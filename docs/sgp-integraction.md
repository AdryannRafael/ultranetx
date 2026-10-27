# Integração com o SGP (TSMX)

> Documento técnico interno da API Ultra Net X. Fonte: coleção Postman pública do SGP
> (https://documenter.getpostman.com/view/6682240/2sB34hHg2V), lida em 26/10/2026.
> Nada aqui foi testado ainda. Todo endpoint marcado **A testar** precisa ser confirmado no demo (`demo.sgp.net.br`) antes de entrar no adaptador.

## 1. Autenticação no SGP

O SGP aceita três modos. A API vai usar só o primeiro.

| Modo | Como envia | Uso na nossa API |
|---|---|---|
| **Token/App** | Campos `token` e `app` no corpo (form-data) | **Sim.** Token gerado em Sistema > Ferramentas > Painel Admin > Tokens |
| Basic Auth | Usuário e senha de um operador do SGP | Não, exceto se algum endpoint útil só aceitar esse modo (ver SMS na seção 4) |
| CPF/CNPJ + senha da Central | Campos `cpfcnpj` e `senha` | **Não.** O login do app é próprio, e a senha da Central nunca é pedida nem guardada |

Observações:

- Os endpoints de `/api/central/*` sem `token`/`app` na documentação (`contratos`, `verificaacesso`, `extratouso`, `promessapagamento`, `fatura2via`, `pagamento/pix`) só aceitam CPF + senha da Central. Para todos eles há um equivalente em `/api/ura/*` que aceita Token/App.
- Os endpoints de `/api/centralapp/*` (PDF do contrato, quitação, avisos, alterar senha) pedem `login` + `password` do serviço + o token do app da Central. **Não vamos usá-los.** Na seção 3 está a alternativa para cada um.
- O corpo vai em `multipart/form-data` nos `POST`. Alguns `GET` (ex.: impressão de contrato) também leem os parâmetros do **corpo**. Testado no demo: query string é ignorada (`[contrato] obrigatório`), `POST` dá 405 e o `fetch` não envia corpo em `GET`. Por isso o proxy usa `node:https` para esses casos.

### 1.1 O que o demo mostrou (26/10/2026)

- `SGP_URL` no `.env` termina em `/api/`. O proxy aceita a URL com ou sem `/api`.
- Token inválido: `403 {"detail":"Credenciais de autenticação incorretas."}`.
- `consultacliente` filtra o CPF corretamente e também devolve contratos **cancelados** (`contratoStatus` 3). O BFF decide quais exibir.
- `central/titulos` difere da documentação: o campo é `gerapix` (não `gerarpix`), há `link_completo` com a URL absoluta do boleto e `linhadigitavel` pode vir `null`. A lista vem do vencimento mais distante para o mais próximo.
- `ura/pagamento/pix` sem Pix configurado: `{"status":0,"msg":"Sem Dados Pix"}`.
- `contratos/print/{tipo}` com Token/App **autentica**: contrato inexistente dá `404 "Contrato não econtrato"`. Para o contrato 1856 do demo, o SGP devolveu uma página HTML de "500 - Erro Interno" **com status 200**, provavelmente porque não há modelo de contrato configurado (P-10). Falta confirmar o PDF com um contrato que tenha modelo.

## 2. Endpoints que vamos usar no MVP

### 2.1 Identificação do cliente (primeiro acesso, login e checagem de sessão)

**`POST /api/ura/consultacliente/`** · Token/App · **A testar**

- Filtro obrigatório (um deles): `cpfcnpj`, `contrato`, `nome`, `login` etc. Nós usamos `cpfcnpj`.
- Filtros úteis: `status` (status do contrato), `tipo_contato` (`whatsapp`, `celular`, `email`...), `incluir_unificados`.
- Devolve uma lista `contratos[]`. Cada item traz:
  - Identidade: `clienteId`, `contratoId`, `cpfCnpj`, `razaoSocial`, `dataNascimento`.
  - Situação: `contratoStatus` (1 = Ativo, 4 = Suspenso, 7 = Ativo com velocidade reduzida), `contratoStatusDisplay`, `motivo_status`.
  - Contatos para o código de verificação: `telefones[]`, `telefones_cargos[]`, `emails[]`.
  - Plano: `planointernet`, `servico_plano`.
  - Financeiro: `contratoValorAberto`, `contratoTitulosAReceber`, `promessasPagamentoMes`.
  - Outros: `popId` / `popNome` (filtra avisos de manutenção) e **`link_quitacao`** (ver 2.5).

> ⚠️ **Dados sensíveis na resposta:** `contratoCentralSenha`, `contratoCentralLogin`, `servico_senha`, `servico_login`, `servico_wifi_password`, `servico_wifi_password_5`, MAC e IP.
> O adaptador precisa **descartar esses campos assim que recebe a resposta**. Eles não podem ser logados, cacheados no Redis nem repassados ao app. A resposta crua do SGP nunca deve ir para o log.

Usos:

1. **Primeiro acesso / esqueci a senha:** confirmar que o CPF/CNPJ existe, que há contrato ativo e pegar os contatos para enviar o código.
2. **Checagem de sessão** (cache de 1 h): confirmar que o contrato segue ativo e é do mesmo CPF/CNPJ.
3. **Lista de contratos do titular** (RF-00, escolha de contrato) e dados de plano (RF-04).

Alternativa mais leve para checar a situação: `POST /api/ura/listacontrato/` (filtro por `contrato` e `status`, retorna `status`, `motivo_status`, `data_status`). Não filtra por CPF.

### 2.2 Faturas — atual e histórico (RF-01 e RF-02)

**`POST /api/central/titulos/`** · Token/App · **A testar**

- Parâmetros: `contrato`, `status` (1 = Em aberto, 2 = Pago, 3 = Cancelado; sem status, vêm só as não canceladas), `offset`, `limit` (máx. 250), `imprimir_nota_fiscal`.
- Campos de cada fatura: `id`, `numero_documento`, `status`/`statusid`, `valor`, `valorcorrigido`, `vencimento`, `vencimento_atualizado`, `data_pagamento`, `link` (boleto, caminho relativo), `linhadigitavel`, `codigopix`, `gerarpix`.
- **Fatura atual:** `status=1`, ordenar por vencimento no BFF e pegar a mais antiga. **Histórico:** sem status, com paginação.
- `link` vem relativo (`/teste/boleto/...`). O BFF precisa completar com a URL da instância.

**Alternativa:** `POST /api/ura/titulos/` · Token/App

- Mais filtros: `data_vencimento_inicio/fim`, `data_pagamento_inicio/fim`, `ordenar` (`data_vencimento`...) e `ordenar_ordem` (`asc`/`desc`). Isso facilita o recorte de 12 meses do RF-02.
- Traz também `link_cobranca` (página pública de pagamento), `valorPago`, `codigoBarras` e `acordoPagamento`.
- Não traz `vencimento_atualizado`.
- **Sugestão:** testar os dois no demo e escolher um. Se nenhum sozinho cobrir tudo, a central serve para a fatura atual e a URA para o histórico.

### 2.3 Pix da fatura (RF-01)

**`POST /api/ura/pagamento/pix/{fatura}`** · Token/App · **A testar**

- Body: `contrato`. Na URL: o `id` do título.
- Devolve `pix` (copia e cola). Se o título ainda não tem Pix e a geração sob demanda está ligada, o SGP gera um novo.
- Só chamar quando `codigopix` vier vazio e `gerarpix` for `true`. O resultado fica em cache de 5 a 10 min.

### 2.4 Contrato em PDF (RF-03) — **resolve o risco em aberto**

**`GET /api/contratos/print/{tipo}`** · **Token/App + `contrato`** · **A testar com prioridade**

- Essa rota está na pasta URA e **aceita Token/App** (o `contrato` é obrigatório nesse modo). Ela substitui `/api/centralapp/contrato/print/{tipo}/`, que não aceita.
- Tipos aceitos: `contrato`, `termoadesao`, `contratofidelidade`, `cancelamento`, `termocomodato`, `termoaceite_web`, `termoprivacidade`.
- Devolve o PDF. Guardar em disco/volume por 7 dias (conforme a arquitetura).
- Quais tipos exibir no app depende da P-10.

### 2.5 Declaração anual de quitação (extra do RF-02)

- `consultacliente` devolve `link_quitacao` por contrato. Verificar no demo se esse link é público e se funciona por ano.
- Se funcionar, ele substitui `/api/centralapp/declaracao/quitacao/{ano}/`, que não aceita Token/App.

## 3. Mapa: o que a Central faria e o que vamos usar

| Necessidade | Rota da Central (não usar) | Rota que vamos usar (Token/App) |
|---|---|---|
| Listar contratos | `/api/central/contratos` (CPF + senha) | `/api/ura/consultacliente/` |
| Faturas | `/api/central/titulos/` | a mesma (aceita Token/App) ou `/api/ura/titulos/` |
| Segunda via | `/api/central/fatura2via/` (CPF + senha) | `/api/ura/fatura2via/` (se precisar; ver 4.1) |
| Pix | `/api/central/pagamento/pix/{id}` (CPF + senha) | `/api/ura/pagamento/pix/{fatura}` |
| PDF do contrato | `/api/centralapp/contrato/print/{tipo}/` | `/api/contratos/print/{tipo}` |
| Quitação | `/api/centralapp/declaracao/quitacao/{ano}/` | `link_quitacao` do `consultacliente` |
| Avisos | `/api/centralapp/avisos/servico/list/` | `/api/ura/manutencao/list/` (ver 4.3) |
| Status da conexão | `/api/central/verificaacesso/` (CPF + senha) | `/api/ura/verificaacesso/` |
| Liberação por confiança | `/api/central/promessapagamento/` (CPF + senha) | `/api/ura/liberacaopromessa/` |
| Alterar senha | `/api/centralapp/alterarsenha/` | **Não se aplica**: a senha é do nosso login |

## 4. Endpoints interessantes (fora do MVP ou dependentes de resposta do cliente)

### 4.1 Financeiro

| Endpoint | O que faz | Por que é interessante | Atenção |
|---|---|---|---|
| `POST /api/ura/fatura2via/` | Faturas abertas/atrasadas com linha digitável e link | Uma chamada só para a tela "pagar agora". `link_pdf=1` devolve o link do boleto em PDF | **Por padrão abre uma ocorrência (protocolo) no SGP.** Sempre enviar `nao_gerar_os=1` |
| `POST /api/central/notafiscal/list/` e `/api/central/nfcom/list` | Notas fiscais do contrato, com `link` público | Tela "Notas fiscais" (já previsto como futuro) | Aceitam Token/App; testar qual modelo de nota a Ultra Net X emite |
| `POST /api/ura/promessapagamento/list` | Promessas de pagamento ativas | Mostrar "você tem uma liberação ativa até dd/mm" | — |

### 4.2 Desbloqueio em confiança (P-03)

**`POST /api/ura/liberacaopromessa/`** · Token/App

- Body: `contrato`; opcionais `data_promessa`, `enviar_sms`, `conteudo`.
- Libera o serviço bloqueado ou reduzido e registra a promessa. Devolve `liberado`, `liberado_dias` e `protocolo`.
- **É uma escrita no SGP.** Só entra se a Ultra Net X aprovar (P-03), com regras já configuradas no SGP e auditoria do nosso lado. Antes de mostrar o botão, conferir `contratoStatus` (4 ou 7) e `promessasPagamentoMes`.

### 4.3 Avisos de manutenção (P-04)

**`GET /api/ura/manutencao/list/`** · Token/App (confirmar)

- Lista manutenções com `descricao`, `data_inicial`, `data_final`, `mensagem_central`, `ativa`, `severidade` e os `pops` afetados.
- O BFF filtra pelo `popId` do contrato do cliente e mostra um banner no app.
- Também serve para o RNF-06: explicar a queda antes que o cliente abra um chamado.

### 4.4 Status da conexão

**`POST /api/ura/verificaacesso/`** · Token/App

- Body: `contrato`. Devolve se o serviço está online (1), offline (2) ou em manutenção (9).
- Bom para um indicador "Sua internet está funcionando" na tela inicial ou no "Meu plano" (extra do RF-04).
- **Não** enviar `protocolo_ura`: com ele, o SGP abre uma ocorrência.
- Atenção: a resposta de exemplo tem um campo `staus` (com erro de digitação) além de `status`. Ver no demo qual dos dois é o confiável.

### 4.5 Chamados de suporte (P-02)

Todos aceitam Token/App:

| Endpoint | Uso |
|---|---|
| `POST /api/central/tipoocorrencia/list/` | Tipos de chamado para o cliente escolher |
| `POST /api/central/chamado/` | Abrir chamado (`contrato`, `conteudo`, `ocorrenciatipo`, `contato_numero`, `sem_os`) |
| `POST /api/central/chamado/list/` | Acompanhar chamados do contrato (protocolo, status, agendamento, técnico) |
| `POST /api/central/chamado/{os_id}/anexo/add/` | Anexar foto (ex.: luz do roteador) |

A resposta de `chamado/list` traz `servicos[].servico_password` e o IP/MAC do serviço. Descartar no adaptador, como na seção 2.1.

### 4.6 Envio do código de verificação pelo gateway do próprio provedor

**`GET /api/sms/send/`** e **`GET /api/sms/gateway/list/`** · **Basic Auth** (usuário do SGP)

- Envia SMS/WhatsApp pelo gateway que a Ultra Net X já tem configurado no SGP (`phone`, `msg`, `gateway`, `idcliente`).
- **Pode resolver a decisão em aberto sobre o canal do código** sem contratar outro fornecedor e usando o mesmo remetente que o cliente já conhece.
- Pontos a confirmar: se aceita Token/App (a documentação só mostra Basic Auth, o que exigiria um usuário de serviço no SGP), qual gateway a Ultra Net X usa, custo por mensagem e se dá para saber se a mensagem foi entregue.

### 4.7 Outros

| Endpoint | Uso possível |
|---|---|
| `GET /api/ura/consultaplano/` | Catálogo de planos (id, descrição, preço). Pode alimentar uma tela "Conheça outros planos" junto do botão de WhatsApp (P-11) |
| `POST /api/central/extratouso/` | Extrato de consumo por dia. **Só aceita CPF + senha da Central**, então fica fora até a TSMX oferecer uma alternativa |
| `GET/POST /api/contrato/termoaceite/{idcontrato}/` | Exibir e aceitar o termo de aceite. Pode servir para aceite digital de contrato no app no futuro (Basic Auth) |
| `GET /api/auth/info/` | Dados do usuário autenticado. Pode servir de *health check* da integração (Basic Auth; testar com Token/App) |
| `POST /api/ura/configuracoes/` | Consultar variáveis do SGP (ex.: se a geração de Pix sob demanda está ligada) |

## 5. Endpoints que **não** devemos chamar

O token do SGP deve ter só as permissões necessárias. Mesmo assim, o adaptador não deve ter código para estes:

- `/api/banco/titulo/{id}/baixar/`, `/estornar/`, `/cancelar/`, `/descancelar/`: liquidam, estornam ou cancelam faturas. São as permissões "Permite Baixar Título" e "Cancelar Título", que devem ficar **desligadas**.
- `/api/ura/cliente/mensalidade/avulsa/add/`, `/api/ura/cliente/titulo/avulso/add/`, `/api/ura/acordopagamento`: geram cobranças.
- `/api/ura/contrato/edit/`, `/api/ura/contrato/status/edit/`, `/api/ura/cliente/servico/senha/edit/`, `/api/ura/contato/add/`: alteram cadastro. O RNF-08 diz que o app nunca altera dados.
- Pastas FTTH, RADIUS, Gerenciador CPE, Estoque, Ordem de Serviço (operador), Remessa/Retorno, CRM (cadastro) e Pré-Cadastro: são para operação interna. Um eventual autoatendimento de Wi-Fi (trocar senha via CPE) seria uma decisão à parte, com o cliente.

## 6. Regras para o adaptador (`sgp`)

1. Único lugar do código que conhece rotas e campos do SGP. O resto usa modelos próprios (`Cliente`, `Contrato`, `Fatura`, `Plano`, `Aviso`).
2. Remove os campos sensíveis (senhas, Wi-Fi, MAC, IP) logo na tradução.
3. Normaliza o que vem inconsistente: `status` com espaços (`" Ativo "`), datas em formatos diferentes (`dd/mm/aaaa hh:mm:ss` e ISO), campos com nomes trocados (`cpfcnpj`/`cpfCnpj`, `staus`) e links relativos.
4. Envia `nao_gerar_os=1` em toda chamada que, sem isso, abre ocorrência.
5. Timeout curto, retry só em leituras e cache conforme a tabela de cache da arquitetura.
6. Testes de contrato com respostas gravadas do demo (sem dados reais).

## 7. Mapa do proxy (`src/src/sgp`)

Funções em `api/<contexto>.api.ts` e tipos em `types/<contexto>.types.ts`. Uso: `sgp.<contexto>.<Função>`.

| Contexto | Função | Rota do SGP | Uso no app | Demo |
|---|---|---|---|---|
| `cliente` | `Consultar(cpfcnpj)` | `POST /api/ura/consultacliente/` | Primeiro acesso, sessão, contratos e plano (RF-00/04) | ✅ |
| `fatura` | `Listar({ contrato, status })` | `POST /api/central/titulos/` | Fatura atual e histórico (RF-01/02) | ✅ |
| `fatura` | `ListarPorPeriodo({ contrato, vencimentoInicio, ... })` | `POST /api/ura/titulos/` | Histórico de 12 meses (RF-02) | ✅ |
| `fatura` | `SegundaVia(contrato)` | `POST /api/ura/fatura2via/` (`nao_gerar_os=1`) | "Pagar agora": multa, juros e links | ✅ |
| `fatura` | `ObterPix(fatura, contrato)` | `POST /api/ura/pagamento/pix/{id}` | Pix copia e cola (RF-01) | ✅ (demo sem Pix) |
| `documento` | `Imprimir(contrato, tipo)` | `GET /api/contratos/print/{tipo}` | PDF do contrato (RF-03) | ⚠️ demo sem modelo |
| `documento` | `BaixarQuitacao(link, ano)` | `GET /api/declaracao/quitacao/…/{ano}` | Declaração anual (RF-02) | ⚠️ trava >60 s no demo |
| `notaFiscal` | `Listar(contrato)` | `POST /api/central/notafiscal/list/` | Notas fiscais | ✅ |
| `plano` | `Listar(tipo?)`, `BuscarPorDescricao(nome)` | `GET /api/ura/consultaplano/` | Velocidade do plano (P-16) | ✅ |
| `conexao` | `Verificar(contrato)` | `POST /api/ura/verificaacesso/` | "Sua internet está funcionando" | ✅ |
| `manutencao` | `Listar(popId?)` | `GET /api/ura/manutencao/list/` | Banner de manutenção (P-04, RNF-06) | ✅ |
| `promessa` | `Listar(contrato)` | `POST /api/ura/promessapagamento/list` | Liberação ativa | ✅ |
| `promessa` | `Liberar(contrato)` — **escrita** | `POST /api/ura/liberacaopromessa/` | Desbloqueio em confiança (P-03) | ⛔ não testado |
| `chamado` | `ListarTipos()`, `Listar({ contrato })` | `POST /api/central/tipoocorrencia/list/`, `/chamado/list/` | Suporte (P-02) | ✅ |
| `chamado` | `Criar({ contrato, conteudo })` — **escrita** | `POST /api/central/chamado/` | Abrir chamado (P-02) | ⛔ não testado |

As funções de escrita não foram chamadas no demo porque ele é compartilhado. Elas só devem ser expostas ao app depois das respostas P-02 e P-03.

Achados do demo (complementam a seção 1.1):

- `ura/titulos` só aplica o período quando recebe **as duas datas**. Com uma só, devolve 0 títulos. O proxy completa a data que faltar.
- O contrato não traz o id do plano. O vínculo com o catálogo é pelo nome (`planointernet` = `descricao`), e funcionou em 6 de 7 contratos testados. O catálogo traz `download`/`upload` em kbps, o que resolve a P-16 sem depender do nome do plano.
- `link_quitacao` funciona **sem login** (os hashes no caminho dão o acesso). Um ano sem pagamentos devolve `400 "Não há titulos pagos para o contrato e ano selecionado."`. Por isso o link nunca vai para log nem para o app.
- `nfcom/list` respondeu 500 no demo e ficou fora do proxy.
- Ficaram fora por exigirem CPF + senha da Central ou Basic Auth: `extratouso`, `sms/send`, `termoaceite`. O anexo de chamado ficou fora por enquanto (upload de arquivo).

## 8. Próximos passos

- [x] No demo: `consultacliente`, `central/titulos`, `ura/pagamento/pix` e `contratos/print/contrato` respondem com Token/App (ver 1.1). Implementados em `src/src/sgp/proxy.ts`.
- [ ] Gravar respostas de exemplo (sem dados sensíveis) para os testes de contrato.
- [ ] Confirmar o PDF com um contrato que tenha modelo configurado (no demo ou com a TSMX).
- [ ] Confirmar se `link_quitacao` funciona sem login da Central.
- [ ] Confirmar se `manutencao/list` e `sms/send` aceitam Token/App.
- [ ] Levar à Ultra Net X: uso do gateway de SMS/WhatsApp do SGP para o código de verificação (seção 4.6).
- [ ] Atualizar o `CLAUDE.md` e o documento de arquitetura se o PDF por `/api/contratos/print/` funcionar.
