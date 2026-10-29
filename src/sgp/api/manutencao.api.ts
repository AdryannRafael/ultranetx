import { E } from "~/shared/either";
import type { SgpHttp, SgpManutencao } from "../types";

// Contexto: avisos de manutenção

function SanitizarManutencao(m: any): SgpManutencao {
  return {
    id: m.id,
    descricao: m.descricao ?? "",
    data_inicial: m.data_inicial ?? "",
    data_final: m.data_final ?? "",
    mensagem_central: m.mensagem_central ?? "",
    ativa: !!m.ativa,
    severidade: m.severidade ?? "",
    status: m.status ?? "",
    pops: Array.isArray(m.pops)
      ? m.pops.map((p: any) => ({ id: p.id, cidade: p.cidade, uf: p.uf }))
      : [],
  };
}

export function CreateManutencaoApi(http: SgpHttp) {
  /**
   * Manutenções cadastradas no SGP. Com popId, devolve só as ativas daquele POP
   * (o popId vem em cliente.Consultar).
   * Rota: GET /api/ura/manutencao/list/
   */
  async function Listar(popId?: number): E.R<SgpManutencao[]> {
    const r = await http.GetJson<any[]>("/api/ura/manutencao/list/");
    if (r.err) return r;
    const lista = (Array.isArray(r.v) ? r.v : []).map(SanitizarManutencao);
    if (popId === undefined) return E.Ok(lista);
    return E.Ok(
      lista.filter((m) => m.ativa && m.pops.some((p) => p.id === popId)),
    );
  }

  return { Listar };
}
