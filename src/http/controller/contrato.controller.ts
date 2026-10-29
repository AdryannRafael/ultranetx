import { ToContratoDto, type SgpContratoDto } from "@/src/http/dto/cliente.dto";
import type { SgpConexaoDto } from "@/src/http/dto/conexao.dto";
import type { SgpManutencaoDto } from "@/src/http/dto/manutencao.dto";
import type { SgpSegundaViaDto } from "@/src/http/dto/fatura.dto";
import type {
  MeuPlanoDto,
  MeuPlanoFaturaVencidaDto,
  SgpPlanoDto,
} from "@/src/http/dto/plano.dto";
import {
  ToLiberacaoDto,
  type SgpLiberacaoDto,
  type SgpPromessaDto,
} from "@/src/http/dto/promessa.dto";
import { LogSystemError } from "@/src/http/utils";
import type { SgpContrato } from "@/src/sgp/types";
import { env } from "@/enviroment";
import { authenticatedMiddleware } from "@/src/http/plugins/auth-middleware";
import {
  ContratoValido,
  contratoMiddleware,
} from "@/src/http/plugins/contrato-middleware";
import { ContratoParam } from "@/src/http/types/contrato";
import { sgp } from "@/src/sgp/proxy";
import Elysia from "elysia";

const config = {
  name: "contrato",
  prefix: "/contratos",
};
export const contratoController = new Elysia(config)
  .use(authenticatedMiddleware)
  .use(contratoMiddleware)
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
  )
  // Rotas de um contrato: recebem ?contrato= e passam pelo macro `contrato`
  .guard({ contrato: true, query: ContratoParam }, (app) =>
    app
      .get(
        // Plano do contrato com velocidade (kbps). null quando o nome do plano
        // do contrato não bate com nenhum plano do catálogo do SGP
        "/plano",
        async ({ contratoSgp }): Promise<SgpPlanoDto | null> => {
          const { err, v } = await sgp.plano.BuscarPorDescricao(
            contratoSgp.planointernet,
          );
          if (err) throw err;
          return v;
        },
      )
      .get(
        // Status da internet: 1 online, 2 offline, 9 em manutenção, 0 não verificado
        "/conexao",
        async ({ query }): Promise<SgpConexaoDto> => {
          const { err, v } = await sgp.conexao.Verificar(query.contrato);
          if (err) throw err;
          return v;
        },
      )
      .get(
        // Manutenções ativas no POP do contrato (banner da tela inicial)
        "/avisos",
        async ({ contratoSgp }): Promise<SgpManutencaoDto[]> => {
          const { err, v } = await sgp.manutencao.Listar(contratoSgp.popId);
          if (err) throw err;
          return v;
        },
      )
      .get(
        // Tudo da tela "Meu plano" numa chamada: contrato, plano (catálogo do SGP)
        // e, se o contrato estiver bloqueado, a fatura vencida que causou o bloqueio.
        // Se o catálogo ou as faturas falharem, a tela sai sem esses dados (RNF-06)
        "/meu-plano",
        async ({ contratoSgp }): Promise<MeuPlanoDto> => {
          const bloqueado = ContratoBloqueado(contratoSgp);
          const [plano, abertas] = await Promise.all([
            sgp.plano.BuscarPorDescricao(contratoSgp.planointernet),
            bloqueado ? sgp.fatura.SegundaVia(contratoSgp.contratoId) : null,
          ]);
          if (plano.err) LogSystemError(plano.err);
          if (abertas?.err) LogSystemError(abertas.err);

          const catalogo = plano.err ? null : plano.v;
          return {
            contratoId: contratoSgp.contratoId,
            contratoStatus: contratoSgp.contratoStatus,
            contratoStatusDisplay: contratoSgp.contratoStatusDisplay,
            motivo_status: contratoSgp.motivo_status,
            endereco: contratoSgp.endereco,
            plano: {
              nome: contratoSgp.planointernet,
              tecnologia: contratoSgp.servico_grupo,
              downloadKbps: catalogo?.download ?? null,
              uploadKbps: catalogo?.upload ?? null,
              valorMensal: catalogo?.preco ?? null,
              vencimentoDia: contratoSgp.cobVencimento,
            },
            faturaVencida:
              abertas && !abertas.err ? FaturaVencida(abertas.v) : null,
            liberacaoConfiancaDisponivel: LiberacaoDisponivel(contratoSgp),
          };
        },
      )
      .get(
        // Promessas de pagamento (liberações por confiança) do contrato
        "/promessas",
        async ({ contratoSgp }): Promise<SgpPromessaDto[]> => {
          const { err, v } = await sgp.promessa.Listar(contratoSgp.contratoId);
          if (err) throw err;
          return v;
        },
      )
      .post(
        // Desbloqueio em confiança: ESCRITA no SGP (libera o serviço e registra a
        // promessa). Só com LIBERACAO_CONFIANCA_HABILITADA=true (P-03)
        "/liberacao",
        async ({ contratoSgp, status }) => {
          if (!env.LIBERACAO_CONFIANCA_HABILITADA) {
            return status(403, {
              message: "Desbloqueio em confiança indisponível",
              code: "LIBERACAO_DESABILITADA",
            });
          }
          if (!ContratoBloqueado(contratoSgp)) {
            return status(409, {
              message: "O serviço deste contrato não está bloqueado",
              code: "CONTRATO_NAO_BLOQUEADO",
            });
          }

          const { err, v } = await sgp.promessa.Liberar(contratoSgp.contratoId);
          if (err) throw err;
          // Auditoria sem CPF: só o contrato e o resultado
          console.info(
            `[liberacao] contrato ${contratoSgp.contratoId}: ${v.liberado ? "liberado" : "negado"} ${v.protocolo ?? ""}`,
          );
          if (!v.liberado) {
            // A msg do SGP fica no log (tem o login PPPoE); o app recebe uma genérica
            return status(409, {
              message:
                "Não foi possível liberar agora. Fale com a Ultra Net X pelo WhatsApp.",
              code: "LIBERACAO_NEGADA",
            });
          }
          return ToLiberacaoDto(v) satisfies SgpLiberacaoDto;
        },
      ),
  );

// Suspenso (4) ou com velocidade reduzida (7): é quando cabe pagar ou pedir liberação
function ContratoBloqueado(c: SgpContrato) {
  return c.contratoStatus === 4 || c.contratoStatus === 7;
}

// Uma liberação por mês: o SGP também confere as regras configuradas por lá
function LiberacaoDisponivel(c: SgpContrato) {
  return (
    env.LIBERACAO_CONFIANCA_HABILITADA &&
    ContratoBloqueado(c) &&
    c.promessasPagamentoMes === 0
  );
}

// Dias entre duas datas AAAA-MM-DD (sem hora, para não depender do fuso)
function DiasEntre(de: string, ate: string) {
  return Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);
}

function Hoje() {
  // Data local do servidor em AAAA-MM-DD (en-CA formata assim)
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

// A fatura vencida mais antiga (a segunda via vem do vencimento mais antigo ao mais novo)
function FaturaVencida(
  segundaVia: SgpSegundaViaDto,
): MeuPlanoFaturaVencidaDto | null {
  const hoje = Hoje();
  const vencida = segundaVia.links.find((f) => f.vencimento_original < hoje);
  if (!vencida) return null;
  return {
    id: vencida.id,
    valor: vencida.valor,
    vencimento: vencida.vencimento_original,
    diasEmAtraso: DiasEntre(vencida.vencimento_original, hoje),
  };
}
