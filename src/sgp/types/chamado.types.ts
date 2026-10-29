// Contexto: chamados de suporte (ocorrência + ordem de serviço)

// ---------- POST /api/central/tipoocorrencia/list/ ----------

export type SgpTipoOcorrencia = {
  codigo: number;
  descricao: string;
};

// ---------- POST /api/central/chamado/list/ ----------

// Os serviços vinculados (login/senha PPPoE, IP do NAS) e a localização são descartados
export type SgpChamado = {
  oc_id: number;
  oc_protocolo: string;
  oc_tipo_id: number;
  oc_tipo_descricao: string;
  oc_data_cadastro: string;
  oc_data_encerramento: string;
  oc_conteudo: string;
  oc_status: number;
  oc_status_descricao: string;
  oc_origem_descricao: string;
  os_id: number | null;
  os_data_agendamento: string | null;
  os_motivo_descricao: string | null;
  os_status: number | null;
  os_status_descricao: string | null;
  contrato_id: number;
};

// Datas no formato AAAA-MM-DD
export type SgpListarChamadosParams = {
  contrato: number;
  cadastroInicio?: string;
  cadastroFim?: string;
};

// ---------- POST /api/central/chamado/ ----------

export type SgpCriarChamadoParams = {
  contrato: number;
  conteudo: string;
  ocorrenciatipo?: number;
  contato?: string;
  contato_numero?: string;
  // true = registra só a ocorrência, sem gerar ordem de serviço
  sem_os?: boolean;
};

export type SgpChamadoCriado = {
  oc_protocolo: string | null;
  os_id: number | null;
  os_protocolo: string | null;
};
