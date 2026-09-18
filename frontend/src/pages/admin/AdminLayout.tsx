import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'ED';
  };

  return (
    <div className="app">
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">
            <img src="/icon.png" alt="Flaxio" className="brand-icon" />
          </div>
          <button
            type="button"
            className="collapse-btn"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav className="nav">
          <div className="nav-label">Principal</div>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <span className="icon">⌂</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/sales" className={location.pathname === '/sales' ? 'active' : ''}>
            <span className="icon">🛒</span>
            <span>Ventas</span>
          </Link>
          <Link to="/purchases" className={location.pathname === '/purchases' ? 'active' : ''}>
            <span className="icon">📥</span>
            <span>Compras</span>
          </Link>
          <Link to="/returns" className={location.pathname === '/returns' ? 'active' : ''}>
            <span className="icon">🔄</span>
            <span>Devoluciones</span>
          </Link>
          <div className="nav-label">Inventario</div>
          <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>
            <span className="icon">📦</span>
            <span>Productos</span>
          </Link>
          <Link to="/categories" className={location.pathname === '/categories' ? 'active' : ''}>
            <span className="icon">🏷</span>
            <span>Categorías</span>
          </Link>
          <div className="nav-label">Finanzas</div>
          <Link to="/cash" className={location.pathname === '/cash' ? 'active' : ''}>
            <span className="icon">💵</span>
            <span>Caja</span>
          </Link>
          <div className="nav-label">Gestión</div>
          <Link to="/customers" className={location.pathname === '/customers' ? 'active' : ''}>
            <span className="icon">👥</span>
            <span>Clientes</span>
          </Link>
          <Link to="/suppliers" className={location.pathname === '/suppliers' ? 'active' : ''}>
            <span className="icon">🏢</span>
            <span>Proveedores</span>
          </Link>
          <div className="nav-label">Sistema</div>
          <Link to="/expenses" className={location.pathname === '/expenses' ? 'active' : ''}>
            <span className="icon">🧾</span>
            <span>Gastos</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Sistema local · v1.0</div>
        </div>
      </aside>
      <main className="main">
        <header className="header">
          <div className="search">
            <span>⌕</span>
            <input placeholder="Buscar productos, ventas, clientes..." />
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="Notificaciones" onClick={() => alert('No hay nuevas notificaciones')}>🔔</button>
            <button className="icon-btn" title="Configuración" onClick={() => alert('Configuración')}>⚙</button>
            <div className="avatar">{getInitials(user?.name, user?.email)}</div>
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
