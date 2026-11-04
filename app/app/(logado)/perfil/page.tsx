import type { Metadata } from "next";

import type { LinhaRanking } from "@/lib/elo";
import { nomeDe } from "@/lib/nome";
import { exigirUsuario } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { Voltar } from "../Voltar";
import { CabecalhoDoPerfil, DominioPorCategoria, type Dominio, type Elo } from "./componentes";
import { Ranking } from "./Ranking";

export const metadata: Metadata = { title: "Meu progresso · BugHunter" };

// Tela 8, perfil (RF-18 a RF-20), conforme o protótipo "Perfil": faixa, elo, domínio
// por categoria e ranking. Os dados vêm de funções do banco que só olham tentativas
// encerradas e, do ranking, devolvem só posição, nome exibido e pontos (migration 017).
export default async function PaginaPerfil() {
  const usuario = await exigirUsuario("/perfil");
  const supabase = await criarClienteServidor();
  const [elo, dominio, semanal, geral, perfil] = await Promise.all([
    supabase.rpc("elo_do_aluno"),
    supabase.rpc("dominio_por_categoria"),
    supabase.rpc("ranking_semanal"),
    supabase.rpc("ranking_geral"),
    supabase.from("usuarios").select("exibir_nome").eq("id", usuario.id).maybeSingle(),
  ]);
  if (elo.error || dominio.error || semanal.error || geral.error || perfil.error) {
    throw new Error("Não foi possível carregar o seu progresso.");
  }
  const nome = nomeDe(usuario);

  return (
    <main className="mx-auto w-full max-w-6xl px-10 py-8">
      <div className="flex items-center gap-6">
        <Voltar href="/temas" para="os temas" />
        <nav aria-label="Caminho" className="text-sm text-texto-secundario">
          <span>Temas</span><span aria-hidden className="mx-2">/</span><span className="text-texto">Meu progresso</span>
        </nav>
      </div>

      <CabecalhoDoPerfil nome={nome} elo={(elo.data as Elo[])[0]} />

      <div className="mt-8 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
        <DominioPorCategoria linhas={dominio.data as Dominio[]} />
        <Ranking semanal={semanal.data as LinhaRanking[]} geral={geral.data as LinhaRanking[]}
          exibirNome={perfil.data?.exibir_nome === true} />
      </div>
    </main>
  );
}
