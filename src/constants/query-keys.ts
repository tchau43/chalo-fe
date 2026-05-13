// src/constants/query-keys.ts
export const QUERY_KEYS = {
  AUTH: {
    ME: ["auth", "me"] as const,
  },
  MENU: {
    CATEGORIES: ["menu", "categories"] as const,
    CATEGORY: (id: string) => ["menu", "category", id] as const,
    PRODUCTS: ["menu", "products"] as const,
    PRODUCT: (id: string) => ["menu", "product", id] as const,
    PRODUCT_PAGE: (params: object) =>
      ["menu", "products", "page", params] as const,
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
    ACTIVE: ["orders", "active"] as const,
    PAGE: (params: object) => ["orders", "page", params] as const,
    DETAIL: (id: string) => ["orders", id] as const,
    BY_TABLE_TOKEN: (token: string) => ["orders", "table", token] as const,
    ESTIMATED_WAIT: (orderId?: string) => ["orders", "estimated-wait", orderId ?? "queue"] as const,
  },
  LOOKUP: {
    CATEGORIES: ["lookup", "categories"] as const,
    TABLE_AREAS: ["lookup", "table-areas"] as const,
  },
} as const;
