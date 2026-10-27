// Contexto: liberação por confiança (promessa de pagamento)

// ---------- POST /api/ura/promessapagamento/list ----------

export type SgpPromessa = {
  id: number;
  contratoId: number;
  dataCadastro: string;
  dataPagamento: string;
  acordo: boolean;
  status: string;
};

// ---------- POST /api/ura/liberacaopromessa/ ----------

export type SgpLiberacao = {
  contratoId: number;
  liberado: boolean;
  liberado_dias: number | null;
  protocolo: string | null;
  msg: string;
};
