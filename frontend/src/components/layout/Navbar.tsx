"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const readerNav: NavItem[] = [
  { label: "Library", href: "/library" },
  { label: "My Bookmarks", href: "/bookmarks" },
  { label: "History", href: "/history" },
  { label: "Profile", href: "/profile" },
];

const adminNav: NavItem[] = [
  { label: "Library", href: "/library" },
  { label: "Upload", href: "/upload" },
  { label: "Drafts", href: "/drafts" },
  { label: "Tag Management", href: "/tags" },
  { label: "Analytics", href: "/analytics" },
  { label: "Profile", href: "/profile" },
];

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const navItems = isAdmin ? adminNav : readerNav;

  return (
    <header className="sticky top-0 z-40 bg-[#1E293B] border-b border-[#334155]">
      <div className="mx-auto max-w-screen-xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/library" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white font-display">
              DocFliq
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 rounded-md text-[0.9375rem] font-semibold tracking-wide transition-colors font-display",
                  pathname.startsWith(href)
                    ? "bg-[#1A7CE0] text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
