import { contratoMiddleware } from "@/src/http/plugins/contrato-middleware";
import { ContratoParam } from "@/src/http/types/contrato";
import {
  DocumentoPathParam,
  QuitacaoPathParam,
} from "@/src/http/types/documento";
import { LogSystemError } from "@/src/http/utils";
import { sgp } from "@/src/sgp/proxy";
import Elysia from "elysia";

const config = {
  name: "documento",
  prefix: "/documentos",
};

function Pdf(body: Buffer, nome: string) {
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nome}.pdf"`,
      // Documento com dados pessoais: não guardar em cache intermediário
      "cache-control": "private, no-store",
    },
  });
}

// O SGP responde erro tanto quando o documento não existe (modelo não configurado,
// ano sem pagamentos) quanto quando está fora do ar. O motivo fica no log.
const INDISPONIVEL = {
  message: "Documento indisponível no momento",
  code: "DOCUMENTO_INDISPONIVEL",
};

export const documentoController = new Elysia(config)
  .use(contratoMiddleware)
  .guard({ contrato: true, query: ContratoParam }, (app) =>
    app
      .get(
        // Declaração anual de quitação em PDF (link do contrato, só no servidor)
        "/quitacao/:ano",
        async ({ contratoSgp, params, status }) => {
          if (!contratoSgp.link_quitacao) return status(404, INDISPONIVEL);

          const { err, v } = await sgp.documento.BaixarQuitacao(
            contratoSgp.link_quitacao,
            params.ano,
          );
          if (err) {
            LogSystemError(err);
            return status(404, INDISPONIVEL);
          }
          return Pdf(v, `quitacao-${params.ano}-${contratoSgp.contratoId}`);
        },
        { params: QuitacaoPathParam },
      )
      .get(
        // PDF do contrato, termo de adesão, comodato etc.
        "/:tipo",
        async ({ query, params, status }) => {
          const { err, v } = await sgp.documento.Imprimir(
            query.contrato,
            params.tipo,
          );
          if (err) {
            LogSystemError(err);
            return status(404, INDISPONIVEL);
          }
          return Pdf(v, `${params.tipo}-${query.contrato}`);
        },
        { params: DocumentoPathParam },
      ),
  );
