import { E } from "~/shared/either";
import type { SgpHttp, SgpPlano, SgpPlanoTipo } from "../types";

// Contexto: catálogo de planos

const Normalizar = (v: string) => v.trim().toLowerCase();

function SanitizarPlano(p: any): SgpPlano {
  return {
    id: p.id,
    descricao: p.descricao ?? "",
    tipo: p.tipo,
    grupo: p.grupo ?? "",
    preco: Number(p.preco ?? 0),
    download: p.download ?? 0,
    upload: p.upload ?? 0,
    ativo: !!p.ativo,
    pos_pago: !!p.pos_pago,
  };
}

export function CreatePlanoApi(http: SgpHttp) {
  /**
   * Catálogo de planos do provedor, com velocidade de download/upload em kbps.
   * Rota: GET /api/ura/consultaplano/
   */
  async function Listar(tipo?: SgpPlanoTipo): E.R<SgpPlano[]> {
    const r = await http.GetJson<{ planos?: any[] }>("/api/ura/consultaplano/");
    if (r.err) return r;
    const planos = (r.v.planos ?? []).map(SanitizarPlano);
    return E.Ok(tipo ? planos.filter((p) => p.tipo === tipo) : planos);
  }

  /**
   * Plano do contrato pelo nome (planointernet do contrato = descricao do plano).
   * Devolve null quando não acha. Para várias consultas, prefira Listar com cache.
   */
  async function BuscarPorDescricao(descricao: string): E.R<SgpPlano | null> {
    const r = await Listar();
    if (r.err) return r;
    const alvo = Normalizar(descricao);
    return E.Ok(r.v.find((p) => Normalizar(p.descricao) === alvo) ?? null);
  }

  return { Listar, BuscarPorDescricao };
}
