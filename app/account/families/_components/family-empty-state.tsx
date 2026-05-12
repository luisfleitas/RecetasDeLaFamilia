import type { ReactNode } from "react";

type FamilyEmptyStateProps = {
  action?: ReactNode;
  description: string;
  id: string;
  title: string;
};

export default function FamilyEmptyState({ action, description, id, title }: FamilyEmptyStateProps) {
  return (
    <div
      id={id}
      className="rounded-md border border-dashed border-[var(--color-border)] bg-white/60 px-5 py-6 text-center"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold text-[var(--color-recipe-ink)]">
        {title}
      </h2>
      <p id={`${id}-description`} className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
        {description}
      </p>
      {action ? (
        <div id={`${id}-action`} className="mt-4 flex justify-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}
