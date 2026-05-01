import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";
import { MSWProvider } from "@/mocks/MSWProvider";
import { ThemeProvider, ThemeScript } from "@/providers/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>
            <MSWProvider>{children}</MSWProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
