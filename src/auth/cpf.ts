// CPF/CNPJ como username: guardado só com dígitos (11 = CPF, 14 = CNPJ)

export const NormalizarCpfCnpj = (v: string) => v.replace(/\D/g, "");

export const CpfCnpjValido = (v: string) => /^(\d{11}|\d{14})$/.test(v);
