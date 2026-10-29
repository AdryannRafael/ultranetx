import { t } from "elysia";

// GET /documentos/:tipo → tipos de documento que o SGP gera em PDF (ver SgpTipoDocumento)
export const DocumentoPathParam = t.Object({
  tipo: t.Union([
    t.Literal("contrato"),
    t.Literal("termoadesao"),
    t.Literal("contratofidelidade"),
    t.Literal("cancelamento"),
    t.Literal("termocomodato"),
    t.Literal("termoaceite_web"),
    t.Literal("termoprivacidade"),
  ]),
});

// GET /documentos/quitacao/:ano → ano da declaração anual (até o ano atual)
export const QuitacaoPathParam = t.Object({
  ano: t.Integer({ minimum: 2000, maximum: new Date().getFullYear() }),
});
