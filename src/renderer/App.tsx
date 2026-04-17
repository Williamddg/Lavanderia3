import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { HealthStatus, SessionUser } from '@shared/types';
import { api } from './services/api';
import { AppShell } from './ui/layouts/AppShell';
import { SetupPage } from './modules/shared/components/SetupPage';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { DashboardPage } from './modules/dashboard/pages/DashboardPage';
import { ClientsPage } from './modules/clients/pages/ClientsPage';
import { NewOrderPage } from './modules/orders/pages/NewOrderPage';
import { OrderDetailPage } from './modules/orders/pages/OrderDetailPage';
import { OrdersPage } from './modules/orders/pages/OrdersPage';
import { PaymentsPage } from './modules/payments/pages/PaymentsPage';
import { InvoicesPage } from './modules/invoices/pages/InvoicesPage';
import { InvoiceDetailPage } from './modules/invoices/pages/InvoiceDetailPage';
import { CashPage } from './modules/cash/pages/CashPage';
import { DeliveriesPage } from './modules/deliveries/pages/DeliveriesPage';
import { InventoryPage } from './modules/inventory/pages/InventoryPage';
import { ExpensesPage } from './modules/expenses/pages/ExpensesPage';
import { WarrantiesPage } from './modules/warranties/pages/WarrantiesPage';
import { ReportsPage } from './modules/reports/pages/ReportsPage';
import { WhatsappPage } from './modules/whatsapp/pages/WhatsappPage';
import { SettingsPage } from './modules/settings/pages/SettingsPage';
import { UsersPage } from './modules/users/pages/UsersPage';
import { AuditPage } from './modules/audit/pages/AuditPage';

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshHealth = async () => {
    const nextHealth = await api.health();
    setHealth(nextHealth);
    setUser(null);
  };

  useEffect(() => {
    api.health().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="center-page">Cargando aplicación...</div>;
  }

  if (!health?.configured || !health.connected) {
    return (
      <SetupPage
        healthMessage={health?.message ?? null}
        onCompleted={refreshHealth}
      />
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const isAdmin = Number(user.roleId) === 1;
  const withRole = (element: JSX.Element, adminOnly = false) =>
    adminOnly && !isAdmin ? <Navigate to="/" replace /> : element;

  return (
    <>
      <Routes>
        <Route element={<AppShell user={user} onLogout={() => setUser(null)} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/ordenes" element={<OrdersPage />} />
          <Route path="/ordenes/nueva" element={<NewOrderPage />} />
          <Route path="/ordenes/:orderId" element={<OrderDetailPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/facturacion" element={<InvoicesPage />} />
          <Route path="/facturas/:orderId" element={<InvoiceDetailPage user={user} />} />
          <Route path="/caja" element={<CashPage />} />
          <Route path="/entregas" element={<DeliveriesPage />} />
          <Route path="/gastos" element={<ExpensesPage />} />
          <Route path="/garantias" element={<WarrantiesPage />} />
          <Route path="/inventario" element={withRole(<InventoryPage />, true)} />
          <Route path="/reportes" element={withRole(<ReportsPage />, true)} />
          <Route path="/whatsapp" element={<WhatsappPage />} />
          <Route path="/configuracion" element={withRole(<SettingsPage user={user} />, true)} />
          <Route path="/usuarios" element={withRole(<UsersPage />, true)} />
          <Route
            path="/auditoria"
            element={withRole(
              <AuditPage />
            , true)}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
