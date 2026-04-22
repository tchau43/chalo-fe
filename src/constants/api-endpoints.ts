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
    LIST: '',
    DETAIL: '',
    CREATE: '',
    UPDATE: '',
    DELETE: '',
    SIMPLE_LIST: ''
  },
  PRODUCT: {
    PAGE: '',
    DETAIL: '',
    SIMPLE_LIST: '',
    CREATE: '',
    UPDATE: '',
    UPDATE_STATUS: '',
    DELETE: '',
  },
  TABLE: {
    PAGE: '',
    LIST: '',
    BY_TOKEN: '',
    AREAS: ''
  }
} as const