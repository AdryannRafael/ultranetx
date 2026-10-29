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
- OpenAPI: `GET /openapi/json`. Os tipos do app saem daí com `openapi-typescript` + `openapi-fetch`. Enquanto as rotas 🕓 não existem, use os tipos da seção 6.

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
6. **Não existe cadastro.** `/auth/sign-up/email` responde 400 e `/auth/sign-in/email` responde 404. Não chamar.
7. **Limite de tentativas:** a API limita as requisições de `/auth/*` (hoje 3 por janela curta). Tratar `429` com mensagem e um botão de tentar de novo, sem repetir em loop.
8. "Esqueci a senha" **ainda não existe** (🕓). Até lá, mostrar o contato do provedor (WhatsApp).

---

## 3. Rotas do app — 🕓 planejadas

Todas exigem sessão (cookie do Better Auth). A API confere se o `:contratoId` é do CPF/CNPJ logado.

| Método | Rota | Tela | Saída |
|---|---|---|---|
| GET | `/contratos` | Escolha de contrato, Perfil | `ContratoDto[]` |
| GET | `/contratos/:contratoId` | Meu contrato | `ContratoDto` |
| GET | `/contratos/:contratoId/plano` | Meu plano | `PlanoDto \| null` |
| GET | `/contratos/:contratoId/conexao` | Início (status da internet) | `ConexaoDto` |
| GET | `/contratos/:contratoId/avisos` | Início (banner de manutenção) | `ManutencaoDto[]` |
| GET | `/contratos/:contratoId/faturas/abertas` | Início, detalhe da fatura | `SegundaViaDto` |
| GET | `/contratos/:contratoId/faturas?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&offset&limit` | Faturas (histórico) | `ListaTitulosDto` |
| GET | `/contratos/:contratoId/faturas/:faturaId/pix` | botão "Copiar Pix" | `{ pix: string \| null }` |
| GET | `/contratos/:contratoId/documentos/:tipo` | ver/baixar contrato | `application/pdf` |
| GET | `/contratos/:contratoId/quitacao/:ano` | declaração anual de quitação | `application/pdf` |
| GET | `/contratos/:contratoId/notas-fiscais` | notas fiscais | `NotaFiscalDto[]` |

Dependem de decisão do provedor (não construir ainda): `GET/POST /contratos/:contratoId/promessas|liberacao` (desbloqueio em confiança), `GET /chamados/tipos`, `GET/POST /contratos/:contratoId/chamados` (suporte) e `GET /planos` (outros planos).

---

## 4. Regras de cada tela

### Escolha de contrato
- `GET /contratos`. Com **um** contrato, pular a tela. Com **vários**, listar com plano e status, e guardar o escolhido (pode trocar no Perfil).
- Status do contrato (`contratoStatus`): `1` Ativo · `4` Suspenso · `7` Ativo com velocidade reduzida · `3` Cancelado (não aparece). Para 4 e 7, mostrar um alerta em vermelho (#E10A0A) com o `motivo_status`.

### Início
- **Fatura atual:** `GET /faturas/abertas`.
  - `status = 0` ou `links` vazio → card "Você está em dia".
  - Senão, a fatura atual é `links[0]` (vêm do vencimento mais antigo para o mais novo). Mostrar `valor`, `vencimento` e a situação, calculada pelo app comparando `vencimento` com hoje: "Em aberto", "Vence hoje" ou "Vencida".
  - Vencida: mostrar `valor` (já corrigido) e, menor, `valor_original` e `vencimento_original`. `multa` e `juros` vêm separados.
- **Status da internet:** `GET /conexao` → `1` "Sua internet está funcionando" · `2` "Sua internet está desconectada" · `9` "Em manutenção" · `0` não mostrar nada.
- **Avisos:** `GET /avisos`. Se vier algum, mostrar um banner com `mensagem_central` e o período (`data_inicial` → `data_final`).
- **Plano:** resumo vindo do contrato (`planointernet`, `cobVencimento` = dia do vencimento).

### Detalhe da fatura / pagar
- **Pix:** se `codigopix` vier preenchido, usar direto. Se vier vazio, chamar `GET /faturas/:faturaId/pix` (`:faturaId` = `id`). `pix: null` → esconder o Pix e deixar só o boleto.
- **Copiar:** Pix e `linhadigitavel` com `expo-clipboard` + vibração (`expo-haptics`) e o aviso "Copiado!".
- **Boleto em PDF:** abrir `link` (público, sem sessão) no navegador do sistema. `link_cobranca` é a página de pagamento do provedor.
- O app **só exibe**. Nunca altera fatura nem marca como paga.

### Faturas (histórico)
- Padrão: últimos 12 meses (`inicio` = hoje − 12 meses, `fim` = hoje + 2 meses), da mais recente para a mais antiga. "Carregar mais" com `offset`/`limit`.
- `status` do título: `"aberto"`, `"pago"` (mostrar `dataPagamento`) ou `"cancelado"`.
- Datas vazias chegam como `""`, não como `null`.

### Meu contrato
- Dados do `ContratoDto`: número (`contratoId`), status, plano e dia de vencimento.
- **Ver/baixar PDF:** `GET /documentos/contrato` com o cookie de sessão. Baixar com `expo-file-system` e abrir ou compartilhar com `expo-sharing`. Outros `:tipo`: `termoadesao`, `contratofidelidade`, `termocomodato` (quais exibir depende do provedor). Se a API responder erro, mostrar "Documento indisponível no momento".
- **Declaração de quitação:** seletor de ano → `GET /quitacao/:ano`. A API devolve erro quando não há faturas pagas no ano ("Não há faturas pagas neste ano").

### Meu plano
- `GET /plano`. `download`/`upload` vêm em **kbps**: mostrar em Mega (`kbps / 1024`, arredondado). `null` → mostrar só `planointernet` e o valor do contrato.
- Botão "Quero mudar de plano" → WhatsApp do provedor (número a definir).

### Perfil
- Nome (`user.name`), CPF/CNPJ mascarado (`user.username`), contrato atual e a opção de trocar de contrato.
- Trocar senha (`authClient.changePassword`), ativar/desativar biometria e sair (`authClient.signOut` e limpar o SecureStore).
- **Não exibir** `user.email`, que pode ser técnico.

---

## 5. Erros

| Origem | Formato | O que fazer |
|---|---|---|
| Rotas `/auth/*` | `{ message, code }` (códigos do Better Auth, ver 2.2) | mensagem específica por `code` |
| Rotas do app | `{ code, message }` | ver abaixo |
| `401` | sessão ausente/expirada | ir para o Login |
| `403` `TROCAR_SENHA` | primeiro acesso pendente | ir para "Criar nova senha" |
| `429` | muitas tentativas | aguardar e permitir tentar de novo |
| `5xx` / SGP fora do ar | `{ code, message }`; `message` pode trazer "informando o codigo SE…" | mostrar a `message` e manter na tela o último dado carregado (TanStack Query com dados em cache) |

O app precisa **funcionar com o SGP fora do ar**: mostrar o último dado conhecido com um aviso, sem travar (requisito RNF-06).

---

## 6. DTOs de saída (rotas 🕓)

Todos os campos chegam como o SGP devolve. Datas em `"AAAA-MM-DD"` ou `"AAAA-MM-DD HH:MM:SS"`. Valores em reais (`number`).

```ts
type ContratoDto = {
  contratoId: number;
  clienteId: number;
  cpfCnpj: string;               // com máscara
  razaoSocial: string;
  contratoStatus: 1 | 3 | 4 | 7 | number;
  contratoStatusDisplay: string; // "Ativo", "Suspenso"…
  motivo_status: string;
  planointernet: string;         // nome do plano (ex.: "500MB - MOVI TELECOM")
  cobVencimento: number | null;  // dia do vencimento
  popId: number;
  popNome: string;
  telefones: string[];
  emails: string[];
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

- **Back-end:** falta o plugin `expo()` do `@better-auth/expo` no servidor e o `trustedOrigins` com o scheme do app (`ultranetx://`). Sem isso o login pelo app nativo não funciona. Avisar o back-end antes de integrar.
- **Rotas 🕓:** usar dados simulados com os DTOs da seção 6.
- **"Esqueci a senha"**, **suporte/chamados**, **desbloqueio em confiança** e **número do WhatsApp**: aguardando decisão do provedor.
- **Domínio** da API: a definir.

## 8. Identidade visual (resumo)

Vermelho `#E10A0A` (ações e alertas) · marinho `#252F3D` (superfícies) · fundo `#F4F6F9` · degradê do cabeçalho `#F0201C → #B00808` · fontes Ubuntu (títulos) e Inter (textos) · **tema só claro**. Protótipo navegável: https://claude.ai/artifact/EFH8KT2LebBZSBWHd9gAFu
