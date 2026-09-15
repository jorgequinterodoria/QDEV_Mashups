# PHASE 25 — QA Profesional

## Objetivo

Establecer una infraestructura de QA determinista para cubrir las dimensiones definidas por el roadmap:

- unit tests;
- integración;
- E2E;
- regresión;
- cancelación;
- corrupción de caché;
- recuperación.

El roadmap exige explícitamente estas siete áreas para la PHASE 25. 

## Arquitectura

`src/qa/professional.ts` proporciona:

- `QaCheck` para definir una comprobación;
- `runQaCheck()` para ejecutar una prueba aislada con timeout y cancelación;
- `runQaSuite()` para ejecutar una colección determinista y producir un reporte agregado;
- `assertFourStemContract()` para proteger el contrato de cuatro canales;
- `verifyAtomicJsonRecovery()` para probar una ruta de recuperación conservando la copia corrupta.

## Cancelación

Las suites aceptan `AbortSignal`. Una cancelación antes de comenzar produce un resultado `skipped`, mientras que una comprobación en curso recibe la señal de cancelación y puede terminar limpiamente.

## Integridad de caché y recuperación

La prueba de recuperación utiliza un archivo temporal:

1. conserva el contenido corrupto original;
2. lo mueve temporalmente;
3. escribe un estado válido;
4. verifica que el estado válido pueda leerse;
5. restaura el original para no dejar residuos.

No se modifica la caché real de producción durante los tests.

## Contrato de stems

La suite protege exclusivamente:

```text
vocals
drums
bass
other
```

No se introducen canales experimentales.

## E2E

Esta fase entrega el arnés de ejecución y el contrato E2E agnóstico del runtime. La validación E2E de la aplicación Electron completa debe ejecutarse en el entorno macOS del proyecto una vez que el runtime empaquetado esté disponible en PHASE 26.

## Regresión

La infraestructura está diseñada para permitir que funcionalidades ya validadas se incorporen como checks sin cambiar el código productivo.

## Regla de cierre

Ejecutar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

La PHASE 25 no se considera completada hasta que las cuatro comprobaciones sean correctas.
