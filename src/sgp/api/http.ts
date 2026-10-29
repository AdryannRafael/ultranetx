import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { E } from "~/shared/either";
import { IntegrationException } from "~/shared/error/exceptions";
import type {
  SgpCampos,
  SgpConfig,
  SgpHttp,
  SgpRespostaBinaria,
} from "../types";

/**
 * Transporte HTTP do SGP: autentica com Token/App, aplica timeout e converte
 * falhas em IntegrationException. As APIs de cada contexto usam só este cliente.
 */

const TIMEOUT_PADRAO_MS = 10_000;

export function Falha(message: string, e?: unknown) {
  return E.Fail(
    new IntegrationException(
      message,
      "sgp",
      e instanceof Error ? e : undefined,
    ),
  );
}

// Lê o "detail" que o SGP manda nos 4xx, sem nunca repassar o corpo inteiro
async function Detalhe(res: Response): Promise<string> {
  try {
    const body: any = await res.json();
    return typeof body?.detail === "string" ? `: ${body.detail}` : "";
  } catch {
    return "";
  }
}

/**
 * GET com corpo: o SGP lê os parâmetros de impressão do corpo, mesmo em GET,
 * e o fetch não deixa enviar corpo em GET. Por isso usa node:http(s).
 */
function RequestGetComCorpo(
  url: string,
  json: object,
  timeoutMs: number,
): Promise<SgpRespostaBinaria> {
  const corpo = Buffer.from(JSON.stringify(json));
  const request = url.startsWith("https:") ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        timeout: timeoutMs,
        headers: {
          "content-type": "application/json",
          "content-length": corpo.length,
        },
      },
      (res) => {
        const partes: Buffer[] = [];
        res.on("data", (p: Buffer) => partes.push(p));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            type: String(res.headers["content-type"] ?? ""),
            body: Buffer.concat(partes),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

export function CreateSgpHttp(config: SgpConfig): SgpHttp {
  const { app, token } = config;
  if (!config.url || !app || !token) {
    throw new Error("SGP_URL, SGP_APP e SGP_TOKEN precisam estar definidos");
  }
  // Aceita a URL com ou sem "/api" no final (ex.: https://demo.sgp.net.br/api/)
  const base = config.url.replace(/\/+$/, "").replace(/\/api$/, "");
  const timeoutMs = config.timeoutMs ?? TIMEOUT_PADRAO_MS;

  async function Post<T>(path: string, campos: SgpCampos = {}): E.R<T> {
    const form = new FormData();
    form.set("token", token);
    form.set("app", app);
    for (const [k, v] of Object.entries(campos)) {
      if (v !== undefined) form.set(k, String(v));
    }

    let res: Response;
    try {
      res = await fetch(base + path, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      return Falha(`SGP indisponível em ${path}`, e);
    }

    if (!res.ok) {
      return Falha(
        `SGP respondeu ${res.status} em ${path}${await Detalhe(res)}`,
      );
    }

    try {
      return E.Ok((await res.json()) as T);
    } catch (e) {
      return Falha(`SGP devolveu uma resposta que não é JSON em ${path}`, e);
    }
  }

  async function GetComCorpo(
    path: string,
    campos: SgpCampos = {},
  ): E.R<SgpRespostaBinaria> {
    try {
      const res = await RequestGetComCorpo(
        base + path,
        { ...campos, token, app },
        timeoutMs,
      );
      return E.Ok(res);
    } catch (e) {
      return Falha(`SGP indisponível em ${path}`, e);
    }
  }

  async function GetJson<T>(path: string, campos: SgpCampos = {}): E.R<T> {
    const r = await GetComCorpo(path, campos);
    if (r.err) return r;

    const { status, body } = r.v;
    if (status < 200 || status >= 300) {
      return Falha(`SGP respondeu ${status} em ${path}`);
    }
    try {
      return E.Ok(JSON.parse(body.toString()) as T);
    } catch (e) {
      return Falha(`SGP devolveu uma resposta que não é JSON em ${path}`, e);
    }
  }

  async function BaixarLink(
    url: string,
    timeout: number = timeoutMs,
  ): E.R<SgpRespostaBinaria> {
    // Evita que um link vindo do SGP leve a API a buscar qualquer endereço
    let alvo: URL;
    try {
      alvo = new URL(url);
    } catch (e) {
      return Falha("Link do SGP inválido", e);
    }
    if (alvo.origin !== new URL(base).origin) {
      return Falha(`Link fora do host do SGP: ${alvo.origin}`);
    }

    try {
      const res = await fetch(alvo, { signal: AbortSignal.timeout(timeout) });
      return E.Ok({
        status: res.status,
        type: res.headers.get("content-type") ?? "",
        body: Buffer.from(await res.arrayBuffer()),
      });
    } catch (e) {
      // Não loga o caminho: ele carrega os hashes que dão acesso ao documento
      return Falha("SGP indisponível ao baixar link", e);
    }
  }

  return { Post, GetComCorpo, GetJson, BaixarLink };
}
