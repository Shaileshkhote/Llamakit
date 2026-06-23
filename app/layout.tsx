import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Toaster } from "react-hot-toast"
import { QueryProvider } from "@/components/providers/QueryProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "LlamaKit",
  description: "Unofficial multi-tenant analytics portals powered by DefiLlama data."
}

const themeScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("llamakit-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : systemDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <QueryProvider>
          {children}
          <Toaster
            gutter={10}
            position="bottom-right"
            toastOptions={{
              className: "lk-toast",
              duration: 3500,
              error: {
                iconTheme: {
                  primary: "var(--bad)",
                  secondary: "#ffffff"
                }
              },
              style: {
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 18px 60px rgb(17 17 17 / 0.12)",
                color: "var(--text)",
                fontSize: 13,
                lineHeight: 1.35,
                maxWidth: 360,
                padding: "12px 14px"
              },
              success: {
                iconTheme: {
                  primary: "var(--text)",
                  secondary: "#ffffff"
                }
              }
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
