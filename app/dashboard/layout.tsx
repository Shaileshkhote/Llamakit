import { ToastProvider } from "./_components/toast"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
