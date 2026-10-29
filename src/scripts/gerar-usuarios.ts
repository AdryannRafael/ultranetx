import { auth } from "~/auth/better-auth";
import { GerarUsuarios } from "~/auth/gerar-usuarios";
import { CheckDatabaseConnection, pool } from "~/db";
import { sgp } from "~/sgp/proxy";

/**
 * Rotina: gera os usuários do app para os contratos que já existem no SGP.
 *
 *   bun run usuarios:gerar              # grava
 *   bun run usuarios:gerar --dry-run    # só mostra quantos seriam criados
 *   bun run usuarios:gerar --limite 50  # processa só os 50 primeiros clientes
 */

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const iLimite = args.indexOf("--limite");
const limite = iLimite >= 0 ? Number(args[iLimite + 1]) : undefined;

if (limite !== undefined && (!Number.isInteger(limite) || limite <= 0)) {
  console.error("--limite precisa ser um número inteiro positivo");
  process.exit(1);
}

await CheckDatabaseConnection();
console.log(
  `Gerando usuários${dryRun ? " (dry-run, nada será gravado)" : ""}${limite ? `, limite ${limite}` : ""}...`,
);

try {
  const ctx = await auth.$context;
  const res = await GerarUsuarios({ sgp, ctx, dryRun, limite });
  console.log("\nResumo:", res);
} finally {
  await pool.end();
}
