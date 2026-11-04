"use client";

// Ranking do perfil (S7-05, RF-20, RN-14): abas Semanal e Geral, o resumo do protótipo
// (3 primeiros, você e os vizinhos) e o ranking completo sob demanda (D-37).

import { useState, useTransition } from "react";

import { resumoDoRanking, type LinhaRanking } from "@/lib/elo";
import { iniciais } from "@/lib/nome";
import { definirExibirNome } from "./acoes";

const ABAS = {
  semanal: { titulo: "Semanal", nota: "Soma do PDR das tentativas encerradas desde segunda-feira às 0h. Zera toda semana." },
  geral: { titulo: "Geral", nota: "Pelo elo: a média do PDR das 20 últimas tentativas encerradas, sem os treinos." },
} as const;

const ANONIMO = "Aluno anônimo";

export function Ranking({ semanal, geral, exibirNome }: { semanal: LinhaRanking[]; geral: LinhaRanking[]; exibirNome: boolean }) {
  const [aba, setAba] = useState<keyof typeof ABAS>("semanal");
  const [completo, setCompleto] = useState(false);
  const linhas = aba === "semanal" ? semanal : geral;
  const resumo = resumoDoRanking(linhas);
  const itens = completo ? linhas : resumo;
  const haMais = linhas.length > resumo.filter((x) => !("reticencias" in x)).length;

  return (
    <section aria-label="Ranking" className="rounded border border-borda bg-painel p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-texto-secundario">RANKING</h2>
        <div role="tablist" aria-label="Período do ranking" className="flex gap-1 rounded border border-borda p-1 text-sm">
          {(Object.keys(ABAS) as (keyof typeof ABAS)[]).map((chave) => (
            <button key={chave} type="button" role="tab" aria-selected={aba === chave}
              onClick={() => { setAba(chave); setCompleto(false); }}
              className={`rounded px-3 py-1 ${aba === chave ? "bg-fundo text-texto" : "text-texto-secundario hover:text-texto"}`}>
              {ABAS[chave].titulo}
            </button>
          ))}
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="mt-6 text-sm text-texto-secundario">
          {aba === "semanal" ? "Ninguém encerrou tentativas nesta semana ainda." : "Ninguém tem elo ainda."}
        </p>
      ) : (
        <ol className={`mt-6 flex flex-col gap-1 ${completo ? "max-h-[28rem] overflow-y-auto pr-2" : ""}`}>
          {itens.map((item, i) =>
            "reticencias" in item
              ? <li key={`r${i}`} aria-hidden className="px-4 py-1 text-texto-apagado">· · ·</li>
              : <LinhaDoRanking key={`${item.posicao}-${i}`} linha={item} />)}
        </ol>
      )}

      {haMais && (
        <button type="button" onClick={() => setCompleto((c) => !c)} className="mt-4 text-sm text-destaque hover:underline">
          {completo ? "Mostrar só o resumo" : `Ver ranking completo (${linhas.length})`}
        </button>
      )}
      <p className="mt-6 border-t border-borda pt-4 text-xs leading-5 text-texto-apagado">{ABAS[aba].nota}</p>
      <Visibilidade exibirNome={exibirNome} />
    </section>
  );
}

function LinhaDoRanking({ linha }: { linha: LinhaRanking }) {
  const anonimo = linha.nome_exibido === ANONIMO;
  return (
    <li className={`grid grid-cols-[2.5rem_2.25rem_1fr_auto] items-center gap-3 rounded px-4 py-2 ${linha.e_voce ? "border-l-2 border-destaque bg-destaque/10" : ""}`}>
      <span className={`font-mono ${linha.e_voce ? "font-semibold text-destaque" : "text-texto-secundario"}`}>{linha.posicao}</span>
      <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded text-xs font-semibold ${linha.e_voce ? "border border-destaque text-destaque" : "bg-fundo text-texto-secundario"}`}>
        {anonimo && !linha.e_voce ? "?" : iniciais(linha.e_voce ? "Você" : linha.nome_exibido)}
      </span>
      <span className={linha.e_voce ? "font-semibold" : anonimo ? "text-texto-secundario" : ""}>
        {linha.e_voce ? "Você" : linha.nome_exibido}
      </span>
      <span className={`font-mono ${linha.e_voce ? "text-destaque" : ""}`}>{linha.pontos.toLocaleString("pt-BR")}</span>
    </li>
  );
}

// D-36: aparecer com o nome ou anônimo; o padrão é anônimo
function Visibilidade({ exibirNome }: { exibirNome: boolean }) {
  const [marcado, setMarcado] = useState(exibirNome);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const mudar = (valor: boolean) => {
    setMarcado(valor);
    setErro(null);
    iniciar(async () => {
      const r = await definirExibirNome(valor);
      if (r) {
        setErro(r.erro);
        setMarcado(!valor);
      }
    });
  };
  return (
    <div className="mt-4">
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={marcado} disabled={salvando} onChange={(e) => mudar(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-destaque)]" />
        Aparecer com o meu nome para os outros alunos
      </label>
      <p className="mt-1 pl-7 text-xs text-texto-apagado">
        {marcado
          ? "Os outros veem o seu primeiro nome e a inicial do último."
          : `Os outros veem você como "${ANONIMO}". Você sempre vê a sua posição.`}
      </p>
      {erro && <p role="alert" className="mt-1 pl-7 text-xs text-perigo">{erro}</p>}
    </div>
  );
}
