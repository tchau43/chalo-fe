//src/services/lookup/index.ts

import { API, CACHE_TAGS, QUERY_KEYS } from "@/constants"
import { request } from "@/lib/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export interface SimpleOptions {
  id: string,
  name: string
}

export const getCachedCategorySimpleList = async (): Promise<SimpleOptions[]> => {
  const res = await fetch(
    `${process.env.API_BASE_URL}${API.CATEGORY.SIMPLE_LIST}`,
    {
      next: {
        tags: [CACHE_TAGS.MENU.CATEGORIES],
        revalidate: 3600
      },
    },
  )
  if (!res.ok) { return [] }
  const json = await res.json()
  return json.data ?? []
}

export const getCachedTableAreaList = async (): Promise<string[]> => {
  const res = await fetch(
    `${process.env.API_BASE_URL}${API.TABLE.AREAS}`,
    {
      next: {
        tags: [CACHE_TAGS.TABLE.AREAS],
        revalidate: 3600
      }
    }
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

const getCategorySimpleList = (): Promise<SimpleOptions[]> => {
  return request.get(API.CATEGORY.SIMPLE_LIST)
}

const getTableAreas = (): Promise<SimpleOptions[]> => {
  return request.get(API.TABLE.AREAS)
}

export const useGetCategorySimpleList = () => {
  useQuery({
    queryKey: QUERY_KEYS.LOOKUP.CATEGORIES,
    queryFn: getCategorySimpleList,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000
  })
}

export const useGetTableAreas = () => {
  useQuery({
    queryKey: QUERY_KEYS.LOOKUP.TABLE_AREAS,
    queryFn: getTableAreas,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000
  })
}

export const useInvalidateLookup = () => {
  const qc = useQueryClient()
  return {
    categories: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.LOOKUP.CATEGORIES }),
    tableAreas: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.LOOKUP.TABLE_AREAS }),
    all: () => qc.invalidateQueries({ queryKey: ['lookup'] })
  }
}