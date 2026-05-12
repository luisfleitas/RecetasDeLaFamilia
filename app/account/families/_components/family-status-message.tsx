type FamilyStatusTone = "loading" | "error" | "success" | "warning";

type FamilyStatusMessageProps = {
  id: string;
  message: string;
  title: string;
  tone: FamilyStatusTone;
};

const toneClasses: Record<FamilyStatusTone, string> = {
  loading: "border-[var(--color-border)] bg-white/70 text-[var(--color-muted)]",
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export default function FamilyStatusMessage({ id, message, title, tone }: FamilyStatusMessageProps) {
  return (
    <aside
      id={id}
      className={`rounded-md border px-4 py-3 text-sm ${toneClasses[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p id={`${id}-title`} className="font-semibold">
        {title}
      </p>
      <p id={`${id}-message`} className="mt-1 leading-6">
        {message}
      </p>
    </aside>
  );
}
