import type { ReactNode, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "green" | "red" | "none";
}

export function Card({ children, className, glow = "none" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#2D3F55] bg-[#1E293B] p-4",
        "card-hover",
        glow === "cyan" && "glow-cyan border-[#00D4FF]/40",
        glow === "green" && "glow-green border-[#22C55E]/40",
        glow === "red" && "glow-red border-[#EF4444]/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "cyan" | "green" | "red" | "amber" | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  cyan:  "bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30",
  green: "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30",
  red:   "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30",
  amber: "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30",
  muted: "bg-[#2D3F55] text-[#94A3B8] border border-[#2D3F55]",
};

export function Badge({ children, variant = "cyan", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && [
          "bg-[#00D4FF] text-[#0A1628]",
          "hover:bg-[#00D4FF]/90 active:scale-95",
          "shadow-[0_0_20px_rgba(0,212,255,0.3)]",
        ],
        variant === "secondary" && [
          "bg-[#1E293B] text-[#F8FAFC] border border-[#2D3F55]",
          "hover:bg-[#2D3F55] active:scale-95",
        ],
        variant === "ghost" && [
          "bg-transparent text-[#94A3B8]",
          "hover:text-[#F8FAFC] hover:bg-[#1E293B] active:scale-95",
        ],
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-6 w-6 rounded-full border-2 border-[#2D3F55] border-t-[#00D4FF] animate-spin",
        className,
      )}
    />
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-sm font-semibold uppercase tracking-widest text-[#94A3B8]", className)}>
      {children}
    </h2>
  );
}

// ─── LiveDot ─────────────────────────────────────────────────────────────────

export function LiveDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]" />
    </span>
  );
}
