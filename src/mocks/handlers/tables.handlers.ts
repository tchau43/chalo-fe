// src/mocks/handlers/tables.handlers.ts
import { http, HttpResponse, delay } from 'msw'

const tables = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Bàn ${i + 1}`,
  area: i < 4 ? 'Tầng 1' : 'Tầng 2',
  capacity: i % 3 === 0 ? 6 : 4,
  status: i === 0 ? 'OCCUPIED' : i === 1 ? 'RESERVED' : 'AVAILABLE',
  qrToken: `qr-token-table-${i + 1}`,
  qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:3000/menu/qr-token-table-${i + 1}`,
  currentOrderId: i === 0 ? 101 : null,
  createdAt: '2024-01-01',
}))

export const tableHandlers = [
  http.get('/api/table/page', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const pageNo = Number(url.searchParams.get('pageNo') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
    const start = (pageNo - 1) * pageSize
    return HttpResponse.json({ code: 200, message: 'success', data: { list: tables.slice(start, start + pageSize), total: tables.length } })
  }),

  http.get('/api/table/list', async () => {
    await delay(200)
    return HttpResponse.json({ code: 200, message: 'success', data: tables })
  }),

  // Validate QR token (dùng cho customer app)
  http.get('/api/table/by-token/:token', async ({ params }) => {
    await delay(200)
    const table = tables.find(t => t.qrToken === params.token)
    if (!table) return HttpResponse.json({ code: 404, message: 'QR không hợp lệ', data: null }, { status: 404 })
    return HttpResponse.json({ code: 200, message: 'success', data: table })
  }),
]