import { app, dialog, ipcMain, shell } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { databaseManager } from '../services/database-manager.js';
import { createClientsService } from '../../backend/modules/clients/service.js';
import { createOrdersService } from '../../backend/modules/orders/service.js';
import { createSettingsService } from '../../backend/modules/settings/service.js';
import { createAuthService } from '../../backend/modules/auth/service.js';
import { createPaymentsService } from '../../backend/modules/payments/service.js';
import { createInvoicesService } from '../../backend/modules/invoices/service.js';
import { createCashService } from '../../backend/modules/cash/service.js';
import { createDeliveriesService } from '../../backend/modules/deliveries/service.js';
import { servicesManager } from '../services/services-manager.js';
import { createExpensesService } from '../../backend/modules/expenses/service.js';
import { createWarrantiesService } from '../../backend/modules/warranties/service.js';
import { createReportsService } from '../../backend/modules/reports/service.js';
import { printerService } from '../services/printer-service.js';
import { backupService } from '../services/backup-service.js';
import { licenseService } from '../services/license-service.js';
import { initialSetupService } from '../services/initial-setup-service.js';

import type {
  BatchPaymentInput,
  ClientInput,
  DeliveryInput,
  ExternalLinkPayload,
  LoginInput,
  OrderInput,
  PaymentInput,
  SetupFinalizeInput,
  SetupRootConnectionInput
} from '../../shared/types.js';

const wrap =
  <TArgs extends unknown[], TResult>(handler: (...args: TArgs) => Promise<TResult>) =>
  async (_event: unknown, ...args: TArgs) => {
    try {
      const data = await handler(...args);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado.'
      };
    }
  };

export const registerIpc = () => {
  ipcMain.handle(
    'license:status',
    wrap(async () => {
      const version = app.getVersion();
      return licenseService.status(version);
    })
  );

  ipcMain.handle(
    'license:activate',
    wrap(async (licenseKey: string) => {
      const version = app.getVersion();
      return licenseService.activate(licenseKey, version);
    })
  );

  ipcMain.handle(
    'backup:connect-drive',
    wrap(async () => backupService.connectDrive())
  );

  ipcMain.handle(
    'backup:upload-drive',
    wrap(async () => backupService.uploadBackupToDrive())
  );

  ipcMain.handle(
    'backup:list',
    wrap(async () => backupService.listBackups())
  );

  ipcMain.handle(
    'settings:update-company',
    wrap(async (input) =>
      createSettingsService(await databaseManager.getDb()).updateCompanySettings(input)
    )
  );

  ipcMain.handle(
    'settings:get-order-protection-password',
    wrap(async () =>
      createSettingsService(await databaseManager.getDb()).getOrderProtectionPassword()
    )
  );

  ipcMain.handle(
    'settings:get-pdf-output-dir',
    wrap(async () =>
      createSettingsService(await databaseManager.getDb()).getPdfOutputDir()
    )
  );

  ipcMain.handle(
    'settings:update-pdf-output-dir',
    wrap(async (value: string | null) =>
      createSettingsService(await databaseManager.getDb()).updatePdfOutputDir(value)
    )
  );

  ipcMain.handle(
  'settings:update-order-protection-password',
  wrap(async (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    createSettingsService(await databaseManager.getDb()).updateOrderProtectionPassword(input)
  )
);

  ipcMain.handle(
    'reports:summary',
    wrap(async (from?: string, to?: string) =>
      createReportsService(await databaseManager.getDb()).summary(from, to)
    )
  );

  ipcMain.handle(
    'printers:list',
    wrap(async () => printerService.listPrinters())
  );

  ipcMain.handle(
    'printer:open-drawer',
    wrap(async (printerName?: string) => printerService.openDrawer(printerName))
  );

  ipcMain.handle(
    'services:list',
    wrap(async (activeOnly?: boolean) => servicesManager.list(Boolean(activeOnly)))
  );

  ipcMain.handle(
    'warranties:list',
    wrap(async () => createWarrantiesService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'warranties:statuses',
    wrap(async () => createWarrantiesService(await databaseManager.getDb()).listStatuses())
  );

  ipcMain.handle(
    'warranties:create',
    wrap(async (input) => createWarrantiesService(await databaseManager.getDb()).create(input))
  );

  ipcMain.handle(
    'warranties:update-status',
    wrap(async (id: number, input) =>
      createWarrantiesService(await databaseManager.getDb()).updateStatus(id, input)
    )
  );

  ipcMain.handle(
    'services:create',
    wrap(async (input) => servicesManager.create(input))
  );

  ipcMain.handle(
    'services:update',
    wrap(async (id: number, input) => servicesManager.update(id, input))
  );

  ipcMain.handle(
    'services:delete',
    wrap(async (id: number) => servicesManager.remove(id))
  );

  ipcMain.handle('app:health', wrap(async () => databaseManager.healthCheck()));

  ipcMain.handle(
    'app:restart',
    wrap(async () => {
      app.relaunch();
      app.exit(0);
      return { restarted: true };
    })
  );

  ipcMain.handle(
    'app:quit',
    wrap(async () => {
      app.quit();
      return { quit: true };
    })
  );

  ipcMain.handle(
    'app:open-external',
    wrap(async ({ url }: ExternalLinkPayload) => {
      await shell.openExternal(url);
      return { opened: true };
    })
  );

  ipcMain.handle('app:print-to-pdf', async (event, input?: { defaultFileName?: string }) => {
    try {
      const webContents = event.sender;
      const defaultFileName = String(input?.defaultFileName ?? 'documento.pdf').trim() || 'documento.pdf';

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Guardar PDF',
        defaultPath: defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: true, data: { saved: false, path: null } };
      }

      const pdf = await webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true
      });

      await writeFile(filePath, pdf);

      return { success: true, data: { saved: true, path: filePath } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'No fue posible generar el PDF.'
      };
    }
  });

  ipcMain.handle(
    'app:print-to-pdf-auto',
    async (
      event,
      input?: { defaultFileName?: string; targetDir?: string | null; subfolder?: string | null }
    ) => {
      try {
        const webContents = event.sender;
        const defaultFileName = String(input?.defaultFileName ?? 'documento.pdf').trim() || 'documento.pdf';
        const safeName = defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`;
        const resolvedBaseDir = String(input?.targetDir ?? '').trim() || path.join(app.getPath('documents'), 'LavaSuite');
        const subfolder = String(input?.subfolder ?? '').trim();
        const outputDir = subfolder ? path.join(resolvedBaseDir, subfolder) : resolvedBaseDir;
        const outputPath = path.join(outputDir, safeName);

        await mkdir(outputDir, { recursive: true });

        const pdf = await webContents.printToPDF({
          printBackground: true,
          preferCSSPageSize: true
        });

        await writeFile(outputPath, pdf);

        return { success: true, data: { saved: true, path: outputPath } };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'No fue posible generar el PDF.'
        };
      }
    }
  );

  ipcMain.handle(
    'app:select-directory',
    wrap(async () => {
      const result = await dialog.showOpenDialog({
        title: 'Seleccionar carpeta',
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths.length) {
        return { selected: false, path: null };
      }

      return { selected: true, path: result.filePaths[0] };
    })
  );

  ipcMain.handle(
    'setup:create-database',
    wrap(async (input: SetupRootConnectionInput) =>
      initialSetupService.createDatabase(input)
    )
  );

  ipcMain.handle(
    'setup:initialize-schema',
    async (event, input: SetupRootConnectionInput) => {
      try {
        const data = await initialSetupService.initializeSchema(input, (progress) => {
          event.sender.send('setup:initialize-progress', progress);
        });

        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error inesperado.'
        };
      }
    }
  );

  ipcMain.handle(
    'setup:finalize',
    wrap(async (input: SetupFinalizeInput) =>
      initialSetupService.finalizeSetup(input)
    )
  );

  ipcMain.handle(
    'auth:verify-password',
    wrap(async (password: string) =>
      createAuthService(await databaseManager.getDb()).verifyPassword(password)
    )
  );

  ipcMain.handle(
    'auth:login',
    wrap(async (input: LoginInput) =>
      createAuthService(await databaseManager.getDb()).login(input)
    )
  );

  ipcMain.handle(
    'settings:company',
    wrap(async () =>
      createSettingsService(await databaseManager.getDb()).getCompanySettings()
    )
  );

  ipcMain.handle(
    'clients:list',
    wrap(async () => createClientsService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'clients:search',
    wrap(async (term: string, limit?: number) =>
      createClientsService(await databaseManager.getDb()).searchByName(term, limit)
    )
  );

  ipcMain.handle(
    'clients:create',
    wrap(async (input: ClientInput) =>
      createClientsService(await databaseManager.getDb()).create(input)
    )
  );

  ipcMain.handle(
    'clients:update',
    wrap(async (id: number, input: ClientInput) =>
      createClientsService(await databaseManager.getDb()).update(id, input)
    )
  );

  ipcMain.handle(
    'clients:delete',
    wrap(async (id: number) =>
      createClientsService(await databaseManager.getDb()).remove(id)
    )
  );

  ipcMain.handle(
    'orders:list',
    wrap(async () => createOrdersService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'orders:detail',
    wrap(async (id: number) =>
      createOrdersService(await databaseManager.getDb()).detail(id)
    )
  );

  ipcMain.handle(
    'orders:create',
    wrap(async (input: OrderInput) =>
      createOrdersService(await databaseManager.getDb()).create(input)
    )
  );

  ipcMain.handle(
    'orders:catalogs',
    wrap(async () => createOrdersService(await databaseManager.getDb()).catalogs())
  );

  ipcMain.handle(
    'orders:update-status',
    wrap(async (orderId: number, statusId: number) =>
      createOrdersService(await databaseManager.getDb()).updateStatus(orderId, statusId)
    )
  );

  ipcMain.handle(
    'orders:update',
    wrap(async (orderId: number, input: OrderInput) =>
      createOrdersService(await databaseManager.getDb()).update(orderId, input)
    )
  );

  ipcMain.handle(
    'orders:cancel',
    wrap(async (orderId: number) =>
      createOrdersService(await databaseManager.getDb()).cancel(orderId)
    )
  );

  ipcMain.handle(
    'payments:list',
    wrap(async (orderId?: number) =>
      createPaymentsService(await databaseManager.getDb()).list(orderId)
    )
  );

  ipcMain.handle(
    'payments:create',
    wrap(async (input: PaymentInput) =>
      createPaymentsService(await databaseManager.getDb()).create(input)
    )
  );

  ipcMain.handle(
    'payments:create-batch',
    wrap(async (input: BatchPaymentInput) =>
      createPaymentsService(await databaseManager.getDb()).createBatch(input)
    )
  );

  ipcMain.handle(
    'invoices:list',
    wrap(async () => createInvoicesService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'invoices:detail',
    wrap(async (id: number) =>
      createInvoicesService(await databaseManager.getDb()).detail(id)
    )
  );

  ipcMain.handle(
    'invoices:create-from-order',
    wrap(async (orderId: number) =>
      createInvoicesService(await databaseManager.getDb()).createFromOrder(orderId)
    )
  );

  ipcMain.handle(
  'cash:open',
  wrap(async (input: {
    openingAmount?: number;
    openedByName: string;
    openedByPhone: string;
  }) =>
    createCashService(await databaseManager.getDb()).open(input)
  )
);

  ipcMain.handle(
    'cash:close',
    wrap(async (declaredAmount: number) =>
      createCashService(await databaseManager.getDb()).close({ declaredAmount })
    )
  );

  ipcMain.handle(
    'cash:summary',
    wrap(async () => createCashService(await databaseManager.getDb()).summary())
  );

  ipcMain.handle(
    'expenses:list',
    wrap(async () => createExpensesService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'expenses:create',
    wrap(async (input) => createExpensesService(await databaseManager.getDb()).create(input))
  );

  ipcMain.handle(
    'expenses:categories',
    wrap(async () =>
      createExpensesService(await databaseManager.getDb()).listCategories()
    )
  );

  ipcMain.handle(
    'deliveries:list',
    wrap(async () => createDeliveriesService(await databaseManager.getDb()).list())
  );

  ipcMain.handle(
    'deliveries:create',
    wrap(async (input: DeliveryInput) =>
      createDeliveriesService(await databaseManager.getDb()).create(input)
    )
  );

  ipcMain.handle(
    'dashboard:summary',
    wrap(async () => createOrdersService(await databaseManager.getDb()).dashboard())
  );
};
