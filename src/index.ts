// import { Elysia } from "elysia";

import { auth } from "@/src/auth/better-auth";
import { GerarUsuarios } from "@/src/auth/gerar-usuarios";
import { CheckDatabaseConnection } from "@/src/db";
import { StartServer } from "@/src/http/server";
import { sgp } from "@/src/sgp/proxy";

// const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);

// console.log(
//   `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
// );

(async () => {
  // const cpfCnpj = "61673447000116";
  // const contrato = 1856;
  // // const { v, err } = await sgp.fatura.Listar({ contrato });
  // // if (err) throw err;

  // // const { err: pixError, v: pix } = await sgp.fatura.ObterPix(23998, contrato);

  // // if (pix) throw pixError;
  // const { v, err } = await sgp.cliente.Consultar(cpfCnpj);
  // if (err) throw err;

  // console.log(v);
  // // console.log(pix);
  const dbIsRunning = await CheckDatabaseConnection();
  if (dbIsRunning) {
    await StartServer(3333);
  }
})();
