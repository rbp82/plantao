# Plantão — calculadoras clínicas, leitos, PCR guiada e protocolos (PWA)

App web mobile-first, instalável e offline, para plantão de UTI e emergência: calculadoras auditadas (vasoativas, sedação, sepse, ajuste renal de antimicrobianos, CAD, sódio, TEG, fluido-responsividade, ventilação…), **quadro de leitos** com ficha, gasometria completa com tendência e leitura do ticket por foto (OCR no próprio aparelho), **PCR guiada** (ACLS adulto, AHA 2025) com cronômetros, registro e relatório, e **protocolos institucionais em Markdown** publicados a partir do GitHub. Site: **https://rbp82.github.io/plantao/** · repositório: https://github.com/rbp82/plantao.

Um único app React 19 + TypeScript + HeroUI v3 (`@heroui/react`) + Tailwind v4, em `web/`. Não há mais "app anterior": toda a lógica clínica foi portada para TypeScript em `web/src/lib` (com os testes originais) e as telas para React.

## Navegação

Barra inferior fixa, a mesma em todas as telas: **Calcular** (`#/`), **Protocolos** (`#/protocolos`), **Leitos** (`#/leitos`) e **PCR** (`#/pcr`, vermelha; mostra "Em curso" enquanto há uma PCR registrada). Cada calculadora fica em `#/<id>`; a gasometria completa em `#/gaso?novo=1`; `#/ajustes` tem tema, bloqueio automático, biometria, troca de senha e apagar tudo.

Princípios: resumo primeiro e detalhe sob demanda; cor só no que está fora do normal; alvos de toque ≥ 44 px; sem botão "calcular" (tudo reativo); dados do paciente (peso, idade, sexo, altura, Cr) compartilhados entre calculadoras, ficha e gasometria.

## Leitos, gasometria e PCR

- **Leitos** (`#/leitos`): azulejos por leito com a última gasometria (pH, lactato, P/F com setas de variação), dias de UTI, isolamento, alergia e paciente ativo; identificação rápida por iniciais, leito ou nº de atendimento; avulso (sem identificação, apaga em 12 h); admissão com ficha completa; altas e arquivados.
- **Paciente** (`#/paciente?id=`): ficha resumida, última gasometria, tendência por parâmetro, registros, paradas registradas, nova gasometria, editar ficha, alta/arquivar.
- **Gasometria** (`#/gaso?id=&rec=` ou `#/gaso?novo=1`): entrada por grupos (arterial, venosa central, hemodinâmica, ventilação, fluidos, renal), leitura com veredito, achados por canal, comparação com o registro anterior e mapa de Davenport; **foto do ticket do gasômetro** → OCR local (Tesseract, ≈ 15 MB baixados no primeiro uso e guardados offline) → conferência valor a valor com recortes da foto → lançamento.
- **PCR** (`#/pcr`): algoritmo AHA 2025 caixa a caixa, cronômetro total e do ciclo, alertas de checagem de ritmo e de adrenalina, registro de cada ação com um toque, H's e T's, pós-RCE, encerramento e **relatório** (`#/pcr-relatorio?id=`) para copiar/compartilhar. Tela acesa e bloqueio automático suspenso enquanto a PCR estiver ativa.

## Protocolos

A aba Protocolos mostra os `.md` da pasta [`protocolos/`](protocolos/) deste repositório. **Para publicar ou editar um protocolo basta criar/editar o arquivo pelo site do GitHub** (ou pelo Obsidian no celular, ver o LEIAME): o push dispara o build, que copia a pasta para o site e gera `protocolos/index.json` com título, categoria, resumo etc. lidos do cabeçalho de cada arquivo (`web/scripts/protocolos.mjs`). Em 1–2 minutos está no ar. Tudo vem da mesma origem do app — sem API do GitHub nem limite de requisições — e entra no pré-cache do service worker: protocolos, imagens e links entre eles funcionam offline. A busca procura também no texto inteiro. Regras (subpasta = categoria, cabeçalho opcional com `titulo/categoria/resumo/atualizado/autor/ordem`, arquivos iniciados por `_` ignorados, imagens por caminho relativo) estão em [`protocolos/_LEIAME.md`](protocolos/_LEIAME.md); modelo em `protocolos/_modelo.md`. Os dois protocolos incluídos são **exemplos** a substituir pelos documentos oficiais do serviço.

## Estrutura

```
web/
  src/lib/core/                 num.ts (números pt-BR, formatação, limites, faixas), renal.ts, infMath.ts,
                                vault.ts (cofre AES-GCM + store), patients.ts — com os testes originais
  src/lib/engine.ts             motor de gasometria/hemodinâmica/ventilação/renal (auditado) + definições de campos
  src/lib/scan.ts               leitura do ticket por foto: parse (puro) e OCR local
  src/lib/beds.ts               leitos: registros, ficha, tendência, formatação
  src/lib/pcr.ts                PCR: algoritmo (derive/guide), referências AHA e relatório
  src/lib/calc.ts               agregador `C` (num, fmt, renal, infMath, store, Vault, Patients, engine, gasF…)
  src/lib/                      store.ts, patients.ts (ganchos React), router.ts, protocols.ts
  src/components/               ui.tsx (kit), pro.tsx (Segment, ListView, Sheet…), InfusionCard.tsx, Shell.tsx
  src/tools/<grupo>/<id>.{calc.ts,tsx,test.ts}   uma calculadora = lógica pura + componente + testes
  src/screens/                  Lock, Home, ToolPage, Settings, Protocols (+ ProtocolBody), beds/ (Board, PatientPage, Ficha, Gaso, GasoScan), pcr/ (PcrStart, PcrLive, PcrReport)
  src/styles/                   app.css (tema + só os componentes HeroUI usados), fonts.css (Inter e IBM Plex Mono empacotadas)
  public/                       manifest.webmanifest, icons/, ocr/ (Tesseract: baixado sob demanda, fora do pré-cache)
  scripts/postbuild.mjs         gera dist/sw.js (pré-cache com hash) e publica protocolos/
  scripts/protocolos.mjs        índice dos protocolos (index.json) e servidor da pasta em desenvolvimento; frontmatter.mjs = cabeçalho
  CONVENTIONS.md                convenções para criar calculadoras e telas
protocolos/                   protocolos em Markdown (publicados junto com o app a cada push)
AUDITORIA.md, PESQUISA*.md    fórmulas conferidas, fontes e correções (motor, calculadoras, ACLS)
```

## Desenvolvimento (`web/`)

Node 22+ (na máquina atual: `%USERPROFILE%\node`; a política do PowerShell bloqueia `npx.ps1`, use `cmd /c "npx.cmd …"`).

```
npm install            (node_modules pode ser uma junção fora do OneDrive)
npm run dev            http://localhost:5173/plantao/  (a pasta ../protocolos é servida em /plantao/protocolos/)
npm test               Vitest — 613 testes: calculadoras, núcleo e cofre, motor de gasometria, leitura por foto,
                       leitos, PCR e protocolos (valores esperados conferidos à mão contra as fontes)
npm run typecheck      tsc --noEmit
npm run build          vite build + scripts/postbuild.mjs → dist/ pronto para o GitHub Pages
npm run preview        serve dist/ em http://localhost:4173/plantao/
```

Só dependências públicas do npm; nada externo em tempo de execução (fontes e OCR empacotados).

## Publicação (GitHub Pages via GitHub Actions)

**Publicar = fazer push na branch `main`.** O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda typecheck, os testes, `npm run build` e envia `web/dist/` para o GitHub Pages com `actions/deploy-pages`. Em 1–2 minutos o site está atualizado. Dá para disparar à mão em **Actions → Deploy Plantão to GitHub Pages → Run workflow**.

Configuração necessária no repositório (feita uma vez): **Settings → Pages → Build and deployment → Source = GitHub Actions**.

`deploy.ps1` (ou `deploy.cmd`, ou `npm run deploy` em `web/`) reproduz localmente o que o workflow faz e deixa o resultado em `deploy/github-pages/` para conferir antes de publicar (`-SkipTests`, `-SkipTypecheck`, `-OutputDir`, `-Commit`, `-Push`).

O `sw.js` é gerado a cada build com a versão `plantao-web-<package.json version>-<hash do conteúdo>`: qualquer build diferente vira uma versão nova, instalada em segundo plano e aplicada na próxima troca de tela, levando a sessão junto (sem pedir a senha de novo). Os arquivos do OCR ficam num cache próprio, preenchido no primeiro uso e mantido entre versões.

## Adicionar uma calculadora

Ver [`web/CONVENTIONS.md`](web/CONVENTIONS.md): `src/tools/<grupo>/<id>.calc.ts` (função pura), `<id>.tsx` (componente + `registerTool`), `<id>.test.ts`, e importar no `index.ts` do grupo. Helpers auditados em `C` (`@/lib/calc`): `C.num`, `C.fmt`, `C.renal`, `C.infMath`, `C.engine`, `C.gasF`, `C.LIM`…

## Login, criptografia e pacientes

- Na primeira abertura o app pede para criar uma senha. Tudo o que ele guarda fica num único bloco cifrado com **AES-256-GCM** no `localStorage`; só o tema fica em texto claro.
- A chave de dados é aleatória (256 bits), guardada cifrada pela senha (PBKDF2-SHA256, 600 000 iterações) e, opcionalmente, pela biometria (passkey WebAuthn com extensão PRF + HKDF). Trocar a senha não invalida a biometria.
- Não há servidor nem conta: **a senha não pode ser recuperada**. "Esqueci a senha" apaga tudo.
- Bloqueio automático por inatividade (2, 5, 10 ou 30 min; suspenso durante uma PCR), espera crescente após 5 senhas erradas e modo temporário ("usar sem salvar dados").
- Biometria: Android com Chrome recente ou iPhone com iOS 18+, ativável só no endereço definitivo.
- **Pacientes:** identificados por iniciais, leito ou nº de atendimento; o ativo alimenta peso, idade, sexo, altura e creatinina em todas as calculadoras; sem paciente ativo, registro avulso que expira em 12 h. O formato dos dados é o mesmo das versões anteriores: aparelhos que já tinham pacientes, gasometrias e relatórios de PCR continuam abrindo tudo.

## Testes e auditoria

- `npm test` em `web/` (Vitest). Cada calculadora tem o seu `*.test.ts`; os módulos de `src/lib` carregam as asserções da bateria original (números pt-BR, infusões, função renal, gasometria e motor completo, cofre criptografado, leitos, PCR caixa a caixa, leitura do ticket) mais casos de borda.
- Fórmulas, fontes e correções: [AUDITORIA.md](AUDITORIA.md). Base do motor de gasometria: [PESQUISA.md](PESQUISA.md); PCR: [PESQUISA-ACLS.md](PESQUISA-ACLS.md).
