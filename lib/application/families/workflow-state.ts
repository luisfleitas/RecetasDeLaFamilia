export type FamilyWorkflowStepStatus = "complete" | "current" | "future";

export type CreateFamilyStep = "start" | "family-details" | "invite-members" | "review";
export type AdminEditFamilyStep = CreateFamilyStep;
export type MemberViewFamilyStep = "details" | "invites";
export type ManageFamilyTopTab = "families" | "pending-invites" | "selected-family";
export type ManageFamilySelectedStep = "overview" | "members" | "invites" | "safety";

export type FamilyWorkflowStep<TStep extends string> = {
  id: TStep;
  label: string;
};

export type FamilyWorkflowStepViewModel<TStep extends string> = FamilyWorkflowStep<TStep> & {
  status: FamilyWorkflowStepStatus;
  isClickable: boolean;
};

const CREATE_FAMILY_STEPS: FamilyWorkflowStep<CreateFamilyStep>[] = [
  { id: "start", label: "Start" },
  { id: "family-details", label: "Family details" },
  { id: "invite-members", label: "Invite members" },
  { id: "review", label: "Review" },
];

const MEMBER_VIEW_FAMILY_STEPS: FamilyWorkflowStep<MemberViewFamilyStep>[] = [
  { id: "details", label: "Details" },
  { id: "invites", label: "Invites" },
];

const MANAGE_FAMILY_TOP_TABS: FamilyWorkflowStep<ManageFamilyTopTab>[] = [
  { id: "families", label: "Families" },
  { id: "pending-invites", label: "Pending invites" },
  { id: "selected-family", label: "Selected family" },
];

const MANAGE_FAMILY_SELECTED_STEPS: FamilyWorkflowStep<ManageFamilySelectedStep>[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "invites", label: "Invites" },
  { id: "safety", label: "Safety" },
];

function cloneSteps<TStep extends string>(steps: FamilyWorkflowStep<TStep>[]) {
  return steps.map((step) => ({ ...step }));
}

export function getCreateFamilySteps() {
  return cloneSteps(CREATE_FAMILY_STEPS);
}

export function getAdminEditFamilySteps() {
  return cloneSteps(CREATE_FAMILY_STEPS);
}

export function getMemberViewFamilySteps() {
  return cloneSteps(MEMBER_VIEW_FAMILY_STEPS);
}

export function getManageFamilyTopTabs() {
  return cloneSteps(MANAGE_FAMILY_TOP_TABS);
}

export function getManageFamilySelectedSteps() {
  return cloneSteps(MANAGE_FAMILY_SELECTED_STEPS);
}

export function buildFamilyWorkflowStepViewModels<TStep extends string>({
  steps,
  activeStep,
  completedSteps = [],
}: {
  steps: FamilyWorkflowStep<TStep>[];
  activeStep: TStep;
  completedSteps?: TStep[];
}): FamilyWorkflowStepViewModel<TStep>[] {
  return steps.map((step) => {
    const status: FamilyWorkflowStepStatus = completedSteps.includes(step.id)
      ? "complete"
      : step.id === activeStep
        ? "current"
        : "future";

    return {
      ...step,
      status,
      isClickable: status !== "future",
    };
  });
}

export function buildMemberViewFamilyStepViewModels(activeStep: MemberViewFamilyStep) {
  return getMemberViewFamilySteps().map((step) => ({
    ...step,
    status:
      step.id === activeStep
        ? "current"
        : activeStep === "invites" && step.id === "details"
          ? "complete"
          : "future",
    isClickable: true,
  })) satisfies FamilyWorkflowStepViewModel<MemberViewFamilyStep>[];
}

export function resolveNextFamilyStep<TStep extends string>(
  steps: FamilyWorkflowStep<TStep>[],
  currentStep: TStep | string,
): TStep {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  if (currentIndex < 0) {
    return steps[0]?.id as TStep;
  }

  return steps[Math.min(currentIndex + 1, steps.length - 1)].id;
}
