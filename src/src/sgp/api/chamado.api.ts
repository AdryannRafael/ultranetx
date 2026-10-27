import { E } from "~/shared/either";
import type {
  SgpChamado,
  SgpChamadoCriado,
  SgpCriarChamadoParams,
  SgpHttp,
  SgpListarChamadosParams,
  SgpTipoOcorrencia,
} from "../types";
import { Falha } from "./http";

// Contexto: chamados de suporte (ocorrência + ordem de serviço)

// Descarta servicos[] (login/senha PPPoE, IP do NAS) e a localização do endereço
function SanitizarChamado(c: any): SgpChamado {
  return {
    oc_id: c.oc_id,
    oc_protocolo: c.oc_protocolo ?? "",
    oc_tipo_id: c.oc_tipo_id,
    oc_tipo_descricao: c.oc_tipo_descricao ?? "",
    oc_data_cadastro: c.oc_data_cadastro ?? "",
    oc_data_encerramento: c.oc_data_encerramento ?? "",
    oc_conteudo: c.oc_conteudo ?? "",
    oc_status: c.oc_status,
    oc_status_descricao: c.oc_status_descricao ?? "",
    oc_origem_descricao: c.oc_origem_descricao ?? "",
    os_id: c.os_id ?? null,
    os_data_agendamento: c.os_data_agendamento ?? null,
    os_motivo_descricao: c.os_motivo_descricao ?? null,
    os_status: c.os_status ?? null,
    os_status_descricao: c.os_status_descricao ?? null,
    contrato_id: c.contrato_id,
  };
}

export function CreateChamadoApi(http: SgpHttp) {
  /**
   * Tipos de ocorrência ativos, para o cliente escolher ao abrir o chamado.
   * Rota: POST /api/central/tipoocorrencia/list/
   */
  async function ListarTipos(): E.R<SgpTipoOcorrencia[]> {
    const r = await http.Post<any[]>("/api/central/tipoocorrencia/list/");
    if (r.err) return r;
    return E.Ok(
      (Array.isArray(r.v) ? r.v : []).map((t) => ({
        codigo: t.codigo,
        descricao: t.descricao,
      })),
    );
  }

  /**
   * Chamados do contrato, com protocolo, situação e agendamento da visita.
   * Rota: POST /api/central/chamado/list/
   */
  async function Listar(params: SgpListarChamadosParams): E.R<SgpChamado[]> {
    const r = await http.Post<any[]>("/api/central/chamado/list/", {
      contrato: params.contrato,
      data_cadastro_inicio: params.cadastroInicio,
      data_cadastro_fim: params.cadastroFim,
    });
    if (r.err) return r;
    return E.Ok((Array.isArray(r.v) ? r.v : []).map(SanitizarChamado));
  }

  /**
   * ESCRITA no SGP: abre uma ocorrência e, por padrão, uma ordem de serviço.
   * Depende da P-02. Não testado no demo.
   * Rota: POST /api/central/chamado/
   */
  async function Criar(params: SgpCriarChamadoParams): E.R<SgpChamadoCriado> {
    if (!params.conteudo.trim()) {
      return Falha("Conteúdo do chamado vazio");
    }
    const r = await http.Post<any>("/api/central/chamado/", {
      contrato: params.contrato,
      conteudo: params.conteudo,
      ocorrenciatipo: params.ocorrenciatipo,
      contato: params.contato,
      contato_numero: params.contato_numero,
      sem_os: params.sem_os ? 1 : undefined,
    });
    if (r.err) return r;

    // A resposta é uma lista com a OS criada (e os dados do serviço, descartados aqui)
    const criado = Array.isArray(r.v) ? r.v[0] : r.v;
    return E.Ok({
      oc_protocolo: criado?.oc_protocolo ?? null,
      os_id: criado?.os_id ?? null,
      os_protocolo: criado?.os_protocolo ?? null,
    });
  }

  return { ListarTipos, Listar, Criar };
}
