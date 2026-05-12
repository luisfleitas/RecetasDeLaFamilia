"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import FamilyImageFrame from "@/app/account/families/_components/family-image-frame";
import FamilyReadOnlyDetails from "@/app/account/families/_components/family-read-only-details";
import FamilySecondaryTabs from "@/app/account/families/_components/family-secondary-tabs";
import FamilyStatusMessage from "@/app/account/families/_components/family-status-message";
import FamilyWizardBar from "@/app/account/families/_components/family-wizard-bar";
import {
  buildEditFamilyExistingInviteRows,
  buildEditFamilyPayload,
  buildEditFamilyReviewSummary,
  createInitialEditFamilyDraft,
  removeEditFamilyImage,
  stageEditFamilyImage,
  stageEditFamilyInviteLink,
  stageEditFamilyUsernameInvite,
  updateEditFamilyDetails,
  type EditFamilyDraft,
  type EditFamilyExistingInviteLink,
  type EditFamilyMode,
} from "@/lib/application/families/edit-family-workflow";
import type { FamilyEditPageFamily } from "@/lib/application/families/page-loaders";
import {
  buildFamilyWorkflowStepViewModels,
  getAdminEditFamilySteps,
  getMemberViewFamilySteps,
  resolveNextFamilyStep,
  type AdminEditFamilyStep,
  type MemberViewFamilyStep,
} from "@/lib/application/families/workflow-state";

type FamilyImageUploadState = "empty" | "loading" | "ready";
type EditFamilyInviteTab = "link" | "username";

type FamilyImageUploadResponse = {
  error?: string;
  image?: {
    pictureUrl: string;
    storageKey: string;
  };
};

type SaveFamilyResponse = {
  error?: string;
  family?: {
    id: number;
    name: string;
    description: string | null;
    pictureStorageKey: string | null;
    pictureUrl: string | null;
  };
};

type InviteCreateResponse = {
  error?: string;
  code?: string;
  invite?: {
    id: number;
    inviteUrl?: string;
    usageType?: "single_use" | "multi_use";
  };
};

type InviteLinksResponse = {
  error?: string;
  code?: string;
  invites?: EditFamilyExistingInviteLink[];
};

type InviteDeleteResponse = {
  code?: string;
  deleted?: boolean;
  error?: string;
  inviteId?: number;
};

type DirectInviteCreateResponse = {
  code?: string;
  error?: string;
  invite?: {
    id: number;
  };
  inviteUrl?: string;
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

function getAdminStepLabel(step: AdminEditFamilyStep, messages: ReturnType<typeof useMessages>["family"]["editFamily"]) {
  const labels: Record<AdminEditFamilyStep, string> = {
    start: messages.steps.start,
    "family-details": messages.steps.familyDetails,
    "invite-members": messages.steps.inviteMembers,
    review: messages.steps.review,
  };

  return labels[step];
}

function getMemberStepLabel(step: MemberViewFamilyStep, messages: ReturnType<typeof useMessages>["family"]["editFamily"]) {
  const labels: Record<MemberViewFamilyStep, string> = {
    details: messages.steps.details,
    invites: messages.steps.invites,
  };

  return labels[step];
}

function imageActionLabel(label: string, messages: ReturnType<typeof useMessages>["family"]["editFamily"]) {
  if (label === "Image will be replaced") {
    return messages.imageReplaced;
  }

  if (label === "Image will be removed") {
    return messages.imageRemoved;
  }

  return messages.imageUnchanged;
}

function EditFamilyStartScreen({ onContinue }: { onContinue: () => void }) {
  const messages = useMessages().family.editFamily;

  return (
    <section id="edit-family-start-screen" className="surface-panel grid gap-4 p-5">
      <div id="edit-family-start-copy" className="recipe-form-section-copy">
        <h2 id="edit-family-start-title" className="recipe-form-section-title">
          {messages.startTitle}
        </h2>
        <p id="edit-family-start-description" className="recipe-form-section-description">
          {messages.startDescription}
        </p>
      </div>
      <button id="edit-family-start-continue-btn" type="button" className={buttonClassName("primary")} onClick={onContinue}>
        {messages.startPrimaryAction}
      </button>
    </section>
  );
}

function EditFamilyDetailsScreen({
  draft,
  error,
  imageUploadState,
  onDescriptionChange,
  onImageFileChange,
  onImageRemove,
  onNameChange,
}: {
  draft: EditFamilyDraft;
  error: string | null;
  imageUploadState: FamilyImageUploadState;
  onDescriptionChange: (value: string) => void;
  onImageFileChange: (files: FileList | null) => void;
  onImageRemove: () => void;
  onNameChange: (value: string) => void;
}) {
  const messages = useMessages().family.editFamily;
  const imageUrl = draft.imageAction === "remove" ? null : draft.stagedImage?.pictureUrl ?? draft.initialProfile.pictureUrl;

  return (
    <section id="edit-family-details-screen" className="surface-panel grid gap-5 p-5">
      <div id="edit-family-details-copy" className="recipe-form-section-copy">
        <h2 id="edit-family-details-title" className="recipe-form-section-title">
          {messages.detailsTitle}
        </h2>
        <p id="edit-family-details-description" className="recipe-form-section-description">
          {messages.detailsDescription}
        </p>
      </div>

      {error ? (
        <FamilyStatusMessage id="edit-family-details-error" tone="error" title={messages.imageErrorTitle} message={error} />
      ) : null}

      <div id="edit-family-details-layout" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div id="edit-family-details-fields" className="grid gap-4">
          <label id="edit-family-details-name-label" className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]">
            {messages.nameLabel}
            <input
              id="edit-family-details-name-input"
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-text)]"
              value={draft.details.name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>

          <label
            id="edit-family-details-description-label"
            className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]"
          >
            {messages.descriptionLabel}
            <textarea
              id="edit-family-details-description-input"
              className="min-h-28 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium leading-6 text-[var(--color-text)]"
              value={draft.details.description}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </label>
        </div>

        <div id="edit-family-details-image-panel" className="grid content-start gap-3">
          <FamilyImageFrame
            id="edit-family-details-image-preview"
            alt={messages.imagePreviewAlt}
            imageUrl={imageUrl}
            initials={getInitials(draft.details.name)}
            state={imageUploadState}
          />
          <label id="edit-family-details-image-label" className={buttonClassName("secondary", "cursor-pointer")}>
            {messages.uploadImage}
            <input
              id="edit-family-details-image-input"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) => onImageFileChange(event.target.files)}
            />
          </label>
          <button id="edit-family-details-image-remove-btn" type="button" className={buttonClassName("secondary")} onClick={onImageRemove}>
            {messages.removeImage}
          </button>
          <p id="edit-family-details-image-help" className="text-xs leading-5 text-[var(--color-muted)]">
            {messages.imageHelp}
          </p>
        </div>
      </div>
    </section>
  );
}

function EditFamilyInviteMembersScreen({
  activeInviteTab,
  generatedInviteLinks,
  existingInviteLinks,
  inviteError,
  isCreatingInvite,
  isDeletingInviteId,
  isLoadingExistingInvites,
  onCopyInviteUrl,
  onExistingInviteDelete,
  onInviteTabChange,
  onLinkInviteCreate,
  onUsernameDraftChange,
  onUsernameInviteCreate,
  usernameDraft,
}: {
  activeInviteTab: EditFamilyInviteTab;
  generatedInviteLinks: { id: string; inputId: string; label: string; url: string }[];
  existingInviteLinks: EditFamilyExistingInviteLink[];
  inviteError: string | null;
  isCreatingInvite: boolean;
  isDeletingInviteId: number | null;
  isLoadingExistingInvites: boolean;
  onCopyInviteUrl: (url: string) => void;
  onExistingInviteDelete: (inviteId: number) => void;
  onInviteTabChange: (tab: EditFamilyInviteTab) => void;
  onLinkInviteCreate: (usageType: "single_use" | "multi_use") => void;
  onUsernameDraftChange: (value: string) => void;
  onUsernameInviteCreate: () => void;
  usernameDraft: string;
}) {
  const messages = useMessages().family.editFamily;
  const existingInviteRows = buildEditFamilyExistingInviteRows(
    existingInviteLinks,
    {
      activeLabel: messages.existingInviteStateActive,
      createdLabel: messages.existingInviteCreatedLabel,
      expiresLabel: messages.existingInviteExpiresLabel,
      multiUseLabel: messages.existingInviteMultiUseLabel,
      singleUseLabel: messages.existingInviteSingleUseLabel,
      usageLabel: messages.existingInviteUsageLabel,
    },
    (value) => new Date(value).toLocaleString(),
  );

  return (
    <section id="edit-family-invites-screen" className="surface-panel grid gap-5 p-5">
      <div id="edit-family-invites-copy" className="recipe-form-section-copy">
        <h2 id="edit-family-invites-title" className="recipe-form-section-title">
          {messages.invitesTitle}
        </h2>
        <p id="edit-family-invites-description" className="recipe-form-section-description">
          {messages.invitesDescription}
        </p>
      </div>

      {inviteError ? (
        <FamilyStatusMessage id="edit-family-invites-error" tone="error" title={messages.inviteCreateError} message={inviteError} />
      ) : null}

      <FamilySecondaryTabs
        idPrefix="edit-family-invites"
        ariaLabel={messages.inviteMethodsLabel}
        activeTab={activeInviteTab}
        onTabSelect={onInviteTabChange}
        tabs={[
          { id: "link", label: messages.inviteLinkTab },
          { id: "username", label: messages.usernameInviteTab },
        ]}
      />

      {activeInviteTab === "link" ? (
        <div id="edit-family-invites-link-panel" className="grid gap-3 md:grid-cols-2">
          <button
            id="edit-family-invites-single-use-btn"
            type="button"
            className={buttonClassName("secondary", "min-h-20 flex-col items-start gap-2 text-left leading-normal")}
            disabled={isCreatingInvite}
            onClick={() => onLinkInviteCreate("single_use")}
          >
            {messages.singleUseLinkTitle}
          </button>
          <button
            id="edit-family-invites-multi-use-btn"
            type="button"
            className={buttonClassName("secondary", "min-h-20 flex-col items-start gap-2 text-left leading-normal")}
            disabled={isCreatingInvite}
            onClick={() => onLinkInviteCreate("multi_use")}
          >
            {messages.multiUseLinkTitle}
          </button>
        </div>
      ) : (
        <div id="edit-family-invites-username-panel" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label id="edit-family-invites-username-label" className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]">
            {messages.usernameLabel}
            <input
              id="edit-family-invites-username-input"
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-text)]"
              value={usernameDraft}
              onChange={(event) => onUsernameDraftChange(event.target.value)}
              placeholder={messages.usernamePlaceholder}
            />
          </label>
          <button
            id="edit-family-invites-username-create-btn"
            type="button"
            className={buttonClassName("primary")}
            disabled={isCreatingInvite || usernameDraft.trim().length === 0}
            onClick={onUsernameInviteCreate}
          >
            {messages.createUsernameInvite}
          </button>
        </div>
      )}

      {generatedInviteLinks.length > 0 ? (
        <div id="edit-family-generated-invites" className="grid gap-3 rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <div id="edit-family-generated-invites-copy" className="grid gap-1">
            <h3 id="edit-family-generated-invites-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
              {messages.generatedInvitesTitle}
            </h3>
            <p id="edit-family-generated-invites-note" className="text-sm text-[var(--color-muted)]">
              {messages.generatedInvitesNote}
            </p>
          </div>
          <ul id="edit-family-generated-invites-list" className="grid gap-3">
            {generatedInviteLinks.map((invite) => (
              <li id={`edit-family-generated-invite-item-${invite.id}`} key={invite.id} className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] p-3">
                <label htmlFor={invite.inputId} className="text-sm font-semibold text-[var(--color-recipe-ink)]">
                  {invite.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id={invite.inputId}
                    readOnly
                    value={invite.url}
                    className="min-w-[220px] flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  />
                  <button type="button" className={buttonClassName("secondary")} onClick={() => onCopyInviteUrl(invite.url)}>
                    {messages.copyUrl}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div id="edit-family-existing-invites" className="grid gap-3 rounded-md border border-[var(--color-border)] bg-white/70 p-4">
        <div id="edit-family-existing-invites-copy" className="grid gap-1">
          <h3 id="edit-family-existing-invites-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
            {messages.existingInvitesTitle}
          </h3>
          <p id="edit-family-existing-invites-note" className="text-sm text-[var(--color-muted)]">
            {messages.existingInvitesNote}
          </p>
        </div>
        {isLoadingExistingInvites ? (
          <p id="edit-family-existing-invites-loading" className="text-sm text-[var(--color-muted)]">
            {messages.existingInvitesLoading}
          </p>
        ) : existingInviteRows.length === 0 ? (
          <p id="edit-family-existing-invites-empty" className="text-sm text-[var(--color-muted)]">
            {messages.existingInvitesEmpty}
          </p>
        ) : (
          <ul id="edit-family-existing-invites-list" className="grid gap-3">
            {existingInviteRows.map((invite) => (
              <li
                id={`edit-family-existing-invite-item-${invite.id}`}
                key={invite.id}
                className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div id={`edit-family-existing-invite-content-${invite.id}`} className="grid gap-1">
                  <p id={`edit-family-existing-invite-state-${invite.id}`} className="text-xs font-semibold uppercase text-[var(--color-primary)]">
                    {invite.stateLabel}
                  </p>
                  <p id={`edit-family-existing-invite-created-${invite.id}`} className="text-sm text-[var(--color-muted)]">
                    {invite.createdLabel}
                  </p>
                  <p id={`edit-family-existing-invite-usage-${invite.id}`} className="text-sm text-[var(--color-muted)]">
                    {invite.usageLabel}
                  </p>
                  <p id={`edit-family-existing-invite-expires-${invite.id}`} className="text-sm text-[var(--color-muted)]">
                    {invite.expiresLabel}
                  </p>
                </div>
                <button
                  id={`edit-family-existing-invite-delete-btn-${invite.id}`}
                  type="button"
                  className={buttonClassName("danger")}
                  disabled={isDeletingInviteId === invite.id}
                  onClick={() => onExistingInviteDelete(invite.id)}
                >
                  {isDeletingInviteId === invite.id ? messages.deletingInviteLink : messages.deleteInviteLink}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EditFamilyReviewScreen({
  draft,
  isSaving,
  onSave,
}: {
  draft: EditFamilyDraft;
  isSaving: boolean;
  onSave: () => void;
}) {
  const messages = useMessages().family.editFamily;
  const summary = buildEditFamilyReviewSummary(draft);
  const blockers = summary.blockers.map((blocker) =>
    blocker === "Family name is required" ? messages.familyNameRequired : blocker,
  );

  return (
    <section id="edit-family-review-screen" className="surface-panel grid gap-5 p-5">
      <div id="edit-family-review-copy" className="recipe-form-section-copy">
        <h2 id="edit-family-review-title" className="recipe-form-section-title">
          {messages.reviewTitle}
        </h2>
        <p id="edit-family-review-description" className="recipe-form-section-description">
          {messages.reviewDescription}
        </p>
      </div>

      {blockers.length > 0 ? (
        <FamilyStatusMessage id="edit-family-review-blockers" tone="error" title={messages.beforeSavingTitle} message={blockers.join(". ")} />
      ) : null}

      <div id="edit-family-review-summary-grid" className="grid gap-4 lg:grid-cols-2">
        <div id="edit-family-review-profile-summary" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <h3 id="edit-family-review-profile-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
            {messages.profileTitle}
          </h3>
          <dl id="edit-family-review-profile-list" className="mt-3 grid gap-3 text-sm">
            <div id="edit-family-review-profile-name-row">
              <dt className="font-semibold text-[var(--color-muted)]">{messages.reviewNameLabel}</dt>
              <dd id="edit-family-review-profile-name" className="mt-1 text-[var(--color-text)]">
                {draft.details.name || messages.notSet}
              </dd>
            </div>
            <div id="edit-family-review-profile-description-row">
              <dt className="font-semibold text-[var(--color-muted)]">{messages.reviewDescriptionLabel}</dt>
              <dd id="edit-family-review-profile-description" className="mt-1 text-[var(--color-text)]">
                {draft.details.description || messages.noDescription}
              </dd>
            </div>
            <div id="edit-family-review-profile-image-row">
              <dt className="font-semibold text-[var(--color-muted)]">{messages.reviewImageLabel}</dt>
              <dd id="edit-family-review-profile-image" className="mt-1 text-[var(--color-text)]">
                {imageActionLabel(summary.imageActionLabel, messages)}
              </dd>
            </div>
          </dl>
        </div>

        <div id="edit-family-review-invites-summary" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <h3 id="edit-family-review-invites-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
            {messages.reviewInvitesTitle}
          </h3>
          <p id="edit-family-review-invites-count" className="mt-2 text-sm text-[var(--color-muted)]">
            {summary.inviteCountLabel}
          </p>
        </div>
      </div>

      <button
        id="edit-family-review-save-btn"
        type="button"
        className={buttonClassName("primary")}
        disabled={!summary.canSave || isSaving}
        onClick={onSave}
      >
        {isSaving ? messages.savingSubmit : messages.saveSubmit}
      </button>
    </section>
  );
}

export default function EditFamilyWorkflow({
  family,
  mode,
}: {
  family: FamilyEditPageFamily;
  mode: EditFamilyMode;
}) {
  const messages = useMessages();
  const editMessages = messages.family.editFamily;
  const router = useRouter();
  const [adminStep, setAdminStep] = useState<AdminEditFamilyStep>("start");
  const [memberStep, setMemberStep] = useState<MemberViewFamilyStep>("details");
  const [draft, setDraft] = useState(() => createInitialEditFamilyDraft(family));
  const [activeInviteTab, setActiveInviteTab] = useState<EditFamilyInviteTab>("link");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [imageUploadState, setImageUploadState] = useState<FamilyImageUploadState>(family.pictureUrl ? "ready" : "empty");
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [existingInviteLinks, setExistingInviteLinks] = useState<EditFamilyExistingInviteLink[]>([]);
  const [isLoadingExistingInvites, setIsLoadingExistingInvites] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isDeletingInviteId, setIsDeletingInviteId] = useState<number | null>(null);
  const [generatedInviteLinks, setGeneratedInviteLinks] = useState<{ id: string; inputId: string; label: string; url: string }[]>([]);
  const adminSteps = useMemo(
    () =>
      getAdminEditFamilySteps().map((step) => ({
        ...step,
        label: getAdminStepLabel(step.id, editMessages),
      })),
    [editMessages],
  );
  const memberSteps = useMemo(
    () =>
      getMemberViewFamilySteps().map((step) => ({
        ...step,
        label: getMemberStepLabel(step.id, editMessages),
      })),
    [editMessages],
  );
  const activeAdminIndex = adminSteps.findIndex((step) => step.id === adminStep);
  const adminStepViewModels = buildFamilyWorkflowStepViewModels({
    steps: adminSteps,
    activeStep: adminStep,
    completedSteps: adminSteps.slice(0, Math.max(activeAdminIndex, 0)).map((step) => step.id),
  });
  const memberStepViewModels = buildFamilyWorkflowStepViewModels({
    steps: memberSteps,
    activeStep: memberStep,
    completedSteps: memberStep === "invites" ? ["details"] : [],
  });

  useEffect(() => {
    const firstGeneratedLink = generatedInviteLinks[0];
    if (!firstGeneratedLink) {
      return;
    }

    const input = document.getElementById(firstGeneratedLink.inputId);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [generatedInviteLinks]);

  const loadExistingInviteLinks = useCallback(async () => {
    setIsLoadingExistingInvites(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/families/${family.id}/invite-links`, { cache: "no-store" });
      const payload = (await response.json()) as InviteLinksResponse;
      if (!response.ok || !payload.invites) {
        throw new Error(payload.error ?? editMessages.inviteLoadError);
      }

      setExistingInviteLinks(payload.invites);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : editMessages.inviteLoadError);
    } finally {
      setIsLoadingExistingInvites(false);
    }
  }, [editMessages.inviteLoadError, family.id]);

  useEffect(() => {
    if (mode !== "edit" || adminStep !== "invite-members") {
      return;
    }

    void loadExistingInviteLinks();
  }, [adminStep, loadExistingInviteLinks, mode]);

  async function handleImageFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    setImageError(null);
    setImageUploadState("loading");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/family-images", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as FamilyImageUploadResponse;
      if (!response.ok || !payload.image) {
        throw new Error(payload.error ?? editMessages.imageUploadError);
      }

      setDraft((current) => stageEditFamilyImage(current, payload.image!));
      setImageUploadState("ready");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : editMessages.imageUploadError);
      setImageUploadState(draft.initialProfile.pictureUrl ? "ready" : "empty");
    }
  }

  async function saveFamily() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/families/${family.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildEditFamilyPayload(draft)),
      });
      const payload = (await response.json()) as SaveFamilyResponse;
      if (!response.ok || !payload.family) {
        throw new Error(payload.error ?? editMessages.saveError);
      }

      setSaveSuccess(true);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : editMessages.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function createLinkInvite(usageType: "single_use" | "multi_use") {
    setIsCreatingInvite(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/families/${family.id}/invite-links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usageType }),
      });
      const payload = (await response.json()) as InviteCreateResponse;
      if (!response.ok || !payload.invite?.inviteUrl) {
        throw new Error(payload.error ?? editMessages.inviteCreateError);
      }

      setDraft((current) => stageEditFamilyInviteLink(current, { usageType }));
      setGeneratedInviteLinks((current) => [
        ...current,
        {
          id: `link-${payload.invite!.id}`,
          inputId: `edit-family-generated-invite-input-link-${payload.invite!.id}`,
          label: usageType === "single_use" ? editMessages.singleUseLinkTitle : editMessages.multiUseLinkTitle,
          url: payload.invite!.inviteUrl!,
        },
      ]);
      await loadExistingInviteLinks();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : editMessages.inviteCreateError);
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function deleteExistingInviteLink(inviteId: number) {
    setIsDeletingInviteId(inviteId);
    setInviteError(null);

    try {
      const response = await fetch(`/api/families/${family.id}/invite-links/${inviteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as InviteDeleteResponse;
      if (!response.ok || !payload.deleted) {
        throw new Error(payload.error ?? editMessages.inviteDeleteError);
      }

      setExistingInviteLinks((current) => current.filter((invite) => invite.id !== inviteId));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : editMessages.inviteDeleteError);
    } finally {
      setIsDeletingInviteId(null);
    }
  }

  async function createUsernameInvite() {
    setIsCreatingInvite(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/families/${family.id}/direct-invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: usernameDraft }),
      });
      const payload = (await response.json()) as DirectInviteCreateResponse;
      if (!response.ok || !payload.inviteUrl || !payload.invite) {
        throw new Error(payload.error ?? editMessages.inviteCreateError);
      }

      setDraft((current) => stageEditFamilyUsernameInvite(current, { username: usernameDraft }));
      setGeneratedInviteLinks((current) => [
        ...current,
        {
          id: `direct-${payload.invite!.id}`,
          inputId: `edit-family-generated-invite-input-direct-${payload.invite!.id}`,
          label: `${editMessages.usernameInviteTab}: ${usernameDraft.trim().replace(/^@+/, "").toLowerCase()}`,
          url: payload.inviteUrl!,
        },
      ]);
      setUsernameDraft("");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : editMessages.inviteCreateError);
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setInviteError(editMessages.copyGeneratedUrlError);
    }
  }

  if (mode === "view") {
    return (
      <div id="edit-family-member-view-workflow" className="grid gap-5">
        <FamilyWizardBar
          idPrefix="edit-family-member-view"
          ariaLabel={editMessages.viewWizardLabel}
          activeStep={memberStep}
          steps={memberStepViewModels}
          onStepSelect={setMemberStep}
        />
        {memberStep === "details" ? <FamilyReadOnlyDetails family={family} messages={editMessages} /> : null}
        {memberStep === "invites" ? (
          <section id="edit-family-read-only-invites" className="surface-panel grid gap-3 p-5">
            <h2 id="edit-family-read-only-invites-title" className="recipe-form-section-title">
              {editMessages.readOnlyInvitesTitle}
            </h2>
            <p id="edit-family-read-only-invites-description" className="recipe-form-section-description">
              {editMessages.readOnlyInvitesDescription}
            </p>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div id="edit-family-admin-workflow" className="grid gap-5">
      <FamilyWizardBar
        idPrefix="edit-family-admin"
        ariaLabel={editMessages.editWizardLabel}
        activeStep={adminStep}
        steps={adminStepViewModels}
        onStepSelect={setAdminStep}
      />

      {saveError ? <FamilyStatusMessage id="edit-family-save-error" tone="error" title={editMessages.saveError} message={saveError} /> : null}
      {saveSuccess ? (
        <FamilyStatusMessage id="edit-family-save-success" tone="success" title={editMessages.saveSuccessTitle} message={editMessages.saveSuccessMessage} />
      ) : null}

      {adminStep === "start" ? <EditFamilyStartScreen onContinue={() => setAdminStep("family-details")} /> : null}
      {adminStep === "family-details" ? (
        <EditFamilyDetailsScreen
          draft={draft}
          error={imageError}
          imageUploadState={imageUploadState}
          onNameChange={(name) => setDraft((current) => updateEditFamilyDetails(current, { name }))}
          onDescriptionChange={(description) => setDraft((current) => updateEditFamilyDetails(current, { description }))}
          onImageFileChange={handleImageFileChange}
          onImageRemove={() => {
            setDraft((current) => removeEditFamilyImage(current));
            setImageUploadState("empty");
            setImageError(null);
          }}
        />
      ) : null}
      {adminStep === "invite-members" ? (
        <EditFamilyInviteMembersScreen
          activeInviteTab={activeInviteTab}
          existingInviteLinks={existingInviteLinks}
          generatedInviteLinks={generatedInviteLinks}
          inviteError={inviteError}
          isCreatingInvite={isCreatingInvite}
          isDeletingInviteId={isDeletingInviteId}
          isLoadingExistingInvites={isLoadingExistingInvites}
          usernameDraft={usernameDraft}
          onExistingInviteDelete={deleteExistingInviteLink}
          onInviteTabChange={setActiveInviteTab}
          onUsernameDraftChange={setUsernameDraft}
          onLinkInviteCreate={createLinkInvite}
          onUsernameInviteCreate={createUsernameInvite}
          onCopyInviteUrl={copyInviteUrl}
        />
      ) : null}
      {adminStep === "review" ? <EditFamilyReviewScreen draft={draft} isSaving={isSaving} onSave={saveFamily} /> : null}

      <div id="edit-family-workflow-footer-actions" className="flex flex-wrap items-center justify-between gap-3">
        <button id="edit-family-workflow-manage-link-btn" type="button" className={buttonClassName("secondary")} onClick={() => router.push("/account/families")}>
          {editMessages.backToManageFamilies}
        </button>
        {adminStep !== "review" ? (
          <button
            id="edit-family-workflow-next-btn"
            type="button"
            className={buttonClassName("primary")}
            onClick={() => setAdminStep(resolveNextFamilyStep(adminSteps, adminStep))}
          >
            {editMessages.continue}
          </button>
        ) : null}
      </div>
    </div>
  );
}
