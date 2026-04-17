"use client";

import { ROUTES } from "@/constants";
import { getCurrentUser } from "@/services/auth/api";
import { useAuthStore } from "@/stores/auth.store";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";

const InitializingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-400 shadow-lg text-2xl">
          ☕
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent"></div>
          <span className="text-sm font-medium text-gray-500">
            Đang tải ...
          </span>
        </div>
      </div>
    </div>
  );
};

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const {
    isHydrated,
    isInitialized,
    accessToken,
    setUser,
    logout,
    setInitialized,
  } = useAuthStore();

  const isCustomerRoute = pathname.startsWith(ROUTES.MENU);

  const initialize = useCallback(async () => {
    if (!isHydrated || isInitialized) return;

    try {
      if (!accessToken) {
        setInitialized();
        return;
      }
      const user = await getCurrentUser();
      setUser(user);
      setInitialized();
    } catch (error) {
      logout();
      setInitialized();
    }
  }, [isInitialized, isHydrated, accessToken, setInitialized, setUser, logout]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isCustomerRoute) return <>{children}</>;

  if (!isHydrated || !isInitialized) return <InitializingScreen />;

  return <>{children}</>;
}
