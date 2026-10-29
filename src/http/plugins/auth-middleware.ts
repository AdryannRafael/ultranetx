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

      return result;
    },
  },
});
