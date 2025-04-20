"use client";

import { useIsClient } from "@/hooks/use-is-client";

import { useTheme } from "next-themes";
import NextTopLoader from "nextjs-toploader";

export default function TopLoader() {
  const { theme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) return null;

  return (
    <NextTopLoader
      showSpinner={false}
      color={theme === "system" || theme === "dark" ? "#16a34a" : "#15803d"}
      height={2}
    />
  );
}
