import { SgpContrato, SgpContratoStatus } from "@/src/sgp/types";

export type SgpContratoStatusDto = SgpContratoStatus;

// link_quitacao abre a declaração sem login: fica só no servidor (documento.BaixarQuitacao)
export type SgpContratoDto = Omit<SgpContrato, "link_quitacao">;
