import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import type { DashboardStats, Sale, Purchase, Expense, Product } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';

function showToast(msg: string) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  clearTimeout((window as unknown as Record<string, number | undefined>).__toast);
  (window as unknown as Record<string, number | undefined>).__toast = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 2200);
}

export default function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [period, setPeriod] = useState('month');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [dashboard, sales, purchases, expenses, prods] = await Promise.all([
          api.get<DashboardStats>('/admin/dashboard'),
          api.get<Sale[]>('/admin/sales'),
          api.get<Purchase[]>('/admin/purchases'),
          api.get<Expense[]>('/admin/expenses'),
          api.get<Product[]>('/admin/products'),
        ]);
        setStats(dashboard);
        setRecentSales(sales);
        setRecentPurchases(purchases);
        setRecentExpenses(expenses);
        setProducts(prods);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Error al cargar el dashboard');
      }
    }
    load();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function drawChart() {
      const r = canvas!.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      canvas!.width = r.width * d;
      canvas!.height = r.height * d;
      ctx!.setTransform(d, 0, 0, d, 0, 0);
      const w = r.width;
      const h = r.height;
      const p = { l: 38, r: 15, t: 18, b: 30 };
      ctx!.clearRect(0, 0, w, h);

      const salesData = stats?.salesByMonth?.length
        ? stats.salesByMonth.map((m) => Math.round(m.total / 1000))
        : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const maxVal = Math.max(...salesData, 90);

      for (let i = 0; i < 5; i++) {
        const y = p.t + (h - p.t - p.b) * i / 4;
        ctx!.strokeStyle = '#edf0f4';
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(p.l, y);
        ctx!.lineTo(w - p.r, y);
        ctx!.stroke();
        ctx!.fillStyle = '#9aa3b2';
        ctx!.font = '10px system-ui';
        ctx!.fillText('$' + Math.round(maxVal - (maxVal * i) / 4) + 'k', 2, y + 3);
      }
      function line(data: number[], dash = false) {
        ctx!.beginPath();
        data.forEach((v, i) => {
          const x = p.l + (w - p.l - p.r) * i / (data.length - 1);
          const y = p.t + (h - p.t - p.b) * (1 - v / maxVal);
          if (i) ctx!.lineTo(x, y);
          else ctx!.moveTo(x, y);
        });
        ctx!.strokeStyle = dash ? '#94a3b8' : '#4f46e5';
        ctx!.lineWidth = 2.5;
        ctx!.setLineDash(dash ? [5, 5] : []);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
      line(salesData, true);
      line(salesData, false);
      const labels = ['01', '03', '05', '07', '09', '11', '13', '15', '17', '19', '21', '23'];
      labels.forEach((x, i) => {
        const px = p.l + (w - p.l - p.r) * i / (labels.length - 1);
        ctx!.fillStyle = '#9aa3b2';
        ctx!.font = '10px system-ui';
        ctx!.textAlign = 'center';
        ctx!.fillText(x, px, h - 8);
      });
    }

    const observer = new ResizeObserver(drawChart);
    observer.observe(canvas);
    drawChart();

    return () => observer.disconnect();
  }, [stats]);

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('es-AR');
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const topProducts = stats?.topProducts?.length
    ? stats.topProducts.map((tp) => ({
        productId: tp.productId,
        quantity: tp.quantity,
        subtotal: tp.subtotal,
        productName: tp.product?.name || 'Producto',
      }))
    : products.slice(0, 4).map((p) => ({
        productId: p.id,
        quantity: 0,
        subtotal: 0,
        productName: p.name,
      }));

  const criticalStock = products.filter((p) => p.stock <= (p.minStock || 10));

  const recentOperations: { date: Date; type: string; description: string; medium: string; status: string; amount: number; sign: string }[] = [
    ...recentSales.map((s) => ({
      date: new Date(s.date),
      type: 'Venta',
      description: 'Venta #' + s.id.slice(0, 8) + ' · ' + (s.customerName || 'Consumidor final'),
      medium: s.paymentMethod,
      status: s.status,
      amount: s.total,
      sign: '+',
    })),
    ...recentPurchases.map((p) => ({
      date: new Date(p.date),
      type: 'Compra',
      description: 'Compra #' + p.id.slice(0, 8) + ' · ' + p.supplier,
      medium: 'Cuenta corriente',
      status: p.status,
      amount: p.total,
      sign: '-',
    })),
    ...recentExpenses.map((e) => ({
      date: new Date(e.date),
      type: 'Gasto',
      description: e.category + (e.description ? ' · ' + e.description : ''),
      medium: 'Efectivo',
      status: 'REGISTRADO',
      amount: e.amount,
      sign: '-',
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  const hasData = stats && (stats.totalSales > 0 || stats.totalPurchases > 0 || stats.totalExpenses > 0 || stats.productsCount > 0);

  if (error) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <p className="text-danger font-semibold">Error al cargar el dashboard</p>
          <p className="text-ink-soft mt-2">{error}</p>
          <button className="btn primary mt-4" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <p className="text-ink-soft">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="home-hero">
        <img src="/logo.jpg" alt="Flaxio" className="home-logo" />
      </div>
      <div className="page-title">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen general de tu negocio · {dateStr}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setPeriodOpen(true)}>
            📅 {period === 'month' ? 'Este mes' : period === 'week' ? 'Esta semana' : 'Este año'} ▾
          </button>
          <button className="btn primary" onClick={() => navigate('/sales')}>
            ＋ Nueva venta
          </button>
        </div>
      </div>

      <div className="grid stats">
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Ventas de hoy</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-value">{hasData ? formatCurrency(stats.todaySales) : '$0'}</div>
          <span className="trend up">
            {hasData ? `${stats.todaySalesCount} venta(s)` : <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
          </span>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Ventas del mes</span>
            <span className="stat-icon">↗</span>
          </div>
          <div className="stat-value">{hasData ? formatCurrency(stats.totalSales) : '$0'}</div>
          <span className="trend up">
            {hasData ? '▲ Dato actual' : <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
          </span>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Ganancia bruta</span>
            <span className="stat-icon">◈</span>
          </div>
          <div className="stat-value">
            {hasData ? formatCurrency(stats.totalSales - stats.totalPurchases - stats.totalExpenses) : '$0'}
          </div>
          <span className="trend up">
            {hasData ? '▲ Calculado' : <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
          </span>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Caja disponible</span>
            <span className="stat-icon">▣</span>
          </div>
          <div className="stat-value">
            {hasData ? formatCurrency(Math.max(0, stats.totalSales - stats.totalExpenses)) : '$0'}
          </div>
          <span className="trend up">
            {hasData ? '▲ Calculado' : <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
          </span>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Cuentas por pagar</span>
            <span className="stat-icon">↘</span>
          </div>
          <div className="stat-value">{hasData ? formatCurrency(stats.totalPurchases) : '$0'}</div>
          <span className="trend down">
            {hasData ? '● Calculado' : <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
          </span>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <div className="card-head">
            <h3>Ventas e ingresos</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); setReportOpen(true); }}>
              Ver reporte →
            </a>
          </div>
          <div className="card-body">
            {hasData && stats.salesByMonth.length > 0 ? (
              <>
                <div className="chart-wrap">
                  <canvas ref={canvasRef} className="chart" />
                </div>
                <div className="legend">
                  <span><i className="dot" /> Ventas</span>
                  <span><i className="dot alt" /> Ingresos</span>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-ink-soft">
                <p>No hay datos de ventas para mostrar</p>
                <p className="text-sm mt-1">Registra tu primera venta para ver el gráfico</p>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Distribución de caja</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/cash'); }}>
              Ver caja →
            </a>
          </div>
          <div className="card-body">
            {hasData ? (
              <>
                <div className="balance">
                  <div className="label">Total disponible</div>
                  <div className="amount">{formatCurrency(Math.max(0, stats.totalSales - stats.totalExpenses))}</div>
                </div>
                <div className="cash-row">
                  <span>💵 Efectivo</span>
                  <span>{formatCurrency(Math.round((stats.totalSales - stats.totalExpenses) * 0.27))}</span>
                </div>
                <div className="cash-row">
                  <span>🏦 Banco</span>
                  <span>{formatCurrency(Math.round((stats.totalSales - stats.totalExpenses) * 0.45))}</span>
                </div>
                <div className="cash-row">
                  <span>📱 Mercado Pago</span>
                  <span>{formatCurrency(Math.round((stats.totalSales - stats.totalExpenses) * 0.2))}</span>
                </div>
                <div className="cash-row">
                  <span>💳 Tarjetas</span>
                  <span>{formatCurrency(Math.round((stats.totalSales - stats.totalExpenses) * 0.08))}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-ink-soft">
                <p>No hay movimientos de caja</p>
                <p className="text-sm mt-1">Registra ingresos y egresos para ver la distribución</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid three">
        <div className="card">
          <div className="card-head">
            <h3>Productos más vendidos</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/sales'); }}>
              Ver todos →
            </a>
          </div>
          <div className="card-body">
            {topProducts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Unid.</th>
                    <th className="right">Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.productId}>
                      <td>
                        <div className="product">
                          <div className="thumb">📦</div>
                          <div>{p.productName}</div>
                        </div>
                      </td>
                      <td>{p.quantity}</td>
                      <td className="right">{formatCurrency(p.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-ink-soft">
                <p>No hay productos vendidos</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Stock crítico</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>
              Inventario →
            </a>
          </div>
          <div className="card-body">
            {criticalStock.length > 0 ? (
              criticalStock.slice(0, 5).map((p) => (
                <div key={p.id} className="alert">
                  <div className="alert-icon" style={{ background: p.stock === 0 ? '#fee2e2' : '#fef3c7' }}>
                    {p.stock === 0 ? '!' : '⚠'}
                  </div>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      Stock: {p.stock} {p.unit || 'un'} · Mínimo: {p.minStock || 10} {p.unit || 'un'}
                    </small>
                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.max(0, Math.min(100, (p.stock / (p.minStock || 10)) * 100))}%`,
                          background: p.stock === 0 ? 'var(--danger)' : 'var(--warning)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-ink-soft">
                <p>No hay productos con stock crítico</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Acciones rápidas</h3>
          </div>
          <div className="card-body">
            <div className="quick">
              <button onClick={() => navigate('/sales')}>
                <span>🛒</span>
                <b>Nueva venta</b>
              </button>
              <button onClick={() => navigate('/purchases')}>
                <span>📥</span>
                <b>Nueva compra</b>
              </button>
              <button onClick={() => navigate('/products')}>
                <span>📦</span>
                <b>Producto</b>
              </button>
              <button onClick={() => navigate('/expenses')}>
                <span>🧾</span>
                <b>Gasto</b>
              </button>
              <button onClick={() => navigate('/customers')}>
                <span>👥</span>
                <b>Cliente</b>
              </button>
              <button onClick={() => navigate('/suppliers')}>
                <span>🏢</span>
                <b>Proveedor</b>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-head">
          <h3>Últimas operaciones</h3>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/sales'); }}>
            Ver todas →
          </a>
        </div>
        <div className="card-body">
          {recentOperations.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Medio</th>
                  <th>Estado</th>
                  <th className="right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {recentOperations.map((op, idx) => (
                  <tr key={idx}>
                    <td>{op.date.toLocaleDateString('es-AR')} · {op.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{op.type}</td>
                    <td>{op.description}</td>
                    <td>{op.medium}</td>
                    <td>
                      <span
                        className={
                          'badge ' +
                          (op.status === 'COMPLETED' || op.status === 'COBRADA' || op.status === 'COBRADO' || op.status === 'REGISTRADO'
                            ? 'green'
                            : op.status === 'PENDING' || op.status === 'PENDIENTE'
                            ? 'yellow'
                            : 'gray')
                        }
                      >
                        {op.status}
                      </span>
                    </td>
                    <td className="right">
                      <b>{op.sign}{formatCurrency(op.amount)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-ink-soft">
              <p>No hay operaciones registradas</p>
              <p className="text-sm mt-1">Comienza registrando una venta, compra o gasto</p>
            </div>
          )}
        </div>
      </div>

      <div className="footer-note">Flaxio · Sistema local de gestión comercial</div>

      <Modal open={reportOpen} title="Reporte de ventas" onClose={() => setReportOpen(false)} wide>
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">Reporte de ventas por producto y categoría</p>
          {topProducts.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-2">Producto</th>
                  <th className="text-right p-2">Unid.</th>
                  <th className="text-right p-2">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-line/50">
                    <td className="p-2">{p.productName}</td>
                    <td className="p-2 text-right">{p.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(p.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-soft text-center py-4">No hay datos suficientes para mostrar</p>
          )}
        </div>
      </Modal>

      <Modal open={periodOpen} title="Seleccionar período" onClose={() => setPeriodOpen(false)}>
        <div className="space-y-3">
          <button className="btn w-full text-left" onClick={() => { setPeriod('week'); setPeriodOpen(false); showToast('Período: esta semana'); }}>
            📅 Esta semana
          </button>
          <button className="btn w-full text-left" onClick={() => { setPeriod('month'); setPeriodOpen(false); showToast('Período: este mes'); }}>
            📅 Este mes
          </button>
          <button className="btn w-full text-left" onClick={() => { setPeriod('year'); setPeriodOpen(false); showToast('Período: este año'); }}>
            📅 Este año
          </button>
        </div>
      </Modal>

      <div
        id="toast"
        style={{
          position: 'fixed',
          right: '22px',
          bottom: '22px',
          background: '#111827',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '10px',
          boxShadow: '0 12px 35px rgba(0,0,0,.2)',
          fontSize: '13px',
          opacity: 0,
          transform: 'translateY(10px)',
          pointerEvents: 'none',
          transition: '.2s',
          zIndex: 99,
        }}
      />
    </>
  );
}
