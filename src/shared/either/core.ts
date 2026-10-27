import type { SystemException } from "~/shared/error";
import { DbException, IntegrationException } from "../error/exceptions";
import { NatureErrors } from "../error/NatureErrors.enum";
import { SelectedSpecificity } from "../error/specificity";

export type RSync<T, E = SystemException> =
  | { err: E; v: null }
  | { err: null; v: T };

export type R<T, E = SystemException> = Promise<RSync<T, E>>;

export const Ok = async <T>(v: T): R<T, never> => ({ err: null, v });
export const Fail = async <E>(err: E): R<never, E> => ({ err, v: null });

export const OkSync = <T>(v: T): RSync<T, never> => ({ err: null, v });
export const FailSync = <E>(err: E): RSync<never, E> => ({ err, v: null });

// (Opcional) Helper para capturar Promises de terceiros e jogar no padrão
export async function FromPromise<T, E = SystemException>(
  promise: Promise<T>,
  errorMapper: (err: unknown) => E,
): R<T, E> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (e) {
    return Fail(errorMapper(e));
  }
}

type ValueForDB = SelectedSpecificity<NatureErrors.DATABASE>;
type ValueForIntergration = SelectedSpecificity<NatureErrors.INTEGRATION>;

export async function Db<T>(
  promise: Promise<T>,
  origem: ValueForDB = "query",
): R<T, DbException> {
  return FromPromise(
    promise,
    (e: any) => new DbException(e.message, origem, e),
  );
}
export async function External<T>(
  promise: Promise<T>,
  origem: ValueForIntergration = "braipe",
): R<T, DbException> {
  return FromPromise(
    promise,
    (e: any) => new IntegrationException(e.message, origem, e),
  );
}
