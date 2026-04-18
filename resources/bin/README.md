# Runtime binaries (Windows self-contained build)

Coloca aquí los binarios externos requeridos por la app empaquetada.

## Obligatorio

- `mysqldump.exe` (Windows) para respaldos SQL.

## Recomendado

- `LICENSE.mysqldump.txt` con la licencia del binario que redistribuyes.

## Notas

- Esta carpeta se copia a `resources/bin` del paquete final vía `extraResources`.
- Si falta `mysqldump.exe`, `npm run runtime:check` y los scripts de dist para Windows fallarán.
