"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import type { Role } from "@/types";

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user ?? null;
  const role = (user?.role ?? null) as Role | null;
  const isAdmin = role === "admin";
  const backendToken = session?.backendToken ?? null;

  return {
    user,
    role,
    isAdmin,
    isLoading,
    isAuthenticated,
    backendToken,
    signIn,
    signOut,
  };
}
