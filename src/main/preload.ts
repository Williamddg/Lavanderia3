import { contextBridge, ipcRenderer } from 'electron';
import type {
  BatchPaymentInput,
  ClientInput,
  DeliveryInput,
  ExternalLinkPayload,
  LoginInput,
  OrderInput,
  PaymentInput,
  ServiceInput,
  SetupFinalizeInput,
  SetupInitializeProgress,
  SetupRootConnectionInput
} from '../shared/types.js';

type DesktopPdfPageSize = 'A4' | 'Letter' | 'Legal' | 'Tabloid';
type DesktopPdfInput = {
  defaultFileName?: string;
  targetDir?: string | null;
  subfolder?: string | null;
  pageSize?: DesktopPdfPageSize;
  landscape?: boolean;
  preferCssPageSize?: boolean;
};

contextBridge.exposeInMainWorld('desktopApi', {
  getPlatform: () => process.platform,
  verifyPassword: (password: string) =>
    ipcRenderer.invoke('auth:verify-password', password),

  getOrderProtectionPassword: () =>
    ipcRenderer.invoke('settings:get-order-protection-password'),
  getPdfOutputDir: () =>
    ipcRenderer.invoke('settings:get-pdf-output-dir'),
  updatePdfOutputDir: (value: string | null) =>
    ipcRenderer.invoke('settings:update-pdf-output-dir', value),

  updateOrderProtectionPassword: (input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) =>
  ipcRenderer.invoke('settings:update-order-protection-password', input),

  connectDriveBackup: () => ipcRenderer.invoke('backup:connect-drive'),
  uploadBackupToDrive: () => ipcRenderer.invoke('backup:upload-drive'),
  listBackups: () => ipcRenderer.invoke('backup:list'),

  listPrinters: () => ipcRenderer.invoke('printers:list'),
  openCashDrawer: (printerName?: string) => ipcRenderer.invoke('printer:open-drawer', printerName),

  updateCompanySettings: (input: any) =>
    ipcRenderer.invoke('settings:update-company', input),
  getReportsSummary: (from?: string, to?: string) =>
    ipcRenderer.invoke('reports:summary', from, to),

  listWarranties: () => ipcRenderer.invoke('warranties:list'),
  listWarrantyStatuses: () => ipcRenderer.invoke('warranties:statuses'),
  createWarranty: (input: { orderId: number; reason: string }) =>
    ipcRenderer.invoke('warranties:create', input),
  updateWarrantyStatus: (id: number, input: { statusId: number; resolution: string | null }) =>
    ipcRenderer.invoke('warranties:update-status', id, input),

  health: () => ipcRenderer.invoke('app:health'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  openExternal: (payload: ExternalLinkPayload) => ipcRenderer.invoke('app:open-external', payload),
  printToPdf: (input?: Omit<DesktopPdfInput, 'targetDir' | 'subfolder'>) => ipcRenderer.invoke('app:print-to-pdf', input),
  printToPdfAuto: (input?: DesktopPdfInput) =>
    ipcRenderer.invoke('app:print-to-pdf-auto', input),
  selectDirectory: () => ipcRenderer.invoke('app:select-directory'),
  setupCreateDatabase: (input: SetupRootConnectionInput) =>
    ipcRenderer.invoke('setup:create-database', input),
  setupInitializeSchema: (input: SetupRootConnectionInput) =>
    ipcRenderer.invoke('setup:initialize-schema', input),
  onSetupInitializeProgress: (callback: (progress: SetupInitializeProgress) => void) => {
    const listener = (_event: unknown, progress: SetupInitializeProgress) => callback(progress);
    ipcRenderer.on('setup:initialize-progress', listener);
    return () => ipcRenderer.removeListener('setup:initialize-progress', listener);
  },
  setupFinalize: (input: SetupFinalizeInput) =>
    ipcRenderer.invoke('setup:finalize', input),
  login: (input: LoginInput) => ipcRenderer.invoke('auth:login', input),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCompanySettings: () => ipcRenderer.invoke('settings:company'),

  listClients: () => ipcRenderer.invoke('clients:list'),
  searchClients: (term: string, limit?: number) => ipcRenderer.invoke('clients:search', term, limit),
  createClient: (input: ClientInput) => ipcRenderer.invoke('clients:create', input),
  updateClient: (id: number, input: ClientInput) => ipcRenderer.invoke('clients:update', id, input),
  deleteClient: (id: number) => ipcRenderer.invoke('clients:delete', id),

  listOrders: () => ipcRenderer.invoke('orders:list'),
  searchOrders: (term: string, limit?: number) => ipcRenderer.invoke('orders:search', term, limit),
  getOrderDetail: (id: number) => ipcRenderer.invoke('orders:detail', id),
  getOrderCatalogs: () => ipcRenderer.invoke('orders:catalogs'),
  createOrder: (input: OrderInput) => ipcRenderer.invoke('orders:create', input),
  updateOrderStatus: (orderId: number, statusId: number) =>
    ipcRenderer.invoke('orders:update-status', orderId, statusId),

  updateOrder: (orderId: number, input: OrderInput) =>
    ipcRenderer.invoke('orders:update', orderId, input),

  cancelOrder: (orderId: number) =>
    ipcRenderer.invoke('orders:cancel', orderId),

  listPayments: (orderId?: number) => ipcRenderer.invoke('payments:list', orderId),
  createPayment: (input: PaymentInput) => ipcRenderer.invoke('payments:create', input),
  createPaymentBatch: (input: BatchPaymentInput) => ipcRenderer.invoke('payments:create-batch', input),

  listInvoices: () => ipcRenderer.invoke('invoices:list'),
  searchInvoices: (term: string, limit?: number) => ipcRenderer.invoke('invoices:search', term, limit),
  getInvoiceDetail: (id: number) => ipcRenderer.invoke('invoices:detail', id),
  createInvoiceFromOrder: (orderId: number) => ipcRenderer.invoke('invoices:create-from-order', orderId),

  openCashSession: (input: {
  openingAmount?: number;
  openedByName: string;
  openedByPhone: string;
}) => ipcRenderer.invoke('cash:open', input),
  closeCashSession: (declaredAmount: number) => ipcRenderer.invoke('cash:close', declaredAmount),
  getCashSummary: () => ipcRenderer.invoke('cash:summary'),

  listExpenses: () => ipcRenderer.invoke('expenses:list'),
  createExpense: (input: { categoryId: number; paymentMethodId: number; amount: number; description: string; expenseDate: string }) =>
    ipcRenderer.invoke('expenses:create', input),
  listExpenseCategories: () => ipcRenderer.invoke('expenses:categories'),

  listSellerUsers: () => ipcRenderer.invoke('users:list-sellers'),
  createSellerUser: (input: { fullName: string; username: string; password: string }) =>
    ipcRenderer.invoke('users:create-seller', input),
  updateSellerUser: (id: number, input: { fullName: string; username: string; password?: string | null }) =>
    ipcRenderer.invoke('users:update-seller', id, input),
  deleteSellerUser: (id: number) => ipcRenderer.invoke('users:delete-seller', id),

  listDeliveries: () => ipcRenderer.invoke('deliveries:list'),
  createDelivery: (input: DeliveryInput) => ipcRenderer.invoke('deliveries:create', input),

  getDashboardSummary: () => ipcRenderer.invoke('dashboard:summary'),
  auditListDays: () => ipcRenderer.invoke('audit:list-days'),
  auditListByDay: (date: string) => ipcRenderer.invoke('audit:list-by-day', date),

  listServices: (activeOnly?: boolean) => ipcRenderer.invoke('services:list', activeOnly),
  createService: (input: ServiceInput) => ipcRenderer.invoke('services:create', input),
  updateService: (id: number, input: ServiceInput) => ipcRenderer.invoke('services:update', id, input),
  deleteService: (id: number) => ipcRenderer.invoke('services:delete', id)
});
