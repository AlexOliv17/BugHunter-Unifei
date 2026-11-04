// Elo, faixas, domínio por categoria e resumo do ranking (RN-13, RN-14, D-34, D-37). Puras.
// O elo em si é calculado no banco (elo_de, migration 017); aqui ficam a faixa, a barra
// até a próxima divisão e o recorte do ranking que o perfil mostra.

import { BASE_POR_NIVEL, ehNivel } from "./niveis";

export const ELO_MAXIMO = 200;

// D-34: blocos de 50 pontos; Diamante vai até 200
export const FAIXAS = [
  { nome: "Bronze", inicio: 0, fim: 49 },
  { nome: "Prata", inicio: 50, fim: 99 },
  { nome: "Ouro", inicio: 100, fim: 149 },
  { nome: "Diamante", inicio: 150, fim: 200 },
] as const;

const DIVISOES = ["I", "II", "III"] as const;

export type Divisao = {
  faixa: (typeof FAIXAS)[number]["nome"];
  divisao: (typeof DIVISOES)[number];
  rotulo: string;      // "Ouro II"
  inicio: number;      // primeiro elo da divisão
  fim: number;         // último elo da divisão
};

// Todas as divisões, da mais baixa à mais alta: cada faixa em terços, I embaixo (D-34).
// Ouro: I 100–116, II 117–133, III 134–149; Diamante: I 150–166, II 167–183, III 184–200.
export const DIVISOES_EM_ORDEM: Divisao[] = FAIXAS.flatMap((f) => {
  const tamanho = f.fim - f.inicio + 1;
  const terco = Math.ceil(tamanho / 3);
  return DIVISOES.map((d, i) => ({
    faixa: f.nome, divisao: d, rotulo: `${f.nome} ${d}`,
    inicio: f.inicio + i * terco,
    fim: i === 2 ? f.fim : f.inicio + (i + 1) * terco - 1,
  }));
});

export type Posicao = { atual: Divisao; proxima: Divisao | null; falta: number; progresso: number };

// Divisão de um elo e quanto falta para a próxima; elo fora de 0–200 é recusado.
export function divisaoDoElo(elo: number): Posicao {
  if (!Number.isInteger(elo) || elo < 0 || elo > ELO_MAXIMO) throw new RangeError(`elo fora de 0–${ELO_MAXIMO}: ${elo}`);
  const i = DIVISOES_EM_ORDEM.findIndex((d) => elo >= d.inicio && elo <= d.fim);
  const atual = DIVISOES_EM_ORDEM[i];
  const proxima = DIVISOES_EM_ORDEM[i + 1] ?? null;
  // progresso dentro da divisão atual, de 0 a 1, para a barra do perfil
  const progresso = proxima ? (elo - atual.inicio) / (proxima.inicio - atual.inicio) : 1;
  return { atual, proxima, falta: proxima ? proxima.inicio - elo : 0, progresso };
}

// Domínio por categoria (RN-13): PDR médio em percentual da base do nível; sem tentativas, null.
export function percentualDaBase(pdrMedio: number | string | null, nivel: string): number | null {
  if (pdrMedio === null) return null;
  const base = BASE_POR_NIVEL[ehNivel(nivel) ? nivel : "baixo"];
  return Math.min(100, Math.floor((Number(pdrMedio) / base) * 100 + 0.5));
}

export type LinhaRanking = { posicao: number; nome_exibido: string; pontos: number; e_voce: boolean };
export type ItemDoResumo = LinhaRanking | { reticencias: true };

// D-37: os 3 primeiros, o aluno e um vizinho de cada lado; "…" onde houver salto.
export function resumoDoRanking(linhas: LinhaRanking[]): ItemDoResumo[] {
  const eu = linhas.findIndex((l) => l.e_voce);
  const indices = new Set([0, 1, 2]);
  if (eu >= 0) [eu - 1, eu, eu + 1].forEach((i) => indices.add(i));
  const escolhidos = [...indices].filter((i) => i >= 0 && i < linhas.length).sort((a, b) => a - b);
  const resumo: ItemDoResumo[] = [];
  escolhidos.forEach((i, k) => {
    if (k > 0 && i !== escolhidos[k - 1] + 1) resumo.push({ reticencias: true });
    resumo.push(linhas[i]);
  });
  return resumo;
}
