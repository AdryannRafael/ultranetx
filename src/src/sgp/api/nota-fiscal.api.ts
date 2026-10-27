import { E } from "~/shared/either";
import type { SgpHttp, SgpNotaFiscal } from "../types";

// Contexto: notas fiscais

function SanitizarNota(n: any): SgpNotaFiscal {
  return {
    numero: n.numero,
    serie: n.serie ?? "",
    modelo: n.modelo ?? "",
    status: n.status,
    valortotal: n.valortotal ?? 0,
    data_emissao: n.data_emissao ?? "",
    link: n.link ?? "",
  };
}

export function CreateNotaFiscalApi(http: SgpHttp) {
  /**
   * Notas fiscais (modelos 21/22) do contrato, com link público do documento.
   * Rota: POST /api/central/notafiscal/list/
   */
  async function Listar(contrato: number): E.R<SgpNotaFiscal[]> {
    const r = await http.Post<any[]>("/api/central/notafiscal/list/", {
      contrato,
    });
    if (r.err) return r;
    return E.Ok((Array.isArray(r.v) ? r.v : []).map(SanitizarNota));
  }

  return { Listar };
}
