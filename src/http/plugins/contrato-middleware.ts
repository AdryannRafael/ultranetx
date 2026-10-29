import { Elysia } from "elysia";
import { authenticatedMiddleware } from "@/src/http/plugins/auth-middleware";
import { sgp } from "@/src/sgp/proxy";
import type { SgpContrato, SgpContratoStatus } from "@/src/sgp/types";

// Contratos que o app pode usar: Ativo, Suspenso (precisa ver e pagar a fatura)
// e Ativo com velocidade reduzida
export const STATUS_CONTRATO_VALIDOS: SgpContratoStatus[] = [1, 4, 7];

export const ContratoValido = (c: SgpContrato) =>
  STATUS_CONTRATO_VALIDOS.includes(c.contratoStatus);

/**
 * Macro `contrato`: para rotas que recebem ?contrato= do app.
 * Inclui o `auth` e confere no SGP se o contrato é do CPF/CNPJ logado e está válido.
 * Sem isso, qualquer usuário logado veria os dados de outro trocando o número.
 * Disponibiliza `contratoSgp` (o contrato já conferido) para o handler.
 */
export const contratoMiddleware = new Elysia({ name: "contrato" })
  .use(authenticatedMiddleware)
  .macro({
    contrato: {
      auth: true,
      async resolve(ctx) {
        // O `auth: true` acima já resolveu a sessão; o Elysia não propaga esse tipo
        // para dentro de outro macro, então ele é declarado aqui
        const { query, status, user } = ctx as typeof ctx & {
          user: { username?: string | null };
        };
        const numero = Number((query as { contrato?: unknown }).contrato);

        const { err, v } = await sgp.cliente.Consultar(user.username ?? "");
        if (err) throw err;

        const contratoSgp = v.find(
          (c) => c.contratoId === numero && ContratoValido(c),
        );
        // 404 também para contrato de outra pessoa: não revela que ele existe
        if (!contratoSgp) {
          return status(404, {
            message: "Contrato não encontrado",
            code: "CONTRATO_NAO_ENCONTRADO",
          });
        }

        return { contratoSgp };
      },
    },
  });
