import { NatureErrors } from "./NatureErrors.enum";

const { DATABASE, DOMAIN, INTERNAL, NEGOTIATE, INTEGRATION } = NatureErrors;
type SpecInfo = {
  code: string;
  description: string;
};

export const SPecificityError = {
  [DATABASE]: [
    { code: "001", description: "connection" },
    { code: "002", description: "query" },
    { code: "003", description: "not_found" },
  ],
  [DOMAIN]: [{ code: "001", description: "validation" }],
  [INTERNAL]: [
    { code: "001", description: "io" },
    { code: "002", description: "whatsapp" },
    { code: "003", description: "nullpointer" },
  ],
  [NEGOTIATE]: [
    { code: "003", description: "rule_businnes" },
    { code: "102", description: "validation" },
  ],
  [INTEGRATION]: [
    { code: "001", description: "braipe" },
    { code: "002", description: "telegram" },
    { code: "003", description: "sgp" },
    // { code: "102", description: "validation" },
  ],
} as const satisfies Record<NatureErrors, readonly SpecInfo[]>;

export type Specificity<N extends NatureErrors = NatureErrors> =
  (typeof SPecificityError)[N][number];
export type SelectedSpecificity<N extends NatureErrors = NatureErrors> =
  (typeof SPecificityError)[N][number]["description"];

export function LoadGetSpecificity(
  nature: NatureErrors,
  s: SelectedSpecificity,
): Specificity {
  const specificityFounded = SPecificityError[nature].find(
    ({ description }) => description === s,
  );
  if (!specificityFounded) {
    throw new Error(`Specificity ${s} not found for nature ${nature}`);
  }
  return specificityFounded;
}
