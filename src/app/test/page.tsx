// src/app/test/page.tsx
import { API } from "@/constants";
import { INTERNAL_API } from "@/constants/server";

// 1. Phải thêm chữ async vào component vì đây là Server Component
export default async function TestServerPage() {

  let rawResponseInfo = "";
  let data = null;

  try {
    // 2. Tái hiện lại lệnh fetch ở đây để xem nó đang gọi đi đâu
    const url = `${INTERNAL_API}${API.CATEGORY.LIST}`;
    console.log("🔥 Đang gọi đến URL:", url);

    const res = await fetch(url, {
      next: { revalidate: 0 }, // Để 0 để không bị cache, luôn gọi mới khi F5
    });

    // 3. Gom thông tin của Response để in ra màn hình
    // rawResponseInfo = `Status: ${res.status} | Ok: ${res.ok} | URL: ${res.url}`;
    // console.log("🔥 Thông tin Response:", rawResponseInfo);

    // 4. Lấy dữ liệu
    if (res.ok) {
      const json = await res.json();
      data = json;
    }
  } catch (error: any) {
    console.log("🔥 LỖI CATCH:", error.message);
    rawResponseInfo = `LỖI CATCH: ${error.message}`;
  }

  // 5. In ra màn hình Trình duyệt
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Debug Server-side Fetch</h1>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <h2 className="font-semibold text-red-500">
          Thông tin gói tin mạng (Response):
        </h2>
        <p className="font-mono text-sm">{rawResponseInfo}</p>
      </div>

      <div className="p-4 bg-gray-900 text-green-400 rounded-xl overflow-auto h-96">
        <h2 className="font-semibold text-white mb-2">
          Dữ liệu JSON thu được:
        </h2>
        <pre className="text-sm">
          {data
            ? JSON.stringify(data, null, 2)
            : "Không có dữ liệu (Thường do fetch lỗi)"}
        </pre>
      </div>
    </div>
  );
}
