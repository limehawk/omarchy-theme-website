import type { Metadata } from "next";
import { Suspense } from "react";
import { getThemeList } from "@/lib/db";
import { ThemeBrowser } from "@/components/theme-browser";

export const metadata: Metadata = {
  title: "Browse Themes",
};

export default function ThemesPage() {
  const themes = getThemeList();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Suspense>
        <ThemeBrowser themes={themes} />
      </Suspense>
    </div>
  );
}
