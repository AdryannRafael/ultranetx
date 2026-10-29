// Contexto: documentos do contrato em PDF (GET /api/contratos/print/{tipo})

export type SgpTipoDocumento =
  | "contrato"
  | "termoadesao"
  | "contratofidelidade"
  | "cancelamento"
  | "termocomodato"
  | "termoaceite_web"
  | "termoprivacidade";
