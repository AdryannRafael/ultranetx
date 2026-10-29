// Transporte HTTP compartilhado pelas APIs de cada contexto (src/sgp/api)
import type { E } from "~/shared/either";

// Campos enviados no corpo das requisições (undefined é ignorado)
export type SgpCampos = Record<string, string | number | boolean | undefined>;

// Resposta sem parse, para rotas que devolvem arquivo (ex.: PDF)
export type SgpRespostaBinaria = {
  status: number;
  type: string;
  body: Buffer;
};

// Cliente HTTP já autenticado com Token/App
export type SgpHttp = {
  Post<T>(path: string, campos?: SgpCampos): E.R<T>;
  // GET com os parâmetros no corpo (o SGP lê do corpo mesmo em GET)
  GetComCorpo(path: string, campos?: SgpCampos): E.R<SgpRespostaBinaria>;
  GetJson<T>(path: string, campos?: SgpCampos): E.R<T>;
  // Baixa um link absoluto devolvido pelo próprio SGP (só aceita o host configurado).
  // Links como o de quitação dão acesso sem login: não devem ir para log nem para o app.
  BaixarLink(url: string, timeoutMs?: number): E.R<SgpRespostaBinaria>;
};
