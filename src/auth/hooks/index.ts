import { createAuthMiddleware } from "better-auth/api";
import { PrimeiroLogin } from "./primeiro-login";
import { ConcluirTrocaSenha, ValidarTrocaSenha } from "./troca-senha";

// O Better Auth aceita um único hook "before" e um "after": cada rota é despachada aqui

export const beforeHook = createAuthMiddleware(async (ctx) => {
  switch (ctx.path) {
    case "/sign-in/username":
      return PrimeiroLogin(ctx);
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
