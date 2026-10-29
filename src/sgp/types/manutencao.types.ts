// Contexto: avisos de manutenção (GET /api/ura/manutencao/list/)

export type SgpManutencaoPop = {
  id: number;
  cidade: string;
  uf: string;
};

export type SgpManutencao = {
  id: number;
  descricao: string;
  data_inicial: string;
  data_final: string;
  mensagem_central: string;
  ativa: boolean;
  severidade: string;
  status: string;
  pops: SgpManutencaoPop[];
};
