"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import FamilyImageFrame from "@/app/account/families/_components/family-image-frame";
import FamilySecondaryTabs from "@/app/account/families/_components/family-secondary-tabs";
import FamilyStatusMessage from "@/app/account/families/_components/family-status-message";
import FamilyWizardBar from "@/app/account/families/_components/family-wizard-bar";
import {
  buildCreateFamilyPayload,
  createInitialCreateFamilyDraft,
  removeStagedInvite,
  stageImage,
  stageInviteLink,
  stageUsernameInvite,
  summarizeCreateFamilyReview,
  updateDetails,
  type CreateFamilyDraft,
} from "@/lib/application/families/create-family-workflow";
import {
  buildCreateFamilyGeneratedInviteLinks,
  buildCreateFamilyReviewSections,
  formatCreateFamilyInvite,
  getCreateFamilyDetailsFields,
  getCreateFamilyInviteMethodTabs,
  getCreateFamilyStartCopy,
  type CreateFamilyMessages,
} from "@/lib/application/families/create-family-ui-contract";
import {
  buildFamilyWorkflowStepViewModels,
  getCreateFamilySteps,
  resolveNextFamilyStep,
  type CreateFamilyStep,
} from "@/lib/application/families/workflow-state";

type CreateFamilyInviteTab = "link" | "username";
type FamilyImageUploadState = "empty" | "loading" | "ready";

type CreateFamilySubmitResponse = {
  completion?: {
    failedInvites?: { inviteId: string; message: string }[];
    inviteResults?: {
      inviteId: string;
      inviteType: "direct" | "link";
      inviteUrl?: string;
      ok: boolean;
    }[];
    status: "success" | "warning";
  };
  error?: string;
  family?: {
    id: number;
    name: string;
  };
};

type FamilyImageUploadResponse = {
  error?: string;
  image?: {
    pictureUrl: string;
    storageKey: string;
  };
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

function getCreateFamilyStepLabel(step: CreateFamilyStep, messages: CreateFamilyMessages) {
  const labels: Record<CreateFamilyStep, string> = {
    start: messages.steps.start,
    "family-details": messages.steps.familyDetails,
    "invite-members": messages.steps.inviteMembers,
    review: messages.steps.review,
  };

  return labels[step];
}

export function CreateFamilyStartScreen({ onContinue }: { onContinue: () => void }) {
  const copy = getCreateFamilyStartCopy(useMessages().family.createFamily);

  return (
    <section id="create-family-start-screen" className="surface-panel grid gap-4 p-5">
      <div id="create-family-start-copy" className="recipe-form-section-copy">
        <h2 id="create-family-start-title" className="recipe-form-section-title">
          {copy.title}
        </h2>
        <p id="create-family-start-description" className="recipe-form-section-description">
          {copy.description}
        </p>
      </div>

      <div id="create-family-start-actions" className="flex flex-wrap gap-3">
        <button
          id="create-family-start-continue-btn"
          type="button"
          className={buttonClassName("primary")}
          onClick={onContinue}
        >
          {copy.primaryActionLabel}
        </button>
      </div>
    </section>
  );
}

export function CreateFamilyDetailsScreen({
  draft,
  error,
  imageUploadState,
  onDescriptionChange,
  onImageFileChange,
  onImageRemove,
  onNameChange,
}: {
  draft: CreateFamilyDraft;
  error: string | null;
  imageUploadState: FamilyImageUploadState;
  onDescriptionChange: (value: string) => void;
  onImageFileChange: (files: FileList | null) => void;
  onImageRemove: () => void;
  onNameChange: (value: string) => void;
}) {
  const createFamilyMessages = useMessages().family.createFamily;
  const [nameField, descriptionField] = getCreateFamilyDetailsFields(createFamilyMessages);

  return (
    <section id="create-family-details-screen" className="surface-panel grid gap-5 p-5">
      <div id="create-family-details-copy" className="recipe-form-section-copy">
        <h2 id="create-family-details-title" className="recipe-form-section-title">
          {createFamilyMessages.detailsTitle}
        </h2>
        <p id="create-family-details-description" className="recipe-form-section-description">
          {createFamilyMessages.detailsDescription}
        </p>
      </div>

      {error ? (
        <FamilyStatusMessage
          id="create-family-details-error"
          tone="error"
          title={createFamilyMessages.imageErrorTitle}
          message={error}
        />
      ) : null}

      <div id="create-family-details-layout" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div id="create-family-details-fields" className="grid gap-4">
          <label id="create-family-details-name-label" className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]">
            {nameField.label}
            <input
              id="create-family-details-name-input"
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-text)]"
              type="text"
              value={draft.details.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={createFamilyMessages.namePlaceholder}
            />
          </label>

          <label id="create-family-details-description-label" className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]">
            {descriptionField.label}
            <textarea
              id="create-family-details-description-input"
              className="min-h-28 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium leading-6 text-[var(--color-text)]"
              value={draft.details.description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={createFamilyMessages.descriptionPlaceholder}
            />
          </label>
        </div>

        <div id="create-family-details-image-panel" className="grid content-start gap-3">
          <FamilyImageFrame
            id="create-family-details-image-preview"
            alt={createFamilyMessages.imagePreviewAlt}
            imageUrl={draft.stagedImage?.pictureUrl ?? null}
            initials={getInitials(draft.details.name)}
            state={imageUploadState}
          />
          <label id="create-family-details-image-label" className={buttonClassName("secondary", "cursor-pointer")}>
            {createFamilyMessages.uploadImage}
            <input
              id="create-family-details-image-input"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) => onImageFileChange(event.target.files)}
            />
          </label>
          {draft.stagedImage ? (
            <button
              id="create-family-details-image-remove-btn"
              type="button"
              className={buttonClassName("secondary")}
              onClick={onImageRemove}
            >
              {createFamilyMessages.removeImage}
            </button>
          ) : null}
          <p id="create-family-details-image-help" className="text-xs leading-5 text-[var(--color-muted)]">
            {createFamilyMessages.imageHelp}
          </p>
        </div>
      </div>
    </section>
  );
}

export function CreateFamilyInviteMembersScreen({
  activeInviteTab,
  draft,
  usernameDraft,
  onInviteTabChange,
  onLinkInviteStage,
  onRemoveInvite,
  onUsernameDraftChange,
  onUsernameInviteStage,
}: {
  activeInviteTab: CreateFamilyInviteTab;
  draft: CreateFamilyDraft;
  usernameDraft: string;
  onInviteTabChange: (tab: CreateFamilyInviteTab) => void;
  onLinkInviteStage: (usageType: "single_use" | "multi_use") => void;
  onRemoveInvite: (inviteId: string) => void;
  onUsernameDraftChange: (value: string) => void;
  onUsernameInviteStage: () => void;
}) {
  const createFamilyMessages = useMessages().family.createFamily;

  return (
    <section id="create-family-invites-screen" className="surface-panel grid gap-5 p-5">
      <div id="create-family-invites-copy" className="recipe-form-section-copy">
        <h2 id="create-family-invites-title" className="recipe-form-section-title">
          {createFamilyMessages.invitesTitle}
        </h2>
        <p id="create-family-invites-description" className="recipe-form-section-description">
          {createFamilyMessages.invitesDescription}
        </p>
      </div>

      <FamilySecondaryTabs
        idPrefix="create-family-invites"
        ariaLabel={createFamilyMessages.inviteMethodsLabel}
        activeTab={activeInviteTab}
        onTabSelect={onInviteTabChange}
        tabs={getCreateFamilyInviteMethodTabs(createFamilyMessages)}
      />

      {activeInviteTab === "link" ? (
        <div id="create-family-invites-link-panel" className="grid gap-3 md:grid-cols-2">
          <button
            id="create-family-invites-single-use-btn"
            type="button"
            className={buttonClassName("secondary", "min-h-24 flex-col items-start gap-2 text-left leading-normal")}
            onClick={() => onLinkInviteStage("single_use")}
          >
            <span id="create-family-invites-single-use-title">{createFamilyMessages.singleUseLinkTitle}</span>
            <span id="create-family-invites-single-use-description" className="text-sm font-medium text-[var(--color-text-muted)]">
              {createFamilyMessages.singleUseLinkDescription}
            </span>
          </button>
          <button
            id="create-family-invites-multi-use-btn"
            type="button"
            className={buttonClassName("secondary", "min-h-24 flex-col items-start gap-2 text-left leading-normal")}
            onClick={() => onLinkInviteStage("multi_use")}
          >
            <span id="create-family-invites-multi-use-title">{createFamilyMessages.multiUseLinkTitle}</span>
            <span id="create-family-invites-multi-use-description" className="text-sm font-medium text-[var(--color-text-muted)]">
              {createFamilyMessages.multiUseLinkDescription}
            </span>
          </button>
        </div>
      ) : (
        <div id="create-family-invites-username-panel" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label id="create-family-invites-username-label" className="grid gap-2 text-sm font-semibold text-[var(--color-recipe-ink)]">
            {createFamilyMessages.usernameLabel}
            <input
              id="create-family-invites-username-input"
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-base font-medium text-[var(--color-text)]"
              type="text"
              value={usernameDraft}
              onChange={(event) => onUsernameDraftChange(event.target.value)}
              placeholder={createFamilyMessages.usernamePlaceholder}
            />
          </label>
          <button
            id="create-family-invites-username-stage-btn"
            type="button"
            className={buttonClassName("primary")}
            disabled={usernameDraft.trim().length === 0}
            onClick={onUsernameInviteStage}
          >
            {createFamilyMessages.stageUsernameInvite}
          </button>
        </div>
      )}

      <div id="create-family-invites-staged-summary" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
        <h3 id="create-family-invites-staged-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
          {createFamilyMessages.stagedInvitesTitle}
        </h3>
        {draft.stagedInvites.length === 0 ? (
          <p id="create-family-invites-staged-empty" className="mt-2 text-sm text-[var(--color-muted)]">
            {createFamilyMessages.stagedInvitesEmpty}
          </p>
        ) : (
          <ul id="create-family-invites-staged-list" className="mt-3 grid gap-2">
            {draft.stagedInvites.map((invite) => (
              <li
                id={`create-family-invites-staged-item-${invite.id}`}
                key={invite.id}
                className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span id={`create-family-invites-staged-label-${invite.id}`} className="text-sm font-medium text-[var(--color-text)]">
                  {formatCreateFamilyInvite(invite, createFamilyMessages)}
                </span>
                <button
                  id={`create-family-invites-staged-remove-btn-${invite.id}`}
                  type="button"
                  className={buttonClassName("secondary", "self-start sm:self-auto")}
                  onClick={() => onRemoveInvite(invite.id)}
                >
                  {createFamilyMessages.removeInvite}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function CreateFamilyReviewScreen({
  createdFamilyId,
  draft,
  failedInviteMessages,
  generatedInviteLinks,
  isSubmitting,
  onCreate,
  onCopyInviteUrl,
}: {
  createdFamilyId?: number | null;
  draft: CreateFamilyDraft;
  failedInviteMessages: string[];
  generatedInviteLinks: { id: string; inputId: string; label: string; url: string }[];
  isSubmitting: boolean;
  onCreate: () => void;
  onCopyInviteUrl: (url: string) => void;
}) {
  const createFamilyMessages = useMessages().family.createFamily;
  const summary = summarizeCreateFamilyReview(draft);
  const reviewSections = buildCreateFamilyReviewSections(draft, failedInviteMessages, createFamilyMessages);
  const blockers = summary.blockers.map((blocker) =>
    blocker === "Family name is required" ? createFamilyMessages.familyNameRequired : blocker,
  );

  return (
    <section id="create-family-review-screen" className="surface-panel grid gap-5 p-5">
      <div id="create-family-review-copy" className="recipe-form-section-copy">
        <h2 id="create-family-review-title" className="recipe-form-section-title">
          {createFamilyMessages.reviewTitle}
        </h2>
        <p id="create-family-review-description" className="recipe-form-section-description">
          {createFamilyMessages.reviewDescription}
        </p>
      </div>

      {failedInviteMessages.length > 0 ? (
        <div id="create-family-review-invite-warning-panel" className="grid gap-3">
          <FamilyStatusMessage
            id="create-family-review-invite-warning"
            tone="warning"
            title={reviewSections.warning?.title ?? createFamilyMessages.recoverableWarningTitle}
            message={reviewSections.warning?.message ?? ""}
          />
          <div id="create-family-review-warning-actions" className="flex flex-wrap gap-3">
            {createdFamilyId ? (
              <a
                id="create-family-review-warning-edit-link"
                className={buttonClassName("primary")}
                href={`/account/families/${createdFamilyId}/edit`}
              >
                {createFamilyMessages.openEditFamily}
              </a>
            ) : null}
            <a
              id="create-family-review-warning-manage-link"
              className={buttonClassName("secondary")}
              href="/account/families"
            >
              {createFamilyMessages.openManageFamilies}
            </a>
          </div>
        </div>
      ) : null}

      {generatedInviteLinks.length > 0 ? (
        <div id="create-family-review-generated-invites" className="grid gap-3 rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <div id="create-family-review-generated-invites-copy" className="grid gap-1">
            <h3 id="create-family-review-generated-invites-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
              {createFamilyMessages.generatedInviteUrlsTitle}
            </h3>
            <p id="create-family-review-generated-invites-note" className="text-sm text-[var(--color-muted)]">
              {createFamilyMessages.generatedInviteUrlsNote}
            </p>
          </div>
          <ul id="create-family-review-generated-invites-list" className="grid gap-3">
            {generatedInviteLinks.map((invite) => (
              <li
                id={`create-family-review-generated-invite-item-${invite.id}`}
                key={invite.id}
                className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] p-3"
              >
                <label
                  id={`create-family-review-generated-invite-label-${invite.id}`}
                  htmlFor={invite.inputId}
                  className="text-sm font-semibold text-[var(--color-recipe-ink)]"
                >
                  {invite.label}
                </label>
                <div id={`create-family-review-generated-invite-row-${invite.id}`} className="flex flex-wrap gap-2">
                  <input
                    id={invite.inputId}
                    readOnly
                    value={invite.url}
                    className="min-w-[220px] flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-text)]"
                  />
                  <button
                    id={`create-family-review-generated-invite-copy-btn-${invite.id}`}
                    type="button"
                    className={buttonClassName("secondary")}
                    onClick={() => onCopyInviteUrl(invite.url)}
                  >
                    {createFamilyMessages.copyUrl}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.blockers.length > 0 ? (
        <FamilyStatusMessage
          id="create-family-review-blockers"
          tone="error"
          title={createFamilyMessages.beforeCreatingTitle}
          message={blockers.join(". ")}
        />
      ) : null}

      <div id="create-family-review-summary-grid" className="grid gap-4 lg:grid-cols-2">
        <div id="create-family-review-profile-summary" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <h3 id="create-family-review-profile-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
            {createFamilyMessages.profileTitle}
          </h3>
          <dl id="create-family-review-profile-list" className="mt-3 grid gap-3 text-sm">
            <div id="create-family-review-profile-name-row">
              <dt className="font-semibold text-[var(--color-muted)]">{createFamilyMessages.reviewNameLabel}</dt>
              <dd id="create-family-review-profile-name" className="mt-1 text-[var(--color-text)]">
                {reviewSections.profile.name}
              </dd>
            </div>
            <div id="create-family-review-profile-description-row">
              <dt className="font-semibold text-[var(--color-muted)]">{createFamilyMessages.reviewDescriptionLabel}</dt>
              <dd id="create-family-review-profile-description" className="mt-1 text-[var(--color-text)]">
                {reviewSections.profile.description}
              </dd>
            </div>
            <div id="create-family-review-profile-image-row">
              <dt className="font-semibold text-[var(--color-muted)]">{createFamilyMessages.reviewImageLabel}</dt>
              <dd id="create-family-review-profile-image" className="mt-1 text-[var(--color-text)]">
                {reviewSections.profile.image}
              </dd>
            </div>
          </dl>
        </div>

        <div id="create-family-review-invites-summary" className="rounded-md border border-[var(--color-border)] bg-white/70 p-4">
          <h3 id="create-family-review-invites-title" className="text-sm font-semibold text-[var(--color-recipe-ink)]">
            {createFamilyMessages.reviewInvitesTitle}
          </h3>
          <p id="create-family-review-invites-count" className="mt-2 text-sm text-[var(--color-muted)]">
            {summary.inviteCountLabel}
          </p>
          {draft.stagedInvites.length > 0 ? (
            <ul id="create-family-review-invites-list" className="mt-3 grid gap-2 text-sm text-[var(--color-text)]">
              {draft.stagedInvites.map((invite, index) => (
                <li id={`create-family-review-invite-item-${invite.id}`} key={invite.id}>
                  {reviewSections.invites[index]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div id="create-family-review-actions" className="flex flex-wrap gap-3">
        <button
          id="create-family-review-submit-btn"
          type="button"
          className={buttonClassName("primary")}
          disabled={!summary.canCreate || isSubmitting}
          onClick={onCreate}
        >
          {isSubmitting ? createFamilyMessages.creatingSubmit : createFamilyMessages.createSubmit}
        </button>
      </div>
    </section>
  );
}

export default function CreateFamilyWorkflow() {
  const messages = useMessages();
  const createFamilyMessages = messages.family.createFamily;
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<CreateFamilyStep>("start");
  const [draft, setDraft] = useState(createInitialCreateFamilyDraft);
  const [activeInviteTab, setActiveInviteTab] = useState<CreateFamilyInviteTab>("link");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [imageUploadState, setImageUploadState] = useState<FamilyImageUploadState>("empty");
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [failedInviteMessages, setFailedInviteMessages] = useState<string[]>([]);
  const [generatedInviteLinks, setGeneratedInviteLinks] = useState<{ id: string; inputId: string; label: string; url: string }[]>([]);
  const [createdFamilyId, setCreatedFamilyId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createSteps = useMemo(
    () =>
      getCreateFamilySteps().map((step) => ({
        ...step,
        label: getCreateFamilyStepLabel(step.id, createFamilyMessages),
      })),
    [createFamilyMessages],
  );
  const activeIndex = createSteps.findIndex((step) => step.id === activeStep);
  const completedSteps = createSteps.slice(0, Math.max(activeIndex, 0)).map((step) => step.id);
  const stepViewModels = buildFamilyWorkflowStepViewModels({
    steps: createSteps,
    activeStep,
    completedSteps,
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

  function goToStep(step: CreateFamilyStep) {
    setActiveStep(step);
  }

  function goNext() {
    setActiveStep(resolveNextFamilyStep(createSteps, activeStep));
  }

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
        throw new Error(payload.error ?? createFamilyMessages.imageUploadError);
      }

      setDraft((current) => stageImage(current, payload.image!));
      setImageUploadState("ready");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : createFamilyMessages.imageUploadError);
      setImageUploadState(draft.stagedImage ? "ready" : "empty");
    }
  }

  async function createFamily() {
    setIsSubmitting(true);
    setSubmitError(null);
    setFailedInviteMessages([]);
    setGeneratedInviteLinks([]);

    try {
      const response = await fetch("/api/families", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildCreateFamilyPayload(draft)),
      });
      const payload = (await response.json()) as CreateFamilySubmitResponse;

      if (!response.ok || !payload.family || !payload.completion) {
        throw new Error(payload.error ?? createFamilyMessages.createError);
      }

      setCreatedFamilyId(payload.family.id);
      setGeneratedInviteLinks(buildCreateFamilyGeneratedInviteLinks(payload.completion.inviteResults ?? [], createFamilyMessages));
      if (payload.completion.status === "warning") {
        setFailedInviteMessages((payload.completion.failedInvites ?? []).map((invite) => invite.message));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : createFamilyMessages.createError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setSubmitError(createFamilyMessages.copyGeneratedUrlError);
    }
  }

  return (
    <div id="create-family-workflow" className="grid gap-5">
      <FamilyWizardBar
        idPrefix="create-family"
        ariaLabel={createFamilyMessages.wizardLabel}
        activeStep={activeStep}
        steps={stepViewModels}
        onStepSelect={goToStep}
      />

      {submitError ? (
        <FamilyStatusMessage
          id="create-family-submit-error"
          tone="error"
          title={createFamilyMessages.createError}
          message={submitError}
        />
      ) : null}

      {createdFamilyId && failedInviteMessages.length === 0 ? (
        <FamilyStatusMessage
          id="create-family-submit-success"
          tone="success"
          title={createFamilyMessages.createSuccessTitle}
          message={createFamilyMessages.createSuccessMessage}
        />
      ) : null}

      {activeStep === "start" ? <CreateFamilyStartScreen onContinue={goNext} /> : null}

      {activeStep === "family-details" ? (
        <CreateFamilyDetailsScreen
          draft={draft}
          error={imageError}
          imageUploadState={imageUploadState}
          onNameChange={(name) => setDraft((current) => updateDetails(current, { name }))}
          onDescriptionChange={(description) => setDraft((current) => updateDetails(current, { description }))}
          onImageFileChange={handleImageFileChange}
          onImageRemove={() => {
            setDraft((current) => ({ ...current, stagedImage: null }));
            setImageUploadState("empty");
            setImageError(null);
          }}
        />
      ) : null}

      {activeStep === "invite-members" ? (
        <CreateFamilyInviteMembersScreen
          activeInviteTab={activeInviteTab}
          draft={draft}
          usernameDraft={usernameDraft}
          onInviteTabChange={setActiveInviteTab}
          onLinkInviteStage={(usageType) => setDraft((current) => stageInviteLink(current, { usageType }))}
          onUsernameDraftChange={setUsernameDraft}
          onUsernameInviteStage={() => {
            setDraft((current) => stageUsernameInvite(current, { username: usernameDraft }));
            setUsernameDraft("");
          }}
          onRemoveInvite={(inviteId) => setDraft((current) => removeStagedInvite(current, inviteId))}
        />
      ) : null}

      {activeStep === "review" ? (
        <CreateFamilyReviewScreen
          createdFamilyId={createdFamilyId}
          draft={draft}
          failedInviteMessages={failedInviteMessages}
          generatedInviteLinks={generatedInviteLinks}
          isSubmitting={isSubmitting}
          onCreate={createFamily}
          onCopyInviteUrl={copyInviteUrl}
        />
      ) : null}

      <div id="create-family-workflow-footer-actions" className="flex flex-wrap items-center justify-between gap-3">
        <button
          id="create-family-workflow-manage-link-btn"
          type="button"
          className={buttonClassName("secondary")}
          onClick={() => router.push("/account/families")}
        >
          {createFamilyMessages.backToManageFamilies}
        </button>
        {activeStep !== "review" ? (
          <button
            id="create-family-workflow-next-btn"
            type="button"
            className={buttonClassName("primary")}
            onClick={goNext}
          >
            {createFamilyMessages.continue}
          </button>
        ) : null}
      </div>
    </div>
  );
}
