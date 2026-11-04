// Blocos da tela de perfil (S7-04, S7-05). Só apresentação: os dados vêm da página.

import { divisaoDoElo, percentualDaBase } from "@/lib/elo";
import { iniciais } from "@/lib/nome";

export type Elo = { elo: number | null; tentativas: number };
export type Dominio = { categoria: string; nivel: string; tentativas: number; pdr_medio: string | number | null };

export function CabecalhoDoPerfil({ nome, elo }: { nome: string; elo: Elo | undefined }) {
  const posicao = elo?.elo != null ? divisaoDoElo(elo.elo) : null;
  return (
    <section aria-label="Resumo" className="mt-8 flex items-center gap-8 rounded border border-borda bg-painel p-10">
      <span aria-hidden className="flex h-24 w-24 shrink-0 items-center justify-center rounded border-2 border-destaque text-3xl font-semibold text-destaque">
        {iniciais(nome)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-semibold">{nome}</h1>
          {posicao && <span className="font-mono text-sm font-semibold tracking-wider text-destaque">{posicao.atual.rotulo.toUpperCase()}</span>}
        </div>
        {posicao && elo ? (
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-texto-secundario">elo <strong className="text-texto">{elo.elo}</strong></span>
              <span className="text-texto-secundario">
                {posicao.proxima ? `faltam ${posicao.falta} para ${posicao.proxima.rotulo}` : "divisão mais alta"}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded bg-fundo" role="progressbar" aria-label="Progresso até a próxima divisão"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(posicao.progresso * 100)}>
              <div className="h-full rounded bg-destaque" style={{ width: `${Math.round(posicao.progresso * 100)}%` }} />
            </div>
            <p className="mt-3 text-xs text-texto-apagado">
              Média do PDR das suas {elo.tentativas === 1 ? "última tentativa encerrada" : `${elo.tentativas} últimas tentativas encerradas`} (até 20). Treinos não entram.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-texto-secundario">Você ainda não tem elo: ele aparece quando você encerrar o primeiro exercício.</p>
        )}
      </div>
    </section>
  );
}

const corDaBarra = (p: number) => (p >= 80 ? "bg-sucesso" : p >= 50 ? "bg-destaque" : "bg-perigo");
const corDoTexto = (p: number) => (p >= 80 ? "text-sucesso" : p >= 50 ? "text-destaque" : "text-perigo");

export function DominioPorCategoria({ linhas }: { linhas: Dominio[] }) {
  return (
    <section aria-label="Domínio por categoria" className="rounded border border-borda bg-painel p-8">
      <h2 className="text-xs font-semibold tracking-wider text-texto-secundario">DOMÍNIO POR CATEGORIA DE DEFEITO</h2>
      <p className="mt-2 text-sm text-texto-secundario">PDR médio das suas tentativas encerradas, em percentual da base do nível.</p>
      <ul className="mt-6 flex flex-col gap-4">
        {linhas.map((l) => {
          const p = percentualDaBase(l.pdr_medio, l.nivel);
          return (
            <li key={l.categoria} className="grid grid-cols-[minmax(0,15.5rem)_1fr_3.5rem] items-center gap-4">
              <span className="truncate font-mono text-sm">{l.categoria}</span>
              {p === null ? (
                <span className="col-span-2 text-sm text-texto-apagado">ainda sem tentativas</span>
              ) : (
                <>
                  <div className="h-2 rounded bg-fundo" role="meter" aria-label={`${l.categoria}: ${p}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
                    <div className={`h-full rounded ${corDaBarra(p)}`} style={{ width: `${p}%` }} />
                  </div>
                  <span className={`text-right font-mono text-sm ${corDoTexto(p)}`}>{p}%</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-texto-apagado">
        As outras 5 categorias de defeito entram junto com o nível Alto. Treinos não entram; desistências contam como 0.
      </p>
    </section>
  );
}
