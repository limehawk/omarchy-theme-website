import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-32">
      <div className="max-w-lg space-y-6">
        <div className="font-mono text-sm text-muted-foreground space-y-1">
          <div>
            <span className="text-green-400/60">user@omarchy</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-400/60">~</span>
            <span className="text-muted-foreground"> $ </span>
            <span className="text-foreground">cd themes/???</span>
          </div>
          <div className="text-red-400/80">
            bash: cd: themes/???: No such file or directory
          </div>
        </div>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
          404
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          This page doesn't exist. Maybe the theme was removed, or the URL is wrong.
        </p>
        <div className="flex gap-3 pt-2">
          <Button className="font-mono" render={<Link href="/themes" />}>
            browse themes
          </Button>
          <Button variant="outline" className="font-mono" render={<Link href="/" />}>
            home
          </Button>
        </div>
      </div>
    </div>
  );
}
