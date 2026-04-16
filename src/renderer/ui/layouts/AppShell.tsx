import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@renderer/services/api';
import { NavLink, Outlet } from 'react-router-dom';
import type { SessionUser } from '@shared/types';

const menu = [
  { to: '/', label: 'Inicio' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/ordenes', label: 'Órdenes' },
  { to: '/entregas', label: 'Entregas' },
  { to: '/facturacion', label: 'Facturación' },
  { to: '/pagos', label: 'Pagos' },
  { to: '/caja', label: 'Caja' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/garantias', label: 'Garantías' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/whatsapp', label: 'WhatsApp' },
  { to: '/configuracion', label: 'Configuración' },
  { to: '/auditoria', label: 'Auditoría' }
];

type AppShellProps = {
  user: SessionUser;
  onLogout: () => void;
};

export const AppShell = ({ user, onLogout }: AppShellProps) => {
  const [now, setNow] = useState(() => new Date());
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn: api.companySettings
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          {company?.logoBase64 ? (
            <img
              src={company.logoBase64}
              alt={company.companyName || 'Logo de la empresa'}
              className="brand-logo"
            />
          ) : (
            <div className="brand-logo brand-logo-fallback">
              {(company?.companyName || 'LS').slice(0, 2).toUpperCase()}
            </div>
          )}
          <strong>{company?.companyName || 'LavaSuite'}</strong>
          {company?.legalName ? <span>{company.legalName}</span> : null}
        </div>

        <nav className="sidebar-nav">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="nav-link"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <strong>{user.displayName}</strong>
          <span>{user.roleName}</span>
          <button
            className="button button-secondary"
            type="button"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <h1>Operación diaria</h1>
          </div>

          <div className="topbar-tools">
            <input
              className="field compact-field"
              placeholder="Buscar cliente, orden o factura"
            />

            <div className="topbar-user">
              <strong>{now.toLocaleDateString('es-CO')}</strong>
              <span className="topbar-clock">
                {now.toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}
              </span>
              <small>{user.displayName}</small>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
