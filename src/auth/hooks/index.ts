import { createAuthMiddleware } from "better-auth/api";
import { ConcluirTrocaSenha, ValidarTrocaSenha } from "./troca-senha";

// O Better Auth aceita um único hook "before" e um "after": cada rota é despachada aqui.
// Os usuários são gerados antes pela rotina src/scripts/gerar-usuarios.ts,
// então o login não busca nada fora.

export const beforeHook = createAuthMiddleware(async (ctx) => {
  switch (ctx.path) {
    case "/change-password":
      return ValidarTrocaSenha(ctx);
  }
});

export const afterHook = createAuthMiddleware(async (ctx) => {
  switch (ctx.path) {
    case "/change-password":
      return ConcluirTrocaSenha(ctx);
  }
});
