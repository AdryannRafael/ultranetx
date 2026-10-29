import { t } from "elysia";
import { ContratoParam } from "./contrato";
import { PaginacaoParam } from "./pagination";

// GET /faturas/periodo → sgp.fatura.ListarPorPeriodo
export const ListarTitulosParam = t.Composite([
  ContratoParam,
  PaginacaoParam,
  t.Object({
    status: t.Optional(
      t.Union([
        t.Literal("abertos"),
        t.Literal("pagos"),
        t.Literal("cancelados"),
      ]),
    ),
    // AAAA-MM-DD
    vencimentoInicio: t.Optional(t.String({ format: "date" })),
    vencimentoFim: t.Optional(t.String({ format: "date" })),
    ordenar: t.Optional(
      t.Union([
        t.Literal("data_documento"),
        t.Literal("data_vencimento"),
        t.Literal("data_pagamento"),
      ]),
    ),
    ordem: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  }),
]);
