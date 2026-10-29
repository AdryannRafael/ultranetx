import { SystemException } from "@/src/shared/error";

export function LogSystemError(error: unknown) {
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

export function ToDto(error: Readonly<SystemException>, message?: string): any {
  return {
    code: error.Erro.Code(),
    message: message || error.message,
  };
}

export function Mount500Err(code: string) {
  return `Entre em contato com suporte informando o codigo SE${code}`;
}
