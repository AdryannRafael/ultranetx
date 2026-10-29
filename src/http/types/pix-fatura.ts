import { t } from "elysia";

// GET /faturas/:fatura/pix → id do título (campo `id` da fatura)
export const PixFaturaPathParam = t.Object({
  fatura: t.Number({ minimum: 1 }),
});
