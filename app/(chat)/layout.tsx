import { AppHeader } from '@/components/layouts/app-header'
import { AppPopup } from '@/components/layouts/app-popup'
import { AppSidebar } from '@/components/layouts/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppPopup />
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
