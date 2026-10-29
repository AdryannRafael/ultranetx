import { SgpContrato, SgpContratoStatus } from "@/src/sgp/types";

export type SgpContratoStatusDto = SgpContratoStatus;

// link_quitacao abre a declaração sem login: fica só no servidor (documento.BaixarQuitacao)
export type SgpContratoDto = Omit<SgpContrato, "link_quitacao">;

// Tira do contrato o que não pode ir para o app
export function ToContratoDto({
  link_quitacao: _,
  ...contrato
}: SgpContrato): SgpContratoDto {
  return contrato;
}
