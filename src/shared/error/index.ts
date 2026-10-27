import { Instant, InstantVo } from "../ddd/instant.vo";
import { NatureErrors } from "./NatureErrors.enum";
import {
  LoadGetSpecificity,
  type SelectedSpecificity,
  type Specificity,
} from "./specificity";

interface ErrorCore<N extends NatureErrors = NatureErrors> {
  GetNature(): NatureErrors;
  Code(): string;
  GetSpecificity(): Specificity<N>;
}

interface ErrorFactory {
  nature: NatureErrors;
  Create(specificity: Specificity): SystemError;
}

function PopulateMap(): Map<NatureErrors, ErrorFactory> {
  const map: Map<NatureErrors, ErrorFactory> = new Map();
  Object.values(NatureErrors).forEach((value) => {
    const instance = {
      nature: value,
      Create: (specificity: Specificity) => Create(value, specificity),
    };
    map.set(value, instance);
  });
  return map;
}

export const Factory = {
  map: PopulateMap(),
};

function Create(nature: NatureErrors, specificity: Specificity): SystemError {
  return new SystemError(nature, specificity);
}

export function GetFactory(nature: NatureErrors): ErrorFactory {
  const factory = Factory.map.get(nature);
  if (!factory) {
    throw new Error("ErrorFactory not found for nature: " + nature);
  }
  return factory;
}

/**Implementacao da interface de erro */
export class SystemError implements ErrorCore {
  constructor(
    private readonly nature: NatureErrors,
    private readonly specificity: Specificity,
  ) {}

  GetNature() {
    return this.nature;
  }

  Code(): string {
    return `${this.nature.toString()}${this.specificity.code.toString()}`;
  }

  GetSpecificity() {
    return this.specificity;
  }

  toJSON() {
    return {
      code: this.Code(),
      nature: this.nature,
      specificity: this.specificity.description,
      specCode: this.specificity.code,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

export class SystemException extends Error {
  private _horario: Instant;
  constructor(
    message: string,
    private readonly nature: NatureErrors,
    private readonly selectedSpecificity: SelectedSpecificity<NatureErrors>,
    public readonly e?: Error,
  ) {
    super(message, e);
    this._horario = InstantVo.now();
  }

  get GetSpecificity(): Specificity {
    return LoadGetSpecificity(this.nature, this.selectedSpecificity);
  }

  get Erro() {
    return GetFactory(this.nature).Create(this.GetSpecificity);
  }

  public get horario(): Instant {
    return this._horario;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      error: this.Erro.toJSON(),
    };
  }

  override toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
