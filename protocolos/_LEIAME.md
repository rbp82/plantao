# Protocolos — como alimentar

A aba **Protocolos** do Plantão mostra os arquivos desta pasta. Não precisa mexer no app: basta criar ou editar um
arquivo `.md` aqui (pelo site do GitHub: *Add file → Create new file*, ou o lápis em um arquivo existente) e salvar
(*Commit changes*). O push dispara a publicação automática e, em **1 a 2 minutos**, o protocolo aparece no app —
quem já estiver com a lista aberta puxa para atualizar. Depois de aberto uma vez com internet, o app guarda todos os
protocolos (e as imagens) no aparelho e os mostra sem rede.

## Regras

- **Um arquivo = um protocolo.** Markdown comum (`.md`), em UTF-8.
- **Subpasta = categoria.** `protocolos/sepse/choque-septico.md` aparece na categoria **Sepse**.
  Arquivos soltos na raiz de `protocolos/` ficam em **Geral**. Para o nome da categoria ter acento
  ("Metabólico"), declare `categoria:` no cabeçalho de **um** arquivo da pasta: os vizinhos herdam.
- **Título** = `titulo:` do cabeçalho; se não houver, o primeiro `# Título`; se não houver, o nome do arquivo.
- **Arquivos e pastas iniciados por `_` são ignorados** (como este `_LEIAME.md` e o `_modelo.md`).
- Nomes de arquivo: minúsculas, sem acento, hífen no lugar de espaço (`hipercalemia.md`, `pcr-pos-parada.md`).
  O nome vira o endereço do protocolo no app; renomear o arquivo quebra links antigos para ele.

## Cabeçalho (opcional)

Entre duas linhas `---` no começo do arquivo:

```
---
titulo: Choque séptico — primeira hora
categoria: Sepse
resumo: Bundle de 1 h, metas e vasopressor
atualizado: 2026-10-09
autor: UTI adulto
ordem: 1
---
```

| Campo | Para quê |
|---|---|
| `titulo` | Título mostrado na lista e no topo da página |
| `categoria` | Sobrescreve a categoria da subpasta (vale para os vizinhos sem `categoria:`) |
| `resumo` | Uma linha abaixo do título na lista (serve de busca) |
| `atualizado` | Data mostrada no rodapé do protocolo (AAAA-MM-DD) |
| `autor` | Serviço/responsável, mostrado no rodapé |
| `ordem` | Número; menor aparece primeiro dentro da categoria |

## O que funciona no texto

Títulos (`##`), listas, **negrito**, tabelas, citações (`>`), código (`` ` ``) e links. Tabelas são boas para
doses; use `>` para avisos (aparecem destacados).

- **Imagens:** coloque o arquivo (PNG/JPG/SVG/WebP) na mesma pasta e referencie com caminho relativo:
  `![fluxograma](fluxograma-sepse.png)`. São publicadas junto e ficam disponíveis offline. Prefira imagens
  leves (< 300 KB): tudo é guardado no celular.
- **Links entre protocolos:** `[ver hipercalemia](../metabolico/hipercalemia.md)` abre o outro protocolo dentro do app.
- **Busca:** o campo de busca procura no título, no resumo e no texto inteiro de todos os protocolos.

Não funcionam: HTML dentro do Markdown, `[[links no estilo wiki]]` e *callouts* do Obsidian (`> [!warning]`),
que aparecem como texto comum.

Copie `_modelo.md` para começar.

## Escrevendo pelo celular (Obsidian)

Os arquivos são Markdown com cabeçalho YAML, o mesmo formato do Obsidian — as chaves `titulo`, `resumo` etc. aparecem
lá como propriedades da nota. Duas formas de publicar direto do app:

1. **Enveloppe** (plugin da comunidade, antes chamado *GitHub Publisher*; funciona no Obsidian Mobile). Publica as
   notas marcadas (por exemplo `share: true` no cabeçalho) direto para uma pasta deste repositório pela API do
   GitHub, sem clonar nada, e converte `[[wikilinks]]` e `![[imagens]]` para Markdown comum. Configure o repositório
   `rbp82/plantao`, a branch `main`, a pasta de destino `protocolos/` e um *fine-grained personal access token*
   com permissão **Contents: read and write** só neste repositório.
2. **Obsidian Git** (plugin da comunidade). Clona o repositório no vault e faz pull/push; no iPhone é mais lento
   e só por HTTPS com token. Se for usar, vale manter os protocolos num repositório próprio, para o vault não
   carregar o código do app.

Sem plugin: o botão "Novo protocolo" no app abre o GitHub no navegador do celular, onde dá para criar e editar o `.md`.
