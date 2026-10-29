import type { auth } from "~/auth/better-auth";
import type { SgpProxy } from "~/sgp/proxy";
import type { SgpClienteResumo, SgpContratoStatus } from "~/sgp/types";
import { CpfCnpjValido, NormalizarCpfCnpj } from "./cpf";

/**
 * Gera um usuário do app para cada CPF/CNPJ com contrato válido no SGP.
 *
 * - usuário: CPF/CNPJ só com dígitos
 * - senha inicial: número do contrato (o de menor número, se houver mais de um)
 * - mustChangePassword = true: no primeiro login o app obriga a trocar a senha
 *
 * Idempotente: quem já tem usuário é ignorado (a senha nunca é sobrescrita), então
 * pode rodar de novo a qualquer momento para pegar clientes novos.
 */

type AuthCtx = Awaited<typeof auth.$context>;

// Contratos que dão direito a usuário: Ativo, Suspenso e Ativo com velocidade reduzida
const STATUS_PERMITIDOS: SgpContratoStatus[] = [1, 4, 7];
const STATUS_TEXTO_PERMITIDOS = new Set([
  "Ativo",
  "Suspenso",
  "Ativo V. Reduzida",
]);

const POR_PAGINA = 100;

export type GerarUsuariosOpcoes = {
  sgp: SgpProxy;
  ctx: Pick<AuthCtx, "adapter" | "internalAdapter" | "password">;
  // Só simula: não grava nada
  dryRun?: boolean;
  // Para testes: processa no máximo N clientes
  limite?: number;
  log?: (msg: string) => void;
};

export type GerarUsuariosResultado = {
  total: number;
  criados: number;
  jaExistiam: number;
  semContratoValido: number;
  documentoInvalido: number;
  erros: number;
};

// Senha inicial: menor número de contrato permitido
function SenhaInicial(cliente: SgpClienteResumo): string | null {
  const ids = cliente.contratos
    .filter((c) => STATUS_TEXTO_PERMITIDOS.has(c.status))
    .map((c) => c.id)
    .filter((id) => Number.isInteger(id))
    .sort((a, b) => a - b);
  return ids.length ? String(ids[0]) : null;
}

export async function GerarUsuarios(
  opcoes: GerarUsuariosOpcoes,
): Promise<GerarUsuariosResultado> {
  const { sgp, ctx, dryRun = false, limite, log = console.log } = opcoes;
  const res: GerarUsuariosResultado = {
    total: 0,
    criados: 0,
    jaExistiam: 0,
    semContratoValido: 0,
    documentoInvalido: 0,
    erros: 0,
  };

  // O mesmo CPF/CNPJ pode aparecer em mais de um cadastro de cliente no SGP
  const vistos = new Set<string>();

  let offset = 0;
  let totalSgp = Infinity;
  while (offset < totalSgp && (limite === undefined || res.total < limite)) {
    const pagina = await sgp.cliente.Listar({
      contratoStatus: STATUS_PERMITIDOS,
      offset,
      limit: POR_PAGINA,
    });
    if (pagina.err) throw pagina.err;

    totalSgp = pagina.v.paginacao.total;
    if (!pagina.v.clientes.length) break;
    offset += pagina.v.clientes.length;

    for (const cliente of pagina.v.clientes) {
      if (limite !== undefined && res.total >= limite) break;
      res.total++;

      const username = NormalizarCpfCnpj(cliente.cpfcnpj);
      if (!CpfCnpjValido(username)) {
        res.documentoInvalido++;
        continue;
      }
      if (vistos.has(username)) {
        res.jaExistiam++;
        continue;
      }
      vistos.add(username);

      const senha = SenhaInicial(cliente);
      console.log("\n Senha, ", senha);
      if (!senha) {
        res.semContratoValido++;
        continue;
      }

      try {
        const existente = await ctx.adapter.findOne({
          model: "user",
          where: [{ field: "username", value: username }],
        });
        if (existente) {
          res.jaExistiam++;
          continue;
        }
        if (dryRun) {
          res.criados++;
          continue;
        }

        const user = await ctx.internalAdapter.createUser(
          {
            name: cliente.nome,
            email: `${username}@clientes.ultranetx.invalid`,
            username,
            mustChangePassword: true,
          },
          { method: "gerar-usuarios" },
        );
        await ctx.internalAdapter.linkAccount({
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: await ctx.password.hash(senha),
        });
        res.criados++;
      } catch (e) {
        res.erros++;
        // Sem CPF no log: só o id do cliente no SGP
        log(`Erro no cliente SGP ${cliente.id}: ${(e as Error).message}`);
      }
    }

    log(
      `${Math.min(offset, totalSgp)}/${totalSgp} clientes lidos · ${res.criados} ${dryRun ? "a criar" : "criados"} · ${res.jaExistiam} já existiam · ${res.erros} erros`,
    );
  }

  return res;
}
