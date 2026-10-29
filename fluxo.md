# Fluxo do app Ultra Net X — contrato com a API

> Para quem vai construir o app em Expo (`ultranetx-app`). Descreve o que a API faz, em que ordem o app chama e como reagir a cada resposta.
> Fonte: back-end `ultranetx` (Bun + Elysia + Better Auth), em 29/10/2026.
> Cada rota tem um status: **✅ existe** (pode integrar) ou **🕓 planejada** (contrato definido, ainda não implementada; usar dados simulados até sair).

---

## 1. Visão geral

- O app **nunca** fala com o SGP (sistema do provedor). Tudo passa pela API.
- **Login:** usuário = **CPF/CNPJ**; senha = senha do app. No **primeiro acesso**, a senha é o **número do contrato**, e o app **obriga** a criar uma senha nova antes de liberar qualquer tela.
- **Não existe tela de cadastro.** A API gera as contas antes, a partir do SGP: todo cliente com contrato Ativo, Suspenso ou com velocidade reduzida já tem usuário.
- **Sessão:** Better Auth. O app usa `better-auth/expo`, com a sessão guardada no `expo-secure-store`. A biometria (`expo-local-authentication`) só **destrava** a sessão guardada, sem fazer login de novo.
- **Contrato:** quase tudo é por contrato (`:contratoId`). Se o CPF/CNPJ tiver mais de um contrato, o app pede para escolher.

### Base URL

| Ambiente | URL |
|---|---|
| Local | `http://<ip-da-máquina>:3333` (no celular, `localhost` não alcança a máquina) |
| Homologação / Produção | `https://api-hml.<domínio>` / `https://api.<domínio>` (domínio a definir) |

- Autenticação: tudo sob `/auth/*`.
- OpenAPI: `GET /openapi/json`. Os tipos do app saem daí com `openapi-typescript` + `openapi-fetch`. Os tipos da seção 6 descrevem as mesmas respostas.

---

## 2. Autenticação

### 2.1 Cliente Better Auth no app

```ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { usernameClient, inferAdditionalFields } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: API_URL, // a API já usa basePath "/auth"
  basePath: "/auth",
  plugins: [
    expoClient({ scheme: "ultranetx", storagePrefix: "ultranetx", storage: SecureStore }),
    usernameClient(),
    // campo extra do usuário que a API devolve na sessão
    inferAdditionalFields({ user: { mustChangePassword: { type: "boolean", required: false } } }),
  ],
});
```

As chamadas às rotas do app (seção 3) precisam levar o cookie de sessão. Com `expoClient`, use `authClient.getCookie()` no header `Cookie` de cada `fetch`/`openapi-fetch`.

### 2.2 Fluxo de entrada

```
Abertura (splash)
  └─ há sessão guardada?
       ├─ não → Login
       └─ sim → biometria ativada? → pede biometria
                 └─ authClient.getSession()
                      ├─ sem sessão (401/expirada) → Login
                      ├─ user.mustChangePassword = true → Criar nova senha
                      └─ ok → Escolha de contrato (se > 1) → Início

Login: CPF/CNPJ + senha
  └─ authClient.signIn.username({ username, password })
       ├─ 200 e user.mustChangePassword = true → Criar nova senha
       ├─ 200 e false → Escolha de contrato (se > 1) → Início
       ├─ 401 INVALID_USERNAME_OR_PASSWORD → "CPF/CNPJ ou senha incorretos"
       ├─ 422 (USERNAME_TOO_SHORT, INVALID_USERNAME…) → "CPF/CNPJ inválido"
       └─ 429 → "Muitas tentativas. Aguarde alguns segundos."

Criar nova senha (obrigatória no primeiro acesso)
  └─ authClient.changePassword({ currentPassword, newPassword })
       ├─ 200 → user.mustChangePassword = false; a sessão continua → Escolha de contrato → Início
       ├─ 400 NOVA_SENHA_IGUAL_ATUAL → "A nova senha precisa ser diferente da atual"
       ├─ 400 PASSWORD_TOO_SHORT → "A senha precisa ter pelo menos 8 caracteres"
       └─ 400 INVALID_PASSWORD → a senha atual não confere (pedir login de novo)
```

### 2.3 Rotas de autenticação (Better Auth) — ✅ existem

| Método | Rota | Corpo | Resposta 200 |
|---|---|---|---|
| POST | `/auth/sign-in/username` | `{ username: string, password: string }` | `{ token, user }` |
| GET | `/auth/get-session` | — | `{ session, user }` ou `null` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword, revokeOtherSessions? }` | `{ token, user }` |
| POST | `/auth/sign-out` | — | `{ success: true }` |
| GET | `/auth/list-sessions` | — | sessões ativas do usuário (aparelhos conectados) |
| POST | `/auth/revoke-other-sessions` | `{}` | `{ status: true }`: desconecta os outros aparelhos |
| POST | `/auth/revoke-session` | `{ token }` | `{ status: true }`: desconecta um aparelho |

**`user` na sessão:**

```ts
type User = {
  id: string;
  name: string;             // razão social / nome do titular no SGP
  email: string;            // pode ser técnico (<cpf>@clientes.ultranetx.invalid): NÃO exibir
  username: string;         // CPF/CNPJ só com dígitos
  mustChangePassword: boolean;
  createdAt: string; updatedAt: string;
};
```

### 2.4 Regras de autenticação

1. **CPF/CNPJ com ou sem máscara.** A API normaliza para dígitos. Use máscara no campo (11 dígitos = CPF, 14 = CNPJ).
2. **Primeiro acesso:** a senha é o **número do contrato** (ex.: `1856`), que aparece no boleto/contrato. Com **mais de um contrato**, é o de **menor número** (o mais antigo). Na tela de login, mostrar a dica: "Primeiro acesso? Use o número do seu contrato como senha. Se tiver mais de um, use o mais antigo."
3. **Quem não tem conta não entra.** CPF/CNPJ só com contratos cancelados ou inativos, ou cliente novo que ainda não passou pela geração de contas, recebe 401 como senha errada. Para esses casos, mostrar o contato do provedor junto do erro.
4. **Enquanto `mustChangePassword = true`**, todas as rotas do app (seção 3) respondem `403 { code: "TROCAR_SENHA" }`. Ao receber isso em qualquer tela, ir para "Criar nova senha".
5. **Senha nova:** mínimo de 8 caracteres e diferente da atual. No primeiro acesso, `currentPassword` é o número do contrato que o cliente acabou de digitar. Guarde em memória durante o fluxo e **nunca** em disco.
6. **Não existe cadastro nem edição de conta.** `/auth/sign-up/email` responde 400. `/auth/sign-in/email`, `/auth/update-user`, `/auth/delete-user` e `/auth/is-username-available` respondem 404. Não chamar. Nome e contatos vêm do SGP e o app só exibe.
7. **Limite de tentativas:** a API limita as requisições de `/auth/*` (hoje 3 por janela curta). Tratar `429` com mensagem e um botão de tentar de novo, sem repetir em loop.
8. "Esqueci a senha" **ainda não existe** (🕓). Até lá, mostrar o contato do provedor (WhatsApp).

---

## 3. Rotas do app

Todas exigem sessão (cookie do Better Auth). O **número do contrato vai sempre em `?contrato=`** (o `contratoId` escolhido na tela de contratos). A API confere se o contrato é do CPF/CNPJ logado e está válido: se não for, responde `404 CONTRATO_NAO_ENCONTRADO`, mesmo quando o contrato existe para outra pessoa.

### 3.1 ✅ Implementadas

| Método | Rota | Parâmetros (query) | Tela | Saída |
|---|---|---|---|---|
| GET | `/contratos/ativos` | — | Escolha de contrato, Perfil | `ContratoDto[]` |
| GET | `/faturas/abertas` | `contrato` | Início, detalhe da fatura | `SegundaViaDto` |
| GET | `/faturas/periodo` | `contrato`, `vencimentoInicio?`, `vencimentoFim?` (AAAA-MM-DD), `status?` (`abertos` \| `pagos` \| `cancelados`), `ordenar?` (`data_vencimento` padrão \| `data_documento` \| `data_pagamento`), `ordem?` (`desc` padrão \| `asc`), `offset?`, `limit?` (1–250) | Faturas (histórico) | `ListaTitulosDto` |
| GET | `/faturas/listar` | `contrato`, `status?` (1 aberto \| 2 pago \| 3 cancelado; sem status = todas menos canceladas), `offset?`, `limit?` (1–250) | alternativa ao histórico (traz `vencimento_atualizado` e `gerapix`) | `ListaFaturasDto` |
| GET | `/faturas/:fatura/pix` | `contrato` (`:fatura` = `id` da fatura) | botão "Copiar Pix" | `{ pix: string \| null }` |
| GET | `/contratos/meu-plano` | `contrato` | Meu plano (tela inteira numa chamada) | `MeuPlanoDto` |
| GET | `/contratos/plano` | `contrato` | só o plano do catálogo (se precisar avulso) | `PlanoDto \| null` |
| GET | `/contratos/promessas` | `contrato` | histórico de desbloqueios em confiança | `PromessaDto[]` |
| POST | `/contratos/liberacao` | `contrato` | botão "Desbloqueio em confiança" | `LiberacaoDto` |
| GET | `/contratos/conexao` | `contrato` | Início (status da internet) | `ConexaoDto` |
| GET | `/contratos/avisos` | `contrato` | Início (banner de manutenção) | `ManutencaoDto[]` (só as ativas no POP do contrato) |
| GET | `/notas-fiscais/listar` | `contrato` | notas fiscais | `NotaFiscalDto[]` |
| GET | `/documentos/:tipo` | `contrato` (`:tipo` = `contrato` \| `termoadesao` \| `contratofidelidade` \| `termocomodato` \| `cancelamento` \| `termoaceite_web` \| `termoprivacidade`) | ver/baixar contrato | `application/pdf` |
| GET | `/documentos/quitacao/:ano` | `contrato` (`:ano` de 2000 até o ano atual) | declaração anual de quitação | `application/pdf` |
| GET | `/usuario/perfil` | — | Perfil | `PerfilDto` |

`/contratos/ativos` devolve os contratos **Ativo, Suspenso e Ativo com velocidade reduzida**. Suspenso entra porque o cliente precisa ver e pagar a fatura.

Parâmetro inválido (ex.: `contrato=abc`, `limit=999`, data fora do formato, tipo de documento desconhecido) → `400` com `{ type: "validation", property, message }`.

**PDFs (`/documentos/*`):** respondem `application/pdf` com `content-disposition: inline` e exigem o cookie de sessão. Baixe com `expo-file-system` (`File.downloadFileAsync`/`downloadAsync` com o header `Cookie` de `authClient.getCookie()`) e abra ou compartilhe com `expo-sharing`. Quando o SGP não gera o documento (modelo não configurado, ano sem faturas pagas ou SGP fora do ar), a resposta é `404 { code: "DOCUMENTO_INDISPONIVEL" }` → "Documento indisponível no momento". A quitação pode levar **até 60 s** para ser gerada: mostrar carregamento e não repetir a chamada.

**Desbloqueio em confiança (`POST /contratos/liberacao`):** grava no SGP (libera o serviço e registra uma promessa de pagamento) e está **desligado até a Ultra Net X aprovar** (P-03). Respostas:
- `200 LiberacaoDto` → "Internet liberada por `liberado_dias` dia(s). Protocolo `protocolo`". Recarregar `/contratos/meu-plano`.
- `403 LIBERACAO_DESABILITADA` → a função está desligada no servidor (não deveria acontecer: o botão só aparece com `liberacaoConfiancaDisponivel = true`).
- `409 CONTRATO_NAO_BLOQUEADO` → o serviço não está bloqueado.
- `409 LIBERACAO_NEGADA` → o SGP recusou (regras do provedor, ex.: já usou no mês). Mostrar a `message` e o WhatsApp.
- Pedir confirmação antes de chamar e **não repetir** em caso de erro.

### 3.2 🕓 Dependem de decisão do provedor (não construir ainda)

Chamados de suporte e catálogo de outros planos.

---

## 4. Regras de cada tela

### Escolha de contrato
- `GET /contratos/ativos`. Com **um** contrato, pular a tela. Com **vários**, listar com plano e status, e guardar o escolhido (pode trocar no Perfil).
- Status do contrato (`contratoStatus`): `1` Ativo · `4` Suspenso · `7` Ativo com velocidade reduzida · `3` Cancelado (não aparece). Para 4 e 7, mostrar um alerta em vermelho (#E10A0A) com o `motivo_status`.

### Início
- **Fatura atual:** `GET /faturas/abertas?contrato=`.
  - `status = 0` ou `links` vazio → card "Você está em dia".
  - Senão, a fatura atual é `links[0]` (vêm do vencimento mais antigo para o mais novo). Mostrar `valor`, `vencimento` e a situação, calculada pelo app comparando `vencimento` com hoje: "Em aberto", "Vence hoje" ou "Vencida".
  - Vencida: mostrar `valor` (já corrigido) e, menor, `valor_original` e `vencimento_original`. `multa` e `juros` vêm separados.
- **Status da internet:** `GET /contratos/conexao?contrato=` → `1` "Sua internet está funcionando" · `2` "Sua internet está desconectada" · `9` "Em manutenção" · `0` não mostrar nada.
- **Avisos:** `GET /contratos/avisos?contrato=`. Se vier algum, mostrar um banner com `mensagem_central` e o período (`data_inicial` → `data_final`).
- **Plano:** resumo vindo do contrato (`planointernet`, `cobVencimento` = dia do vencimento).

### Detalhe da fatura / pagar
- **Pix:** se `codigopix` vier preenchido, usar direto. Se vier vazio, chamar `GET /faturas/:fatura/pix?contrato=` (`:fatura` = `id`). `pix: null` → esconder o Pix e deixar só o boleto.
- **Copiar:** Pix e `linhadigitavel` com `expo-clipboard` + vibração (`expo-haptics`) e o aviso "Copiado!".
- **Boleto em PDF:** abrir `link` (público, sem sessão) no navegador do sistema. `link_cobranca` é a página de pagamento do provedor.
- O app **só exibe**. Nunca altera fatura nem marca como paga.

### Faturas (histórico)
- `GET /faturas/periodo?contrato=`. Padrão: últimos 12 meses (`vencimentoInicio` = hoje − 12 meses, `vencimentoFim` = hoje + 2 meses), da mais recente para a mais antiga. "Carregar mais" com `offset`/`limit`.
- `status` do título: `"aberto"`, `"pago"` (mostrar `dataPagamento`) ou `"cancelado"`.
- Datas vazias chegam como `""`, não como `null`.

### Meu contrato
- Dados do `ContratoDto`: número (`contratoId`), status, plano e dia de vencimento.
- **Ver/baixar PDF:** `GET /documentos/contrato?contrato=` com o cookie de sessão. Baixar com `expo-file-system` e abrir ou compartilhar com `expo-sharing`. Outros `:tipo`: `termoadesao`, `contratofidelidade`, `termocomodato` (quais exibir depende do provedor). Se a API responder erro, mostrar "Documento indisponível no momento".
- **Declaração de quitação:** seletor de ano → `GET /documentos/quitacao/:ano?contrato=`. Ano sem faturas pagas → `404 DOCUMENTO_INDISPONIVEL` ("Não há faturas pagas neste ano").

### Meu plano
- `GET /contratos/meu-plano?contrato=` → uma chamada para a tela inteira.
- **Cabeçalho:** "Contrato `contratoId` · `endereco.logradouro`, `endereco.numero`" (sem número: só o logradouro).
- **Card do plano:**
  - nome = `plano.nome`, com pílula de status a partir de `contratoStatusDisplay` (Ativo verde; Suspenso/reduzida vermelho);
  - tecnologia = `plano.tecnologia` (`fibra` → "Internet fibra óptica", `radio` → "Internet via rádio");
  - velocidade = `plano.downloadKbps / 1024` arredondado + "Mega de download";
  - "Valor mensal" = `plano.valorMensal` em R$;
  - "Vencimento" = "Todo dia `plano.vencimentoDia`".
  - Campo `null` (o nome do plano não bate com o catálogo do SGP ou o SGP não respondeu) → esconder só aquele dado.
- **Serviço suspenso** (`contratoStatus` 4 ou 7, com `faturaVencida` preenchida):
  - Texto: "Sua internet foi suspensa por uma fatura vencida há `diasEmAtraso` dias (R$ `valor`). Ela volta em poucos minutos após o pagamento."
  - "Pagar agora com Pix" → `GET /faturas/:fatura/pix?contrato=` com `faturaVencida.id`.
  - "Desbloqueio em confiança" **só** quando `liberacaoConfiancaDisponivel = true` → `POST /contratos/liberacao?contrato=` (ver 3.1).
  - Suspenso sem `faturaVencida` → mostrar o alerta com `motivo_status` e o WhatsApp.
- **"O que está incluso":** lista fixa no app (não vem do SGP; o provedor define o texto).
- **"Quero mudar de plano"** → WhatsApp comercial do provedor (número a definir, P-11).

### Perfil
- `GET /usuario/perfil` → nome, CPF/CNPJ já formatado, tipo de pessoa e os contatos cadastrados no SGP (telefones e e-mails, cada um com `tipo`, ex.: "WhatsApp Número", "Celular Pessoal").
  - `contatos: null` → o SGP não respondeu. Mostrar o resto do perfil e esconder a seção de contatos.
  - Os contatos são **só leitura**. Para mudar, mostrar "Para atualizar seus dados, fale com a Ultra Net X" com o WhatsApp do provedor.
- Contrato atual e "Trocar contrato" (só quando `totalContratos > 1`).
- **Segurança:** trocar senha (`authClient.changePassword`), "Aparelhos conectados" (`authClient.listSessions`, com "Desconectar outros aparelhos" via `authClient.revokeOtherSessions`) e ativar/desativar biometria.
- **Sair:** `authClient.signOut` e limpar o SecureStore.
- **Não exibir** `user.email`, que pode ser técnico.

---

## 5. Erros

| Origem | Formato | O que fazer |
|---|---|---|
| Rotas `/auth/*` | `{ message, code }` (códigos do Better Auth, ver 2.2) | mensagem específica por `code` |
| Rotas do app | `{ code, message }` | ver abaixo |
| `401` | sessão ausente/expirada | ir para o Login |
| `403` `TROCAR_SENHA` | primeiro acesso pendente | ir para "Criar nova senha" |
| `404` `CONTRATO_NAO_ENCONTRADO` | o `?contrato=` não é do usuário ou deixou de ser válido (ex.: foi cancelado) | recarregar `/contratos/ativos` e voltar para a escolha de contrato |
| `429` | muitas tentativas | aguardar e permitir tentar de novo |
| `502` | o SGP não respondeu | mostrar a `message` e manter o último dado em cache |
| `5xx` / SGP fora do ar | `{ code, message }`; `message` pode trazer "informando o codigo SE…" | mostrar a `message` e manter na tela o último dado carregado (TanStack Query com dados em cache) |

O app precisa **funcionar com o SGP fora do ar**: mostrar o último dado conhecido com um aviso, sem travar (requisito RNF-06).

---

## 6. DTOs de saída

Todos os campos chegam como o SGP devolve. Datas em `"AAAA-MM-DD"` ou `"AAAA-MM-DD HH:MM:SS"`. Valores em reais (`number`).

```ts
type ContatoDto = {
  tipo: string;                  // "Celular Pessoal", "WhatsApp Número", "Telefone Residencial", "E-Mail"…
  contato: string;               // "(84) 99999-9999" ou "nome@email.com"
};

type PerfilDto = {
  nome: string;
  cpfCnpj: string;               // já formatado: "123.456.789-09" / "61.673.447/0001-16"
  tipoPessoa: "fisica" | "juridica";
  contatos: { telefones: ContatoDto[]; emails: ContatoDto[] } | null; // null = SGP fora do ar
  totalContratos: number | null;
  criadoEm: string;              // ISO 8601
};

type EnderecoDto = {
  logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string; cep: string; // vazios chegam como ""
};

type MeuPlanoDto = {
  contratoId: number;
  contratoStatus: 1 | 4 | 7 | number;
  contratoStatusDisplay: string;
  motivo_status: string;
  endereco: EnderecoDto;
  plano: {
    nome: string;
    tecnologia: string;          // "fibra", "radio"…
    downloadKbps: number | null;
    uploadKbps: number | null;
    valorMensal: number | null;  // preço do plano no catálogo do SGP
    vencimentoDia: number | null;
  };
  faturaVencida: {               // só com o contrato suspenso/reduzido
    id: number;                  // usar em /faturas/:fatura/pix
    valor: number;               // com multa e juros
    vencimento: string;          // vencimento original, AAAA-MM-DD
    diasEmAtraso: number;
  } | null;
  liberacaoConfiancaDisponivel: boolean; // mostrar o botão "Desbloqueio em confiança"
};

type PromessaDto = {
  id: number; contratoId: number;
  dataCadastro: string; dataPagamento: string; // "AAAA-MM-DD HH:MM:SS"
  acordo: boolean;
  status: string;                // "ativa" | "inativa"
};

type LiberacaoDto = {
  contratoId: number;
  liberado: boolean;
  liberado_dias: number | null;
  protocolo: string | null;
};

type ContratoDto = {
  contratoId: number;
  clienteId: number;
  cpfCnpj: string;               // com máscara
  razaoSocial: string;
  contratoStatus: 1 | 3 | 4 | 7 | number;
  contratoStatusDisplay: string; // "Ativo", "Suspenso"…
  motivo_status: string;
  planointernet: string;         // nome do plano (ex.: "500MB - MOVI TELECOM")
  servico_grupo: string;         // tecnologia: "fibra", "radio"…
  endereco: EnderecoDto;         // endereço de instalação
  cobVencimento: number | null;  // dia do vencimento
  popId: number;
  popNome: string;
  telefones: ContatoDto[];
  emails: ContatoDto[];
  contratoValorAberto: number;
  contratoTitulosAReceber: number;
  promessasPagamentoMes: number;
  dataCadastro: string;          // "dd/mm/aaaa hh:mm:ss"
};

type SegundaViaDto = {
  status: number;                // 1 = há faturas em aberto; 0 = nenhuma
  msg: string;
  contratoId: number;
  links: {
    id: number;                  // id do título (use em /faturas/:faturaId/pix)
    fatura: number;              // número do documento
    valor: number;               // já com multa/juros
    valor_original: number;
    multa: number;
    juros: number;
    desconto_vencimento: number;
    vencimento: string;
    vencimento_original: string;
    link: string;                // boleto (público)
    link_cobranca: string;       // página de pagamento (pública)
    link_pix_html: string;
    linhadigitavel: string;      // pode vir ""
    codigopix: string;           // pode vir "" → chamar /pix
  }[];
};

type ListaTitulosDto = {
  paginacao: { offset: number; limit: number; parcial: number; total: number };
  titulos: {
    id: number;
    numeroDocumento: number;
    status: "aberto" | "pago" | "cancelado" | string;
    valor: number;
    valorDesconto: number;
    valorCorrigido: number;
    valorPago: number;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento: string;       // "" se não pago
    dataCancelamento: string;
    link: string;
    link_cobranca: string;
    linhaDigitavel: string;
    codigoBarras: string;
    codigoPix: string;
    demonstrativo: string;       // descrição da cobrança
  }[];
};

type PlanoDto = {
  id: number;
  descricao: string;
  tipo: "internet" | "telefonia" | "multimidia" | "tv" | "generico";
  grupo: string;                 // "fibra", "radio"…
  preco: number;
  download: number;              // kbps
  upload: number;                // kbps
  ativo: boolean;
  pos_pago: boolean;
};

type ConexaoDto = { contratoId: number; status: 0 | 1 | 2 | 9 | number; msg: string };

type ManutencaoDto = {
  id: number;
  descricao: string;
  data_inicial: string;
  data_final: string;
  mensagem_central: string;      // texto para o cliente
  ativa: boolean;
  severidade: string;
  status: string;
  pops: { id: number; cidade: string; uf: string }[];
};

type NotaFiscalDto = {
  numero: number;
  serie: string;
  modelo: string;
  status: number;
  valortotal: number;
  data_emissao: string;
  link: string;                  // PDF público da nota
};
```

---

## 7. Pendências que afetam o app

- **Back-end:** ~~falta o plugin `expo()` e o `trustedOrigins`~~ feito em 29/10/2026 (`ultranetx://` e, fora de produção, `exp://`).
- **Rotas 🕓:** usar dados simulados com os DTOs da seção 6.
- **"Esqueci a senha"**, **suporte/chamados**, **desbloqueio em confiança** e **número do WhatsApp**: aguardando decisão do provedor.
- **Domínio** da API: a definir.

## 8. Identidade visual (resumo)

Vermelho `#E10A0A` (ações e alertas) · marinho `#252F3D` (superfícies) · fundo `#F4F6F9` · degradê do cabeçalho `#F0201C → #B00808` · fontes Ubuntu (títulos) e Inter (textos) · **tema só claro**. Protótipo navegável: https://claude.ai/artifact/EFH8KT2LebBZSBWHd9gAFu
