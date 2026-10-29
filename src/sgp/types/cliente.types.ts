// Contexto: cliente e contratos (POST /api/ura/consultacliente/)

// 1 = Ativo; 3 = Cancelado; 4 = Suspenso; 7 = Ativo com velocidade reduzida
export type SgpContratoStatus = 1 | 3 | 4 | 7 | (number & {});

// Só os campos que o app usa. Senhas da Central, PPPoE, Wi-Fi, MAC e IP nunca saem do proxy.
export type SgpContrato = {
  contratoId: number;
  clienteId: number;
  cpfCnpj: string;
  razaoSocial: string;
  contratoStatus: SgpContratoStatus;
  contratoStatusDisplay: string;
  motivo_status: string;
  planointernet: string;
  cobVencimento: number | null;
  popId: number;
  popNome: string;
  telefones: string[];
  emails: string[];
  contratoValorAberto: number;
  contratoTitulosAReceber: number;
  promessasPagamentoMes: number;
  // Link público (sem login) da declaração de quitação: usar só no servidor, via documento.BaixarQuitacao
  link_quitacao: string | null;
  dataCadastro: string;
};
