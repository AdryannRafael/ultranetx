import { E } from "~/shared/either";
import type { SgpHttp, SgpLiberacao, SgpPromessa } from "../types";

// Contexto: liberação por confiança (promessa de pagamento)

export function CreatePromessaApi(http: SgpHttp) {
  /**
   * Promessas de pagamento do contrato (ativas e inativas).
   * Rota: POST /api/ura/promessapagamento/list
   */
  async function Listar(contrato: number): E.R<SgpPromessa[]> {
    const r = await http.Post<{ promessas?: any[] }>(
      "/api/ura/promessapagamento/list",
      { contrato_id: contrato },
    );
    if (r.err) return r;
    return E.Ok(
      (r.v.promessas ?? []).map((p) => ({
        id: p.id,
        contratoId: p.contratoId,
        dataCadastro: p.dataCadastro ?? "",
        dataPagamento: p.dataPagamento ?? "",
        acordo: !!p.acordo,
        status: p.status ?? "",
      })),
    );
  }

  /**
   * ESCRITA no SGP: libera o serviço bloqueado/reduzido e registra a promessa.
   * Depende da P-03 e das regras configuradas no SGP. Não testado no demo.
   * Rota: POST /api/ura/liberacaopromessa/
   */
  async function Liberar(contrato: number): E.R<SgpLiberacao> {
    const r = await http.Post<any>("/api/ura/liberacaopromessa/", {
      contrato,
    });
    if (r.err) return r;
    return E.Ok({
      contratoId: r.v.contratoId ?? contrato,
      liberado: r.v.liberado === true,
      liberado_dias: r.v.liberado_dias ?? null,
      protocolo: r.v.protocolo ?? null,
      msg: r.v.msg ?? "",
    });
  }

  return { Listar, Liberar };
}
