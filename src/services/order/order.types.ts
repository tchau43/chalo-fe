// src/services/order/order.types.ts

import { PageParam } from "../types";

export const ORDER_STATUS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  note: string | null;
}

export interface OrderDto {
  id: string;
  tableId: string;
  tableName: string;
  tableToken: string;
  items: OrderItemDto[];
  status: OrderStatus;
  paidStatus: boolean;
  totalAmount: number;
  estimateWaitMinutes: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  tableToken: string;
  items: { productId: string; quantity: number; note?: string }[];
  note?: string;
}

export interface OrderPageParams extends PageParam {
  status?: OrderStatus;
  tableId?: string;
  date?: string;
  paidStatus?: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  price: number;
  quantity: number;
  note?: string;
}

export interface PayOrderPayload {
  orderId: string;
}

export interface PayAllOrdersPayload {
  tableToken: string;
}
