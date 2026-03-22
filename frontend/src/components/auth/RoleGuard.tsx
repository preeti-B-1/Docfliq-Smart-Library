"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: "admin" | "reader";
}

export default function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requiredRole === "admin" && role !== "admin") {
      router.replace("/library");
    }
  }, [role, isLoading, isAuthenticated, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole === "admin" && role !== "admin") return null;

  return <>{children}</>;
}
