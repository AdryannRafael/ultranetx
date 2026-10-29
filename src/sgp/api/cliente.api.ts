import { E } from "~/shared/either";
import type {
  SgpClienteResumo,
  SgpContato,
  SgpContrato,
  SgpHttp,
  SgpListaClientes,
  SgpListarClientesParams,
} from "../types";
import { Falha } from "./http";

// Contexto: cliente e contratos

const SoDigitos = (v: string) => v.replace(/\D/g, "");

// O SGP manda null, número ou "None" em campos de texto do endereço
const Texto = (v: unknown) =>
  v === null || v === undefined || v === "None" ? "" : String(v).trim();

// Aceita o formato real ({ tipoContato, contato }) e o da documentação (string)
function SanitizarContatos(lista: unknown, tipoPadrao: string): SgpContato[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((x: any) =>
      typeof x === "string"
        ? { tipo: tipoPadrao, contato: x }
        : { tipo: String(x?.tipoContato ?? tipoPadrao), contato: String(x?.contato ?? "") },
    )
    .map((x) => ({ tipo: x.tipo.trim(), contato: x.contato.trim() }))
    .filter((x) => x.contato);
}

// Copia só os campos permitidos. Senhas da Central, PPPoE, Wi-Fi, MAC e IP ficam para trás.
function SanitizarContrato(c: any): SgpContrato {
  return {
    contratoId: c.contratoId,
    clienteId: c.clienteId,
    cpfCnpj: c.cpfCnpj,
    razaoSocial: c.razaoSocial,
    contratoStatus: c.contratoStatus,
    contratoStatusDisplay: String(c.contratoStatusDisplay ?? "").trim(),
    motivo_status: c.motivo_status ?? "",
    planointernet: c.planointernet ?? "",
    servico_grupo: c.servico_grupo ?? "",
    endereco: {
      logradouro: Texto(c.endereco_logradouro),
      numero: Texto(c.endereco_numero),
      complemento: Texto(c.endereco_complemento),
      bairro: Texto(c.endereco_bairro),
      cidade: Texto(c.endereco_cidade),
      uf: Texto(c.endereco_uf),
      cep: Texto(c.endereco_cep),
    },
    cobVencimento: c.cobVencimento ?? null,
    popId: c.popId,
    popNome: c.popNome ?? "",
    telefones: SanitizarContatos(c.telefones, "Telefone"),
    emails: SanitizarContatos(c.emails, "E-Mail"),
    contratoValorAberto: c.contratoValorAberto ?? 0,
    contratoTitulosAReceber: c.contratoTitulosAReceber ?? 0,
    promessasPagamentoMes: c.promessasPagamentoMes ?? 0,
    link_quitacao: c.link_quitacao || null,
    dataCadastro: c.dataCadastro,
  };
}

function SanitizarClienteResumo(c: any): SgpClienteResumo {
  return {
    id: c.id,
    nome: c.nome ?? "",
    cpfcnpj: c.cpfcnpj ?? "",
    contratos: Array.isArray(c.contratos)
      ? c.contratos.map((k: any) => ({
          id: k.id,
          status: String(k.status ?? "").trim(),
        }))
      : [],
  };
}

export function CreateClienteApi(http: SgpHttp) {
  /**
   * Contratos do CPF/CNPJ, com os contatos usados para enviar o código de verificação.
   * Rota: POST /api/ura/consultacliente/
   */
  async function Consultar(cpfcnpj: string): E.R<SgpContrato[]> {
    const doc = SoDigitos(cpfcnpj);
    if (doc.length !== 11 && doc.length !== 14) {
      return Falha("CPF/CNPJ inválido para consulta no SGP");
    }

    const r = await http.Post<{ contratos?: any[] }>(
      "/api/ura/consultacliente/",
      { cpfcnpj: doc },
    );
    if (r.err) return r;

    // Defesa extra: só aceita contratos do próprio documento consultado
    const contratos = (r.v.contratos ?? [])
      .filter((c) => SoDigitos(String(c.cpfCnpj ?? "")) === doc)
      .map(SanitizarContrato);
    return E.Ok(contratos);
  }

  /**
   * Todos os clientes, paginados (máx. 100 por página), só com id e status dos contratos.
   * Usado pela rotina que gera os usuários do app (src/scripts/gerar-usuarios.ts).
   * Rota: POST /api/ura/clientes/
   */
  async function Listar(
    params: SgpListarClientesParams = {},
  ): E.R<SgpListaClientes> {
    const r = await http.Post<{ paginacao: any; clientes?: any[] }>(
      "/api/ura/clientes/",
      {
        contrato_status: params.contratoStatus?.join(","),
        offset: params.offset,
        limit: params.limit && Math.min(params.limit, 100),
        omitir_titulos: 1,
        omitir_contatos: 1,
      },
    );
    if (r.err) return r;
    return E.Ok({
      paginacao: r.v.paginacao,
      clientes: (r.v.clientes ?? []).map(SanitizarClienteResumo),
    });
  }

  return { Consultar, Listar };
}
