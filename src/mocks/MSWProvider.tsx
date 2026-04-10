// src/mocks/MSWProvider.tsx — khởi động MSW trước khi app render
"use client";

import { useEffect, useState, type ReactNode } from "react";

export const MSWProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Chỉ chạy MSW trong development
    if (process.env.NODE_ENV === "development") {
      import("./browser")
        .then(({ worker }) =>
          worker.start({
            onUnhandledRequest: "bypass", // request không có handler → cho qua
          }),
        )
        .then(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  // Chờ MSW khởi động xong mới render app
  // Tránh race condition: component fetch trước khi mock worker sẵn sàng
  if (!ready) return null;

  return <>{children}</>;
};
