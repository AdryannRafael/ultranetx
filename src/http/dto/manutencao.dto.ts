import { SgpManutencao, SgpManutencaoPop } from "@/src/sgp/types";

export type SgpManutencaoPopDto = SgpManutencaoPop;

export type SgpManutencaoDto = Omit<SgpManutencao, "pops"> & {
  pops: SgpManutencaoPopDto[];
};
