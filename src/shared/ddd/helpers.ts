import { randomUUIDv7 } from "bun";
declare const brandSymbol: unique symbol;

export type Brand<K extends string, T = string> = T & {
  readonly [brandSymbol]: K;
};

// export type Entity<T> = {
//   id: T;
// };

export function GenarateUUID(): string {
  return randomUUIDv7();
}
