"use server";

import { revalidatePath } from "next/cache";

import { usuarioAtual } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// D-36: o aluno escolhe se aparece com o nome no ranking. Grava com a sessão dele:
// o banco só deixa alterar a coluna exibir_nome (grant) da própria linha (RLS).
export async function definirExibirNome(exibir: boolean): Promise<{ erro: string } | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "Entre para continuar." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("usuarios").update({ exibir_nome: exibir === true }).eq("id", usuario.id);
  if (error) return { erro: "Não foi possível salvar a sua escolha agora." };
  revalidatePath("/perfil");
  return null;
}
