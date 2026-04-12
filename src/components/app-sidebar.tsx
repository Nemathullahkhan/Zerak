"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCardIcon,
  FolderOpenIcon,
  HistoryIcon,
  KeyIcon,
  LogOutIcon,
  StarIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Main",
    items: [
      {
        title: "Workflows",
        icon: FolderOpenIcon,
        url: "/workflows",
      },
      {
        title: "Credentials",
        icon: KeyIcon,
        url: "/credentials",
      },
      {
        title: "Executions",
        icon: HistoryIcon,
        url: "/executions",
      },
    ],
  },
];

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const prefetchData = (url: string) => {
    if (url === "/workflows") {
      queryClient.prefetchQuery(trpc.workflows.getMany.queryOptions({}));
    } else if (url === "/credentials") {
      queryClient.prefetchQuery(trpc.credentials.getMany.queryOptions({}));
    } else if (url === "/executions") {
      queryClient.prefetchQuery(trpc.executions.getMany.queryOptions({}));
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/50 px-4">
        <SidebarMenuItem className="list-none w-full">
          <SidebarMenuButton
            asChild
            className="h-12 w-full hover:bg-transparent active:bg-transparent"
          >
            <Link
              href="/dashboard"
              prefetch
              className="flex items-center gap-3"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shadow-sm">
                <Image
                  src="/logos/ZerakLogo2.svg"
                  alt="Zerak"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                  priority
                />
              </div>
              <span className="font-heading font-bold text-white tracking-tight text-xl">
                Zerak
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>
      <SidebarContent className="py-4 px-2">
        {menuItems.map((group) => (
          <SidebarGroup key={group.title} className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={
                        item.url === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.url)
                      }
                      asChild
                      className={cn(
                        "gap-3 h-10 px-3 rounded-lg transition-all duration-200",
                        "hover:bg-primary/5 hover:text-primary",
                        "active:scale-[0.98]",
                      )}
                      onMouseEnter={() => prefetchData(item.url)}
                    >
                      <Link href={item.url} prefetch>
                        <item.icon className="size-[18px]" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border/50 bg-muted/20">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              className="gap-3 h-10 px-3 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      toast.success("Signed out successfully");
                      router.push("/login");
                    },
                  },
                });
              }}
            >
              <LogOutIcon className="size-[18px]" />
              <span className="font-medium">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
