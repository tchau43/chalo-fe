"use client";
// src/services/order/order.queries.ts
import { QUERY_KEYS } from "@/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  getEstimatedWait,
  getOrderById,
  getOrdersByTableToken,
  payAllOrders,
  payOrder,
  requestPayment,
} from "./order.api";
import {
  CreateOrderPayload,
  PayAllOrdersPayload,
  PayOrderPayload,
} from "./order.types";
import { toast } from "sonner";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGetOrderByToken = (tableToken: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.BY_TABLE_TOKEN(tableToken),
    queryFn: () => getOrdersByTableToken(tableToken),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
};

export const useGetOrderById = (orderId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.DETAIL(orderId),
    queryFn: () => getOrderById(orderId),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
};

export const useGetEstimatedWait = (orderId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.ESTIMATED_WAIT(orderId),
    queryFn: () => getEstimatedWait(orderId),
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderPayload) => {
      return createOrder(data);
    },
    onSuccess: (createdOrder, variables) => {
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.ORDERS.BY_TABLE_TOKEN(variables.tableToken),
      });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ESTIMATED_WAIT() });
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.ORDERS.ESTIMATED_WAIT(createdOrder.id),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useRequestPayment = () => {
  return useMutation({
    mutationFn: (orderId: string) => requestPayment(orderId),
    onSuccess: () => toast.success("Đã gửi yêu cầu thanh toán đến quầy"),
    onError: (e: Error) => toast.error(e.message),
  });
};

export const usePayOrder = (tableToken: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PayOrderPayload) => payOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.ORDERS.BY_TABLE_TOKEN(tableToken),
      });
      toast.success("Thanh toán thành công!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const usePayAllOrders = (tableToken: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PayAllOrdersPayload) => payAllOrders(data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.ORDERS.BY_TABLE_TOKEN(tableToken),
      });
      toast.success("Đã thanh toán tất cả đơn hàng!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
