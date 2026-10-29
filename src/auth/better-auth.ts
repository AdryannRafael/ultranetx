import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { admin, openAPI, username } from "better-auth/plugins";
import { db } from "~/db";
import * as schemas from "~/db/schema/auth";
import { GenarateUUID } from "~/shared/ddd/helpers";
import { CpfCnpjValido, NormalizarCpfCnpj } from "./cpf";
import { afterHook, beforeHook } from "./hooks";

// Origens aceitas: o scheme do app (app.json → "ultranetx") e, fora de produção, o Expo Go (exp://)
const trustedOrigins = [
  "ultranetx://",
  ...(Bun.env.NODE_ENV === "production"
    ? []
    : ["exp://", "exp://**", "exp://192.168.*.*:*/**"]),
];

export const auth = betterAuth({
  basePath: "/auth",
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Não existe cadastro pelo app: as contas são geradas a partir do SGP (bun run usuarios:gerar)
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // true nas contas geradas (senha = nº do contrato): só libera o app depois do /change-password
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
  // As colunas id são text sem default no banco: o Better Auth precisa gerar o id (UUIDv7)
  advanced: { database: { joins: false, generateId: () => GenarateUUID() } },
  // rateLimit: {
  //   enabled: true,
  //   max: 3,
  // },

  database: drizzleAdapter(db, {
    provider: "pg",
    camelCase: false,
    // usePlural: true,
    schema: schemas,
  }),

  plugins: [
    // App nativo (better-auth/expo): aceita o cookie de sessão vindo do header do app
    expo(),
    openAPI(),
    admin(),
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
