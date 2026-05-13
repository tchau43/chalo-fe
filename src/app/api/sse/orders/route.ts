// src/app/api/sse/orders/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      sendEvent("connected", { message: "SSE connected" });

      const interval = setInterval(() => {
        sendEvent("order_updated", {
          type: "ORDER_UPDATED",
          timestamp: new Date().toISOString(),
        });
      }, 10_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
