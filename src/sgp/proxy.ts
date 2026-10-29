import { env } from "@/enviroment";
import {
  CreateChamadoApi,
  CreateClienteApi,
  CreateConexaoApi,
  CreateDocumentoApi,
  CreateFaturaApi,
  CreateManutencaoApi,
  CreateNotaFiscalApi,
  CreatePlanoApi,
  CreatePromessaApi,
  CreateSgpHttp,
} from "./api";
import type { SgpConfig } from "./types";

/**
 * Proxy para a API do SGP (TSMX). Único ponto do sistema que conhece rotas e campos do SGP.
 * Autentica sempre com Token/App. Detalhes dos endpoints em docs/sgp-integraction.md.
 *
 * Organização:
 * - ./api: transporte HTTP (http.ts) e uma API por contexto (<contexto>.api.ts)
 * - ./types: tipos, um arquivo por contexto
 *
 * Uso: sgp.cliente.Consultar(cpf), sgp.fatura.Listar({ contrato }), sgp.documento.Imprimir(contrato)
 */
export function CreateSgpProxy(config: SgpConfig) {
  const http = CreateSgpHttp(config);
  return {
    cliente: CreateClienteApi(http),
    fatura: CreateFaturaApi(http),
    documento: CreateDocumentoApi(http),
    notaFiscal: CreateNotaFiscalApi(http),
    plano: CreatePlanoApi(http),
    conexao: CreateConexaoApi(http),
    manutencao: CreateManutencaoApi(http),
    promessa: CreatePromessaApi(http),
    chamado: CreateChamadoApi(http),
  };
}

export type SgpProxy = ReturnType<typeof CreateSgpProxy>;

export const sgp = CreateSgpProxy({
  url: env.SGP_URL,
  app: env.SGP_APP,
  token: env.SGP_TOKEN,
});
