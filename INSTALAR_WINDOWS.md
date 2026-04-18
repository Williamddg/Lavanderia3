# Instalar LavaSuite en Windows (sin instalador)

## Requisitos previos

Antes de empezar, el PC destino debe tener instalado:

- **Node.js** — https://nodejs.org (versión LTS recomendada)
- **MySQL** — corriendo localmente
- El proyecto **LavaSuite** copiado o clonado en el PC

---

## Paso 1 — Copiar el proyecto

Copia la carpeta del proyecto en el PC. La ruta recomendada es:

```
C:\Program Files\LavaSuite
```

> Puedes usar cualquier otra ruta, solo recuerda cuál es porque la necesitarás en el siguiente paso.

---

## Paso 2 — Instalar dependencias

Abre una terminal (CMD o PowerShell) dentro de la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto solo se hace **una vez**. No es necesario repetirlo a menos que el proyecto cambie.

---

## Paso 3 — Crear el archivo LavaSuite.bat

Crea un archivo de texto nuevo y pega el siguiente contenido:

```bat
@echo off
title LavaSuite
cd /d "C:\Program Files\LavaSuite"

echo Iniciando LavaSuite...
npm run dev

pause
```

> **Importante:** Si copiaste el proyecto en una ruta diferente, edita la línea `cd /d "C:\Program Files\LavaSuite"` y reemplázala por la ruta correcta.  
> Ejemplo: si está en el escritorio sería `cd /d "C:\Users\TuUsuario\Desktop\LavaSuite"`

Guarda el archivo con el nombre:

```
LavaSuite.bat
```

Asegúrate de que la extensión sea `.bat` y no `.bat.txt`.

---

## Paso 4 — Mover el .bat al menú inicio

1. Presiona `Win + R` en el teclado
2. Escribe lo siguiente y presiona Enter:

```
shell:programs
```

3. Se abrirá la carpeta del menú inicio de Windows
4. **Copia o mueve** el archivo `LavaSuite.bat` dentro de esa carpeta

A partir de ese momento LavaSuite aparecerá en el menú inicio de Windows.

---

## Paso 5 — Crear acceso directo en el escritorio (opcional)

Si también quieres un icono en el escritorio:

1. Haz clic derecho sobre `LavaSuite.bat`
2. Selecciona **Crear acceso directo**
3. Mueve ese acceso directo al escritorio

---

## Uso diario

A partir de ahora para abrir LavaSuite:

- Búscala en el menú inicio escribiendo **LavaSuite**
- O haz doble clic en el acceso directo del escritorio

Se abrirá una ventana de consola brevemente mientras carga y luego aparecerá la aplicación. La ventana de consola debe permanecer abierta mientras usas la app — **no la cierres**.

---

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| La ventana se cierra sola | Error al iniciar | Revisa que la ruta en el `.bat` sea correcta |
| "npm no se reconoce" | Node.js no está instalado | Instala Node.js desde nodejs.org |
| La app abre pero no carga datos | MySQL no está corriendo | Inicia el servicio de MySQL |
| "Cannot find module" | Faltan dependencias | Corre `npm install` en la carpeta del proyecto |
