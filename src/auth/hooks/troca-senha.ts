import {
  APIError,
  isAPIError,
  type createAuthMiddleware,
} from "better-auth/api";

// Contexto que o Better Auth passa para os hooks before/after
type Ctx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/**
 * Antes do POST /auth/change-password: a nova senha não pode repetir a atual
 * (no primeiro acesso, a atual é o número do contrato).
 */
export async function ValidarTrocaSenha(ctx: Ctx) {
  const body = (ctx.body ?? {}) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (
    typeof body.newPassword === "string" &&
    body.newPassword === body.currentPassword
  ) {
    throw new APIError("BAD_REQUEST", {
      message: "A nova senha precisa ser diferente da atual",
      code: "NOVA_SENHA_IGUAL_ATUAL",
    });
  }
}

/**
 * Depois do POST /auth/change-password com sucesso: libera o usuário da troca
 * obrigatória. A sessão atual continua válida, então ele segue logado.
 */
export async function ConcluirTrocaSenha(ctx: Ctx) {
  const retorno = ctx.context.returned as
    | { token?: string | null; user?: { id?: string } }
    | undefined;
  if (!retorno || isAPIError(retorno)) return;

  const userId = ctx.context.session?.user.id ?? retorno.user?.id;
  if (!userId) return;

  await ctx.context.internalAdapter.updateUser(userId, {
    mustChangePassword: false,
  });

  // A resposta foi montada antes desta atualização: devolve o usuário já liberado
  return ctx.json({
    ...retorno,
    user: { ...retorno.user, mustChangePassword: false },
  });
}
