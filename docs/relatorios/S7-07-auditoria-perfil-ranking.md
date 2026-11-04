# S7-07 · Auditoria do perfil e do ranking (RNF-03, RNF-04)

Data: 2026-11-04 · Branch `sprint-7-perfil-ranking`. Migrations 017 e 018 já aplicadas no banco publicado.

## O que entrou de novo para o cliente

| Função | Quem chama | O que devolve |
|---|---|---|
| `elo_do_aluno()` | aluno logado | o próprio elo e quantas tentativas entraram |
| `dominio_por_categoria()` | aluno logado | por categoria: nome, nível, tentativas e PDR médio, só das próprias tentativas encerradas |
| `ranking_semanal()`, `ranking_geral()` | aluno logado | posição, nome exibido, pontos e se a linha é dele |
| `elo_em_torno(tentativa)` | aluno logado | elo antes e depois de uma tentativa encerrada **dele**; de outro aluno, nada |
| coluna `usuarios.exibir_nome` | aluno logado | editável só na própria linha (grant de coluna + RLS) |

## Verificações

| Verificação | Como | Resultado |
|---|---|---|
| ranking devolve só posição, nome exibido, pontos e `e_voce` | teste no Postgres real (`perfil.test.mjs`) | ok: nenhum id, e-mail, tentativa ou evento |
| nome de outro aluno só aparece se ele escolheu | `perfil.test.mjs` | ok: "Aluno anônimo" por padrão, "Daniela P." depois de escolher |
| aluno não altera a linha de outro nem o e-mail | `perfil.test.mjs` | ok: RLS ignora a linha alheia; e-mail recusado (42501) |
| domínio e elo só com tentativas encerradas (a categoria é segredo antes, RNF-03) | `perfil.test.mjs` | ok: tentativa aberta não entra |
| `elo_em_torno` de tentativa alheia | `perfil.test.mjs` | ok: nenhuma linha |
| privilégios pelo catálogo, local e em produção | `auditoria.test.mjs`, `auditoria-producao.mjs` | ok: `authenticated` executa exatamente as 7 funções esperadas e edita só `nome` e `exibir_nome` |
| funções do perfil e do ranking sem login, em produção | `auditoria-producao.mjs` | ok: as 6 respondem 401 |
| JavaScript do build | `auditoria-publicada.mjs` | ok: 22 pedaços, nenhum com conteúdo proibido |

## A conferir depois da publicação

- `node app/scripts/auditoria-publicada.mjs`: `/perfil` deve redirecionar ao login sem sessão. Antes do merge
  ele responde 404, porque a produção ainda não tem a tela.
- Com dois alunos, o critério de saída da sprint: cada um vê o próprio domínio e o próprio elo batendo com a conta à
  mão, e vê o outro no ranking só pelo nome, se o outro tiver escolhido aparecer.
