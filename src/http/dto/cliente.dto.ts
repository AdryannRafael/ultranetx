import {
  SgpContato,
  SgpContrato,
  SgpContratoStatus,
  SgpEndereco,
} from "@/src/sgp/types";

export type SgpContratoStatusDto = SgpContratoStatus;
export type SgpContatoDto = SgpContato;
export type SgpEnderecoDto = SgpEndereco;

// link_quitacao abre a declaração sem login: fica só no servidor (documento.BaixarQuitacao)
export type SgpContratoDto = Omit<
  SgpContrato,
  "link_quitacao" | "telefones" | "emails" | "endereco"
> & {
  telefones: SgpContatoDto[];
  emails: SgpContatoDto[];
  endereco: SgpEnderecoDto;
};

// Tira do contrato o que não pode ir para o app
export function ToContratoDto({
  link_quitacao: _,
  ...contrato
}: SgpContrato): SgpContratoDto {
  return contrato;
}
