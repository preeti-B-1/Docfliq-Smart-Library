import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-5xl font-bold text-foreground">404</h1>
      <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/library">Go to Library</Link>
      </Button>
    </div>
  );
}
