import { Elysia } from "elysia";
import { auth } from "~/auth/better-auth";

export const authenticatedMiddleware = new Elysia({
  name: "authenticated",
}).macro({
  auth: {
    async resolve({ request: { headers }, status }) {
      const result = await auth.api.getSession({
        headers,
      });

      if (!result) {
        return status(401, {
          message: "Unauthorized",
        });
      }

      // Primeiro acesso: o app precisa chamar /auth/change-password antes de qualquer rota
      if (result.user.mustChangePassword) {
        return status(403, {
          message: "Troque a senha inicial para continuar",
          code: "TROCAR_SENHA",
        });
      }

      return result;
    },
  },
});
