import { sgp } from "~/sgp/proxy";

/**
 * PONTO DE PERSONALIZAÇÃO DO PRIMEIRO LOGIN
 *
 * Chamado pelo hook de login (hooks/primeiro-login.ts) quando o CPF/CNPJ ainda não
 * tem conta no app. Se devolver um usuário, a conta é criada com a senha digitada,
 * marcada para troca obrigatória de senha, e o login segue normalmente.
 * Se devolver null, o login falha como credencial inválida.
 *
 * Regra atual: usuário = CPF/CNPJ, senha inicial = número de um contrato
 * não cancelado desse CPF/CNPJ no SGP.
 */

export type UsuarioExterno = {
  name: string;
  // Sem e-mail, usa um e-mail técnico único (o Better Auth exige e-mail no usuário)
  email?: string;
};

// Contrato cancelado no SGP (ver SgpContratoStatus)
const CANCELADO = 3;

export async function BuscarUsuarioExterno(
  cpfcnpj: string,
  senha: string,
): Promise<UsuarioExterno | null> {
  const r = await sgp.cliente.Consultar(cpfcnpj);
  if (r.err) {
    console.error(r.err.toString());
    return null;
  }

  const senhaInicial = senha.trim();
  const contrato = r.v.find(
    (c) =>
      c.contratoStatus !== CANCELADO && String(c.contratoId) === senhaInicial,
  );
  if (!contrato) return null;

  return { name: contrato.razaoSocial };
}
