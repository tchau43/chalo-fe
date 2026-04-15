// src/services/types.ts

export interface PageParam {
  pageNo: number,
  pageSize: number,
}

export interface PageResult<T> {
  list: T[],
  total: number,
}