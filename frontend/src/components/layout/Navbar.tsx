"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

/* OLD — navy dark navbar
interface NavItem { label: string; href: string; }
const readerNav: NavItem[] = [...];
const adminNav: NavItem[] = [...];
export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-[#1E293B] border-b border-[#334155]">
      ...dark navy navbar...
    </header>
  );
}
*/

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
  { label: "Analytics", href: "/analytics" },
  { label: "Profile", href: "/profile" },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-semibold">{initials}</span>
    </div>
  );
}

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const navItems = isAdmin ? adminNav : readerNav;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
      <div className="mx-auto max-w-screen-xl px-6">
        <div className="flex h-14 items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/library" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="40" height="40" rx="8" fill="#7C3AED"/>
                <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
                <circle cx="18" cy="12" r="5" fill="white"/>
                <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
                <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <span className="text-[1.0625rem] font-bold text-zinc-900 font-display tracking-tight">
              DocFliq
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            {navItems.map(({ label, href }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-50 text-violet-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User area */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user && <UserAvatar name={user.name ?? user.email} />}
            <span className="text-sm text-zinc-600 font-medium hidden xl:block">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-2.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Sign out</span>
            </Button>
          </div>

        </div>
      </div>
    </header>
  );
}
