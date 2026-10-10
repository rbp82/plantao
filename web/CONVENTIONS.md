# Plantão (web/) — convenções para portar calculadoras

App React 19 + Vite 8 + Tailwind v4 + HeroUI v3 (`@heroui/react`). Os componentes que vinham do HeroUI Pro (Segment, ListView, ItemCard, RadioButtonGroup, CheckboxButtonGroup, Timeline, EmptyState, Sheet, CellSlider) são implementações próprias em `src/components/pro.tsx`, com a mesma API composta. Rotas por hash. Mobile-first (375 px).

## Comandos (Windows; a política do PowerShell bloqueia `npx.ps1`, por isso `cmd /c npx.cmd`)
Rode a partir de `web/`:
- Testes: `cmd /c "npx.cmd vitest run"` (ou um arquivo: `cmd /c "npx.cmd vitest run src/tools/inf"`). Inclui `src/legacy/suite.test.ts` (bateria do app anterior) e `parity.test.ts` (src/legacy ↔ ../assets/js idênticos: ao corrigir um motor, copie para os dois lugares).
- Tipos: `cmd /c "npx.cmd tsc --noEmit"`
- Build: `cmd /c "npx.cmd vite build"`
Um servidor de desenvolvimento pode já estar rodando em http://localhost:5173/plantao/ (não inicie outro).

## Onde fica cada coisa
- `src/legacy/core.js`, `src/legacy/engine.js`: motores auditados do app anterior, carregados como efeito colateral e expostos em `window.Calc` (ponte tipada em `src/lib/calc.ts` → `import { C, num, fmt, fmtDose, fmtN, isNum, r9 } from '@/lib/calc'`). Funções úteis: `C.num`, `C.fmt(n, casas)`, `C.fmtDose`, `C.fmtN`, `C.rangeTag(v, lo, hi)`, `C.fio2`, `C.berlin`, `C.renal.*`, `C.infMath.*`, `C.LIM` (limites de plausibilidade por campo do paciente), `C.engine` (gasometria/hemodinâmica/ventilação: `C.engine.compute(inputs, cfg, {})`, `C.engine.REF`, `C.engine.fmt`), `C.gasF.F` (definições de campos do engine).
- Código-fonte das calculadoras antigas (a referência do que portar): `../assets/js/tools/{inf,sed,met,hema,delta}.js` e `../assets/js/core.js`. Testes antigos com valores esperados calculados à mão: `../tests/tests.js`. Fontes clínicas: `../AUDITORIA.md`.
- Kit de interface: `src/components/ui.tsx` (abaixo), `src/components/InfusionCard.tsx` (infusões), `src/components/Shell.tsx`.
- Registro: `src/tools/registry.ts` → `registerTool({ id, group, tile, title, sub, keywords, weight?, Component })`. `Component` recebe `ToolProps = { api: { setSummary(texto) }, peso: number }` (peso já validado; NaN se ausente). Cada grupo tem `src/tools/<grupo>/index.ts` que importa as ferramentas do grupo (a ordem de import é a ordem na lista). **Não edite `src/tools/index.ts` nem arquivos de outros grupos.**
- Exemplo completo: `src/tools/hemo/dva.tsx`.

## Como portar uma calculadora
1. Separe a lógica numa função pura `compute(inputs) → modelo` em `src/tools/<grupo>/<id>.calc.ts` (sem DOM, sem React). O componente só lê o estado dos campos, chama `compute` e renderiza o modelo.
2. Escreva `src/tools/<grupo>/<id>.test.ts` (Vitest: `import { describe, it, expect } from 'vitest'`; ambiente jsdom já configurado) portando TODAS as asserções correspondentes de `../tests/tests.js` (os valores esperados foram conferidos à mão contra as fontes — não os altere) e acrescentando casos de borda. Importar `@/lib/calc` no topo do teste carrega o `window.Calc`.
3. Preserve exatamente limiares, doses, textos clínicos, notas e referências do arquivo antigo (eles foram auditados). Strings HTML antigas (`<b>`, `&lt;`, `&gt;`) viram JSX (`<b>`, `<`, `>`).
4. Estado dos campos: `useState<string>` por campo (texto como digitado; converta com `num()`); escolhas com `useState<string>`. Em cada render, `useEffect(() => { api.setSummary(texto) })` com o resumo para prontuário (mesmo texto do antigo), ou `''` quando não há o que copiar.
5. Peso vem de `props.peso` (ferramentas com `weight: true` já mostram a faixa de peso/paciente no topo). Outros dados compartilhados do paciente: `usePatientField('idade' | 'sexo' | 'altura' | 'cr')` de `@/lib/patients` devolve `[valorTexto, setValor]` — use nos campos que o antigo marcava com `p: 'idade'` etc. (idade, sexo, altura, creatinina).
6. Valores guardados entre sessões (ex.: modo, diluições, aba escolhida): `useStore(chave, padrão)` de `@/lib/store`.

## Kit (`@/components/ui`)
Por baixo, o kit usa `@/components/pro` (API igual à do HeroUI Pro): `SegField` = Segment · `PickGrid`/`ChoiceList` = RadioButtonGroup · `CheckGroup`/`CheckRow` = CheckboxButtonGroup · `Steps` = Timeline · `Empty` = EmptyState. Listas de navegação usam `ListView`, cartões de acesso rápido `ItemCard`, a troca de paciente na faixa de peso abre um `Sheet`, e os controles deslizantes do TEG são `CellSlider`. Use o kit, não os componentes de `pro.tsx` diretamente, para manter o visual uniforme.
- `NumField {label, value, onChange, unit?, placeholder?, hint?, lim?: [min,max], optional?}` — campo numérico (teclado decimal, parse pt-BR, marca fora do plausível). Use `lim` como no antigo (`lim:` / `C.LIM`).
- `SegField {label?, value, onChange, options: [{value, label, small?}]}` — escolha única em segmentos (2–4 opções curtas).
- `PickGrid {label?, value, onChange, options: [{value, label, small?}], cols?: 2|3}` — escolha única em grade compacta (5+ opções curtas, ou 3 opções com legenda que não cabem num Segment a 375 px).
- `ChoiceList {label?, value, onChange, options: [{value, label, sub?, lead?, tone?}]}` — escolha única em lista (opções longas; `lead` = texto grande à esquerda, ex. "+4" na RASS; `tone` colore o lead).
- Sem `autoFocus` em campos: no celular abre o teclado ao entrar na tela e tapa metade da calculadora.
- `CheckGroup` + `CheckRow {checked, onChange, label, sub?}` — checklists.
- `Readout {label, value, unit?, cls?, status?, note?, big?, className?}` dentro de `Readouts` (grade 2 colunas; `className="col-span-full"` para ocupar a linha). `value` null/undefined/'—' = vazio.
- `Verdict {cls: 'ok'|'warn'|'crit'|'info'|'violet'|'idle', kicker?, title, desc?}` — manchete do resultado. Use `cls="idle"` com "Aguardando — faltam: …" enquanto faltam dados.
- `Note {cls}` — alerta/nota. `Steps {items: [[cls, <jsx/>], …]}` — condutas (aceita `null` nos itens). `Dose` — caixinha mono de dose dentro de um passo.
- `Section {title?, aux?}` — cartão. `Grid {cols: 2|3}` + `Span2`. `Lbl` (rótulo mono pequeno). `KV {rows: [[k, v]]}`. `Pill {cls}`. `CalcLine` (fórmula em mono). `Ref` (nota de fontes no rodapé). `Empty`.
- Infusões: `InfusionCard {d, mode, peso, input, onInput}`, `ModeSwitch {mode, onChange}`, `useInfusionSet(chave, drugs, peso)` → `{ mode, switchMode, inputs, setInput, summary() }`; tipo `Drug` em `@/tools/infusion` (`band(d)` para faixas não lineares; `alerts(d, ctx)` devolve `[cls, html][]` — html é inserido com dangerouslySetInnerHTML, só texto próprio).
- Ícones: `lucide-react`. Classes utilitárias Tailwind + tokens HeroUI (`text-muted`, `bg-surface`, `bg-accent-soft`, `text-danger`, `border-separator`…).
- `src/styles/app.css` importa só o CSS dos componentes HeroUI usados: ao usar um componente novo de `@heroui/react`, acrescente o `@import "@heroui/styles/components/<nome>.css" layer(components)` correspondente.
- Protocolos: `../protocolos/` é servida pelo Vite em `/plantao/protocolos/` (com `index.json` gerado na hora) — `src/lib/protocols.ts` lê daí tanto em dev quanto no site publicado.

## Princípios de interface (médico no plantão)
Resumo primeiro, detalhe sob demanda; cor só no que está fora do normal; alvos de toque ≥ 44 px; números tabulares; uma coisa aberta por vez; sem botão "calcular" (tudo reativo). Nada de novas fontes, cores fora dos tokens ou texto genérico.
