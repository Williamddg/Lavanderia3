import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@renderer/services/api';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { GlobalSearchResult, SessionUser } from '@shared/types';

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
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/auditoria', label: 'Auditoría' }
];

type AppShellProps = {
  user: SessionUser;
  onLogout: () => void;
};

export const AppShell = ({ user, onLogout }: AppShellProps) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const isAdmin = Number(user.roleId) === 1;
  const visibleMenu = useMemo(() => {
    if (isAdmin) return menu;
    const adminOnly = new Set([
      '/inventario',
      '/reportes',
      '/configuracion',
      '/auditoria',
      '/usuarios'
    ]);
    return menu.filter((item) => !adminOnly.has(item.to));
  }, [isAdmin]);
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn: api.companySettings
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const { data: globalSearch, isFetching: searchingGlobal } = useQuery<GlobalSearchResult>({
    queryKey: ['global-search', debouncedSearch],
    queryFn: async () => {
      const term = debouncedSearch.trim();
      if (!term) {
        return { clients: [], orders: [], invoices: [] };
      }
      const [clients, orders, invoices] = await Promise.all([
        api.searchClientsByName(term, 6),
        api.searchOrders(term, 6),
        api.searchInvoices(term, 6)
      ]);
      return { clients, orders, invoices };
    },
    enabled: debouncedSearch.length >= 2
  });

  const hasSearchResults = useMemo(() => {
    return Boolean(
      globalSearch &&
        (globalSearch.clients.length > 0 ||
          globalSearch.orders.length > 0 ||
          globalSearch.invoices.length > 0)
    );
  }, [globalSearch]);

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
          {visibleMenu.map((item) => (
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
            <h1>Inicio</h1>
          </div>

          <div className="topbar-tools">
            <div className="topbar-search">
              <input
                className="field compact-field"
                placeholder="Buscar cliente, orden o factura"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 130);
                }}
              />

              {searchOpen && debouncedSearch.length >= 2 ? (
                <div className="topbar-search-results card-panel">
                  {searchingGlobal ? (
                    <p className="topbar-search-empty">Buscando...</p>
                  ) : null}

                  {!searchingGlobal && !hasSearchResults ? (
                    <p className="topbar-search-empty">Sin resultados.</p>
                  ) : null}

                  {globalSearch?.clients?.length ? (
                    <div className="topbar-search-group">
                      <strong>Clientes</strong>
                      {globalSearch.clients.map((client) => (
                        <button
                          key={`c-${client.id}`}
                          type="button"
                          className="topbar-search-item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchText('');
                            navigate('/clientes');
                          }}
                        >
                          <span>{client.firstName} {client.lastName}</span>
                          <small>{client.phone}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {globalSearch?.orders?.length ? (
                    <div className="topbar-search-group">
                      <strong>Órdenes</strong>
                      {globalSearch.orders.map((order) => (
                        <button
                          key={`o-${order.id}`}
                          type="button"
                          className="topbar-search-item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchText('');
                            navigate(`/ordenes/${order.id}`);
                          }}
                        >
                          <span>{order.orderNumber} · {order.clientName}</span>
                          <small>{order.statusName} · Saldo {order.balanceDue.toLocaleString('es-CO')}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {globalSearch?.invoices?.length ? (
                    <div className="topbar-search-group">
                      <strong>Facturas</strong>
                      {globalSearch.invoices.map((invoice) => (
                        <button
                          key={`i-${invoice.id}`}
                          type="button"
                          className="topbar-search-item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchText('');
                            navigate(`/facturas/${invoice.orderId}`);
                          }}
                        >
                          <span>{invoice.invoiceNumber} · {invoice.clientName}</span>
                          <small>Orden #{invoice.orderId} · Saldo {invoice.balanceDue.toLocaleString('es-CO')}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

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
