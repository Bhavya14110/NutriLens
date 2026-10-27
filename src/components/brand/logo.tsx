import { cn } from "@/lib/utils";

// a lens with a leaf in it - same shape as the PWA icon
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="48" height="48" rx="14" className="fill-primary" />
      <circle cx="22" cy="22" r="11" fill="none" strokeWidth="3.5" className="stroke-primary-foreground" />
      <path d="M30 30l8 8" strokeWidth="3.5" strokeLinecap="round" className="stroke-primary-foreground" />
      <path d="M17 26c0-6 4-10 10-10 0 6-4 10-10 10z" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">NutriLens</span>
    </span>
  );
}
