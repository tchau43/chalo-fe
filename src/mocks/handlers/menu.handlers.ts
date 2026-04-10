// src/mocks/handlers/menu.handlers.ts
import { http, HttpResponse, delay } from 'msw'

// Mock data
const categories = [
  { id: 1, name: 'Cà phê', description: 'Các loại cà phê đặc trưng', imageUrl: null, sortOrder: 1, isActive: true, productCount: 3, createdAt: '2024-01-01' },
  { id: 2, name: 'Trà', description: 'Trà trái cây, trà sữa', imageUrl: null, sortOrder: 2, isActive: true, productCount: 2, createdAt: '2024-01-01' },
  { id: 3, name: 'Sinh tố', description: 'Sinh tố tươi mỗi ngày', imageUrl: null, sortOrder: 3, isActive: true, productCount: 1, createdAt: '2024-01-01' },
]

const products = [
  { id: 1, categoryId: 1, categoryName: 'Cà phê', name: 'Cà phê đen', description: 'Cà phê pha phin truyền thống', imageUrl: null, price: 25000, status: 'AVAILABLE', isActive: true, sortOrder: 1, prepTime: 5, createdAt: '2024-01-01' },
  { id: 2, categoryId: 1, categoryName: 'Cà phê', name: 'Cà phê sữa', description: 'Cà phê đen + sữa đặc', imageUrl: null, price: 30000, status: 'AVAILABLE', isActive: true, sortOrder: 2, prepTime: 5, createdAt: '2024-01-01' },
  { id: 3, categoryId: 1, categoryName: 'Cà phê', name: 'Bạc xỉu', description: 'Nhiều sữa ít cà phê', imageUrl: null, price: 30000, status: 'OUT_OF_STOCK', isActive: true, sortOrder: 3, prepTime: 5, createdAt: '2024-01-01' },
  { id: 4, categoryId: 2, categoryName: 'Trà', name: 'Trà đào', description: 'Trà xanh + đào tươi', imageUrl: null, price: 35000, status: 'AVAILABLE', isActive: true, sortOrder: 1, prepTime: 7, createdAt: '2024-01-01' },
  { id: 5, categoryId: 2, categoryName: 'Trà', name: 'Trà vải', description: 'Trà xanh + vải thiều', imageUrl: null, price: 35000, status: 'AVAILABLE', isActive: true, sortOrder: 2, prepTime: 7, createdAt: '2024-01-01' },
  { id: 6, categoryId: 3, categoryName: 'Sinh tố', name: 'Sinh tố bơ', description: 'Bơ + sữa tươi + đường', imageUrl: null, price: 45000, status: 'AVAILABLE', isActive: true, sortOrder: 1, prepTime: 8, createdAt: '2024-01-01' },
]

export const menuHandlers = [
  http.get('/api/menu/category/list', async () => {
    await delay(300)
    return HttpResponse.json({ code: 200, message: 'success', data: categories })
  }),

  http.get('/api/menu/category/simple-list', async () => {
    await delay(200)
    return HttpResponse.json({ code: 200, message: 'success', data: categories.map(c => ({ id: c.id, name: c.name })) })
  }),

  http.get('/api/menu/product/page', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const pageNo = Number(url.searchParams.get('pageNo') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
    const name = url.searchParams.get('name') ?? ''
    const catId = url.searchParams.get('categoryId')

    let filtered = products
    if (name) filtered = filtered.filter(p => p.name.toLowerCase().includes(name.toLowerCase()))
    if (catId) filtered = filtered.filter(p => p.categoryId === Number(catId))

    const start = (pageNo - 1) * pageSize
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { list: filtered.slice(start, start + pageSize), total: filtered.length },
    })
  }),
]