import { t } from "elysia";
import { ContratoParam } from "./contrato";
import { PaginacaoParam } from "./pagination";

// GET /faturas/listar → sgp.fatura.Listar
export const ListarFaturaParam = t.Composite([
  ContratoParam,
  PaginacaoParam,
  t.Object({
    // 1 = Em aberto; 2 = Pago; 3 = Cancelado. Sem status: todas menos as canceladas.
    // t.Number (e não t.Literal) porque só ele converte o texto da query em número
    status: t.Optional(t.Integer({ minimum: 1, maximum: 3 })),
  }),
]);
