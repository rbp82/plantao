# Protocolos — como alimentar

A aba **Protocolos** do Plantão lê esta pasta direto do GitHub. Não precisa gerar build nem mexer no app:
basta criar ou editar um arquivo `.md` aqui (pelo próprio site do GitHub: *Add file → Create new file*, ou o lápis
em um arquivo existente) e, ao salvar (*Commit changes*), ele aparece no app em até 10 minutos — ou na hora,
puxando a lista para atualizar.

## Regras

- **Um arquivo = um protocolo.** Markdown comum (`.md`), em UTF-8.
- **Subpasta = categoria.** `protocolos/sepse/choque-septico.md` aparece na categoria **Sepse**.
  Arquivos soltos na raiz de `protocolos/` ficam em **Geral**.
- **Título** = `titulo:` do cabeçalho; se não houver, o primeiro `# Título`; se não houver, o nome do arquivo.
- **Arquivos e pastas iniciados por `_` são ignorados** (como este `_LEIAME.md` e o `_modelo.md`).
- Nomes de arquivo: minúsculas, sem acento, hífen no lugar de espaço (`hipercalemia.md`, `pcr-pos-parada.md`).

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
| `categoria` | Sobrescreve a categoria da subpasta |
| `resumo` | Uma linha abaixo do título na lista (serve de busca) |
| `atualizado` | Data mostrada no rodapé do protocolo (AAAA-MM-DD) |
| `autor` | Serviço/responsável, mostrado no rodapé |
| `ordem` | Número; menor aparece primeiro dentro da categoria |

## O que funciona no texto

Títulos (`##`), listas, **negrito**, tabelas, citações (`>`), código (`` ` ``) e links. Tabelas são boas para
doses; use `>` para avisos. Imagens: coloque o arquivo na mesma pasta e referencie com caminho relativo
(`![fluxograma](fluxograma.png)`) — ficam disponíveis só com internet.

Copie `_modelo.md` para começar.
