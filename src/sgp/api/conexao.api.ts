import { E } from "~/shared/either";
import type { SgpConexao, SgpHttp } from "../types";

// Contexto: status da conexão de internet

export function CreateConexaoApi(http: SgpHttp) {
  /**
   * Se o serviço do contrato está online (1), offline (2) ou em manutenção (9).
   * Não envia protocolo_ura: com ele o SGP abre uma ocorrência.
   * Rota: POST /api/ura/verificaacesso/
   */
  async function Verificar(contrato: number): E.R<SgpConexao> {
    const r = await http.Post<any>("/api/ura/verificaacesso/", { contrato });
    if (r.err) return r;
    return E.Ok({
      contratoId: r.v.contratoId ?? contrato,
      status: r.v.status ?? 0,
      msg: r.v.msg ?? "",
    });
  }

  return { Verificar };
}
