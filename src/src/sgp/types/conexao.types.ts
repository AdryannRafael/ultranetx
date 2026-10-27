// Contexto: status da conexão de internet (POST /api/ura/verificaacesso/)

// 0 = nada verificado; 1 = online; 2 = offline; 9 = em manutenção
export type SgpConexaoStatus = 0 | 1 | 2 | 9 | (number & {});

// O login PPPoE que vem na resposta é descartado
export type SgpConexao = {
  contratoId: number;
  status: SgpConexaoStatus;
  msg: string;
};
