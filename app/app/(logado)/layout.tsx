import Link from "next/link";
import { redirect } from "next/navigation";

import { divisaoDoElo } from "@/lib/elo";
import { iniciais, nomeDe } from "@/lib/nome";
import { usuarioAtual } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { sair } from "./acoes";

// Cabeçalho das telas logadas: a marca (leva a Temas, D-30), o selo da faixa do elo,
// o nome e as iniciais (levam ao perfil, RF-18, RF-19) e o Sair (D-28).
export default async function LayoutLogado({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  const nome = nomeDe(usuario);
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("elo_do_aluno");
  const elo = (data as { elo: number | null }[] | null)?.[0]?.elo ?? null;
  const faixa = elo !== null ? divisaoDoElo(elo).atual.rotulo : null;

  return (
    <div className="flex min-h-screen flex-col bg-fundo text-texto">
      <header className="flex h-16 items-center justify-between border-b border-borda px-10">
        <Link href="/temas" className="flex items-center gap-3 text-lg font-semibold">
          <span aria-hidden className="text-destaque">◎</span> BugHunter
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/perfil" aria-label={`Meu progresso${faixa ? ` (${faixa}, elo ${elo})` : ""}`}
            className="group flex items-center gap-4">
            {faixa && (
              <span className="rounded border border-destaque px-3 py-1 font-mono text-xs font-semibold tracking-wider text-destaque group-hover:bg-destaque/10">
                {faixa.toUpperCase()}
              </span>
            )}
            <span className="text-sm text-texto-secundario group-hover:text-texto">{nome}</span>
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-painel text-sm font-semibold text-texto-secundario group-hover:text-texto">
              {iniciais(nome)}
            </span>
          </Link>
          <form action={sair}>
            <button type="submit" className="h-9 rounded border border-borda px-3 text-sm text-texto-secundario transition-colors hover:border-texto-apagado hover:text-texto">
              Sair
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
