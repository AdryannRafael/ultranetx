// Contexto: perfil do usuário logado (sessão do Better Auth + contatos do SGP)
import type { SgpContatoDto } from "./cliente.dto";

export type PerfilContatosDto = {
  telefones: SgpContatoDto[];
  emails: SgpContatoDto[];
};

export type PerfilDto = {
  nome: string;
  // Formatado: "123.456.789-09" ou "61.673.447/0001-16"
  cpfCnpj: string;
  tipoPessoa: "fisica" | "juridica";
  // Contatos cadastrados no SGP (de todos os contratos válidos, sem repetição).
  // null quando o SGP não respondeu: o resto do perfil continua disponível
  contatos: PerfilContatosDto | null;
  // Quantidade de contratos válidos (para mostrar ou não "Trocar contrato")
  totalContratos: number | null;
  // Quando a conta do app foi criada (ISO 8601)
  criadoEm: string;
};
