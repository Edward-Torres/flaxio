import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    email: z.string().trim().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  })
  .strict();

export const idParamSchema = z.object({ id: z.string().uuid() }).strict();

export const productSchema = z
  .object({
    name: z.string().min(1).max(200),
    category: z.string().min(1).max(100).optional().or(z.literal('')),
    price: z.coerce.number().positive(),
    cost: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0),
    minStock: z.coerce.number().int().min(0).optional(),
    unit: z.string().min(1).max(50).optional(),
  })
  .strict();

export const saleSchema = z
  .object({
    date: z.string().min(1),
    customerName: z.string().min(1).max(200).optional(),
    paymentMethod: z.string().min(1).max(50),
    status: z.string().min(1).max(50).optional(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        price: z.coerce.number().positive(),
      })
    ).min(1),
  })
  .strict();

export const purchaseSchema = z
  .object({
    date: z.string().min(1),
    supplier: z.string().min(1).max(200),
    status: z.string().min(1).max(50).optional(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        cost: z.coerce.number().positive(),
      })
    ).min(1),
  })
  .strict();

export const expenseSchema = z
  .object({
    date: z.string().min(1),
    amount: z.coerce.number().positive(),
    category: z.string().min(1).max(100),
    description: z.string().min(1).max(500).optional(),
  })
  .strict();

export const customerSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
  })
  .strict();

export const supplierSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
  })
  .strict();

export const categorySchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .strict();

export const cashMovementSchema = z
  .object({
    date: z.string().min(1),
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.coerce.number().positive(),
    method: z.string().min(1).max(50),
    description: z.string().max(500).optional().or(z.literal('')),
  })
  .strict();

export const productUpdateSchema = productSchema.partial().strict();

export const saleUpdateSchema = saleSchema.partial().strict();

export const purchaseUpdateSchema = purchaseSchema.partial().strict();

export const expenseUpdateSchema = expenseSchema.partial().strict();

export const customerUpdateSchema = customerSchema.partial().strict();

export const supplierUpdateSchema = supplierSchema.partial().strict();

export const categoryUpdateSchema = categorySchema.partial().strict();

export const cashMovementUpdateSchema = cashMovementSchema.partial().strict();

export const returnSchema = z
  .object({
    date: z.string().min(1),
    supplier: z.string().min(1).max(200),
    status: z.string().min(1).max(50).optional(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        listPrice: z.coerce.number().positive(),
      })
    ).min(1),
  })
  .strict();

export const returnUpdateSchema = returnSchema.partial().strict();
