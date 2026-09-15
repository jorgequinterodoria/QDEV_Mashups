# PHASE 21 — Automatización de Mashups

## Objetivo

Crear el motor de automatización local que decide cuándo una biblioteca tiene suficientes condiciones para generar candidatos de mashup y preparar una ejecución controlada.

## Archivos

- `src/automation/mashup-automation.ts`
- `src/automation/index.ts`
- `tests/automation/automation.test.ts`
- `docs/PHASE-21-AUTOMATIZACION-MASHUPS.md`

## Arquitectura

```text
Biblioteca Inteligente 2.0
        ↓
Regla de automatización
        ↓
Evaluación de candidatos
        ↓
Plan determinista
        ↓
Run controlado
        ↓
planned / completed / failed / skipped
```

La fase crea el **planificador/orquestador**, no ejecuta silenciosamente renderizados de audio ni modifica bibliotecas externas.

## Reglas

Una regla define:

- trigger;
- acciones;
- score mínimo;
- completitud mínima del análisis;
- máximo de candidatos;
- cooldown;
- restricción de usar tracks diferentes.

Las acciones se ordenan de forma determinista:

```text
discover
prepare
render
export
```

## Seguridad

- Las reglas y planes se clonan antes de almacenarse.
- Los runs tienen ID determinista.
- El cooldown evita ejecuciones repetitivas.
- Una ejecución fallida no activa el cooldown de éxito.
- No se ejecutan procesos externos dentro del planificador.
- No se modifican archivos de audio.
- No se modifica djay.
- Los stems siguen siendo exclusivamente `vocals`, `drums`, `bass`, `other`.

## Integración futura

Las fases posteriores pueden conectar:

```text
discover → Mashup Discovery
prepare  → DJ Prep
render   → Stem Renderer
export   → DJ Export Package
```

pero la fase 21 mantiene esas operaciones separadas mediante acciones declarativas.

## Criterio de cierre

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Las cuatro comprobaciones deben terminar correctamente.
