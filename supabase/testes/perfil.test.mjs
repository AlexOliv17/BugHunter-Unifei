// S7-02 — perfil, elo e ranking (RF-18 a RF-20, RN-13, RN-14).
// Cada teste cria os seus alunos e tentativas; os rankings são globais, então os testes
// de ranking olham só as linhas dos alunos que criaram.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { subirBanco } from "./banco.mjs";

let banco;
let ordem = 15000;
before(async () => { banco = await subirBanco(); });
after(async () => { await banco?.encerrar(); });

const q = (sql, p) => banco.admin.query(sql, p);

async function aluno(nome = "Aluno Teste") {
  const id = randomUUID();
  await q("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, `${id}@t`, { nome }]);
  return id;
}

// um exercício novo de uma categoria (ARIT_TROC: baixo, base 100; ACUM_AUSENTE: médio, base 200)
async function exercicio(categoria = "ARIT_TROC") {
  const tema = "t" + randomUUID().slice(0, 8), prog = randomUUID(), id = randomUUID();
  await q("insert into temas values ($1, $1, 'd', true, (select coalesce(max(ordem), 0) + 1 from temas))", [tema]);
  await q("insert into programas_base values ($1, $2, 'f', 'f(x)', 'd', 'C', '{}', 'S')", [prog, tema]);
  await q(`insert into exercicios (id, programa_base_id, categoria_codigo, ordem, codigo_com_defeito, linha_defeito, mutador_versao)
           values ($1, $2, $3, $4, 'def f(x):\n    return x', 2, '1.0.0')`, [id, prog, categoria, ordem++]);
  return id;
}

// tentativa já encerrada, com o PDR e a data dados (direto na tabela, como o servidor deixaria)
async function encerrada(usuario, exercicioId, { pdr, desfecho = "resolvido", numero = 1, quando = "now()" }) {
  await q(`insert into tentativas (usuario_id, exercicio_id, numero_tentativa, desfecho, pdr_final, fechada_em)
           values ($1, $2, $3, $4, $5, ${quando})`, [usuario, exercicioId, numero, desfecho, pdr]);
}

async function comoAluno(usuario, sql, params = []) {
  const c = await banco.conectar();
  try {
    await c.query("set role authenticated");
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario]);
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

describe("elo (RN-13, D-33)", () => {
  test("média das 20 últimas por fechada_em, arredondada meio-para-cima", async () => {
    const a = await aluno();
    // 21 tentativas: a mais antiga vale 0 e deve ficar de fora da janela
    await encerrada(a, await exercicio(), { pdr: 0, quando: "now() - interval '30 days'" });
    for (let i = 0; i < 19; i++) await encerrada(a, await exercicio(), { pdr: 100, quando: `now() - interval '${i + 1} hours'` });
    await encerrada(a, await exercicio(), { pdr: 10 });
    // (19 × 100 + 10) / 20 = 95,5 → 96
    assert.deepEqual(await comoAluno(a, "select * from elo_do_aluno()"), [{ elo: 96, tentativas: 20 }]);
  });
  test("desistência entra com 0; treino fica de fora", async () => {
    const a = await aluno();
    const ex = await exercicio();
    await encerrada(a, ex, { pdr: 100, quando: "now() - interval '2 hours'" });
    await encerrada(a, ex, { pdr: 0, numero: 2, quando: "now() - interval '1 hour'" });  // treino: o 1º já resolvido
    await encerrada(a, await exercicio(), { pdr: 0, desfecho: "desistiu" });
    // (100 + 0 da desistência) / 2 = 50; o treino não conta
    assert.deepEqual(await comoAluno(a, "select * from elo_do_aluno()"), [{ elo: 50, tentativas: 2 }]);
  });
  test("sem tentativas encerradas: sem elo", async () => {
    const a = await aluno();
    assert.deepEqual(await comoAluno(a, "select * from elo_do_aluno()"), [{ elo: null, tentativas: 0 }]);
  });
});

describe("domínio por categoria (RN-13, D-32)", () => {
  test("PDR médio por categoria do aluno; categoria sem tentativas aparece vazia", async () => {
    const a = await aluno(), outro = await aluno();
    await encerrada(a, await exercicio("ARIT_TROC"), { pdr: 100 });
    await encerrada(a, await exercicio("ARIT_TROC"), { pdr: 0, desfecho: "desistiu" });
    await encerrada(a, await exercicio("ACUM_AUSENTE"), { pdr: 150 });
    await encerrada(outro, await exercicio("CMP_INV"), { pdr: 100 });   // de outro aluno: não aparece
    const d = Object.fromEntries((await comoAluno(a, "select * from dominio_por_categoria()"))
      .map((r) => [r.categoria, { n: r.tentativas, media: r.pdr_medio === null ? null : Number(r.pdr_medio) }]));
    assert.deepEqual(d["operador aritmético trocado"], { n: 2, media: 50 });
    assert.deepEqual(d["acumulador não atualizado"], { n: 1, media: 150 });
    assert.deepEqual(d["comparador invertido"], { n: 0, media: null });
  });
  test("tentativa aberta não entra (RNF-03)", async () => {
    const a = await aluno();
    await q("insert into tentativas (usuario_id, exercicio_id, numero_tentativa) values ($1, $2, 1)", [a, await exercicio("LACO_DESL")]);
    const linha = (await comoAluno(a, "select * from dominio_por_categoria()")).find((r) => r.categoria === "limite de laço deslocado");
    assert.equal(linha.tentativas, 0);
  });
});

describe("ranking (RN-14, D-35 a D-37)", () => {
  test("semanal: soma desde segunda 0h em Brasília; semana passada fica de fora", async () => {
    const a = await aluno("Beatriz Souza"), b = await aluno("Carlos Lima");
    await encerrada(a, await exercicio(), { pdr: 100 });
    await encerrada(a, await exercicio(), { pdr: 50 });
    await encerrada(b, await exercicio(), { pdr: 120 });
    await encerrada(b, await exercicio(), { pdr: 200, quando: "now() - interval '8 days'" });
    const linhas = await comoAluno(a, "select * from ranking_semanal()");
    const meu = linhas.find((r) => r.e_voce);
    assert.equal(meu.pontos, 150);
    const pontosDeB = linhas.filter((r) => !r.e_voce && r.pontos === 120);
    assert.ok(pontosDeB.length >= 1, "o outro aluno aparece com 120, sem a semana passada");
  });
  test("nome exibido: anônimo por padrão; 'Nome S.' depois de escolher", async () => {
    const a = await aluno("Daniela Rocha Prado");
    await encerrada(a, await exercicio(), { pdr: 77 });
    const ver = async () => (await comoAluno(await aluno(), "select * from ranking_semanal()")).find((r) => r.pontos === 77 && !r.e_voce);
    assert.equal((await ver()).nome_exibido, "Aluno anônimo");
    await comoAluno(a, "update usuarios set exibir_nome = true where id = $1", [a]);
    assert.equal((await ver()).nome_exibido, "Daniela P.");
  });
  test("o ranking devolve só posição, nome exibido, pontos e se é você", async () => {
    const a = await aluno();
    await encerrada(a, await exercicio(), { pdr: 10 });
    for (const f of ["ranking_semanal", "ranking_geral"]) {
      const [linha] = await comoAluno(a, `select * from ${f}()`);
      assert.deepEqual(Object.keys(linha).sort(), ["e_voce", "nome_exibido", "pontos", "posicao"], f);
    }
  });
  test("geral: pelo elo, empates na mesma posição", async () => {
    const a = await aluno("Elisa A."), b = await aluno("Fabio B.");
    await encerrada(a, await exercicio(), { pdr: 199 });
    await encerrada(b, await exercicio(), { pdr: 199 });
    const linhas = (await comoAluno(a, "select * from ranking_geral()")).filter((r) => r.pontos === 199);
    assert.equal(linhas.length, 2);
    assert.equal(linhas[0].posicao, linhas[1].posicao);
  });
});

describe("escolha de visibilidade (D-36)", () => {
  test("o aluno altera só a própria linha, e só o nome e o exibir_nome", async () => {
    const a = await aluno(), b = await aluno();
    await comoAluno(a, "update usuarios set exibir_nome = true where id = $1", [b]);   // RLS: não afeta a linha de b
    assert.equal((await q("select exibir_nome from usuarios where id = $1", [b])).rows[0].exibir_nome, false);
    await assert.rejects(comoAluno(a, "update usuarios set email = 'x@y' where id = $1", [a]), { code: "42501" });
  });
});

test("o cliente não executa os auxiliares", async () => {
  const a = await aluno();
  for (const sql of ["select * from elo_de(gen_random_uuid())", "select * from tentativas_pontuaveis(gen_random_uuid())", "select nome_exibido('a', true)"]) {
    await assert.rejects(comoAluno(a, sql), { code: "42501" }, sql);
  }
});
