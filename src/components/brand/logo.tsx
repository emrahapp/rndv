import { cn } from "@/lib/utils";

export function Logo({
  size = 28,
  className,
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className="grid place-items-center rounded-full bg-primary text-primary-foreground"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 11 10 15 18 7" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: size * 0.78 }}
        >
          bossaat
          <span className="font-medium text-foreground/35">.com</span>
        </span>
      )}
    </div>
  );
}
