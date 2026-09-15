# PHASE 20 — Corrección

Correcciones incluidas:

1. El filtro `tag` usa coincidencia normalizada compatible con etiquetas compuestas.
2. El test de encapsulación ya no intenta mutar una propiedad pública `readonly`; valida la separación de referencias devueltas por `get()`.

Validar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
