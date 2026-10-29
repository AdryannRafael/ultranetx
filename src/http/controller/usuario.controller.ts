import { FormatarCpfCnpj, NormalizarCpfCnpj } from "@/src/auth/cpf";
import type { SgpContatoDto } from "@/src/http/dto/cliente.dto";
import type { PerfilDto } from "@/src/http/dto/usuario.dto";
import { authenticatedMiddleware } from "@/src/http/plugins/auth-middleware";
import { ContratoValido } from "@/src/http/plugins/contrato-middleware";
import { LogSystemError } from "@/src/http/utils";
import { sgp } from "@/src/sgp/proxy";
import Elysia from "elysia";

const config = {
  name: "usuario",
  prefix: "/usuario",
};

// O mesmo contato pode estar em mais de um contrato: mantém o primeiro
function Unicos(lista: SgpContatoDto[]): SgpContatoDto[] {
  const vistos = new Set<string>();
  return lista.filter((c) => {
    const chave = c.contato.toLowerCase();
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

// Senha, sessões e saída ficam nas rotas do Better Auth (/auth/change-password,
// /auth/list-sessions, /auth/revoke-other-sessions, /auth/sign-out)
export const usuarioController = new Elysia(config)
  .use(authenticatedMiddleware)
  .guard({ auth: true }, (app) =>
    app.get(
      // Dados da tela de Perfil
      "/perfil",
      async ({ user }): Promise<PerfilDto> => {
        const documento = NormalizarCpfCnpj(user.username ?? "");
        const perfil: PerfilDto = {
          nome: user.name,
          cpfCnpj: FormatarCpfCnpj(documento),
          tipoPessoa: documento.length === 14 ? "juridica" : "fisica",
          contatos: null,
          totalContratos: null,
          criadoEm: new Date(user.createdAt).toISOString(),
        };

        // Contatos vêm do SGP; se ele estiver fora, o perfil sai sem eles (RNF-06)
        const { err, v } = await sgp.cliente.Consultar(documento);
        if (err) {
          LogSystemError(err);
          return perfil;
        }

        const validos = v.filter(ContratoValido);
        return {
          ...perfil,
          // O nome do SGP é a fonte oficial e pode ter mudado depois da geração da conta
          nome: validos[0]?.razaoSocial || perfil.nome,
          contatos: {
            telefones: Unicos(validos.flatMap((c) => c.telefones)),
            emails: Unicos(validos.flatMap((c) => c.emails)),
          },
          totalContratos: validos.length,
        };
      },
    ),
  );
