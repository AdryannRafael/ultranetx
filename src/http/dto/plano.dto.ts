import { SgpPlano, SgpPlanoTipo } from "@/src/sgp/types";
import type { SgpContratoStatusDto, SgpEnderecoDto } from "./cliente.dto";

export type SgpPlanoTipoDto = SgpPlanoTipo;
export type SgpPlanoDto = SgpPlano;

// ---------- GET /contratos/meu-plano (tela "Meu plano") ----------

export type MeuPlanoInfoDto = {
  // Nome do plano no contrato (planointernet)
  nome: string;
  // Tecnologia da conexão: "fibra", "radio"…
  tecnologia: string;
  // Do catálogo do SGP; null quando o nome do plano não bate com o catálogo
  downloadKbps: number | null;
  uploadKbps: number | null;
  // Preço do plano no catálogo (pode não refletir descontos do contrato)
  valorMensal: number | null;
  // Dia do vencimento da fatura
  vencimentoDia: number | null;
};

export type MeuPlanoFaturaVencidaDto = {
  // id do título: usar em /faturas/:fatura/pix
  id: number;
  // Valor já com multa e juros
  valor: number;
  // Vencimento original (AAAA-MM-DD)
  vencimento: string;
  diasEmAtraso: number;
};

export type MeuPlanoDto = {
  contratoId: number;
  contratoStatus: SgpContratoStatusDto;
  contratoStatusDisplay: string;
  motivo_status: string;
  endereco: SgpEnderecoDto;
  plano: MeuPlanoInfoDto;
  // Fatura vencida mais antiga. Só vem preenchida com o contrato suspenso
  // ou com velocidade reduzida; null nos outros casos ou se o SGP não respondeu
  faturaVencida: MeuPlanoFaturaVencidaDto | null;
  // Se o botão "Desbloqueio em confiança" deve aparecer
  liberacaoConfiancaDisponivel: boolean;
};
