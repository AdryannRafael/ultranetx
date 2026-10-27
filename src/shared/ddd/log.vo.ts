import { Instant, InstantVo } from "./instant.vo";

export type Log = {
  createdAt: Instant;
  updatedAt: Instant;
  deletedAt: Instant | null;
};

export namespace LogVo {
  // Cria um Log novo: createdAt e updatedAt no instante atual, deletedAt nulo
  export function Created(): Log {
    const now = InstantVo.now();
    return {
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }
}
