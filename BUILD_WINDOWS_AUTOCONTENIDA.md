# Build Windows autocontenida (portable + instalable)

Este documento deja el pipeline operativo para generar una app de Windows autocontenida, lo más cercana posible a `npm run dev`.

## 1) Preparar assets obligatorios

Antes de empaquetar, coloca:

- `resources/bin/mysqldump.exe` (obligatorio)
- `resources/bin/LICENSE.mysqldump.txt` (recomendado por trazabilidad legal)
- `resources/bin/mysqldump.source.json` (vendor/version/source_url/sha256)
- `resources/runtime/google-oauth.json` (opcional, solo para backup Google Drive)

> Si `mysqldump.exe` no existe, la build de Windows falla por diseño.

### Procedencia recomendada de `mysqldump.exe` para este proyecto

Recomendación operativa: usar `mysqldump.exe` de **MariaDB Community Server for Windows**, fijando versión en `mysqldump.source.json` y validando hash SHA-256 en `runtime:check`.

Comparación práctica:
- **MariaDB**: buena compatibilidad operativa, distribución simple para desktop.
- **MySQL (Oracle)**: también válido técnicamente, pero en ambos casos (MySQL/MariaDB) debes validar licencia/compliance interno antes de redistribuir.

Si legal no aprueba redistribución embebida, la alternativa menos riesgosa es **usar mysqldump del sistema** (PATH), pero eso rompe el objetivo de autocontenida.

## 2) Verificación previa de runtime

```bash
npm run runtime:check
```

Resultado esperado:
- `ERROR` si falta `mysqldump.exe`.
- `WARNING` si falta `google-oauth.json`.
- `WARNING`/`ERROR` si falta `@alexssmusica/node-printer` (crítico en Windows).
- `ERROR` si el hash SHA-256 no coincide con `mysqldump.source.json`.

## 3) Build autocontenida recomendada

### Opción principal (entrega completa)

```bash
npm run dist:win:selfcontained
```

Esto hace:
1. `runtime:check`
2. `build`
3. `electron-builder --win portable nsis`
4. validación de `release/win-unpacked` (`runtime:validate:unpacked`)

### Opción MVP rápida (portable)

```bash
npm run dist:win:selfcontained:mvp
```

## 4) Validar artefacto win-unpacked

```bash
npm run runtime:validate:unpacked
```

Checa que existan:
- `release/win-unpacked/resources/app.asar`
- `release/win-unpacked/resources/bin/mysqldump.exe`
- `release/win-unpacked/resources/runtime` (opcional)

## 5) Validación manual en Windows limpio

1. Copia `release/win-unpacked/` a una PC sin Node/npm.
2. Ejecuta el `.exe` principal.
3. En app:
   - abre **Configuración**
   - desbloquea con contraseña
   - revisa **Diagnóstico runtime**
4. Verifica:
   - conexión MySQL
   - login
   - backup SQL
   - backup Google Drive (si configurado)
   - impresión/cajón (si hardware disponible)

## 6) Comandos de validación sugeridos fuera del contenedor

En PowerShell (PC Windows de QA):

```powershell
# Ejecutar app unpacked
Start-Process ".\release\win-unpacked\Lavanderia y Sastreria Sistetecni.exe"

# Verificar binarios críticos
Test-Path ".\release\win-unpacked\resources\bin\mysqldump.exe"
Test-Path ".\release\win-unpacked\resources\app.asar"

# Smoke test completo (genera reporte JSON)
powershell -ExecutionPolicy Bypass -File .\scripts\runtime\windows-smoke-test.ps1 -AppRoot release/win-unpacked
```

Resultados esperados:
- `True` para `mysqldump.exe`
- `True` para `app.asar`
- smoke test con tabla de resultados y `smoke-test-report.json`
