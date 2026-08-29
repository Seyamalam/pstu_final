"use client";

import type { AuthClient } from "@convex-dev/better-auth/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}

const convex = new ConvexReactClient(convexUrl);
const providerAuthClient = authClient as unknown as AuthClient;

type ConvexClientProviderProps = {
  children: ReactNode;
  initialToken?: string | null;
};

export function ConvexClientProvider({
  children,
  initialToken,
}: ConvexClientProviderProps) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={providerAuthClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
