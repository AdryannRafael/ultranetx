import type {
  SgpListaFaturasDto,
  SgpListaTitulosDto,
  SgpPixDto,
  SgpSegundaViaDto,
} from "@/src/http/dto/fatura.dto";
import { contratoMiddleware } from "@/src/http/plugins/contrato-middleware";
import { ContratoParam } from "@/src/http/types/contrato";
import { ListarFaturaParam } from "@/src/http/types/listar-fatura";
import { ListarTitulosParam } from "@/src/http/types/listar-titulos";
import { PixFaturaPathParam } from "@/src/http/types/pix-fatura";
import { sgp } from "@/src/sgp/proxy";
import type { SgpFaturaStatus } from "@/src/sgp/types";
import Elysia from "elysia";

const config = {
  name: "fatura",
  prefix: "/faturas",
};

// Todas as rotas recebem ?contrato= e passam pelo macro `contrato`,
// que confere se o contrato é do CPF/CNPJ logado (inclui o `auth`)
export const faturaController = new Elysia(config)
  .use(contratoMiddleware)
  .guard({ contrato: true }, (app) =>
    app
      .get(
        // Faturas do contrato com Pix e linha digitável (status 1/2/3, paginado)
        "/listar",
        async ({ query }): Promise<SgpListaFaturasDto> => {
          const { err, v } = await sgp.fatura.Listar({
            contrato: query.contrato,
            // validado no schema: 1, 2 ou 3
            status: query.status as SgpFaturaStatus | undefined,
            offset: query.offset,
            limit: query.limit,
          });
          if (err) throw err;
          return v;
        },
        { query: ListarFaturaParam },
      )
      .get(
        // Histórico por período de vencimento (ex.: últimos 12 meses)
        "/periodo",
        async ({ query }): Promise<SgpListaTitulosDto> => {
          const { err, v } = await sgp.fatura.ListarPorPeriodo({
            contrato: query.contrato,
            status: query.status,
            vencimentoInicio: query.vencimentoInicio,
            vencimentoFim: query.vencimentoFim,
            ordenar: query.ordenar,
            ordem: query.ordem,
            offset: query.offset,
            limit: query.limit,
          });
          if (err) throw err;
          return v;
        },
        { query: ListarTitulosParam },
      )
      .get(
        // Faturas em aberto/vencidas com multa, juros e links (tela inicial e "pagar agora")
        "/abertas",
        async ({ query }): Promise<SgpSegundaViaDto> => {
          const { err, v } = await sgp.fatura.SegundaVia(query.contrato);
          if (err) throw err;
          return v;
        },
        { query: ContratoParam },
      )
      .get(
        // Pix copia e cola de uma fatura (gera sob demanda quando o SGP permite)
        "/:fatura/pix",
        async ({ query, params }): Promise<SgpPixDto> => {
          const { err, v } = await sgp.fatura.ObterPix(
            params.fatura,
            query.contrato,
          );
          if (err) throw err;
          return { pix: v };
        },
        { query: ContratoParam, params: PixFaturaPathParam },
      ),
  );
