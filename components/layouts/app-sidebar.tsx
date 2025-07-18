'use client'

import * as React from 'react'

import { SearchForm } from '@/components/layouts/search-form'
import { VersionSwitcher } from '@/components/layouts/version-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// This is sample data.
const data = {
  versions: ['1.0.1', '1.1.0-alpha', '2.0.0-beta1'],
  navMain: [
    {
      title: 'Getting Started',
      url: '#',
      items: [
        {
          title: 'Installation',
          url: '#',
          isActive: true
        },
        {
          title: 'Project Structure',
          url: '#'
        }
      ]
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar, setOpenMobile } = useSidebar()
  const isMobile = useIsMobile()
  const currentPath = usePathname()

  const router = useRouter()
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
  //       e.preventDefault()
  //       toggleSidebar()
  //     }
  //   }
  //   window.addEventListener('keydown', handleKeyDown)
  //   return () => window.removeEventListener('keydown', handleKeyDown)
  // }, [router, toggleSidebar])

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [currentPath, isMobile])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map(item => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
