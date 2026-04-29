import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";
import { MSWProvider } from "@/mocks/MSWProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <MSWProvider>{children}</MSWProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
