import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "subtle" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] py-1.5 font-medium text-white hover:bg-[var(--color-accent-hover)] shadow-sm",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 font-medium text-[var(--color-text)] hover:bg-[var(--color-border-subtle)]",
  subtle:
    "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 font-normal text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]",
  ghost:
    "py-1.5 font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]",
  danger: "py-1.5 font-medium text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
