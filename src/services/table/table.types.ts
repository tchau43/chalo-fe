// src/services/table/table.types.ts

import { PageParam } from "../types";

export const TABLE_STATUS = ["AVAILABLE", "OCCUPIED"] as const;
export type TableStatus = (typeof TABLE_STATUS)[number];

export interface TableDto {
  id: string;
  name: string;
  area?: string;
  status: TableStatus;
  qrToken: string;
  qrCodeUrl: string;
  currentOrderId: string | null;
  createdAt: string;
}

export interface CreateTablePayload {
  name: string;
  area?: string;
}

export interface UpdateTablePayload extends CreateTablePayload {
  id: string;
}

export interface TablePageParams extends PageParam {
  status?: TableStatus;
  area?: string;
}

export interface TablePublicDto {
  id: string;
  name: string;
  area?: string;
  status: TableStatus;
}
