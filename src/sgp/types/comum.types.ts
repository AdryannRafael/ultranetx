// Tipos compartilhados entre as rotas do SGP

export type SgpPaginacao = {
  offset: number;
  limit: number;
  parcial: number;
  total: number;
};
