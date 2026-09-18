import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils';
import { asyncHandler } from '../utils';
import { validateBody, validateParams } from '../middleware/validate';
import {
  productSchema,
  productUpdateSchema,
  saleSchema,
  saleUpdateSchema,
  purchaseSchema,
  purchaseUpdateSchema,
  returnSchema,
  returnUpdateSchema,
  expenseSchema,
  expenseUpdateSchema,
  customerSchema,
  customerUpdateSchema,
  supplierSchema,
  supplierUpdateSchema,
  categorySchema,
  categoryUpdateSchema,
  cashMovementSchema,
  cashMovementUpdateSchema,
  idParamSchema,
} from '../schemas';

function getUserId(req: Request): string {
  return (req as any).user.sub;
}

const router = require('express').Router();

router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalSales = 0;
  let totalPurchases = 0;
  let totalExpenses = 0;
  let productsCount = 0;
  let lowStockCount = 0;
  let todaySales = 0;
  let todaySalesCount = 0;
  let salesByMonth: { date: string; total: number }[] = [];
  let topProductsDataArr: { productId: string; quantity: number; subtotal: number }[] = [];

  try {
    const totalSalesAgg = await prisma.sale.aggregate({ where: { userId }, _sum: { total: true } });
    totalSales = totalSalesAgg._sum.total || 0;
    const todayAgg = await prisma.sale.aggregate({
      where: { userId, date: { gte: dayStart } },
      _sum: { total: true },
      _count: { _all: true },
    });
    todaySales = todayAgg._sum.total || 0;
    todaySalesCount = todayAgg._count._all || 0;
  } catch (err) {
    console.error('[dashboard] sales error:', err);
  }

  try {
    const totalPurchasesAgg = await prisma.purchase.aggregate({ where: { userId }, _sum: { total: true } });
    totalPurchases = totalPurchasesAgg._sum.total || 0;
  } catch (err) {
    console.error('[dashboard] purchases error:', err);
  }

  try {
    const totalExpensesAgg = await prisma.expense.aggregate({ where: { userId }, _sum: { amount: true } });
    totalExpenses = totalExpensesAgg._sum.amount || 0;
  } catch (err) {
    console.error('[dashboard] expenses error:', err);
  }

  try {
    productsCount = await prisma.product.count({ where: { userId } });
    lowStockCount = await prisma.product.count({ where: { userId, stock: { lte: 10 } } });
  } catch (err) {
    console.error('[dashboard] products error:', err);
  }

  try {
    const topProductsAgg = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { userId, date: { gte: yearStart } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    topProductsDataArr = topProductsAgg.map((p) => ({
      productId: p.productId,
      quantity: p._sum.quantity || 0,
      subtotal: p._sum.subtotal || 0,
    }));
  } catch (err) {
    console.error('[dashboard] topProducts error:', err);
  }

  try {
    const salesThisYear = await prisma.sale.findMany({
      where: { userId, date: { gte: yearStart } },
      select: { date: true, total: true },
    });
    const byMonth = new Map<string, number>();
    for (const s of salesThisYear) {
      const d = s.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + s.total);
    }
    salesByMonth = Array.from(byMonth.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('[dashboard] salesByMonth error:', err);
  }

  const productIds = topProductsDataArr.map((p) => p.productId);
  let topProductsData: { id: string; name: string }[] = [];
  if (productIds.length) {
    try {
      topProductsData = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
    } catch (err) {
      console.error('[dashboard] topProductsData error:', err);
    }
  }

  res.json({
    totalSales,
    totalPurchases,
    totalExpenses,
    productsCount,
    lowStockCount,
    todaySales,
    todaySalesCount,
    salesByMonth,
    topProducts: topProductsDataArr.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      subtotal: p.subtotal,
      product: topProductsData.find((t) => t.id === p.productId),
    })),
  });
}));

router.get('/products', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const products = await prisma.product.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
}));

router.post('/products', validateBody(productSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { category, ...data } = req.body as any;
  let categoryId: string | undefined;
  if (category) {
    const cat = await prisma.category.findFirst({ where: { name: category, userId } });
    if (!cat) {
      const newCat = await prisma.category.create({ data: { name: category, userId } });
      categoryId = newCat.id;
    } else {
      categoryId = cat.id;
    }
  }
  const product = await prisma.product.create({
    data: { ...data, userId, categoryId },
  });
  res.status(201).json(product);
}));

router.put('/products/:id', validateParams(idParamSchema), validateBody(productUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const id = req.params.id;
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new ApiError(404, 'Producto no encontrado.');
  const { category, ...data } = req.body as any;
  let categoryId = product.categoryId;
  if (category) {
    const cat = await prisma.category.findFirst({ where: { name: category, userId } });
    if (!cat) {
      const newCat = await prisma.category.create({ data: { name: category, userId } });
      categoryId = newCat.id;
    } else {
      categoryId = cat.id;
    }
  }
  const updated = await prisma.product.update({ where: { id }, data: { ...data, categoryId } });
  res.json(updated);
}));

router.delete('/products/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const id = req.params.id;
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new ApiError(404, 'Producto no encontrado.');
  try {
    await prisma.product.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      throw new ApiError(409, 'No se puede eliminar: el producto está referenciado en ventas, compras o devoluciones.');
    }
    throw err;
  }
  res.status(204).end();
}));

router.get('/sales', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const sales = await prisma.sale.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(sales);
}));

router.post('/sales', validateBody(saleSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = req.body as any;
  const total = data.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const sale = await prisma.sale.create({
    data: {
      userId,
      date: new Date(data.date),
      total,
      customerName: data.customerName || '',
      paymentMethod: data.paymentMethod,
      status: data.status || 'COMPLETED',
      items: {
        create: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
      },
    },
    include: { items: true },
  });
  await Promise.all(
    data.items.map((item: any) =>
      prisma.product.updateMany({
        where: { id: item.productId, userId },
        data: { stock: { decrement: item.quantity } },
      })
    )
  );

  if (sale.status === 'COMPLETED') {
    await prisma.cashMovement.create({
      data: {
        userId,
        date: sale.date,
        type: 'INCOME',
        amount: sale.total,
        method: sale.paymentMethod,
        description: 'Venta #' + sale.id.slice(0, 8) + (sale.customerName ? ' · ' + sale.customerName : ''),
      },
    });
  }

  res.status(201).json(sale);
}));

router.get('/purchases', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
}));

router.post('/purchases', validateBody(purchaseSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = req.body as any;
  const total = data.items.reduce((sum: number, item: any) => sum + item.cost * item.quantity, 0);
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      date: new Date(data.date),
      total,
      supplier: data.supplier,
      status: data.status || 'PENDING',
      items: {
        create: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost,
          subtotal: item.cost * item.quantity,
        })),
      },
    },
    include: { items: true },
  });
  await Promise.all(
    data.items.map((item: any) =>
      prisma.product.updateMany({
        where: { id: item.productId, userId },
        data: { stock: { increment: item.quantity } },
      })
    )
  );

  if (purchase.status === 'COMPLETED') {
    await prisma.cashMovement.create({
      data: {
        userId,
        date: purchase.date,
        type: 'EXPENSE',
        amount: purchase.total,
        method: 'Cuenta corriente',
        description: 'Compra #' + purchase.id.slice(0, 8) + ' · ' + purchase.supplier,
      },
    });
  }

  res.status(201).json(purchase);
}));

router.get('/returns', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const returns = await prisma.return.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(returns);
}));

router.post('/returns', validateBody(returnSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = req.body as any;
  const total = data.items.reduce((sum: number, item: any) => sum + item.listPrice * item.quantity, 0);
  const ret = await prisma.return.create({
    data: {
      userId,
      date: new Date(data.date),
      total,
      supplier: data.supplier,
      status: data.status || 'PENDING',
      items: {
        create: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          listPrice: item.listPrice,
          subtotal: item.listPrice * item.quantity,
        })),
      },
    },
    include: { items: true },
  });
  await Promise.all(
    data.items.map((item: any) =>
      prisma.product.updateMany({
        where: { id: item.productId, userId },
        data: { stock: { increment: item.quantity } },
      })
    )
  );

  if (ret.status === 'COMPLETED') {
    await prisma.cashMovement.create({
      data: {
        userId,
        date: ret.date,
        type: 'INCOME',
        amount: ret.total,
        method: 'Cuenta corriente',
        description: 'Devolución #' + ret.id.slice(0, 8) + ' · ' + ret.supplier,
      },
    });
  }

  res.status(201).json(ret);
}));

router.get('/expenses', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });
  res.json(expenses);
}));

router.post('/expenses', validateBody(expenseSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const expense = await prisma.expense.create({
    data: {
      userId,
      date: new Date(req.body.date),
      amount: req.body.amount,
      category: req.body.category,
      description: req.body.description || '',
    },
  });
  res.status(201).json(expense);
}));

router.get('/customers', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const customers = await prisma.customer.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  res.json(customers);
}));

router.post('/customers', validateBody(customerSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const customer = await prisma.customer.create({
    data: { ...req.body, userId },
  });
  res.status(201).json(customer);
}));

router.get('/suppliers', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const suppliers = await prisma.supplier.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  res.json(suppliers);
}));

router.post('/suppliers', validateBody(supplierSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const supplier = await prisma.supplier.create({
    data: { ...req.body, userId },
  });
  res.status(201).json(supplier);
}));

router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
}));

router.post('/categories', validateBody(categorySchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const category = await prisma.category.create({
    data: { ...req.body, userId },
  });
  res.status(201).json(category);
}));

router.get('/cash', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const movements = await prisma.cashMovement.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });
  res.json(movements);
}));

router.post('/cash', validateBody(cashMovementSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const movement = await prisma.cashMovement.create({
    data: {
      userId,
      date: new Date(req.body.date),
      type: req.body.type,
      amount: req.body.amount,
      method: req.body.method,
      description: req.body.description || '',
    },
  });
  res.status(201).json(movement);
}));

// Products
router.get('/products/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const product = await prisma.product.findFirst({ where: { id: req.params.id, userId }, include: { category: true } });
  if (!product) throw new ApiError(404, 'Producto no encontrado.');
  res.json(product);
}));

// Sales
router.get('/sales/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, userId }, include: { items: { include: { product: true } } } });
  if (!sale) throw new ApiError(404, 'Venta no encontrada.');
  res.json(sale);
}));

router.put('/sales/:id', validateParams(idParamSchema), validateBody(saleUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, userId } });
  if (!sale) throw new ApiError(404, 'Venta no encontrada.');
  const { items, ...data } = req.body as any;
  const updated = await prisma.sale.update({ where: { id: req.params.id }, data });
  if (Array.isArray(items) && items.length) {
    await prisma.saleItem.deleteMany({ where: { saleId: updated.id } });
    await prisma.saleItem.createMany({
      data: items.map((item: any) => ({
        saleId: updated.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
    });
  }
  res.json(updated);
}));

router.delete('/sales/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const sale = await prisma.sale.findFirst({ where: { id: req.params.id, userId } });
  if (!sale) throw new ApiError(404, 'Venta no encontrada.');
  await prisma.sale.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Purchases
router.get('/purchases/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, userId }, include: { items: { include: { product: true } } } });
  if (!purchase) throw new ApiError(404, 'Compra no encontrada.');
  res.json(purchase);
}));

router.put('/purchases/:id', validateParams(idParamSchema), validateBody(purchaseUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, userId } });
  if (!purchase) throw new ApiError(404, 'Compra no encontrada.');
  const wasPending = purchase.status === 'PENDING';
  const { items, ...data } = req.body as any;
  const updated = await prisma.purchase.update({ where: { id: req.params.id }, data });
  if (Array.isArray(items) && items.length) {
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: updated.id } });
    await prisma.purchaseItem.createMany({
      data: items.map((item: any) => ({
        purchaseId: updated.id,
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        subtotal: item.cost * item.quantity,
      })),
    });
  }
  if (wasPending && updated.status === 'COMPLETED') {
    await prisma.cashMovement.create({
      data: {
        userId,
        date: updated.date,
        type: 'EXPENSE',
        amount: updated.total,
        method: 'Cuenta corriente',
        description: 'Compra #' + updated.id.slice(0, 8) + ' · ' + updated.supplier,
      },
    });
  }
  res.json(updated);
}));

router.delete('/purchases/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.id, userId } });
  if (!purchase) throw new ApiError(404, 'Compra no encontrada.');
  await prisma.purchase.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Returns
router.get('/returns/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const ret = await prisma.return.findFirst({ where: { id: req.params.id, userId }, include: { items: { include: { product: true } } } });
  if (!ret) throw new ApiError(404, 'Devolución no encontrada.');
  res.json(ret);
}));

router.put('/returns/:id', validateParams(idParamSchema), validateBody(returnUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const ret = await prisma.return.findFirst({ where: { id: req.params.id, userId } });
  if (!ret) throw new ApiError(404, 'Devolución no encontrada.');
  const wasPending = ret.status === 'PENDING';
  const { items, ...data } = req.body as any;
  const updated = await prisma.return.update({ where: { id: req.params.id }, data });
  if (Array.isArray(items) && items.length) {
    await prisma.returnItem.deleteMany({ where: { returnId: updated.id } });
    await prisma.returnItem.createMany({
      data: items.map((item: any) => ({
        returnId: updated.id,
        productId: item.productId,
        quantity: item.quantity,
        listPrice: item.listPrice,
        subtotal: item.listPrice * item.quantity,
      })),
    });
  }
  if (wasPending && updated.status === 'COMPLETED') {
    await prisma.cashMovement.create({
      data: {
        userId,
        date: updated.date,
        type: 'INCOME',
        amount: updated.total,
        method: 'Cuenta corriente',
        description: 'Devolución #' + updated.id.slice(0, 8) + ' · ' + updated.supplier,
      },
    });
  }
  res.json(updated);
}));

router.delete('/returns/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const ret = await prisma.return.findFirst({ where: { id: req.params.id, userId } });
  if (!ret) throw new ApiError(404, 'Devolución no encontrada.');
  await prisma.return.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Expenses
router.get('/expenses/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!expense) throw new ApiError(404, 'Gasto no encontrado.');
  res.json(expense);
}));

router.put('/expenses/:id', validateParams(idParamSchema), validateBody(expenseUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!expense) throw new ApiError(404, 'Gasto no encontrado.');
  const updated = await prisma.expense.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}));

router.delete('/expenses/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!expense) throw new ApiError(404, 'Gasto no encontrado.');
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Customers
router.get('/customers/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, userId } });
  if (!customer) throw new ApiError(404, 'Cliente no encontrado.');
  res.json(customer);
}));

router.put('/customers/:id', validateParams(idParamSchema), validateBody(customerUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, userId } });
  if (!customer) throw new ApiError(404, 'Cliente no encontrado.');
  const updated = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}));

router.delete('/customers/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, userId } });
  if (!customer) throw new ApiError(404, 'Cliente no encontrado.');
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Suppliers
router.get('/suppliers/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, userId } });
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado.');
  res.json(supplier);
}));

router.put('/suppliers/:id', validateParams(idParamSchema), validateBody(supplierUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, userId } });
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado.');
  const updated = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}));

router.delete('/suppliers/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, userId } });
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado.');
  await prisma.supplier.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Categories
router.get('/categories/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const category = await prisma.category.findFirst({ where: { id: req.params.id, userId } });
  if (!category) throw new ApiError(404, 'Categoría no encontrada.');
  res.json(category);
}));

router.put('/categories/:id', validateParams(idParamSchema), validateBody(categoryUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const category = await prisma.category.findFirst({ where: { id: req.params.id, userId } });
  if (!category) throw new ApiError(404, 'Categoría no encontrada.');
  const updated = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}));

router.delete('/categories/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const category = await prisma.category.findFirst({ where: { id: req.params.id, userId } });
  if (!category) throw new ApiError(404, 'Categoría no encontrada.');
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// Cash movements
router.get('/cash/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const movement = await prisma.cashMovement.findFirst({ where: { id: req.params.id, userId } });
  if (!movement) throw new ApiError(404, 'Movimiento no encontrado.');
  res.json(movement);
}));

router.put('/cash/:id', validateParams(idParamSchema), validateBody(cashMovementUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const movement = await prisma.cashMovement.findFirst({ where: { id: req.params.id, userId } });
  if (!movement) throw new ApiError(404, 'Movimiento no encontrado.');
  const updated = await prisma.cashMovement.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}));

router.delete('/cash/:id', validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const movement = await prisma.cashMovement.findFirst({ where: { id: req.params.id, userId } });
  if (!movement) throw new ApiError(404, 'Movimiento no encontrado.');
  await prisma.cashMovement.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

export default router;
