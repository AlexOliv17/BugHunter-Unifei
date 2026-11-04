-- Migration 018 — elo antes e depois de uma tentativa (S7-06, RF-19)
-- A tela de resultado mostra como aquela tentativa mexeu no elo, inclusive ao rever
-- uma tentativa antiga: os dois valores são calculados no momento em que ela fechou.

-- tentativas_pontuaveis passa a devolver também o id (o tipo de retorno muda: recria).
-- As funções que a usam (elo_de, dominio_por_categoria) leem pelo nome das colunas.
drop function tentativas_pontuaveis(uuid);
create function tentativas_pontuaveis(p_usuario uuid)
returns table (id uuid, pdr_final integer, fechada_em timestamptz, categoria_codigo text)
language sql stable security definer set search_path = '' as $$
  select t.id, t.pdr_final, t.fechada_em, e.categoria_codigo
  from public.tentativas t
  join public.exercicios e on e.id = t.exercicio_id
  where t.usuario_id = p_usuario and t.desfecho <> 'aberto'
    and not exists (select 1 from public.tentativas r
                    where r.usuario_id = t.usuario_id and r.exercicio_id = t.exercicio_id
                      and r.numero_tentativa < t.numero_tentativa and r.desfecho = 'resolvido');
$$;

-- antes: média das 20 últimas pontuáveis fechadas antes desta; depois: incluindo esta.
-- Tentativa de treino não entra no elo, então antes = depois. Só do aluno da sessão e
-- só de tentativa encerrada; outra qualquer não devolve linha.
create function elo_em_torno(p_tentativa uuid)
returns table (antes integer, depois integer)
language sql stable security definer set search_path = '' as $$
  with alvo as (
    select t.fechada_em from public.tentativas t
    where t.id = p_tentativa and t.usuario_id = auth.uid() and t.desfecho <> 'aberto'
  ), minhas as (
    select p.id, p.pdr_final, p.fechada_em from public.tentativas_pontuaveis(auth.uid()) p
  )
  select
    (select round(avg(u.pdr_final))::integer from (
       select m.pdr_final from minhas m, alvo
       where m.fechada_em < alvo.fechada_em and m.id <> p_tentativa
       order by m.fechada_em desc limit 20) u),
    (select round(avg(u.pdr_final))::integer from (
       select m.pdr_final from minhas m, alvo
       where m.fechada_em <= alvo.fechada_em
       order by m.fechada_em desc limit 20) u)
  from alvo;
$$;

revoke execute on function tentativas_pontuaveis(uuid) from public, anon, authenticated;
grant execute on function tentativas_pontuaveis(uuid) to service_role;
revoke execute on function elo_em_torno(uuid) from public, anon;
grant execute on function elo_em_torno(uuid) to authenticated, service_role;
