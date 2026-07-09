"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileStack,
  FilePlus2,
  History,
  Settings,
  HardHat,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/reports/generate", label: "Generate Report", icon: FilePlus2 },
  { href: "/reports/history", label: "Report History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Topbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const current = NAV_ITEMS.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 h-full max-h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r p-0 data-[state=open]:slide-in-from-left">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <div className="flex h-14 items-center gap-2 border-b px-5">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <HardHat className="size-4" />
              </div>
              <span className="text-sm font-semibold">BuildReport AI</span>
            </div>
            <nav className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </DialogContent>
        </Dialog>
        <h1 className="text-sm font-semibold text-foreground md:text-base">
          {current?.label ?? "BuildReport AI"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
