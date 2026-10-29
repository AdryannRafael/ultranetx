import type { SgpNotaFiscalDto } from "@/src/http/dto/nota-fiscal.dto";
import { contratoMiddleware } from "@/src/http/plugins/contrato-middleware";
import { ContratoParam } from "@/src/http/types/contrato";
import { sgp } from "@/src/sgp/proxy";
import Elysia from "elysia";

const config = {
  name: "nota-fiscal",
  prefix: "/notas-fiscais",
};

export const notaFiscalController = new Elysia(config)
  .use(contratoMiddleware)
  .guard({ contrato: true, query: ContratoParam }, (app) =>
    app.get(
      // Notas fiscais do contrato, com link público do PDF de cada nota
      "/listar",
      async ({ query }): Promise<SgpNotaFiscalDto[]> => {
        const { err, v } = await sgp.notaFiscal.Listar(query.contrato);
        if (err) throw err;
        return v;
      },
    ),
  );
