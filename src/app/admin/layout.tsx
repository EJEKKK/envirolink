import Link from "next/link";
import * as React from "react";

import TopLoader from "@/components/next-top-loader";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import SidebarNavUser from "./_components/sidebar-nav-user";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <TopLoader />
      <Sidebar>
        <SidebarHeader className="h-16 justify-center">
          <h2 className="text-primary text-center text-xl font-bold">
            Admin Panel
          </h2>
        </SidebarHeader>
        <SidebarContent>
          <UserSidebarGroup />
          <CampaignSidebarGroup />
          <RankDescriptionSidebarGroup />
        </SidebarContent>
        <SidebarFooter>
          <SidebarNavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="min-h-full space-y-4 border">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function UserSidebarGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>User</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin">All users</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/pending-accounts">Pending accounts</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function CampaignSidebarGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Campaign</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* <SidebarMenuItem> */}
          {/*   <SidebarMenuButton asChild> */}
          {/*     <Link href="/admin/completed-campaigns">Completed campaigns</Link> */}
          {/*   </SidebarMenuButton> */}
          {/* </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/campaigns">Campaigns</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem> */}
          {/*   <SidebarMenuButton asChild> */}
          {/*     <Link href="/admin/pending-campaigns">Pending campaigns</Link> */}
          {/*   </SidebarMenuButton> */}
          {/* </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function RankDescriptionSidebarGroup() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Rank Badge Description</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/rank-description">Rank description</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
