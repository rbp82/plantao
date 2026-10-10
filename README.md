# Plantão — calculadoras clínicas e protocolos (PWA)

App web mobile-first, instalável e offline, para plantão de UTI e emergência: calculadoras auditadas (vasoativas, sedação, sepse, ajuste renal de antimicrobianos, CAD, sódio, TEG, fluido-responsividade, ventilação…), **protocolos institucionais em Markdown alimentados pelo GitHub**, acompanhamento por leito e PCR guiada. Site: **https://rbp82.github.io/plantao/** · repositório: https://github.com/rbp82/plantao.

## Duas camadas, um cofre

| | Onde | O quê |
|---|---|---|
| **App novo** (`web/`) | `/plantao/` | React 19 + HeroUI v3 (`@heroui/react`) + Tailwind v4, com componentes próprios em `src/components/pro.tsx` no lugar do HeroUI Pro. Tela inicial, busca, todas as calculadoras, aba **Protocolos**, lista de pacientes, ajustes/segurança. |
| **App anterior** (raiz) | `/plantao/legado/` | Vanilla JS. Ainda responde por **Leitos (quadro completo, ficha, gasometria com tendência e leitura por foto)** e **PCR guiada**. Fase 2: portar para o app novo. |

Os dois compartilham o mesmo cofre criptografado (`localStorage` da mesma origem) e **a sessão passa de um para o outro sem pedir a senha de novo** (`Vault.handoff()`/`resume()` em `assets/js/core.js`: a chave de dados, não exportável, atravessa pelo IndexedDB com validade de 60 s e é apagada ao ser lida). O mesmo mecanismo evita pedir a senha quando o app recarrega para aplicar uma atualização.

## Navegação (app novo)

Barra inferior: **Calcular** (`#/`), **Protocolos** (`#/protocolos`), **Leitos** (`#/leitos`, lista de pacientes; o quadro completo abre no legado) e **PCR** (vermelho; abre o ACLS guiado no legado). Cada calculadora fica em `#/<id>`; `#/ajustes` tem tema, bloqueio automático, biometria, troca de senha e apagar tudo.

Princípios: resumo primeiro e detalhe sob demanda; cor só no que está fora do normal; alvos de toque ≥ 44 px; sem botão "calcular" (tudo reativo); dados do paciente (peso, idade, sexo, altura, Cr) compartilhados entre calculadoras.

## Protocolos

A aba Protocolos lê a pasta [`protocolos/`](protocolos/) deste repositório pela API do GitHub e guarda tudo em cache para uso offline. **Para publicar ou editar um protocolo basta criar/editar um `.md` na pasta pelo site do GitHub** — sem build. Regras (subpasta = categoria, cabeçalho opcional com `titulo/resumo/atualizado/autor/ordem`, arquivos iniciados por `_` ignorados) estão em [`protocolos/_LEIAME.md`](protocolos/_LEIAME.md); modelo em `protocolos/_modelo.md`. Os dois protocolos incluídos são **exemplos** a substituir pelos documentos oficiais do serviço.

## Estrutura

```
web/                          app novo (fonte)
  src/legacy/{core,engine}.js   cópias idênticas dos motores auditados (window.Calc)
  src/lib/                      calc.ts (ponte tipada), store.ts, patients.ts, router.ts, protocols.ts
  src/components/               ui.tsx (kit), pro.tsx (Segment, ListView, Sheet… substitutos do HeroUI Pro), InfusionCard.tsx, Shell.tsx
  src/tools/<grupo>/<id>.{calc.ts,tsx,test.ts}   uma calculadora = lógica pura + componente + testes
  src/screens/                  Lock, Home, ToolPage, Patients, Settings, Protocols
  public/                       manifest.webmanifest, icons/
  scripts/postbuild.mjs         gera dist/sw.js (pré-cache com hash) e copia o legado para dist/legado/
  CONVENTIONS.md                convenções para portar/criar calculadoras
protocolos/                   protocolos em Markdown (lidos pelo app direto do GitHub)
index.html, sw.js, manifest.webmanifest, assets/   app anterior (publicado em legado/)
tests/                        304 testes do app anterior (abrir tests/index.html por HTTP)
AUDITORIA.md, PESQUISA*.md    fórmulas conferidas, fontes e correções
```

## Desenvolvimento (`web/`)

Node 22+ (na máquina atual: `%USERPROFILE%\node`; a política do PowerShell bloqueia `npx.ps1`, use `cmd /c "npx.cmd …"`).

```
npm install            (node_modules pode ser uma junção fora do OneDrive)
npm run dev            http://localhost:5173/plantao/
npm test               Vitest — 255 testes das calculadoras portadas (valores esperados conferidos à mão)
npm run typecheck      tsc --noEmit
npm run build          vite build + scripts/postbuild.mjs → dist/ pronto para o GitHub Pages
npm run preview        serve dist/ em http://localhost:4173/plantao/
```

Só dependências públicas do npm: o HeroUI Pro (que exigia login) foi substituído por componentes próprios em `src/components/pro.tsx`, por isso o build roda no GitHub Actions sem credenciais.

## Publicação (GitHub Pages via GitHub Actions)

**Publicar = fazer push na branch `main`.** O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda typecheck, os testes (Vitest), `npm run build` (Vite + postbuild) e envia `web/dist/` (app novo, `legado/` e `protocolos/`) para o GitHub Pages com `actions/deploy-pages`. Em 1–2 minutos o site em **https://rbp82.github.io/plantao/** está atualizado. Dá para disparar à mão em **Actions → Deploy Plantão to GitHub Pages → Run workflow**.

Configuração necessária no repositório (feita uma vez): **Settings → Pages → Build and deployment → Source = GitHub Actions**. Com *Deploy from a branch* o Pages passa a servir a raiz da branch com Jekyll (o app antigo, e os `.md` de `protocolos/` virando `.html`) e ignora o workflow. A branch `gh-pages` que existiu durante a migração não é mais usada e pode ser apagada.

### Build local (opcional)

`deploy.ps1` reproduz localmente o que o workflow faz e deixa o resultado em `deploy/github-pages/` para conferir antes de publicar:

```
.\deploy.ps1                    typecheck + testes + build + pacote em deploy/github-pages
deploy.cmd                      o mesmo, para duplo clique / Prompt de Comando
npm run deploy                  o mesmo, de dentro de web/
.\deploy.ps1 -SkipTests         pula os testes          -SkipTypecheck pula o tsc
.\deploy.ps1 -OutputDir <pasta> pasta de saída personalizada
.\deploy.ps1 -Commit            commit das alterações (mensagem com -Message "…")
.\deploy.ps1 -Push              commit + push da main — e é o push que publica
```

### Versões e service workers

- O `sw.js` do app novo é gerado a cada build com a versão `plantao-web-<package.json version>-<hash do conteúdo>`: **não precisa editar nada** — qualquer build diferente vira uma versão nova, instalada em segundo plano e aplicada na próxima troca de tela.
- O legado tem o próprio service worker em `legado/sw.js`: ao alterar qualquer arquivo do app anterior (`assets/**`, `index.html`), **incremente `VERSION` em `sw.js`** da raiz, como antes. Os dois service workers convivem (cada um só apaga os caches com o próprio prefixo).
- Arquivos do app anterior que ficaram na raiz do repositório antes da migração podem ser apagados.

## Adicionar uma calculadora (app novo)

Ver [`web/CONVENTIONS.md`](web/CONVENTIONS.md): `src/tools/<grupo>/<id>.calc.ts` (função pura), `<id>.tsx` (componente + `registerTool`), `<id>.test.ts`, e importar no `index.ts` do grupo. Motores auditados em `window.Calc` (`C.num`, `C.fmt`, `C.renal`, `C.infMath`, `C.engine`…).

## Login, criptografia e pacientes

- Na primeira abertura o app pede para criar uma senha. Tudo o que ele guarda fica num único bloco cifrado com **AES-256-GCM** no `localStorage`; só o tema fica em texto claro.
- A chave de dados é aleatória (256 bits), guardada cifrada pela senha (PBKDF2-SHA256, 600 000 iterações) e, opcionalmente, pela biometria (passkey WebAuthn com extensão PRF + HKDF). Trocar a senha não invalida a biometria.
- Não há servidor nem conta: **a senha não pode ser recuperada**. "Esqueci a senha" apaga tudo.
- Bloqueio automático por inatividade (2, 5, 10 ou 30 min), espera crescente após 5 senhas erradas e modo temporário ("usar sem salvar dados").
- Biometria: Android com Chrome recente ou iPhone com iOS 18+, ativável só no endereço definitivo.
- **Pacientes:** identificados por iniciais, leito ou nº de atendimento; o ativo alimenta peso, idade, sexo, altura e creatinina em todas as calculadoras; sem paciente ativo, registro avulso que expira em 12 h.

## Testes e auditoria

- App novo: `npm test` em `web/` (Vitest). Cada calculadora portada tem o seu `*.test.ts` com as asserções originais de `tests/tests.js` mais casos de borda.
- App anterior: `tests/index.html` (304 testes). Rode após qualquer alteração em `assets/js/`.
- Fórmulas, fontes e correções: [AUDITORIA.md](AUDITORIA.md). Base do `engine.js`: [PESQUISA.md](PESQUISA.md); PCR: [PESQUISA-ACLS.md](PESQUISA-ACLS.md).

## Diferenças em relação aos arquivos originais

- Resultados em tempo real; peso/idade/sexo/altura/Cr compartilhados; infusões nos dois sentidos com diluições editáveis salvas no aparelho.
- Correções de bugs do original: contador do bundle de sepse, faixa do propofol (mg/kg/h), comparação de ponto flutuante na vasopressina, prontuário do sódio sem NaCl 3% em sintomas moderados agudos, plural "disfunções" na triagem de sepse, peso que não chegava ao cálculo de débito cardíaco indexado.
