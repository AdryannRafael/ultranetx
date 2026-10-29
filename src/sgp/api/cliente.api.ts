import { E } from "~/shared/either";
import type { SgpContrato, SgpHttp } from "../types";
import { Falha } from "./http";

// Contexto: cliente e contratos

const SoDigitos = (v: string) => v.replace(/\D/g, "");

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
    cobVencimento: c.cobVencimento ?? null,
    popId: c.popId,
    popNome: c.popNome ?? "",
    telefones: Array.isArray(c.telefones) ? c.telefones : [],
    emails: Array.isArray(c.emails) ? c.emails : [],
    contratoValorAberto: c.contratoValorAberto ?? 0,
    contratoTitulosAReceber: c.contratoTitulosAReceber ?? 0,
    promessasPagamentoMes: c.promessasPagamentoMes ?? 0,
    link_quitacao: c.link_quitacao || null,
    dataCadastro: c.dataCadastro,
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

  return { Consultar };
}
