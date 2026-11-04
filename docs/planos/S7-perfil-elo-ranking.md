# Plano · Sprint 7 · Perfil, elo e ranking

Situação: **aprovado pelo P.O. em 2026-11-04**, com os ajustes de divisões e ranking completo. Nada foi implementado ainda.
Origem: pedido do P.O. em 2026-11-04. Hoje os três itens estão em "Fora de escopo na v1" (Requisitos §6); o plano os
traz para dentro com as decisões abaixo.

## 1. Decisões do P.O. (a registrar como D-32 a D-37)

| # | Assunto | Decisão |
|---|---|---|
| D-32 | Conteúdo do perfil | domínio por categoria de defeito, medido pelo **PDR médio** em percentual da base, mais o elo, a faixa e o ranking. Sem "dias seguidos", sem "ponto fraco" e sem resumo numérico (resolvidos, precisão, tentativas por acerto) |
| D-33 | Elo | média do `pdr_final` das **20 últimas tentativas encerradas**, por `fechada_em`, **sem os treinos** (D-31); desistências entram com 0. Com menos de 20, a média do que houver; sem nenhuma, não há elo. Arredondado meio-para-cima (D-16) |
| D-34 | Faixas | **Bronze 0–49, Prata 50–99, Ouro 100–149, Diamante 150–200**, cada uma dividida em I, II e III, em partes iguais, **subindo de I para III**: Ouro I → Ouro II → Ouro III → Diamante I |
| D-35 | Ranking | **semanal e geral, com todos os alunos** (não existe turma na v1). Semanal: soma do `pdr_final` das tentativas encerradas desde segunda 00h, horário de Brasília. Geral: pelo elo |
| D-36 | Como outros alunos aparecem | **escolha de cada aluno**, no perfil: com o nome ("Marina F.") ou anônimo |
| D-37 | Ranking completo | o perfil mostra um resumo (os 3 primeiros, o aluno e um vizinho acima e um abaixo) e o aluno pode **abrir o ranking completo**, com todas as posições |

## 2. Regras propostas para os pontos ainda em aberto

Confirmadas pelo P.O. em 2026-11-04, salvo os dois ajustes já incorporados (divisões e ranking completo).

- **Visibilidade padrão:** anônimo até o aluno escolher aparecer com o nome. É o mais seguro: ninguém aparece
  com o nome sem ter optado.
- **Nome do anônimo no ranking:** "Aluno anônimo", sem iniciais (iniciais já identificam numa turma pequena).
- **Divisões das faixas:** cada faixa de 50 pontos em terços, **I na parte de baixo e III na de cima**: Ouro I
  100–116, Ouro II 117–133, Ouro III 134–149. Diamante vai até 200, então tem 51 valores: I 150–166, II 167–183,
  III 184–200. A ordem completa: Bronze I, II, III → Prata I, II, III → Ouro I, II, III → Diamante I, II, III.
- **"Faltam X para…":** a barra do perfil mostra quanto falta para a próxima divisão; no Diamante III, nada falta.
- **Empates no ranking:** mesma posição para pontuações iguais (1, 1, 3), em ordem alfabética do nome exibido.
- **Quem entra no ranking:** semanal, só quem encerrou alguma tentativa na semana; geral, só quem tem elo.
- **O que o ranking mostra (D-37):** no perfil, um resumo com os 3 primeiros, o próprio aluno e um vizinho acima e um
  abaixo, como no protótipo; um botão "Ver ranking completo" abre a lista inteira, com a posição do aluno destacada.
- **Domínio por categoria:** só tentativas encerradas e sem treino; categoria sem tentativas aparece vazia ("ainda
  sem tentativas"), não como 0%.
- **Elo na tela de resultado:** o protótipo mostra "Elo, com este resultado: 167 → 158". Proposta: incluir, porque
  sai do mesmo cálculo.
- **Faixa no cabeçalho:** selo com a faixa ao lado das iniciais, como no protótipo; as iniciais levam ao perfil.

## 3. Segurança

- **RNF-03:** o domínio por categoria revela a categoria de cada tentativa, então usa **só tentativas encerradas**,
  quando a categoria já é pública para aquele aluno.
- **RNF-04:** o ranking expõe dados de outros alunos. Ele sai de funções do banco que devolvem só **posição, nome
  exibido (ou "Aluno anônimo") e pontos**, nunca id, e-mail, tentativas ou eventos. O aluno continua sem acesso às
  tentativas de outro; o RNF-04 ganha a ressalva de que a pontuação agregada aparece no ranking.
- A escolha de visibilidade é a única coisa nova que o aluno grava; a D-24 (só o `nome` é editável) passa a incluir
  essa preferência.

## 4. Mudanças na especificação

- Requisitos §6: saem "Elo e janela móvel", "Ranking semanal e geral" e "Perfil com domínio por categoria".
  Continuam fora: dias seguidos, ponto fraco com seleção adaptativa, resumo numérico e visão de professor ou turma.
- Requisitos: **RF-18 Perfil**, **RF-19 Elo e faixas** e **RF-20 Ranking**, com critérios de aceite.
- Documentação: RN-13 (elo e faixas) e RN-14 (ranking); tela 8 (Progresso) e tela 9 (Ranking) passam a "sim" na v1.
- Modelo de Dados: coluna `usuarios.exibir_nome` (boolean, padrão `false`) e as funções novas.

## 5. Atividades

| # | Atividade | Ref. | ◆ |
|---|---|---|---|
| S7-01 | Atualizar Requisitos, Documentação e Modelo de Dados com D-32 a D-37 e as regras confirmadas | — | ◆ |
| S7-02 | Migration: `usuarios.exibir_nome`; funções `elo_do_aluno`, `dominio_por_categoria`, `ranking_semanal` e `ranking_geral`; a escolha de visibilidade é gravada pelo próprio aluno, com grant só na coluna `exibir_nome` (como o `nome`, D-24), com testes no Postgres real (inclusive a recusa de dados de outro aluno) | RF-18 a RF-20 | |
| S7-03 | `lib/elo.ts`: elo e faixas como funções puras, com testes (fronteiras de cada divisão, menos de 20 tentativas, treinos fora) | RF-19 | |
| S7-04 | Tela `/perfil` ("Meu progresso"): cabeçalho com faixa, elo e barra até a próxima divisão; domínio por categoria | RF-18 | |
| S7-05 | Ranking na tela de perfil, com abas Semanal e Geral, o resumo e o ranking completo, e a opção "aparecer com meu nome" | RF-20 | |
| S7-06 | Selo da faixa no cabeçalho, iniciais levando ao perfil; elo antes e depois na tela de resultado | RF-19 | |
| S7-07 | Auditoria: ranking sem id, e-mail ou tentativas de outros; scripts da S6-02 atualizados | RNF-03, RNF-04 | ◆ |

**Critério de saída:** dois alunos resolvem e desistem de exercícios; cada um vê no perfil o próprio domínio por
categoria e o elo batendo com a conta à mão, e no ranking vê o outro só com o nome, se ele tiver escolhido aparecer.
