// Contexto: catálogo de planos (GET /api/ura/consultaplano/)

export type SgpPlanoTipo =
  | "internet"
  | "telefonia"
  | "multimidia"
  | "tv"
  | "generico";

// Velocidades em kbps. O contrato não traz o id do plano: o vínculo é pelo nome (planointernet = descricao).
export type SgpPlano = {
  id: number;
  descricao: string;
  tipo: SgpPlanoTipo;
  grupo: string;
  preco: number;
  download: number;
  upload: number;
  ativo: boolean;
  pos_pago: boolean;
};
