Único jeito de colocar ícone em um design maisa. Heroicons v2, traço 1.6, tamanho 20 na UI e 18 dentro de botões.

```jsx
<Icon name="calendar-days" size={20} />
<Icon name="check-circle" variant="solid" size={18} color="var(--success)" />
```

Nunca desenhe SVG novo. Se faltar um ícone, pegue em assets/icons/ ou no pacote heroicons e adicione ao registro em Icon.jsx. `iconNames` lista tudo que existe.
