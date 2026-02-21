export type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] active:border-[var(--color-primary-active)] active:bg-[var(--color-primary-active)]",
  secondary:
    "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] active:border-[var(--color-primary-active)] active:bg-[var(--color-surface-muted)]",
  danger:
    "border-[var(--color-danger)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] active:bg-[var(--color-danger-soft)]",
};

export function buttonClassName(variant: ButtonVariant, className?: string) {
  return [BUTTON_BASE, BUTTON_VARIANTS[variant], className].filter(Boolean).join(" ");
}
