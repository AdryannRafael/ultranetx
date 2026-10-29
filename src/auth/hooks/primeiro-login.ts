import type { createAuthMiddleware } from "better-auth/api";
import { CpfCnpjValido, NormalizarCpfCnpj } from "../cpf";
import { BuscarUsuarioExterno } from "../usuario-externo";

// Contexto que o Better Auth passa para os hooks before/after
type Ctx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/**
 * Antes do login por CPF/CNPJ (POST /auth/sign-in/username).
 *
 * Se o CPF/CNPJ ainda não tem conta, busca o usuário fora (BuscarUsuarioExterno) e,
 * se ele existir, cria o usuário com a senha inicial e mustChangePassword = true.
 * Depois o plugin username segue com o login normal e devolve a sessão.
 */
export async function PrimeiroLogin(ctx: Ctx) {
  const body = (ctx.body ?? {}) as { username?: unknown; password?: unknown };
  const username = NormalizarCpfCnpj(String(body.username ?? ""));
  const password = String(body.password ?? "");

  // Dados inválidos: deixa o plugin responder o erro de validação.
  // Sem mínimo de tamanho: a senha inicial é o número do contrato (curta).
  const { maxPasswordLength } = ctx.context.password.config;
  if (!CpfCnpjValido(username) || !password || password.length > maxPasswordLength) {
    return;
  }

  const existente = await ctx.context.adapter.findOne({
    model: "user",
    where: [{ field: "username", value: username }],
  });
  if (existente) return;

  const externo = await BuscarUsuarioExterno(username, password);
  if (!externo) return; // segue para o plugin, que responde "credenciais inválidas"

  try {
    const user = await ctx.context.internalAdapter.createUser(
      {
        name: externo.name,
        email: externo.email ?? `${username}@clientes.ultranetx.invalid`,
        username,
        mustChangePassword: true,
      },
      { method: "primeiro-login" },
    );
    await ctx.context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.context.password.hash(password),
    });
  } catch (e) {
    // Dois primeiros logins ao mesmo tempo: o segundo bate na unique e segue para o login
    ctx.context.logger.warn("Primeiro login: não criou o usuário", e);
  }
}
