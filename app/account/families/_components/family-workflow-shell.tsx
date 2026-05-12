import type { ReactNode } from "react";

type FamilyWorkflowShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow: string;
  id: string;
  title: string;
};

export default function FamilyWorkflowShell({
  actions,
  children,
  description,
  eyebrow,
  id,
  title,
}: FamilyWorkflowShellProps) {
  return (
    <section id={id} className="recipe-workflow-panel">
      <header id={`${id}-header`} className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div id={`${id}-header-copy`} className="space-y-2">
          <p id={`${id}-eyebrow`} className="page-eyebrow">
            {eyebrow}
          </p>
          <div id={`${id}-title-group`} className="space-y-2">
            <h1 id={`${id}-title`} className="text-3xl font-semibold text-[var(--color-recipe-ink)]">
              {title}
            </h1>
            {description ? (
              <p id={`${id}-description`} className="max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div id={`${id}-actions`} className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>

      <div id={`${id}-body`} className="mt-6 space-y-5">
        {children}
      </div>
    </section>
  );
}
