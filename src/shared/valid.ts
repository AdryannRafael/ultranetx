// import { DomainException } from "~/shared/error/exceptions"

import { E } from "@/src/shared/either";
import { SystemException } from "@/src/shared/error";
// import { SystemException } from "@/src/shared/error";
import {
  DomainException,
  InternalException,
} from "@/src/shared/error/exceptions";

/**
 *
 * Função utilizada para fazer validacoes em classes/Objetos
 *
 * @param clazz - Objeto que sera submetido as validacoes
 * @returns - Um Objeto com as validações que o objeto suporta
 */
export function Valid<K>(clazz: K) {
  type keysAttrs<T = any> = {
    [X in keyof K]: K[X] extends Function ? never : K[X] extends T ? X : never;
  }[keyof K];

  function percorrer<T>(
    attrs: keysAttrs<T>[],
    validacao: (value: T) => boolean,
    estourar: (nulos: string[]) => E.RSync<null>,
  ): E.RSync<null> {
    let nulls: string[] = [];
    for (const key of attrs) {
      const value: any = clazz[key];
      if (value === undefined) {
        return E.FailSync(
          new InternalException(
            `Valor ${key.toString()} undefined`,
            "nullpointer",
          ),
        );
      }
      if (validacao(value)) {
        nulls.push(key.toString());
      }
    }
    if (nulls && nulls.length) {
      return estourar(nulls);
    }
    return E.OkSync(null);
  }

  /**
   *  Usa-se essa função para fazer validaçao de atributos que são strings vazias, caso verdade estoura uma DomainException,
   * com specificidade de SpecificityError.INVALID_ATTRIBUTE
   * @param attrs - Lista de atributos do objeto que seram validados que tem o type string
   */
  const emptyString = (
    attrs: keysAttrs<string>[],
    exception?: (nulos: string[]) => SystemException,
  ): E.RSync<null> => {
    return percorrer(
      attrs,
      (value) => {
        const v = !value.trim().replace(" ", "").length;
        return v;
      },
      (nulos) => {
        return E.FailSync(
          exception
            ? exception(nulos)
            : new DomainException(
                `Os atributos [${nulos.join(", ")}] não podem ser vazios`,
                "validation",
              ),
        );
      },
    );
  };

  /**
   *  Usa-se essa função para fazer validaçao de atributos nulos, caso verdade estoura uma DomainException,
   * com specificidade de SpecificityError.NULL_POINTER
   * @param attrs - Lista de atributos do objeto que seram validados
   */
  const nullPointer = (
    attrs: keysAttrs[],
    exception?: (nulos: string[]) => SystemException,
  ): E.RSync<null> => {
    return percorrer(
      attrs,
      (value) => value === null,
      (nulos) => {
        return E.FailSync(
          exception
            ? exception(nulos)
            : new DomainException(
                `Os atributos [${nulos.join(", ")}] não pode ser nulos`,
                "validation",
              ),
        );
      },
    );
  };
  return { nullPointer, emptyString };
}
