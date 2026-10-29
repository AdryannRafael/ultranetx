import { ToContratoDto, type SgpContratoDto } from "@/src/http/dto/cliente.dto";
import { authenticatedMiddleware } from "@/src/http/plugins/auth-middleware";
import { ContratoValido } from "@/src/http/plugins/contrato-middleware";
import { sgp } from "@/src/sgp/proxy";
import Elysia from "elysia";

const config = {
  name: "contrato",
  prefix: "/contratos",
};
export const contratoController = new Elysia(config)
  .use(authenticatedMiddleware)
  .guard({ auth: true }, (app) =>
    app.get(
      // Contratos do CPF/CNPJ logado que o app pode usar (Ativo, Suspenso, Ativo V. Reduzida).
      // O app escolhe um e manda o número (contratoId) em ?contrato= nas outras rotas.
      "/ativos",
      async ({ user }): Promise<SgpContratoDto[]> => {
        const { err, v } = await sgp.cliente.Consultar(user.username ?? "");
        if (err) throw err;
        return v.filter(ContratoValido).map(ToContratoDto);
      },
    ),
  );
