import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
// import { presentesController } from "./controller/presentes.routes";

import { SystemException } from "@/src/shared/error";
import cors from "@elysia/cors";
import * as errs from "~/shared/error/exceptions";

function logSystemError(error: unknown) {
  if (error instanceof SystemException) {
    console.error(error.stack);
    console.error(
      `❌ [${error.horario}] [${error.constructor.name}]: ${error.message}`,
    );
    console.error(`   ├─ Code: ${error.Erro.Code()}`);
    if (error.e) {
      console.error(`   └─ Causa Raiz: ${error.e.cause}`);
    }
    return;
  }

  // Fallback para outros erros não mapeados
  console.error(error);
}

export async function StartServer(port: number) {
  const app = new Elysia()
    .use(openapi())
    .use(
      cors({
        origin: [""],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .error(errs)
    .onError({ as: "global" }, (x) => {
      const { code, error, set } = x;

      logSystemError(error);

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
    // .use(presentesController)
    .listen(port, () => {
      console.log(`🦊 Server is Running on port ${port}`);
    });
}

function ToDto(error: Readonly<SystemException>, message?: string): any {
  return {
    code: error.Erro.Code(),
    message: message || error.message,
  };
}

function Mount500Err(code: string) {
  return `Entre em contato com suporte informando o codigo SE${code}`;
}
