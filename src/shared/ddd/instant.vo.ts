// src/domain/shared/instant.ts
import { E } from "~/shared/either";
import { DomainException } from "~/shared/error/exceptions";
import { Brand } from "./helpers";

// String ISO 8601 em UTC imutável (ex: "2026-09-10T21:44:31.000Z")
export type Instant = Brand<string, "IsoDateTime">;

export namespace InstantVo {
  // Retorna o instante atual em UTC
  export function now(): Instant {
    return new Date().toLocaleString("pt-BR") as Instant;
  }

  // Valida e cria a partir de uma string qualquer
  export function create(raw: string): E.RSync<Instant, DomainException> {
    const parsedDate = new Date(raw);

    if (isNaN(parsedDate.getTime())) {
      return E.FailSync(
        new DomainException(
          "Data no formato inválido. Esperado ISO 8601.",
          "validation",
        ),
      );
    }

    return E.OkSync(parsedDate.toLocaleString("pt-BR") as Instant);
  }

  // Comparação lexicográfica direta (Funciona nativamente em strings ISO UTC!)
  export function isBefore(a: Instant, b: Instant): boolean {
    return (a as string) < (b as string);
  }

  export function isAfter(a: Instant, b: Instant): boolean {
    return (a as string) > (b as string);
  }

  // Adiciona horas criando uma nova string (Imutável)
  export function addHours(instant: Instant, hours: number): Instant {
    const date = new Date(instant as string);
    date.setHours(date.getHours() + hours);
    return date.toLocaleString("pt-BR") as Instant;
  }
}
