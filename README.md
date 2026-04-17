# LavaSuite Desktop

Aplicación de escritorio para lavandería y sastrería construida con Electron, React, TypeScript, Node.js y MySQL. Está pensada para operación local por instalación, con base de datos MySQL propia y empaquetado para Windows.

## Qué hace la app

LavaSuite cubre el flujo comercial principal del negocio:

- clientes
- órdenes con múltiples ítems
- edición y detalle de órdenes
- pagos simples y pagos por varios métodos
- facturas
- entregas
- caja
- gastos
- garantías
- reportes
- auditoría
- configuración general
- catálogo de servicios

Flujo operativo típico:

`Dashboard -> Clientes -> Nueva orden -> Detalle de orden -> Pagos -> Factura -> Entrega -> Reportes / Caja / Auditoría`

## Stack

- Electron
- React 18
- TypeScript
- Vite
- TanStack Query
- React Router
- Kysely
- MySQL (`mysql2`)
- electron-builder

## Estructura principal

```text
src/
  backend/
    db/
    modules/
  main/
    ipc/
    services/
    preload.ts
    main.ts
  renderer/
    modules/
    services/
    ui/
    styles/
  shared/
    types.ts
```

## Módulos funcionales

- `Dashboard`: resumen comercial y accesos rápidos.
- `Clientes`: creación, edición y búsqueda.
- `Órdenes`: creación, edición, cambio de estado y notas.
- `Pagos`: registro de abonos y pagos múltiples.
- `Facturación`: generación de factura desde una orden.
- `Entregas`: órdenes pendientes, listas, entregadas y activas.
- `Caja`: apertura, cierre y movimientos relacionados.
- `Gastos`: registro de egresos del negocio.
- `Garantías`: apertura y seguimiento.
- `Reportes`: diario, mensual, anual y personalizado con exportación a PDF.
- `Auditoría`: historial legible de acciones del sistema.
- `Configuración`: datos del negocio, políticas, ruta PDF y opciones administrativas.
- `Inventario`: actualmente funciona como catálogo de servicios, no como inventario físico.

## Requisitos para desarrollo

Necesitas como mínimo:

- Node.js
- npm
- MySQL accesible desde la máquina local

## Importante: archivos y credenciales privadas

Este repositorio no contiene todo lo necesario para compilar o distribuir la app de forma completa.

Para ejecutar ciertos flujos de build y distribución hacen falta elementos privados que solo tienen los desarrolladores:

- clave maestra de build
- archivo `.env`
- archivo `.env.masterkey.enc`
- archivo `google-oauth.json`

Esos archivos no se suben al repositorio y deben ser entregados por el equipo de desarrollo autorizado.

## Clave maestra

Los scripts sensibles como `build`, `dist`, `dist:win` y otros relacionados con empaquetado pasan por una validación de clave maestra.

Eso significa que:

- no basta con clonar el repositorio
- aunque el código esté completo, el build protegido no se puede ejecutar sin la clave
- la clave maestra no está en el repositorio

## Configuración local

En la primera ejecución la app pide configurar conexión MySQL. La aplicación crea o valida el esquema usando las migraciones SQL incluidas en el proyecto.

Datos típicos de configuración inicial:

- host
- puerto
- usuario
- contraseña
- base de datos

## Scripts

- `npm run dev`: desarrollo local.
- `npm run build`: compila renderer y proceso principal. Requiere clave maestra.
- `npm run typecheck`: validación TypeScript.
- `npm run lint`: lint del proyecto.
- `npm run dist:win`: genera instalador Windows localmente, sin publicar release. Requiere clave maestra.
- `npm run dist:win:publish`: genera y publica release de Windows. Requiere clave maestra y credenciales de publicación.

## Salida de compilación Windows

Cuando `npm run dist:win` termina correctamente, los archivos quedan en:

- `release/`: instalador y artefactos finales
- `release/win-unpacked/`: app desempaquetada para pruebas

## Icono de Windows

La build de Windows está configurada para usar:

- `resources/icon.ico`

Puedes reemplazar ese archivo por el icono final del proyecto antes de empaquetar.

## Notas importantes

- `google-oauth.json` se usa en integraciones privadas del proyecto y no debe publicarse.
- la ruta `resources/` sí se versiona
- el proyecto ignora `dist/`, `dist-electron/`, `release/` y otros artefactos generados

## Estado actual

La app ya cubre el flujo principal de operación y empaquetado para Windows. El repositorio contiene el código fuente, migraciones y configuración general, pero no incluye secretos, credenciales ni archivos privados de distribución.
