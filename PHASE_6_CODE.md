# Phase 6 — Staff Real-time Dashboard + POS

> Tất cả file cần tạo/sửa cho Phase 6. Đọc phần **Bug Fixes** trước khi bắt đầu.

---

## 🐛 Bug Fixes (sửa trước khi làm Phase 6)

### Fix 1 — `.env` thiếu MSW flag
```bash
# .env
NEXT_PUBLIC_ENABLE_MSW=true
```

### Fix 2 — `src/mocks/handlers/index.ts` thiếu orderHandlers
```ts
// src/mocks/handlers/index.ts
import { authHandlers } from './auth.handlers'
import { menuHandlers } from './menu.handlers'
import { tableHandlers } from './tables.handlers'
import { orderHandlers } from './order.handlers'

export const handlers = [
  ...authHandlers,
  ...menuHandlers,
  ...tableHandlers,
  ...orderHandlers,
]
```

### Fix 3 — `src/mocks/handlers/order.handlers.ts` thiếu `paidStatus` + thiếu pay handlers

Thêm `paidStatus: false` vào seed data và thêm các handler còn thiếu. Xem file order.handlers.ts đầy đủ ở dưới.

### Fix 4 — `src/services/order/order.api.ts` field name mismatch
```ts
// Dòng này sai:
export const updateOrderStatus = (orderId: string, status: OrderStatus): Promise<OrderDto> =>
  request.put(API.ORDER.UPDATE_STATUS, { orderId, status });

// Sửa thành (khớp với mock handler expect { id, status }):
export const updateOrderStatus = (orderId: string, status: OrderStatus): Promise<OrderDto> =>
  request.put(API.ORDER.UPDATE_STATUS, { id: orderId, status });
```

### Fix 5 — `src/stores/cart.store.ts` xóa console.log debug
Xóa dòng `console.log(state.items);` trong `addItem`.

---

## 📁 Danh sách file Phase 6

```
src/
├── app/
│   └── (staff)/
│       └── staff/
│           ├── orders/
│           │   ├── page.tsx                          ← Kanban board
│           │   └── @modal/
│           │       ├── default.tsx                   ← Parallel Route slot rỗng
│           │       └── (.)orders/[orderId]/
│           │           └── page.tsx                  ← Intercepting Route modal
│           ├── pos/
│           │   └── page.tsx                          ← POS interface
│           └── tables/
│               └── page.tsx                          ← Table grid
├── hooks/
│   └── useSSE.ts                                     ← SSE hook
├── mocks/
│   └── handlers/
│       └── order.handlers.ts                         ← Updated (fix bugs + SSE mock)
├── services/
│   └── order/
│       └── order.queries.ts                          ← Thêm useUpdateOrderStatus
└── components/
    └── shared/
        └── icons/                                    ← Điền SVG còn thiếu
```

---

## 1. `src/hooks/useSSE.ts`

```ts
// src/hooks/useSSE.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseSSEOptions {
  /** Đường dẫn SSE (relative hoặc absolute) */
  url: string
  /** Callback nhận mỗi SSE event */
  onMessage: (event: MessageEvent) => void
  /** Tự động reconnect sau N ms (mặc định 3000) */
  reconnectDelay?: number
  /** Bật/tắt kết nối — false thì không mở EventSource */
  enabled?: boolean
}

/**
 * useSSE — hook subscribe Server-Sent Events với auto-reconnect.
 *
 * Pattern:
 *   1. Mở EventSource khi component mount
 *   2. onMessage được gọi mỗi khi server push event
 *   3. Nếu kết nối lỗi → đóng → đặt timer reconnect → mở lại
 *   4. Cleanup khi unmount (đóng ES, xóa timer)
 */
export function useSSE({
  url,
  onMessage,
  reconnectDelay = 3_000,
  enabled = true,
}: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Dùng ref để onMessage luôn là phiên bản mới nhất, không trigger re-subscribe
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!enabled) return

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      onMessageRef.current(e)
    }

    es.onerror = () => {
      // Đóng ES lỗi — tránh nhiều connection cùng tồn tại
      es.close()
      esRef.current = null
      // Đặt timer reconnect
      timerRef.current = setTimeout(connect, reconnectDelay)
    }
  }, [url, enabled, reconnectDelay])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [connect])
}
```

---

## 2. `src/app/api/sse/orders/route.ts` — SSE Route Handler

```ts
// src/app/api/sse/orders/route.ts
import { NextRequest } from 'next/server'

/**
 * SSE Route Handler cho Staff Orders real-time.
 *
 * Trong dev với MSW: client gọi /api/sse/orders
 * MSW không intercept EventSource (SSE dùng fetch stream, không phải XHR)
 * → Request đi thẳng đến Next.js Route Handler này.
 *
 * Handler này giả lập push event mỗi 10s để test.
 * Production: thay bằng kết nối đến Backend SSE stream thật.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Push event ngay lập tức để client biết connected
      const sendEvent = (type: string, data: unknown) => {
        const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      sendEvent('connected', { message: 'SSE connected' })

      // Mock: push "order_updated" event mỗi 10 giây
      const interval = setInterval(() => {
        sendEvent('order_updated', {
          type: 'ORDER_UPDATED',
          timestamp: new Date().toISOString(),
        })
      }, 10_000)

      // Cleanup khi client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // tắt buffering trên Nginx
    },
  })
}
```

---

## 3. `src/services/order/order.queries.ts` — Thêm useUpdateOrderStatus + useGetOrderPage

```ts
"use client";
// src/services/order/order.queries.ts
import { QUERY_KEYS } from "@/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  getEstimatedWait,
  getOrderById,
  getOrderPage,
  getOrdersByTableToken,
  payAllOrders,
  payOrder,
  requestPayment,
  updateOrderStatus,
} from "./order.api";
import {
  CreateOrderPayload,
  OrderPageParams,
  OrderStatus,
  PayAllOrdersPayload,
  PayOrderPayload,
} from "./order.types";
import { toast } from "sonner";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useGetOrderPage = (params: OrderPageParams) => {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS.PAGE(params),
    queryFn: () => getOrderPage(params),
    staleTime: 30_000,
  })
}

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
    mutationFn: (data: CreateOrderPayload) => createOrder(data),
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

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: (updatedOrder) => {
      // Invalidate toàn bộ orders list để Kanban cập nhật
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
      // Invalidate detail cụ thể
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.ORDERS.DETAIL(updatedOrder.id),
      });
      toast.success("Cập nhật trạng thái đơn thành công");
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
      // Cũng cập nhật danh sách orders cho Staff
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
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
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
      toast.success("Đã thanh toán tất cả đơn hàng!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
```

---

## 4. `src/mocks/handlers/order.handlers.ts` — Full updated

```ts
// src/mocks/handlers/order.handlers.ts
import { http, HttpResponse, delay } from "msw";
import type { OrderDto, OrderStatus } from "@/services/order/order.types";

const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

// Seed data — đầy đủ paidStatus
let orders: OrderDto[] = [
  {
    id: "ord_001",
    tableId: "tbl_01",
    tableName: "Bàn 01",
    tableToken: "qr-token-tbl_01",
    status: "PREPARING",
    paidStatus: false,
    items: [
      {
        id: "item_01",
        productId: "prod_01",
        productName: "Cà phê đen đá",
        productImageUrl: null,
        price: 25000,
        quantity: 2,
        subtotal: 50000,
        note: null,
      },
      {
        id: "item_02",
        productId: "prod_03",
        productName: "Bạc xỉu",
        productImageUrl: null,
        price: 35000,
        quantity: 1,
        subtotal: 35000,
        note: "Ít đá",
      },
    ],
    totalAmount: 85000,
    estimateWaitMinutes: 8,
    note: null,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ord_002",
    tableId: "tbl_08",
    tableName: "Bàn 08",
    tableToken: "qr-token-tbl_08",
    status: "PENDING",
    paidStatus: false,
    items: [
      {
        id: "item_03",
        productId: "prod_08",
        productName: "Trà đào cam sả",
        productImageUrl: null,
        price: 45000,
        quantity: 2,
        subtotal: 90000,
        note: null,
      },
    ],
    totalAmount: 90000,
    estimateWaitMinutes: 5,
    note: "Đem ra cùng lúc",
    createdAt: new Date(Date.now() - 1 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ord_003",
    tableId: "tbl_03",
    tableName: "Bàn 03",
    tableToken: "qr-token-tbl_03",
    status: "CONFIRMED",
    paidStatus: false,
    items: [
      {
        id: "item_04",
        productId: "prod_05",
        productName: "Espresso",
        productImageUrl: null,
        price: 35000,
        quantity: 1,
        subtotal: 35000,
        note: null,
      },
    ],
    totalAmount: 35000,
    estimateWaitMinutes: 3,
    note: null,
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ord_004",
    tableId: "tbl_04",
    tableName: "Bàn 04",
    tableToken: "qr-token-tbl_04",
    status: "READY",
    paidStatus: false,
    items: [
      {
        id: "item_05",
        productId: "prod_08",
        productName: "Trà đào cam sả",
        productImageUrl: null,
        price: 45000,
        quantity: 3,
        subtotal: 135000,
        note: "Ít đường",
      },
    ],
    totalAmount: 135000,
    estimateWaitMinutes: null,
    note: null,
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const calcEstimatedWait = (prepTimePerItem = 5): number => {
  const preparingOrders = orders.filter(
    (o) => o.status === "PREPARING" || o.status === "CONFIRMED",
  );
  const totalItems = preparingOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  return Math.ceil((totalItems * prepTimePerItem) / 3);
};

const ok = (data: unknown) =>
  HttpResponse.json({ code: 200, message: "success", data });
const notFound = (msg = "Không tìm thấy") =>
  HttpResponse.json({ code: 404, message: msg, data: null }, { status: 404 });

export const orderHandlers = [
  // GET /api/order/page (Staff + Admin)
  http.get("*/api/order/page", async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const pageNo = Number(url.searchParams.get("pageNo") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
    const status = url.searchParams.get("status") as OrderStatus | null;

    let filtered = [...orders];
    if (status) filtered = filtered.filter((o) => o.status === status);
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const start = (pageNo - 1) * pageSize;
    return ok({
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
    });
  }),

  // GET /api/order/detail?id=
  http.get("*/api/order/detail", async ({ request }) => {
    await delay(200);
    const id = new URL(request.url).searchParams.get("id");
    const order = orders.find((o) => o.id === id);
    return order ? ok(order) : notFound();
  }),

  // GET /api/order/by-token/:token (Customer)
  http.get("*/api/order/by-token/:token", async ({ params }) => {
    await delay(300);
    const token = params.token as string;
    const tableOrders = orders
      .filter(
        (o) =>
          o.tableToken === token &&
          o.status !== "COMPLETED" &&
          o.status !== "CANCELLED",
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return ok(tableOrders);
  }),

  // GET /api/order/estimated-wait
  http.get("*/api/order/estimated-wait", async () => {
    await delay(200);
    return ok({ estimatedMinutes: calcEstimatedWait() });
  }),

  // POST /api/order/create (Customer)
  http.post("*/api/order/create", async ({ request }) => {
    await delay(600);
    const body = (await request.json()) as Record<string, unknown>;
    const items = body.items as Array<{
      productId: string;
      quantity: number;
      note?: string;
    }>;
    const tableToken = body.tableToken as string;

    const isTable01 = tableToken.includes("tbl_01");
    const mockTableId = isTable01 ? "tbl_01" : `tbl_${generateId("").slice(-3)}`;
    const mockTableName = isTable01 ? "Bàn 01" : "Bàn Khách";
    const estimatedWait = calcEstimatedWait();

    const newOrder: OrderDto = {
      id: generateId("ord"),
      tableId: mockTableId,
      tableName: mockTableName,
      tableToken: tableToken,
      status: "PENDING",
      paidStatus: false,
      items: items.map((item) => {
        const isCoffee = item.productId.includes("prod_01") || item.productId.includes("prod_02");
        const mockPrice = isCoffee ? 25000 : 45000;
        const mockName = isCoffee
          ? "Cà phê " + item.productId.slice(-2)
          : "Trà " + item.productId.slice(-2);
        return {
          id: generateId("item"),
          productId: item.productId,
          productName: mockName,
          productImageUrl: null,
          price: mockPrice,
          quantity: item.quantity,
          subtotal: mockPrice * item.quantity,
          note: item.note || null,
        };
      }),
      totalAmount: 0,
      estimateWaitMinutes: estimatedWait,
      note: (body.note as string) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newOrder.totalAmount = newOrder.items.reduce((sum, i) => sum + i.subtotal, 0);
    orders.unshift(newOrder);
    return ok(newOrder);
  }),

  // PUT /api/order/status (Staff) — expect { id, status }
  http.put("*/api/order/status", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { id: string; status: OrderStatus };
    const idx = orders.findIndex((o) => o.id === body.id);
    if (idx === -1) return notFound();
    orders[idx].status = body.status;
    orders[idx].updatedAt = new Date().toISOString();
    return ok(orders[idx]);
  }),

  // POST /api/order/request-payment (Customer)
  http.post("*/api/order/request-payment", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { orderId: string };
    const idx = orders.findIndex((o) => o.id === body.orderId);
    if (idx === -1) return notFound();
    return ok({ message: "Đã gửi yêu cầu thanh toán" });
  }),

  // POST /api/order/pay (Customer or Staff)
  http.post("*/api/order/pay", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { orderId: string };
    const idx = orders.findIndex((o) => o.id === body.orderId);
    if (idx === -1) return notFound();
    orders[idx].paidStatus = true;
    orders[idx].updatedAt = new Date().toISOString();
    return ok(orders[idx]);
  }),

  // POST /api/order/pay-all (Customer)
  http.post("*/api/order/pay-all", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { tableToken: string };
    const updated: OrderDto[] = [];
    orders = orders.map((o) => {
      if (o.tableToken === body.tableToken && !o.paidStatus) {
        const updatedOrder = { ...o, paidStatus: true, updatedAt: new Date().toISOString() };
        updated.push(updatedOrder);
        return updatedOrder;
      }
      return o;
    });
    return ok(updated);
  }),
];
```

---

## 5. `src/app/(staff)/staff/orders/page.tsx` — Kanban Board Real-time

```tsx
"use client";
// src/app/(staff)/staff/orders/page.tsx

import { SpinnerIcon } from "@/components/shared/icons/SpinnerIcon";
import { useGetOrderPage, useUpdateOrderStatus } from "@/services/order/order.queries";
import { OrderDto, OrderStatus } from "@/services/order/order.types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { QUERY_KEYS } from "@/constants";
import { useSSE } from "@/hooks/useSSE";
import { toast } from "sonner";

// ─── Config ────────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: {
  status: OrderStatus;
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    status: "PENDING",
    label: "Chờ xác nhận",
    emoji: "📋",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800/50",
  },
  {
    status: "CONFIRMED",
    label: "Đã xác nhận",
    emoji: "✅",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800/50",
  },
  {
    status: "PREPARING",
    label: "Đang pha chế",
    emoji: "☕",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800/50",
  },
  {
    status: "READY",
    label: "Sẵn sàng",
    emoji: "🔔",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800/50",
  },
  {
    status: "COMPLETED",
    label: "Hoàn thành",
    emoji: "🎁",
    bgColor: "bg-gray-50 dark:bg-gray-800/50",
    textColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
];

// Next status transitions cho từng trạng thái
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "Xác nhận",
  CONFIRMED: "Bắt đầu pha",
  PREPARING: "Sẵn sàng",
  READY: "Hoàn thành",
};

// ─── OrderCard ─────────────────────────────────────────────────────────────────

const OrderCard = ({
  order,
  onStatusChange,
  isUpdating,
}: {
  order: OrderDto;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  isUpdating: boolean;
}) => {
  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel = NEXT_STATUS_LABEL[order.status];
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const ageMin = Math.floor(ageMs / 60_000);

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-gray-900 shadow-sm p-3.5 space-y-3
        ${order.status === "PENDING" ? "border-l-4 border-l-yellow-400 dark:border-l-yellow-500" : "border-gray-100 dark:border-gray-800"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {order.tableName}
          </p>
          <p className="text-xs text-gray-400 font-mono">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">{ageMin} phút trước</p>
          {order.paidStatus && (
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
              Đã TT
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs">
            <span className="text-gray-700 dark:text-gray-300 truncate pr-2">
              {item.productName}{" "}
              <span className="text-gray-400 font-semibold">×{item.quantity}</span>
            </span>
            {item.note && (
              <span className="text-brand-500 dark:text-brand-400 text-[10px] shrink-0">
                📝 {item.note}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Ghi chú đơn */}
      {order.note && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
          📌 {order.note}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
          {order.totalAmount.toLocaleString("vi-VN")}đ
        </span>

        {nextStatus && (
          <button
            onClick={() => onStatusChange(order.id, nextStatus)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 rounded-lg bg-brand-400 hover:bg-brand-500 active:bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isUpdating ? (
              <SpinnerIcon className="size-3 animate-spin" />
            ) : null}
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
};

// ─── KanbanColumn ──────────────────────────────────────────────────────────────

const KanbanColumn = ({
  config,
  orders,
  onStatusChange,
  updatingId,
}: {
  config: (typeof KANBAN_COLUMNS)[number];
  orders: OrderDto[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  updatingId: string | null;
}) => (
  <div className="flex flex-col min-w-[240px] w-[240px]">
    {/* Column Header */}
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{config.emoji}</span>
        <span className={`text-sm font-bold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      {orders.length > 0 && (
        <span
          className={`size-5 rounded-full text-xs font-bold flex items-center justify-center ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
        >
          {orders.length}
        </span>
      )}
    </div>

    {/* Column Body */}
    <div
      className={`flex-1 min-h-[120px] border-x border-b ${config.borderColor} rounded-b-xl p-2 space-y-2 overflow-y-auto`}
    >
      {orders.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-6">
          Không có đơn
        </p>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={onStatusChange}
            isUpdating={updatingId === order.id}
          />
        ))
      )}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffOrdersPage() {
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef<number>(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch tất cả đơn active (không paginate ở Kanban)
  const { data, isLoading, refetch } = useGetOrderPage({
    pageNo: 1,
    pageSize: 100,
  });

  const updateStatusMutation = useUpdateOrderStatus();

  // ── SSE: lắng nghe event từ server ──────────────────────────────────────────
  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type: string;
          timestamp: string;
        };
        if (parsed.type === "ORDER_UPDATED") {
          // Refetch danh sách đơn khi có cập nhật từ server
          qc.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS.ALL });
        }
      } catch {
        // ignore malformed events
      }
    },
    [qc],
  );

  useSSE({
    url: "/api/sse/orders",
    onMessage: handleSSEMessage,
    enabled: true,
  });

  // ── Âm thanh thông báo khi có đơn PENDING mới ───────────────────────────────
  const activeOrders = data?.list ?? [];
  const pendingCount = activeOrders.filter((o) => o.status === "PENDING").length;

  useEffect(() => {
    if (pendingCount > prevCountRef.current) {
      // Tạo beep âm thanh đơn giản bằng Web Audio API (không cần file mp3)
      try {
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // Web Audio API không hỗ trợ (hiếm gặp)
      }
      toast.info("🔔 Có đơn hàng mới!", { duration: 4000 });
    }
    prevCountRef.current = pendingCount;
  }, [pendingCount]);

  // ── Handle status change ────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await updateStatusMutation.mutateAsync({ orderId, status });
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Group orders by status ─────────────────────────────────────────────────
  const ordersByStatus = KANBAN_COLUMNS.reduce<Record<OrderStatus, OrderDto[]>>(
    (acc, col) => {
      acc[col.status] = activeOrders.filter((o) => o.status === col.status);
      return acc;
    },
    {} as Record<OrderStatus, OrderDto[]>,
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Đơn hàng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time · {activeOrders.length} đơn đang xử lý
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* SSE indicator */}
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <SpinnerIcon className="size-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 h-full pb-4">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                config={col}
                orders={ordersByStatus[col.status] ?? []}
                onStatusChange={handleStatusChange}
                updatingId={updatingId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 6. `src/app/(staff)/staff/pos/page.tsx` — POS Interface

```tsx
"use client";
// src/app/(staff)/staff/pos/page.tsx

import { SpinnerIcon } from "@/components/shared/icons/SpinnerIcon";
import { useGetCategorySimpleList } from "@/services/lookup/lookup.queries";
import { useGetProductPage } from "@/services/menu/menu.queries";
import { useGetTableList } from "@/services/table/table.queries";
import { ProductDto } from "@/services/menu/menu.types";
import { useCreateOrder } from "@/services/order/order.queries";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface POSCartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export default function StaffPOSPage() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedTableToken, setSelectedTableToken] = useState<string>("");
  const [pagerNumber, setPagerNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useGetCategorySimpleList();
  const { data: productPage, isLoading: isLoadingProducts } = useGetProductPage({
    pageNo: 1,
    pageSize: 50,
    categoryId: selectedCategoryId || undefined,
    status: "AVAILABLE",
  });
  const { data: tables } = useGetTableList();
  const createOrderMutation = useCreateOrder();

  const products = productPage?.list ?? [];

  const addToCart = (product: ProductDto) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng đang trống");
      return;
    }
    if (!selectedTableToken) {
      toast.error("Vui lòng chọn bàn");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrderMutation.mutateAsync({
        tableToken: selectedTableToken,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        note: pagerNumber ? `Pager: ${pagerNumber}` : undefined,
      });
      toast.success(`Tạo đơn thành công — #${order.id.slice(-6).toUpperCase()}`);
      setCart([]);
      setSelectedTableToken("");
      setPagerNumber("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex gap-0 overflow-hidden">
      {/* Left — Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-800">
        {/* Category tabs */}
        <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto shrink-0 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSelectedCategoryId("")}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors
              ${selectedCategoryId === ""
                ? "bg-brand-400 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            Tất cả
          </button>
          {(categories ?? []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors
                ${selectedCategoryId === cat.id
                  ? "bg-brand-400 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-40">
              <SpinnerIcon className="size-8 animate-spin text-brand-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {products.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.status !== "AVAILABLE"}
                    className={`relative rounded-xl border p-3 text-left transition-all hover:shadow-md active:scale-[0.97]
                      ${product.status !== "AVAILABLE"
                        ? "opacity-40 cursor-not-allowed border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                        : inCart
                          ? "border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-300"}`}
                  >
                    {/* Badge số lượng trong giỏ */}
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="size-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl mb-2">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="size-full object-cover rounded-lg"
                        />
                      ) : (
                        "☕"
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
                      {product.price.toLocaleString("vi-VN")}đ
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right — Order Panel */}
      <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Đơn tại quầy
          </h2>
          {totalItems > 0 && (
            <p className="text-xs text-gray-400">{totalItems} món</p>
          )}
        </div>

        {/* Table & Pager selector */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Bàn *
            </label>
            <select
              value={selectedTableToken}
              onChange={(e) => setSelectedTableToken(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
            >
              <option value="">— Chọn bàn —</option>
              {(tables ?? []).map((table) => (
                <option key={table.id} value={table.qrToken}>
                  {table.name}
                  {table.area ? ` (${table.area})` : ""}
                  {table.status === "OCCUPIED" ? " 🔴" : " 🟢"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Số thẻ pager
            </label>
            <input
              type="text"
              value={pagerNumber}
              onChange={(e) => setPagerNumber(e.target.value)}
              placeholder="VD: 12"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <span className="text-3xl">🛒</span>
              <p className="text-sm">Chưa có món nào</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-brand-600 dark:text-brand-400">
                    {item.price.toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="size-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          {cart.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tổng cộng</span>
              <span className="text-base font-bold text-brand-600 dark:text-brand-400">
                {totalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Xóa tất cả
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-400 hover:bg-brand-500 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <SpinnerIcon className="size-4 animate-spin" />
              ) : null}
              Tạo đơn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. `src/app/(staff)/staff/tables/page.tsx` — Table Grid

```tsx
"use client";
// src/app/(staff)/staff/tables/page.tsx

import { SpinnerIcon } from "@/components/shared/icons/SpinnerIcon";
import { useGetTableList } from "@/services/table/table.queries";
import { TableDto } from "@/services/table/table.types";
import { useState } from "react";

const STATUS_CONFIG = {
  AVAILABLE: {
    label: "Trống",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800/50",
    textColor: "text-green-700 dark:text-green-400",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    dot: "bg-green-500",
  },
  OCCUPIED: {
    label: "Có khách",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800/50",
    textColor: "text-red-700 dark:text-red-400",
    badgeBg: "bg-red-100 dark:bg-red-900/30",
    dot: "bg-red-500",
  },
};

const TableCard = ({
  table,
  onClick,
}: {
  table: TableDto;
  onClick: (table: TableDto) => void;
}) => {
  const cfg = STATUS_CONFIG[table.status];

  return (
    <button
      onClick={() => onClick(table)}
      className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md active:scale-[0.97]
        ${cfg.bgColor} ${cfg.borderColor}`}
    >
      {/* Status dot */}
      <div className="flex items-center justify-between mb-3">
        <span className={`size-2.5 rounded-full ${cfg.dot}`} />
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.textColor}`}
        >
          {cfg.label}
        </span>
      </div>

      <p className="text-base font-bold text-gray-900 dark:text-gray-100">
        {table.name}
      </p>
      {table.area && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {table.area}
        </p>
      )}

      {table.status === "OCCUPIED" && table.currentOrderId && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
          Đơn: #{table.currentOrderId.slice(-6).toUpperCase()}
        </p>
      )}
    </button>
  );
};

// ─── Table Detail Drawer ──────────────────────────────────────────────────────

const TableDrawer = ({
  table,
  onClose,
}: {
  table: TableDto | null;
  onClose: () => void;
}) => {
  if (!table) return null;
  const cfg = STATUS_CONFIG[table.status];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            {table.name}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${cfg.bgColor} border ${cfg.borderColor}`}
          >
            <span className={`size-3 rounded-full ${cfg.dot}`} />
            <div>
              <p className={`text-sm font-bold ${cfg.textColor}`}>{cfg.label}</p>
              {table.area && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {table.area}
                </p>
              )}
            </div>
          </div>

          {table.status === "OCCUPIED" && table.currentOrderId && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Đơn hàng hiện tại
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                #{table.currentOrderId.slice(-6).toUpperCase()}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              QR Token
            </p>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
              {table.qrToken}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffTablesPage() {
  const { data: tables, isLoading } = useGetTableList();
  const [selectedTable, setSelectedTable] = useState<TableDto | null>(null);
  const [filterArea, setFilterArea] = useState<string>("");

  const areas = [...new Set((tables ?? []).map((t) => t.area).filter(Boolean))];

  const filteredTables = (tables ?? []).filter((t) =>
    filterArea ? t.area === filterArea : true,
  );

  const occupiedCount = (tables ?? []).filter((t) => t.status === "OCCUPIED").length;
  const availableCount = (tables ?? []).filter((t) => t.status === "AVAILABLE").length;

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Sơ đồ bàn
              </h1>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <span className="size-2 rounded-full bg-green-500" />
                  {availableCount} trống
                </span>
                <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <span className="size-2 rounded-full bg-red-500" />
                  {occupiedCount} có khách
                </span>
              </div>
            </div>
          </div>

          {/* Area filter */}
          {areas.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterArea("")}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                  ${filterArea === ""
                    ? "bg-brand-400 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
              >
                Tất cả
              </button>
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setFilterArea(area as string)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                    ${filterArea === area
                      ? "bg-brand-400 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                >
                  {area}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <SpinnerIcon className="size-8 animate-spin text-brand-400" />
            </div>
          ) : filteredTables.length === 0 ? (
            <p className="text-center text-gray-400 py-20">Không có bàn nào</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={setSelectedTable}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <TableDrawer
        table={selectedTable}
        onClose={() => setSelectedTable(null)}
      />
    </>
  );
}
```

---

## 8. Parallel Routes + Intercepting Routes cho Order Modal

### `src/app/(staff)/staff/orders/layout.tsx`

```tsx
// src/app/(staff)/staff/orders/layout.tsx
// Parallel Route layout — slot @modal chạy song song với children

export default function OrdersLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

### `src/app/(staff)/staff/orders/@modal/default.tsx`

```tsx
// src/app/(staff)/staff/orders/@modal/default.tsx
// Slot rỗng khi không có intercepting route nào match
export default function ModalDefault() {
  return null;
}
```

### `src/app/(staff)/staff/orders/@modal/(.)orders/[orderId]/page.tsx`

```tsx
"use client";
// src/app/(staff)/staff/orders/@modal/(.)orders/[orderId]/page.tsx
// Intercepting Route — hiển thị order detail dạng modal khi navigate từ /staff/orders

import { SpinnerIcon } from "@/components/shared/icons/SpinnerIcon";
import { useGetOrderById, useUpdateOrderStatus } from "@/services/order/order.queries";
import { OrderStatus } from "@/services/order/order.types";
import { useParams, useRouter } from "next/navigation";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang pha chế",
  READY: "Sẵn sàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

export default function OrderDetailModal() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const { data: order, isLoading } = useGetOrderById(orderId);
  const updateStatusMutation = useUpdateOrderStatus();

  const handleClose = () => router.back();

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return;
    await updateStatusMutation.mutateAsync({ orderId: order.id, status });
    handleClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Chi tiết đơn hàng
            </h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {isLoading || !order ? (
              <div className="flex justify-center py-10">
                <SpinnerIcon className="size-8 animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {order.tableName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full">
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>

                {/* Items */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.productName}
                        </p>
                        {item.note && (
                          <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">
                            📝 {item.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-gray-500">×{item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {item.subtotal.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note */}
                {order.note && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      📌 Ghi chú
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {order.note}
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-500">Tổng cộng</span>
                  <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                    {order.totalAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer — Status actions */}
          {order && NEXT_STATUS[order.status] && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => handleStatusChange(NEXT_STATUS[order.status]!)}
                disabled={updateStatusMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-400 hover:bg-brand-500 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                {updateStatusMutation.isPending && (
                  <SpinnerIcon className="size-4 animate-spin" />
                )}
                Chuyển trạng thái →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

---

## 9. Điền SVG Icons còn thiếu

### `src/components/shared/icons/ClipboardListIcon.tsx`

```tsx
import { SVGProps } from "react";

export const ClipboardListIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);
```

### `src/components/shared/icons/MonitorIcon.tsx`

```tsx
import { SVGProps } from "react";

export const MonitorIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 7.409A2.25 2.25 0 0 1 2.25 5.493V5.25"
    />
  </svg>
);
```

### `src/components/shared/icons/TableIcon.tsx`

```tsx
import { SVGProps } from "react";

export const TableIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V15c0-.621.504-1.125 1.125-1.125H12m-7.5 3v-3m0 3h1.5m10.5 3H20.625c.621 0 1.125-.504 1.125-1.125m0 0V15m0 3h-1.5m-3 0h1.5m-1.5 0v-3m0 3v-1.5m0-1.5H18m-4.5 3V15m0 0h-4.5m4.5 0V12M6 15v-3m0 0h12M6 12h12"
    />
  </svg>
);
```

### `src/components/shared/icons/LogoutIcon.tsx`

```tsx
import { SVGProps } from "react";

export const LogoutIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
    />
  </svg>
);
```

---

## 10. `src/constants/query-keys.ts` — Thêm ORDERS.PAGE

```ts
export const QUERY_KEYS = {
  AUTH: {
    ME: ["auth", "me"] as const,
  },
  MENU: {
    CATEGORIES: ["menu", "categories"] as const,
    CATEGORY: (id: string) => ["menu", "category", id] as const,
    PRODUCTS: ["menu", "products"] as const,
    PRODUCT: (id: string) => ["menu", "product", id] as const,
    PRODUCT_PAGE: (params: object) => ["menu", "products", "page", params] as const,
    SIMPLE_LIST: (categoryId?: string) =>
      ["menu", "products", "simple", categoryId] as const,
  },
  TABLES: {
    ALL: ["tables"] as const,
    PAGE: (params: object) => ["tables", "page", params] as const,
    DETAIL: (id: string) => ["tables", id] as const,
    LIST: ["table", "list"] as const,
    TOKEN: (token: string) => ["tables", token],
  },
  ORDERS: {
    ALL: ["orders"] as const,
    // ← Thêm mới:
    PAGE: (params: object) => ["orders", "page", params] as const,
    DETAIL: (id: string) => ["orders", id] as const,
    BY_TABLE_TOKEN: (token: string) => ["orders", "table", token] as const,
    ESTIMATED_WAIT: (orderId?: string) =>
      ["orders", "estimated-wait", orderId ?? "queue"] as const,
  },
  LOOKUP: {
    CATEGORIES: ["lookup", "categories"] as const,
    TABLE_AREAS: ["lookup", "table-areas"] as const,
  },
} as const;
```

---

## Tóm tắt thứ tự thực hiện

```
1. Sửa .env — thêm NEXT_PUBLIC_ENABLE_MSW=true
2. Fix handlers/index.ts — import orderHandlers
3. Thay toàn bộ order.handlers.ts (paidStatus + pay handlers)
4. Fix order.api.ts — { id: orderId, status }
5. Xóa console.log trong cart.store.ts
6. Thêm ORDERS.PAGE vào query-keys.ts
7. Thay order.queries.ts (thêm useUpdateOrderStatus + useGetOrderPage)
8. Tạo src/app/api/sse/orders/route.ts
9. Tạo src/hooks/useSSE.ts
10. Điền 4 SVG icons còn TODO
11. Tạo staff/orders/page.tsx (Kanban)
12. Tạo staff/orders/layout.tsx (Parallel Route)
13. Tạo staff/orders/@modal/default.tsx
14. Tạo staff/orders/@modal/(.)orders/[orderId]/page.tsx (Intercepting Route)
15. Tạo staff/pos/page.tsx
16. Tạo staff/tables/page.tsx
```
