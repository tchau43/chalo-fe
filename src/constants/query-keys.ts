export const QUERY_KEYS = {
  AUTH: {
    ME: ['auth', 'me'] as const
  },
  MENU: {
    CATEGORIES: ['menu', 'categories'] as const,
    CATEGORY: (id: string) => ['menu', 'category', id] as const,
    PRODUCTS: ['menu', 'products'] as const,
    PRODUCT: (id: string) => ['menu', 'product', id] as const,
    PRODUCT_PAGE: (params: object) => ['menu', 'products', 'page', params] as const,
    SIMPLE_LIST: (categoryId?: string) => ['menu', 'products', 'simple', categoryId] as const,
  },
  TABLES: {
    ALL: ['tables'] as const,
    PAGE: (params: object) => ['tables', 'page', params] as const,
    DETAIL: (id: string) => ['tables', id] as const,
    LIST: ['table', 'list'] as const,
  },
  ORDERS: {
    ALL: ['orders'] as const,
    PAGE: (params: object) => ['orders', 'page', params] as const,
    DETAIL: (id: string) => ['orders', id] as const,
    BY_TABLE: (tableId: number) => ['orders', 'table', tableId] as const,
  },
  LOOKUP: {
    CATEGORIES: ['lookup', 'categories'] as const,
    TABLE_AREAS: ['lookup', 'table-areas'] as const,
  },
} as const