export interface Product {
  id: string;
  userId: string;
  categoryId?: string;
  name: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
}

export interface Sale {
  id: string;
  userId: string;
  date: string;
  total: number;
  customerName?: string;
  paymentMethod: string;
  status: string;
  items: SaleItem[];
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export interface Purchase {
  id: string;
  userId: string;
  date: string;
  total: number;
  supplier: string;
  status: string;
  items: PurchaseItem[];
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  cost: number;
  subtotal: number;
  product?: Product;
}

export interface Return {
  id: string;
  userId: string;
  date: string;
  total: number;
  supplier: string;
  status: string;
  items: ReturnItem[];
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  quantity: number;
  listPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Expense {
  id: string;
  userId: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  userId: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  method: string;
  description?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
   productsCount: number;
  lowStockCount: number;
  todaySales: number;
  todaySalesCount: number;
  salesByMonth: { date: string; total: number }[];
  topProducts: { productId: string; quantity: number; subtotal: number; product?: { id: string; name: string } }[];
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}
