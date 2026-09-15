# QDEV Mashups — Checklist de publicación 1.0.0

## Freeze

- [ ] No hay nuevas funcionalidades pendientes del roadmap.
- [ ] La versión del `package.json` es `1.0.0`.
- [ ] Electron permanece en `devDependencies`.
- [ ] El contrato de idioma es `es-CO`.
- [ ] Los únicos stems son `vocals`, `drums`, `bass`, `other`.

## QA técnico

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm verify:packaging`

## Packaging

- [ ] `pnpm exec electron-builder --mac dmg`
- [ ] Existe un DMG `1.0.0` para `arm64`.
- [ ] `node scripts/check-release-1.0.mjs`
- [ ] El artefacto tiene tamaño mayor que cero.

## Instalación

- [ ] El DMG monta correctamente.
- [ ] La aplicación se instala correctamente.
- [ ] La aplicación inicia sin error fatal.
- [ ] Renderer y proceso principal se comunican.
- [ ] La biblioteca puede escanearse.
- [ ] El análisis de audio funciona.
- [ ] El sistema de stems conserva los cuatro stems oficiales.
- [ ] Preview y render funcionan.
- [ ] El flujo DJ funciona.
- [ ] Configuración y caché persisten.
- [ ] Reapertura de la aplicación funciona correctamente.

## Firma / notarización

- [ ] Identidad válida de Apple Developer disponible.
- [ ] Firma de código realizada.
- [ ] Notarización completada, cuando se requiera para distribución pública.
- [ ] Gatekeeper probado en un Mac de validación.

## Publicación

- [ ] Artefacto final archivado.
- [ ] Hash del artefacto registrado.
- [ ] Notas de versión preparadas.
- [ ] Documentación de instalación preparada.
- [ ] Checklist completo y firmado por quien realiza la publicación.

## Decisión final

- [ ] APROBADO PARA RELEASE 1.0.0
- [ ] BLOQUEADO — existe un criterio pendiente.
