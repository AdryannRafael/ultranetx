import { SgpLiberacao, SgpPromessa } from "@/src/sgp/types";

export type SgpPromessaDto = SgpPromessa;

// msg fica no servidor: o SGP escreve nela o login PPPoE do serviço
export type SgpLiberacaoDto = Omit<SgpLiberacao, "msg">;

export function ToLiberacaoDto({ msg: _, ...liberacao }: SgpLiberacao): SgpLiberacaoDto {
  return liberacao;
}
