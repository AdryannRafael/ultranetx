// Contexto: notas fiscais (POST /api/central/notafiscal/list/)

// Só os dados que o cliente vê. Os dados fiscais da empresa emissora ficam no PDF do link.
export type SgpNotaFiscal = {
  numero: number;
  serie: string;
  modelo: string;
  status: number;
  valortotal: number;
  data_emissao: string;
  link: string;
};
