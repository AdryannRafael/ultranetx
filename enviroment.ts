interface Enviroment {
  SGP_URL: string;
  SGP_APP: string;
  SGP_TOKEN: string;
  DATABASE_URL: string;
}

export const env: Enviroment = {
  SGP_URL: getEnvOrThrow("SGP_URL", false) || "",
  SGP_APP: getEnvOrThrow("SGP_APP", false) || "",
  SGP_TOKEN: getEnvOrThrow("SGP_TOKEN", false) || "",
  DATABASE_URL: getEnvOrThrow("DATABASE_URL", false) || "",
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
