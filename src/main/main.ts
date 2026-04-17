import { app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import { syncUserPreferences } from './services/telemetry';
import * as crypto from 'node:crypto'
import { registerIpc } from './ipc/register'
import { autoUpdater } from 'electron-updater'
import {
  MASTER_BUILD_AUTHORIZED,
  MASTER_BUILD_GENERATED_AT,
  MASTER_BUILD_MAC,
  MASTER_BUILD_NONCE,
  MASTER_BUILD_SALT,
  MASTER_BUILD_TOKEN
} from './generated/master-build-auth'

const isDev = !app.isPackaged

const buildRuntimeSecret = () => {
  const xorKey = (11 * 2) - 3
  const encoded = [81, 124, 107, 46, 111, 60, 124, 77, 109, 62, 79, 104, 115, 105, 44, 112, 120]
  return String.fromCharCode(...encoded.map((value, index) => (value ^ xorKey) - (index % 3)))
}

const hmacSha256 = (key: string, value: string) =>
  crypto.createHmac('sha256', key).update(value).digest('hex')

const detectRuntimeDebugging = () => {
  const flags = process.execArgv.join(' ').toLowerCase()
  const envFlags = String(process.env.NODE_OPTIONS ?? '').toLowerCase()
  const hasInspector =
    flags.includes('--inspect') ||
    flags.includes('--debug') ||
    envFlags.includes('--inspect') ||
    envFlags.includes('--debug')
  const hasElectronDebugPort = app.commandLine.hasSwitch('remote-debugging-port')
  return hasInspector || hasElectronDebugPort
}

const isBuildTokenValid = () => {
  if (!MASTER_BUILD_AUTHORIZED) return false
  if (!MASTER_BUILD_TOKEN || !MASTER_BUILD_SALT || !MASTER_BUILD_NONCE || !MASTER_BUILD_MAC) {
    return false
  }

  const secret = buildRuntimeSecret()
  const payload = `${MASTER_BUILD_TOKEN}|${MASTER_BUILD_SALT}|${MASTER_BUILD_NONCE}|${MASTER_BUILD_GENERATED_AT}`
  const expectedMac = hmacSha256(secret, payload)
  return expectedMac === MASTER_BUILD_MAC
}

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#edf1f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    if (isDev) {
      await mainWindow.loadURL('http://localhost:5173')
    } else {
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
      await mainWindow.loadFile(indexPath)

    }
  } catch (error) {
    console.error('Error cargando la ventana principal:', error)

    mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h2>Error cargando la aplicación</h2>
            <p>Revisa la consola principal para más detalles.</p>
          </body>
        </html>
      `)}`
    )
  }

  const quitUnauthorized = async () => {
    await dialog.showErrorBox(
      'Aplicación no autorizada',
      'No fue posible validar la integridad de esta aplicación.'
    )
    app.quit()
  }

  mainWindow.webContents.on('devtools-opened', () => {
    void quitUnauthorized()
  })

  const watchdog = setInterval(() => {
    if (mainWindow.isDestroyed()) {
      clearInterval(watchdog)
      return
    }
    if (mainWindow.webContents.isDevToolsOpened() || detectRuntimeDebugging()) {
      void quitUnauthorized()
    }
  }, 1200)

  mainWindow.on('closed', () => {
    clearInterval(watchdog)
  })
}

app.whenReady().then(async () => {
  if (!isBuildTokenValid() || detectRuntimeDebugging()) {
    await dialog.showErrorBox(
      'Aplicación no autorizada',
      'No fue posible validar la autorización de ejecución.'
    )
    app.quit()
    return
  }

  await syncUserPreferences();
    setInterval(() => {
    syncUserPreferences().catch(e => console.error);
  }, 24 * 60 * 60 * 1000);


  registerIpc()
  await createWindow()

  // 🚀 AUTO UPDATE SOLO EN PRODUCCIÓN
  if (!isDev) {
    try {
      autoUpdater.checkForUpdatesAndNotify()

      autoUpdater.on('update-available', () => {
        console.log('🔄 Nueva actualización disponible')
      })

      autoUpdater.on('update-downloaded', () => {
        console.log('✅ Update descargado, reiniciando...')
        autoUpdater.quitAndInstall()
      })

      autoUpdater.on('error', (err) => {
        console.error('❌ Error en autoUpdater:', err)
      })
    } catch (error) {
      console.error('❌ Error iniciando autoUpdater:', error)
    }
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
