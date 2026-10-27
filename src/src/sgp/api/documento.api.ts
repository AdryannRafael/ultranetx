import { E } from "~/shared/either";
import type {
  SgpHttp,
  SgpRespostaBinaria,
  SgpTipoDocumento,
} from "../types";
import { Falha } from "./http";

// Contexto: documentos em PDF (contrato e declaração de quitação)

// A quitação é gerada na hora e pode demorar bem mais que as consultas
const TIMEOUT_QUITACAO_MS = 60_000;

// Lê o "detail" de erros JSON (ex.: "Não há titulos pagos para o contrato e ano selecionado.")
function Detalhe({ type, body }: SgpRespostaBinaria): string {
  if (!type.includes("json")) return "";
  try {
    const detail = JSON.parse(body.toString())?.detail;
    return typeof detail === "string" ? `: ${detail}` : "";
  } catch {
    return "";
  }
}

// O SGP devolve página de erro em HTML com status 200 quando não consegue gerar o PDF
function ValidarPdf(res: SgpRespostaBinaria, descricao: string): E.R<Buffer> {
  const { status, type, body } = res;
  const ehPdf = body.subarray(0, 4).toString() === "%PDF";
  if (status !== 200 || !ehPdf) {
    return Falha(
      `SGP não gerou o PDF ${descricao} (status ${status}, ${type || "sem content-type"})${Detalhe(res)}`,
    );
  }
  return E.Ok(body);
}

export function CreateDocumentoApi(http: SgpHttp) {
  /**
   * PDF de um documento do contrato (contrato, termo de adesão, comodato...).
   * Rota: GET /api/contratos/print/{tipo}
   */
  async function Imprimir(
    contrato: number,
    tipo: SgpTipoDocumento = "contrato",
  ): E.R<Buffer> {
    const r = await http.GetComCorpo(`/api/contratos/print/${tipo}`, {
      contrato,
    });
    if (r.err) return r;
    return ValidarPdf(r.v, `"${tipo}" do contrato ${contrato}`);
  }

  /**
   * Declaração anual de quitação em PDF, pelo link_quitacao que vem em cliente.Consultar.
   * O link termina no ano (…/2026); troca o ano quando informado.
   * Rota: GET /api/declaracao/quitacao/{…}/{ano}
   */
  async function BaixarQuitacao(linkQuitacao: string, ano?: number): E.R<Buffer> {
    const link = ano
      ? linkQuitacao.replace(/\/\d{4}\/?$/, `/${ano}`)
      : linkQuitacao;
    const r = await http.BaixarLink(link, TIMEOUT_QUITACAO_MS);
    if (r.err) return r;
    return ValidarPdf(r.v, `da declaração de quitação${ano ? ` de ${ano}` : ""}`);
  }

  return { Imprimir, BaixarQuitacao };
}
