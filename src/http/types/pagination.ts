import { t } from "elysia";

// Paginação repassada ao SGP (o SGP aceita no máximo 250 por página)
export const PaginacaoParam = t.Object({
  offset: t.Optional(t.Number({ minimum: 0 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 250 })),
});
