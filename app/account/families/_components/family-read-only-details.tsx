"use client";

import FamilyImageFrame from "@/app/account/families/_components/family-image-frame";
import type { FamilyEditPageFamily } from "@/lib/application/families/page-loaders";
import type { Messages } from "@/lib/i18n/messages";

type FamilyReadOnlyDetailsProps = {
  family: FamilyEditPageFamily;
  messages: Messages["family"]["editFamily"];
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "RF";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default function FamilyReadOnlyDetails({ family, messages }: FamilyReadOnlyDetailsProps) {
  return (
    <section id="edit-family-read-only-details" className="surface-panel grid gap-5 p-5">
      <div id="edit-family-read-only-copy" className="recipe-form-section-copy">
        <h2 id="edit-family-read-only-title" className="recipe-form-section-title">
          {messages.readOnlyDetailsTitle}
        </h2>
        <p id="edit-family-read-only-description" className="recipe-form-section-description">
          {messages.readOnlyDetailsDescription}
        </p>
      </div>

      <div id="edit-family-read-only-profile" className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)]">
        <FamilyImageFrame
          id="edit-family-read-only-image"
          alt={messages.imagePreviewAlt}
          imageUrl={family.pictureUrl}
          initials={getInitials(family.name)}
        />

        <dl id="edit-family-read-only-profile-list" className="grid gap-3 text-sm">
          <div id="edit-family-read-only-name-row">
            <dt className="font-semibold text-[var(--color-muted)]">{messages.reviewNameLabel}</dt>
            <dd id="edit-family-read-only-name" className="mt-1 text-[var(--color-text)]">
              {family.name}
            </dd>
          </div>
          <div id="edit-family-read-only-description-row">
            <dt className="font-semibold text-[var(--color-muted)]">{messages.reviewDescriptionLabel}</dt>
            <dd id="edit-family-read-only-family-description" className="mt-1 text-[var(--color-text)]">
              {family.description ?? messages.noDescription}
            </dd>
          </div>
        </dl>
      </div>

      <div id="edit-family-read-only-members" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
        <h3 id="edit-family-read-only-members-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
          {messages.membersTitle}
        </h3>
        <ul id="edit-family-read-only-members-list" className="mt-3 grid gap-2">
          {family.members.map((member) => (
            <li
              id={`edit-family-read-only-member-${member.userId}`}
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] p-3 text-sm"
            >
              <span id={`edit-family-read-only-member-name-${member.userId}`} className="font-medium text-[var(--color-text)]">
                {member.firstName} {member.lastName} (@{member.username})
              </span>
              <span id={`edit-family-read-only-member-role-${member.userId}`} className="text-[var(--color-muted)]">
                {member.role === "admin" ? messages.adminRoleLabel : messages.memberRoleLabel}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
