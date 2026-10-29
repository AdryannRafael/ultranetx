// Contexto: cliente e contratos
import type { SgpPaginacao } from "./comum.types";

// 1 = Ativo; 2 = Inativo; 3 = Cancelado; 4 = Suspenso; 7 = Ativo com velocidade reduzida
export type SgpContratoStatus = 1 | 2 | 3 | 4 | 7 | (number & {});

// ---------- POST /api/ura/consultacliente/ ----------

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

// ---------- POST /api/ura/clientes/ (listagem paginada de todos os clientes) ----------

// Aqui o status do contrato vem como texto, não como número
export type SgpContratoStatusTexto =
  | "Ativo"
  | "Inativo"
  | "Cancelado"
  | "Suspenso"
  | "Ativo V. Reduzida"
  | (string & {});

// Senhas da Central, serviços (PPPoE, Wi-Fi, ONU) e endereço ficam no proxy
export type SgpClienteContratoResumo = {
  id: number;
  status: SgpContratoStatusTexto;
};

export type SgpClienteResumo = {
  id: number;
  nome: string;
  cpfcnpj: string;
  contratos: SgpClienteContratoResumo[];
};

export type SgpListaClientes = {
  paginacao: SgpPaginacao;
  clientes: SgpClienteResumo[];
};

export type SgpListarClientesParams = {
  // Só clientes com algum contrato nesses status (ex.: [1, 4, 7])
  contratoStatus?: SgpContratoStatus[];
  offset?: number;
  // Máximo 100 por página
  limit?: number;
};
