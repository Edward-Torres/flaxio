import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/zones/Dashboard';
import Products from './pages/admin/zones/Products';
import Sales from './pages/admin/zones/Sales';
import Purchases from './pages/admin/zones/Purchases';
import Returns from './pages/admin/zones/Returns';
import Expenses from './pages/admin/zones/Expenses';
import Customers from './pages/admin/zones/Customers';
import Suppliers from './pages/admin/zones/Suppliers';
import Cash from './pages/admin/zones/Cash';
import Categories from './pages/admin/zones/Categories';

export default function App() {
  const { isAuthed, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-navy font-medium">Cargando...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="sales" element={<Sales />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="returns" element={<Returns />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="cash" element={<Cash />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
