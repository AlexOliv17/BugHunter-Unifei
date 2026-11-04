-- Migration 017 — perfil, elo e ranking (S7-02, RF-18 a RF-20, RN-13, RN-14, D-32 a D-37)
-- As funções para o cliente usam auth.uid(), só olham tentativas encerradas e devolvem
-- agregados. Do ranking, só posição, nome exibido e pontos saem; nada de id ou e-mail.

-- D-36: cada aluno escolhe se aparece com o nome no ranking; anônimo por padrão
alter table usuarios add column exibir_nome boolean not null default false;
grant update (exibir_nome) on usuarios to authenticated;   -- junto do nome (D-24); RLS: só a própria linha

-- "Marina Fernandes" -> "Marina F."; um nome só fica como está; quem não escolheu, anônimo
create function nome_exibido(p_nome text, p_exibir boolean) returns text
language sql immutable set search_path = '' as $$
  select case
    when not p_exibir then 'Aluno anônimo'
    when array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1) = 1 then btrim(p_nome)
    else split_part(btrim(p_nome), ' ', 1) || ' '
         || upper(left((regexp_split_to_array(btrim(p_nome), '\s+'))[array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1)], 1)) || '.'
  end;
$$;

-- Tentativas que pontuam no perfil, no elo e no ranking: encerradas e que não são
-- treino (D-31). Desistências ficam, com pdr_final = 0.
create function tentativas_pontuaveis(p_usuario uuid)
returns table (pdr_final integer, fechada_em timestamptz, categoria_codigo text)
language sql stable security definer set search_path = '' as $$
  select t.pdr_final, t.fechada_em, e.categoria_codigo
  from public.tentativas t
  join public.exercicios e on e.id = t.exercicio_id
  where t.usuario_id = p_usuario and t.desfecho <> 'aberto'
    and not exists (select 1 from public.tentativas r
                    where r.usuario_id = t.usuario_id and r.exercicio_id = t.exercicio_id
                      and r.numero_tentativa < t.numero_tentativa and r.desfecho = 'resolvido');
$$;

-- RN-13: média das 20 últimas, arredondada meio-para-cima (round de numeric arredonda
-- 0,5 para longe do zero, o que para valores positivos é para cima, D-16)
create function elo_de(p_usuario uuid)
returns table (elo integer, tentativas integer)
language sql stable security definer set search_path = '' as $$
  select round(avg(u.pdr_final))::integer, count(*)::integer
  from (select p.pdr_final from public.tentativas_pontuaveis(p_usuario) p
        order by p.fechada_em desc limit 20) u;
$$;

-- ─────────────────────────── para o cliente ───────────────────────────

create function elo_do_aluno()
returns table (elo integer, tentativas integer)
language sql stable security definer set search_path = '' as $$
  select * from public.elo_de(auth.uid());
$$;

-- RN-13: PDR médio por categoria; o percentual da base é calculado na aplicação
create function dominio_por_categoria()
returns table (categoria text, nivel text, tentativas integer, pdr_medio numeric)
language sql stable security definer set search_path = '' as $$
  select c.nome, c.nivel, count(p.pdr_final)::integer, avg(p.pdr_final)
  from public.categorias_defeito c
  left join public.tentativas_pontuaveis(auth.uid()) p on p.categoria_codigo = c.codigo
  group by c.nome, c.nivel
  order by c.nivel, c.nome;
$$;

-- RN-14: soma da semana, desde segunda 0h em Brasília
create function ranking_semanal()
returns table (posicao integer, nome_exibido text, pontos integer, e_voce boolean)
language sql stable security definer set search_path = '' as $$
  with inicio as (
    select (date_trunc('week', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo' as em
  ), pontos as (
    select t.usuario_id, sum(t.pdr_final)::integer as pontos
    from public.tentativas t, inicio
    where t.desfecho <> 'aberto' and t.fechada_em >= inicio.em
    group by t.usuario_id
  )
  select rank() over (order by p.pontos desc)::integer,
         public.nome_exibido(u.nome, u.exibir_nome), p.pontos, u.id = auth.uid()
  from pontos p join public.usuarios u on u.id = p.usuario_id
  order by 1, 2;
$$;

-- RN-14: pelo elo; só quem tem elo
create function ranking_geral()
returns table (posicao integer, nome_exibido text, pontos integer, e_voce boolean)
language sql stable security definer set search_path = '' as $$
  select rank() over (order by e.elo desc)::integer,
         public.nome_exibido(u.nome, u.exibir_nome), e.elo, u.id = auth.uid()
  from public.usuarios u
  cross join lateral public.elo_de(u.id) e
  where e.tentativas > 0
  order by 1, 2;
$$;

-- auxiliares: só o servidor
revoke execute on function nome_exibido(text, boolean) from public, anon, authenticated;
revoke execute on function tentativas_pontuaveis(uuid) from public, anon, authenticated;
revoke execute on function elo_de(uuid) from public, anon, authenticated;
grant execute on function nome_exibido(text, boolean), tentativas_pontuaveis(uuid), elo_de(uuid) to service_role;

-- leitura do perfil e do ranking: aluno logado
revoke execute on function elo_do_aluno(), dominio_por_categoria(), ranking_semanal(), ranking_geral() from public, anon;
grant execute on function elo_do_aluno(), dominio_por_categoria(), ranking_semanal(), ranking_geral() to authenticated, service_role;
