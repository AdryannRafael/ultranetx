// Contexto: faturas e Pix
import type { SgpPaginacao } from "./comum.types";

// ---------- POST /api/central/titulos/ ----------

// 1 = Em aberto; 2 = Pago; 3 = Cancelado
export type SgpFaturaStatus = 1 | 2 | 3;

export type SgpFatura = {
  id: number;
  numero_documento: number;
  status: string;
  statusid: SgpFaturaStatus;
  valor: number;
  valorcorrigido: number;
  vencimento: string;
  vencimento_atualizado: string;
  data_pagamento: string | null;
  link_completo: string;
  linhadigitavel: string | null;
  codigopix: string;
  gerapix: boolean;
};

export type SgpListaFaturas = {
  paginacao: SgpPaginacao;
  faturas: SgpFatura[];
};

export type SgpListarFaturasParams = {
  contrato: number;
  status?: SgpFaturaStatus;
  offset?: number;
  limit?: number;
};

// ---------- POST /api/ura/titulos/ (histórico com filtro de período) ----------

export type SgpTituloStatus = "abertos" | "pagos" | "cancelados";

export type SgpTitulo = {
  id: number;
  numeroDocumento: number;
  status: string;
  valor: number;
  valorDesconto: number;
  valorCorrigido: number;
  valorPago: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string;
  dataCancelamento: string;
  link: string;
  link_cobranca: string;
  linhaDigitavel: string;
  codigoBarras: string;
  codigoPix: string;
  demonstrativo: string;
};

export type SgpListaTitulos = {
  paginacao: SgpPaginacao;
  titulos: SgpTitulo[];
};

// Datas no formato AAAA-MM-DD
export type SgpListarTitulosParams = {
  contrato: number;
  status?: SgpTituloStatus;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  ordenar?: "data_documento" | "data_vencimento" | "data_pagamento";
  ordem?: "asc" | "desc";
  offset?: number;
  limit?: number;
};

// ---------- POST /api/ura/fatura2via/ ----------

export type SgpSegundaViaItem = {
  id: number;
  fatura: number;
  valor: number;
  valor_original: number;
  multa: number;
  juros: number;
  desconto_vencimento: number;
  vencimento: string;
  vencimento_original: string;
  link: string;
  link_cobranca: string;
  link_pix_html: string;
  linhadigitavel: string;
  codigopix: string;
};

// status 1 = há faturas em aberto; 0 = nenhuma fatura ou contrato não localizado
export type SgpSegundaVia = {
  status: number;
  msg: string;
  contratoId: number;
  links: SgpSegundaViaItem[];
};

// ---------- POST /api/ura/pagamento/pix/{fatura} ----------

// Resposta crua do SGP: status 1 = Pix disponível; 0 = sem Pix ou erro
export type SgpPixResposta = {
  status: number;
  msg?: string;
  pix?: string;
};
