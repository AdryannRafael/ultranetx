import { E } from "~/shared/either";
import type {
  SgpHttp,
  SgpListaFaturas,
  SgpListaTitulos,
  SgpListarFaturasParams,
  SgpListarTitulosParams,
  SgpPixResposta,
  SgpSegundaVia,
  SgpSegundaViaItem,
  SgpTitulo,
} from "../types";

// Contexto: faturas e Pix

function SanitizarTitulo(t: any): SgpTitulo {
  return {
    id: t.id,
    numeroDocumento: t.numeroDocumento,
    status: t.status,
    valor: t.valor,
    valorDesconto: t.valorDesconto ?? 0,
    valorCorrigido: t.valorCorrigido,
    valorPago: t.valorPago ?? 0,
    dataEmissao: t.dataEmissao ?? "",
    dataVencimento: t.dataVencimento ?? "",
    dataPagamento: t.dataPagamento ?? "",
    dataCancelamento: t.dataCancelamento ?? "",
    link: t.link ?? "",
    link_cobranca: t.link_cobranca ?? "",
    linhaDigitavel: t.linhaDigitavel ?? "",
    codigoBarras: t.codigoBarras ?? "",
    codigoPix: t.codigoPix ?? "",
    demonstrativo: t.demonstrativo ?? "",
  };
}

function SanitizarSegundaVia(i: any): SgpSegundaViaItem {
  return {
    id: i.id,
    fatura: i.fatura,
    valor: i.valor,
    valor_original: i.valor_original,
    multa: i.multa ?? 0,
    juros: i.juros ?? 0,
    desconto_vencimento: i.desconto_vencimento ?? 0,
    vencimento: i.vencimento,
    vencimento_original: i.vencimento_original,
    link: i.link ?? "",
    link_cobranca: i.link_cobranca ?? "",
    link_pix_html: i.link_pix_html ?? "",
    linhadigitavel: i.linhadigitavel ?? "",
    codigopix: i.codigopix ?? "",
  };
}

export function CreateFaturaApi(http: SgpHttp) {
  /**
   * Faturas do contrato, com Pix e linha digitável. Sem status, vêm todas menos as canceladas.
   * Rota: POST /api/central/titulos/
   */
  async function Listar(params: SgpListarFaturasParams): E.R<SgpListaFaturas> {
    const r = await http.Post<SgpListaFaturas>("/api/central/titulos/", {
      contrato: params.contrato,
      status: params.status,
      offset: params.offset,
      limit: params.limit && Math.min(params.limit, 250),
    });
    if (r.err) return r;
    return E.Ok({ paginacao: r.v.paginacao, faturas: r.v.faturas ?? [] });
  }

  /**
   * Histórico com filtro de período e ordenação (ex.: últimos 12 meses do RF-02).
   * Rota: POST /api/ura/titulos/
   */
  async function ListarPorPeriodo(
    params: SgpListarTitulosParams,
  ): E.R<SgpListaTitulos> {
    // O SGP ignora o período se vier só uma das datas (devolve 0 títulos)
    const temPeriodo = params.vencimentoInicio || params.vencimentoFim;
    const r = await http.Post<{ paginacao: any; titulos?: any[] }>(
      "/api/ura/titulos/",
      {
        contrato: params.contrato,
        status: params.status,
        data_vencimento_inicio: temPeriodo
          ? (params.vencimentoInicio ?? "1900-01-01")
          : undefined,
        data_vencimento_fim: temPeriodo
          ? (params.vencimentoFim ?? "2999-12-31")
          : undefined,
        ordenar: params.ordenar ?? "data_vencimento",
        ordenar_ordem: params.ordem ?? "desc",
        offset: params.offset,
        limit: params.limit && Math.min(params.limit, 250),
      },
    );
    if (r.err) return r;
    return E.Ok({
      paginacao: r.v.paginacao,
      titulos: (r.v.titulos ?? []).map(SanitizarTitulo),
    });
  }

  /**
   * Faturas em aberto ou vencidas com multa, juros, linha digitável e links de pagamento.
   * Sempre envia nao_gerar_os=1: sem isso, cada consulta abre uma ocorrência no SGP.
   * Rota: POST /api/ura/fatura2via/
   */
  async function SegundaVia(contrato: number): E.R<SgpSegundaVia> {
    const r = await http.Post<any>("/api/ura/fatura2via/", {
      contrato,
      nao_gerar_os: 1,
      tipo_ordenacao: "data_vencimento",
      modo_ordenacao: "asc",
    });
    if (r.err) return r;
    return E.Ok({
      status: r.v.status ?? 0,
      msg: r.v.msg ?? "",
      contratoId: r.v.contratoId ?? contrato,
      links: (r.v.links ?? []).map(SanitizarSegundaVia),
    });
  }

  /**
   * Pix copia e cola da fatura (gera sob demanda se o SGP permitir).
   * Devolve null quando o SGP não tem Pix para o título.
   * Rota: POST /api/ura/pagamento/pix/{fatura}
   */
  async function ObterPix(fatura: number, contrato: number): E.R<string | null> {
    const r = await http.Post<SgpPixResposta>(
      `/api/ura/pagamento/pix/${fatura}`,
      { contrato },
    );
    if (r.err) return r;
    return E.Ok(r.v.status === 1 && r.v.pix ? r.v.pix : null);
  }

  return { Listar, ListarPorPeriodo, SegundaVia, ObterPix };
}
