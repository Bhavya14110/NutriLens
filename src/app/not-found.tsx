import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <SearchX className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">That link doesn&apos;t lead anywhere. It may have moved, or the barcode in it was mistyped.</p>
        <Button asChild className="mt-6">
          <Link href="/home">Back to my kitchen</Link>
        </Button>
      </div>
    </div>
  );
}
