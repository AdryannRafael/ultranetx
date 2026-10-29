import { t } from "elysia";

// Número do contrato enviado pelo app. A posse é conferida pelo macro `contrato`.
export const ContratoParam = t.Object({
  contrato: t.Number({ minimum: 1 }),
});
