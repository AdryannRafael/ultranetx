// import { Elysia } from "elysia";

import { sgp } from "@/src/src/sgp/proxy";

// const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);

// console.log(
//   `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
// );

(async () => {
  const cpfCnpj = "61673447000116";
  const contrato = 1856;
  // const { v, err } = await sgp.fatura.Listar({ contrato });
  // if (err) throw err;

  // const { err: pixError, v: pix } = await sgp.fatura.ObterPix(23998, contrato);

  // if (pix) throw pixError;
  const { v, err } = await sgp.cliente.Consultar(cpfCnpj);
  if (err) throw err;

  console.log(v);
  // console.log(pix);
})();
