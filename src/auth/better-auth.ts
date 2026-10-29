import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { openAPI, username } from "better-auth/plugins";
import { db } from "~/db";
import * as schemas from "~/db/schema/auth";
import { CpfCnpjValido, NormalizarCpfCnpj } from "./cpf";
import { afterHook, beforeHook } from "./hooks";

export const auth = betterAuth({
  basePath: "/auth",
  emailAndPassword: {
    enabled: true,
    // Não existe cadastro pelo app: a conta nasce no primeiro login (hooks/primeiro-login.ts)
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // true na conta criada no primeiro login: só libera o app depois do /change-password
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false,
      },
    },
  },
  // O login é só por CPF/CNPJ (/sign-in/username)
  disabledPaths: ["/sign-in/email"],
  hooks: {
    before: beforeHook,
    after: afterHook,
  },
  advanced: { database: { joins: false, generateId: false } },
  rateLimit: {
    enabled: true,
    max: 3,
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    camelCase: false,
    // usePlural: true,
    schema: schemas,
  }),

  plugins: [
    openAPI(),
    username({
      usernameNormalization: NormalizarCpfCnpj,
      // No sign-in o plugin valida o texto cru, então o validador normaliza antes:
      // o app pode mandar o CPF/CNPJ com ou sem máscara
      usernameValidator: (u) => CpfCnpjValido(NormalizarCpfCnpj(u)),
      // O plugin mede o tamanho antes de normalizar: 18 cabe o CNPJ com máscara
      minUsernameLength: 11,
      maxUsernameLength: 18,
      displayUsername: false,
    }),
  ],
});
