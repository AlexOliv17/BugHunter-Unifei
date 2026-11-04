import { describe, expect, it } from "vitest";

import { DIVISOES_EM_ORDEM, divisaoDoElo, percentualDaBase, resumoDoRanking, type LinhaRanking } from "../elo";

describe("divisões do elo (D-34)", () => {
  it("12 divisões contíguas, de Bronze I a Diamante III, cobrindo 0–200", () => {
    expect(DIVISOES_EM_ORDEM.map((d) => d.rotulo)).toEqual([
      "Bronze I", "Bronze II", "Bronze III", "Prata I", "Prata II", "Prata III",
      "Ouro I", "Ouro II", "Ouro III", "Diamante I", "Diamante II", "Diamante III",
    ]);
    expect(DIVISOES_EM_ORDEM[0].inicio).toBe(0);
    expect(DIVISOES_EM_ORDEM.at(-1)!.fim).toBe(200);
    DIVISOES_EM_ORDEM.slice(1).forEach((d, i) => expect(d.inicio).toBe(DIVISOES_EM_ORDEM[i].fim + 1));
  });
  it("fronteiras como na RN-13", () => {
    const faixas = (...elos: number[]) => elos.map((e) => divisaoDoElo(e).atual.rotulo);
    expect(faixas(0, 16, 17, 33, 34, 49)).toEqual(["Bronze I", "Bronze I", "Bronze II", "Bronze II", "Bronze III", "Bronze III"]);
    expect(faixas(100, 116, 117, 133, 134, 149)).toEqual(["Ouro I", "Ouro I", "Ouro II", "Ouro II", "Ouro III", "Ouro III"]);
    expect(faixas(150, 166, 167, 183, 184, 200)).toEqual(["Diamante I", "Diamante I", "Diamante II", "Diamante II", "Diamante III", "Diamante III"]);
  });
  it("sobe de I para III, e de Ouro III para Diamante I", () => {
    expect(divisaoDoElo(140)).toMatchObject({ atual: { rotulo: "Ouro III" }, proxima: { rotulo: "Diamante I" }, falta: 10 });
    expect(divisaoDoElo(100)).toMatchObject({ proxima: { rotulo: "Ouro II" }, falta: 17, progresso: 0 });
  });
  it("Diamante III: nada a seguir", () => {
    expect(divisaoDoElo(200)).toMatchObject({ proxima: null, falta: 0, progresso: 1 });
  });
  it("recusa elo fora de 0–200", () => {
    for (const e of [-1, 201, 1.5, NaN]) expect(() => divisaoDoElo(e)).toThrow(RangeError);
  });
});

describe("domínio por categoria (RN-13)", () => {
  it("PDR médio em percentual da base do nível, arredondado meio-para-cima", () => {
    expect(percentualDaBase(50, "baixo")).toBe(50);
    expect(percentualDaBase(150, "medio")).toBe(75);
    expect(percentualDaBase("84.5", "baixo")).toBe(85);
    expect(percentualDaBase(null, "medio")).toBeNull();
  });
});

describe("resumo do ranking (D-37)", () => {
  const ranking = (n: number, eu: number): LinhaRanking[] =>
    Array.from({ length: n }, (_, i) => ({ posicao: i + 1, nome_exibido: `A${i + 1}`, pontos: 100 - i, e_voce: i + 1 === eu }));
  const posicoes = (r: ReturnType<typeof resumoDoRanking>) => r.map((x) => ("reticencias" in x ? "…" : x.posicao));
  it("3 primeiros, você e os vizinhos, com reticências no salto", () => {
    expect(posicoes(resumoDoRanking(ranking(20, 14)))).toEqual([1, 2, 3, "…", 13, 14, 15]);
  });
  it("você entre os primeiros: sem salto", () => {
    expect(posicoes(resumoDoRanking(ranking(20, 2)))).toEqual([1, 2, 3]);
    expect(posicoes(resumoDoRanking(ranking(20, 4)))).toEqual([1, 2, 3, 4, 5]);
  });
  it("você em último: sem vizinho abaixo", () => {
    expect(posicoes(resumoDoRanking(ranking(10, 10)))).toEqual([1, 2, 3, "…", 9, 10]);
  });
  it("você fora do ranking: só os 3 primeiros", () => {
    expect(posicoes(resumoDoRanking(ranking(10, 0)))).toEqual([1, 2, 3]);
  });
});
