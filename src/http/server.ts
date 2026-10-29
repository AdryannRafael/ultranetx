import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
// import { presentesController } from "./controller/presentes.routes";

import { contratoController } from "@/src/http/controller/contrato.controller";
import { documentoController } from "@/src/http/controller/documento.controller";
import { faturaController } from "@/src/http/controller/fatura.controller";
import { notaFiscalController } from "@/src/http/controller/nota-fiscal.controller";
import { usuarioController } from "@/src/http/controller/usuario.controller";
import { betterAuthPlugin, OpenAPI } from "@/src/http/plugins/auth-plugin";
import { LogSystemError, Mount500Err, ToDto } from "@/src/http/utils";
import { SystemException } from "@/src/shared/error";
import * as errs from "~/shared/error/exceptions";

export async function StartServer(port: number) {
  const app = new Elysia()

    .use(betterAuthPlugin)
    .use(
      openapi({
        documentation: {
          components: await OpenAPI.components,
          paths: await OpenAPI.getPaths(),
        },
      }),
    )
    .error(errs)
    .onError({ as: "global" }, (x) => {
      const { code, error, set } = x;

      LogSystemError(error);

      switch (code) {
        case "DomainException": {
          set.status = 423;
          return ToDto(error as SystemException);
        }
        case "NegotiateException": {
          set.status = 409;
          return ToDto(error as SystemException);
        }
        case "DbException": {
          set.status = 500;
          const sysErr = error as SystemException;
          return ToDto(sysErr, Mount500Err(sysErr.Erro.Code()));
        }
        case "IntegrationException": {
          // SGP fora do ar ou respondendo erro: a mensagem interna fica só no log
          set.status = 502;
          const sysErr = error as SystemException;
          return ToDto(sysErr, Mount500Err(sysErr.Erro.Code()));
        }
        case "VALIDATION": {
          if (error instanceof Error) {
            set.status = 400;
            return error.message;
          }
          set.status = 500;
          return "Internal Server Error";
        }
        default: {
          set.status = 500;
          return "Internal Server Error";
        }
      }
    })
    .use(contratoController)
    .use(faturaController)
    .use(documentoController)
    .use(notaFiscalController)
    .use(usuarioController)
    .listen(port, () => {
      console.log(`🦊 Server is Running on port ${port}`);
    });
}
