"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Coins,
  Moon,
  Sun,
  Upload,
  Activity,
  Share2,
  ListTree,
  Microscope,
  Receipt,
  Settings,
  ChevronDown,
  LogOut,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTokenStore } from "@/lib/phyto/stores";
import { useAuth } from "@/auth/AuthProvider";
import { APP_META, DEFAULT_RUN_ID } from "@/lib/phyto/constants";
import { formatRelativeTime } from "@/lib/phyto/formatting";
import { cn } from "@/lib/utils";
import type { PageId } from "./types";

interface NavItem {
  id: PageId;
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "upload", href: "/upload", label: "Upload", icon: Upload, hint: "Start a new run" },
  { id: "analysis", href: `/analysis/${DEFAULT_RUN_ID}`, label: "Analysis", icon: Activity, hint: "Task graph + checkpoints" },
  { id: "network", href: "/network", label: "Network", icon: Share2, hint: "MS2 / HSQC / Fused / Bioactivity" },
  { id: "elucidation", href: "/elucidation", label: "Elucidation", icon: ListTree, hint: "Candidates + novel + localisation" },
  { id: "pharmacology", href: "/pharmacology", label: "Pharmacology", icon: Microscope, hint: "Targets + mechanism hypothesis" },
  { id: "results", href: `/results/${DEFAULT_RUN_ID}`, label: "Results", icon: FileText, hint: "Assembled report" },
  { id: "billing", href: "/billing", label: "Billing", icon: Receipt, hint: "Token packs + transactions" },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings, hint: "LLM provider + model version" },
];

/** Derive the active nav id from the current URL path. */
function activePageFromPath(pathname: string | null): PageId {
  if (!pathname) return "upload";
  const segment = pathname.split("/").filter(Boolean)[0];
  if (
    segment === "upload" ||
    segment === "analysis" ||
    segment === "network" ||
    segment === "elucidation" ||
    segment === "pharmacology" ||
    segment === "results" ||
    segment === "billing" ||
    segment === "settings"
  ) {
    return segment;
  }
  return "upload";
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activePage = activePageFromPath(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header activePage={activePage} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar activePage={activePage} />
        <main
          className="flex-1 min-w-0 px-4 py-6 md:px-8"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

function Header({ activePage }: { activePage: PageId }) {
  const { user, signOut } = useAuth();
  const balance = useTokenStore((s) => s.balance);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isLow = (balance?.balance ?? 0) < 10;

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="banner"
    >
      <div className="flex h-14 items-center gap-2 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/upload"
          className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors"
          aria-label="Phytospectra home"
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[11px] font-bold tracking-tight"
          >
            Phy
          </span>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight">
            {APP_META.name}
          </span>
        </Link>

        <span className="hidden md:inline text-xs text-muted-foreground">
          {APP_META.tagline}
        </span>

        <div className="ml-auto flex items-center gap-1.5 md:gap-3">
          {/* Balance badge */}
          <Link
            href="/billing"
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
              isLow
                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            )}
            aria-label={`Token balance: ${balance?.balance ?? 0} tokens. Last updated ${balance ? formatRelativeTime(balance.last_updated) : "unknown"}. Click to open billing.`}
          >
            <Coins
              aria-hidden="true"
              className={isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
              style={{ width: "0.95rem", height: "0.95rem" }}
            />
            <span className="font-mono tabular-nums font-semibold">
              {balance?.balance ?? 0}
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              tokens
            </span>
          </Link>

          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
              ) : (
                <Moon aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
              )}
            </Button>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-label="User menu"
              >
                <span
                  aria-hidden="true"
                  className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-semibold"
                >
                  {(user?.displayName ?? "?").charAt(0)}
                </span>
                <span className="hidden md:inline text-xs">
                  {user?.displayName ?? "Guest"}
                </span>
                <ChevronDown aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">{user?.displayName}</div>
                  <div className="font-normal text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/billing">
                  <Coins aria-hidden="true" style={{ width: "0.95rem", height: "0.95rem" }} />
                  Billing &amp; tokens
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings aria-hidden="true" style={{ width: "0.95rem", height: "0.95rem" }} />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void signOut()}
                className="text-rose-700 dark:text-rose-400 focus:text-rose-800 dark:focus:text-rose-300"
              >
                <LogOut aria-hidden="true" style={{ width: "0.95rem", height: "0.95rem" }} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Mobile nav strip (sidebar becomes a horizontal scroll on small screens) */}
      <nav
        className="md:hidden flex items-center gap-1 overflow-x-auto border-t px-2 py-1.5"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Sidebar({ activePage }: { activePage: PageId }) {
  return (
    <aside
      className="hidden md:flex w-56 shrink-0 flex-col border-r bg-card/30"
      aria-label="Sidebar navigation"
    >
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block w-full text-left rounded-md px-2.5 py-2 transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  aria-hidden="true"
                  style={{ width: "1rem", height: "1rem" }}
                  className={active ? undefined : "text-muted-foreground"}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.label}
                  </div>
                  {item.hint && (
                    <div
                      className={cn(
                        "text-[10px] truncate",
                        active
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground/80"
                      )}
                    >
                      {item.hint}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          <div className="font-mono">model: {APP_META.model_version}</div>
          <div className="mt-0.5">
            Demo data — swaps for live API at deploy time.
          </div>
        </div>
      </div>
    </aside>
  );
}

function Footer() {
  return (
    <footer
      className="mt-auto border-t bg-card/30"
      role="contentinfo"
    >
      <div className="px-4 md:px-8 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span className="font-semibold text-foreground">{APP_META.name}</span>{" "}
          v{APP_META.version} · AGPL-3.0 · an honest companion, not an oracle.
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            mock API online
          </Badge>
          <span className="hidden md:inline">
            Every claim carries a verdict badge. Every candidate is one
            click from its evidence.
          </span>
        </div>
      </div>
    </footer>
  );
}
