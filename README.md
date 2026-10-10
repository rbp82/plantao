# Plantão — calculadoras clínicas e protocolos (PWA)

App web mobile-first, instalável e offline, para plantão de UTI e emergência: calculadoras auditadas (vasoativas, sedação, sepse, ajuste renal de antimicrobianos, CAD, sódio, TEG, fluido-responsividade, ventilação…), **protocolos institucionais em Markdown alimentados pelo GitHub**, acompanhamento por leito e PCR guiada. Site: **https://rbp82.github.io/plantao/** · repositório: https://github.com/rbp82/plantao.

## Duas camadas, um cofre

| | Onde | O quê |
|---|---|---|
| **App novo** (`web/`) | `/plantao/` | React 19 + HeroUI v3/Pro + Tailwind v4. Tela inicial, busca, todas as calculadoras, aba **Protocolos**, lista de pacientes, ajustes/segurança. |
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
  src/components/               ui.tsx (kit), InfusionCard.tsx, Shell.tsx
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

HeroUI Pro exige login (`cmd /c "npx.cmd heroui-pro@latest login"`) para instalar `@heroui-pro/react`.

## Publicação e Deploy (GitHub Pages)

Para gerar o pacote de deploy e publicar:

```
# Opção 1: Via script PowerShell (na raiz do projeto)
.\deploy.ps1

# Opção 2: Via CMD / Prompt de Comando (ou duplo clique)
deploy.cmd

# Opção 3: Dentro da pasta web/ via npm
npm run deploy
```

### Parâmetros úteis do `deploy.ps1`
- `.\deploy.ps1`: Executa typecheck, testes (Vitest), build (Vite + Postbuild) e gera a pasta `deploy/github-pages` com o app novo, legado (`legado/`) e protocolos (`protocolos/`).
- `.\deploy.ps1 -SkipTests`: Pula a execução dos testes automatizados.
- `.\deploy.ps1 -SkipTypecheck`: Pula a verificação de tipos.
- `.\deploy.ps1 -OutputDir <caminho>`: Especifica pasta de saída personalizada.
- `.\deploy.ps1 -Push -Message "Mensagem do commit"`: Se o Git estiver configurado, realiza o commit e push automaticamente.

Além disso, o repositório conta com workflow de CI/CD automatizado via **GitHub Actions** em `.github/workflows/deploy.yml` que testa, compila e publica no GitHub Pages automaticamente a cada push na branch `main`.

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
