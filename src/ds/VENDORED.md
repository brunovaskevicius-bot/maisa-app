# design system da maisa — vendorado

Gerado por `scripts/vendor-ds.mjs`. **Não edite os arquivos desta pasta à mão.**

- origem: pacote "maisa Design System" (skill `maisa-design`)
- sha256 do readme.md de origem (primeiros 12): `e6a540a37d11`
- ícones copiados: 66

## Como atualizar

```bash
node scripts/vendor-ds.mjs /caminho/do/ds-descompactado
```

## O que o script ajusta

1. `:root` -> `.maisa-ds` — sem isso o DS sobrescreveria `--font-sans`,
   `--font-mono`, `--ease-out`, `--dur-fast`, `--success` e `--danger`, que já
   existem no `src/app/globals.css` do produto.
2. `base.css` reescrito como `:where(.maisa-ds) :where(sel)` — escopa sem mexer
   na especificidade, então as classes `.ms-*` continuam vencendo.
3. `tokens/fonts.css` descartado — as fontes vêm de `next/font` no layout de
   marketing, como `--font-ds-display`, `--font-ds-sans`, `--font-ds-mono`.
4. `components/*.css` copiado literal (só tem seletores `.ms-*`).

## Escopo de uso hoje

Só o mundo **terapeutas**. O mundo barbeiros segue no `marketing.css` antigo
(navy + dourado). Ver `src/app/(marketing)/_lib/terapeutas-v2/`.
