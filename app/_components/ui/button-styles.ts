export type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-[0.7rem] border px-4 py-2.5 text-[0.95rem] font-semibold leading-none tracking-[0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[0_6px_16px_rgba(41,75,55,0.22)] hover:-translate-y-[1px] hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:border-[var(--color-primary-active)] active:bg-[var(--color-primary-active)]",
  secondary:
    "border-[var(--color-border-strong)] bg-[color:var(--color-surface-soft)] text-[var(--color-text)] hover:-translate-y-[1px] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] active:translate-y-0 active:border-[var(--color-primary-active)] active:bg-[var(--color-surface-muted)]",
  danger:
    "border-[var(--color-danger)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:-translate-y-[1px] hover:bg-[var(--color-danger-soft)] active:translate-y-0 active:bg-[var(--color-danger-soft)]",
};

export function buttonClassName(variant: ButtonVariant, className?: string) {
  return [BUTTON_BASE, BUTTON_VARIANTS[variant], className].filter(Boolean).join(" ");
}
