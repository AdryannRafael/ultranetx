interface Enviroment {
  SGP_URL: string;
  SGP_APP: string;
  SGP_TOKEN: string;
  DATABASE_URL: string;
  // Desbloqueio em confiança pelo app (grava promessa de pagamento no SGP).
  // Desligado até a Ultra Net X aprovar (P-03): só liga com "true"
  LIBERACAO_CONFIANCA_HABILITADA: boolean;
}

export const env: Enviroment = {
  SGP_URL: getEnvOrThrow("SGP_URL", false) || "",
  SGP_APP: getEnvOrThrow("SGP_APP", false) || "",
  SGP_TOKEN: getEnvOrThrow("SGP_TOKEN", false) || "",
  DATABASE_URL: getEnvOrThrow("DATABASE_URL", false) || "",
  LIBERACAO_CONFIANCA_HABILITADA:
    getEnvOrThrow("LIBERACAO_CONFIANCA_HABILITADA", false) === "true",
};

function getEnvOrThrow<T = string>(
  key: keyof Enviroment,
  throwable: boolean = true,
): T {
  const value = Bun.env[key];
  if (throwable && (value == undefined || value === null || value === "")) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value as unknown as T;
}
