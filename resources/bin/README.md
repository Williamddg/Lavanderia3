# Runtime binaries (Windows self-contained build)

Coloca aquí los binarios externos requeridos por la app empaquetada.

## Obligatorio

- `mysqldump.exe` (Windows) para respaldos SQL.

## Procedencia recomendada para este proyecto

**Recomendación práctica:** usar `mysqldump.exe` de **MariaDB Community Server for Windows (misma versión mayor que tu servidor MySQL/MariaDB)** y registrar su procedencia en `mysqldump.source.json`.

Motivo operativo:
- suele funcionar bien contra MySQL y MariaDB en escenarios de dump estándar,
- distribución fácil para entornos Windows de escritorio,
- pipeline más estable para empaquetado autocontenido.

## Riesgo legal (resumen operativo)

- MySQL y MariaDB distribuyen sus clientes con licencias copyleft (normalmente GPL/LGPL según componente/distribución).
- Si redistribuyes `mysqldump.exe` dentro de una app comercial cerrada, **debes validar compliance legal interna**.
- En este repo se exige:
  - `LICENSE.mysqldump.txt`
  - `mysqldump.source.json` (vendor, versión, URL, SHA-256)

## Recomendado

- `LICENSE.mysqldump.txt` con la licencia del binario que redistribuyes.
- `mysqldump.source.json` con procedencia y hash.

## Notas

- Esta carpeta se copia a `resources/bin` del paquete final vía `extraResources`.
- Si falta `mysqldump.exe`, `npm run runtime:check` y los scripts de dist para Windows fallarán.
