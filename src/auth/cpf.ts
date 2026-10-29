// CPF/CNPJ como username: guardado só com dígitos (11 = CPF, 14 = CNPJ)

export const NormalizarCpfCnpj = (v: string) => v.replace(/\D/g, "");

export const CpfCnpjValido = (v: string) => /^(\d{11}|\d{14})$/.test(v);

// "12345678909" → "123.456.789-09"; "61673447000116" → "61.673.447/0001-16"
export function FormatarCpfCnpj(v: string): string {
  const d = NormalizarCpfCnpj(v);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return v;
}
