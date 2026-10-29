import {
  SgpFatura,
  SgpFaturaStatus,
  SgpListaFaturas,
  SgpListaTitulos,
  SgpSegundaVia,
  SgpSegundaViaItem,
  SgpTitulo,
  SgpTituloStatus,
} from "@/src/sgp/types";
import { SgpPaginacaoDto } from "./comum.dto";

export type SgpFaturaStatusDto = SgpFaturaStatus;
export type SgpFaturaDto = SgpFatura;

// As listas apontam para os Dto dos itens: um campo novo no item já aparece na lista
export type SgpListaFaturasDto = Omit<
  SgpListaFaturas,
  "paginacao" | "faturas"
> & {
  paginacao: SgpPaginacaoDto;
  faturas: SgpFaturaDto[];
};

export type SgpTituloStatusDto = SgpTituloStatus;
export type SgpTituloDto = SgpTitulo;

export type SgpListaTitulosDto = Omit<
  SgpListaTitulos,
  "paginacao" | "titulos"
> & {
  paginacao: SgpPaginacaoDto;
  titulos: SgpTituloDto[];
};

export type SgpSegundaViaItemDto = SgpSegundaViaItem;

export type SgpSegundaViaDto = Omit<SgpSegundaVia, "links"> & {
  links: SgpSegundaViaItemDto[];
};
