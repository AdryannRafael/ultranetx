// Contexto: cliente e contratos
import type { SgpPaginacao } from "./comum.types";

// 1 = Ativo; 2 = Inativo; 3 = Cancelado; 4 = Suspenso; 7 = Ativo com velocidade reduzida
export type SgpContratoStatus = 1 | 2 | 3 | 4 | 7 | (number & {});

// ---------- POST /api/ura/consultacliente/ ----------

// Endereço de instalação do contrato (campos endereco_* do SGP)
export type SgpEndereco = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

// Telefone ou e-mail do cadastro. O SGP manda { tipoContato, contato, inscricoes }
// (a documentação mostra string; o proxy aceita os dois formatos)
export type SgpContato = {
  // Ex.: "Celular Pessoal", "WhatsApp Número", "Telefone Residencial", "E-Mail"
  tipo: string;
  contato: string;
};

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
  // Tecnologia da conexão (ex.: "fibra", "radio")
  servico_grupo: string;
  endereco: SgpEndereco;
  cobVencimento: number | null;
  popId: number;
  popNome: string;
  telefones: SgpContato[];
  emails: SgpContato[];
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
