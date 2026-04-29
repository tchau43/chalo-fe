// src/constants/api-endpoints.ts

export const API = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh-token',
  },
  CATEGORY: {
    LIST: '/menu/category/list',
    DETAIL: '/menu/category/detail',
    CREATE: '/menu/category/create',
    UPDATE: '/menu/category/update',
    DELETE: '/menu/category/delete',
    SIMPLE_LIST: '/menu/category/simple-list',
  },
  PRODUCT: {
    PAGE: '/menu/product/page',
    DETAIL: '/menu/product/detail',
    SIMPLE_LIST: '/menu/product/simple-list',
    CREATE: '/menu/product/create',
    UPDATE: '/menu/product/update',
    UPDATE_STATUS: '/menu/product/status',
    DELETE: '/menu/product/delete',
  },
  TABLE: {
    PAGE: '/table/page',
    LIST: '/table/list',
    BY_TOKEN: '/table/by-token',
    AREAS: '/table/areas',
  }
} as const