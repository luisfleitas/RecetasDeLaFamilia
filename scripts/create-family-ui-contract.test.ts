import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateFamilyGeneratedInviteLinks,
  buildCreateFamilyReviewSections,
  getCreateFamilyDetailsFields,
  getCreateFamilyInviteMethodTabs,
  getCreateFamilyStartCopy,
} from "../lib/application/families/create-family-ui-contract";
import {
  createInitialCreateFamilyDraft,
  stageImage,
  stageInviteLink,
  stageUsernameInvite,
  updateDetails,
} from "../lib/application/families/create-family-workflow";
import { getMessages } from "../lib/i18n/messages";

test("create family UI contract introduces the workflow without persisting anything early", () => {
  const copy = getCreateFamilyStartCopy(getMessages("en").family.createFamily);

  assert.match(copy.title, /shared family recipe space/i);
  assert.match(copy.description, /before Recetas creates the family/i);
  assert.equal(copy.primaryActionLabel, "Start family setup");
});

test("create family UI contract reads English and Spanish copy from messages", () => {
  const english = getMessages("en").family.createFamily;
  const spanish = getMessages("es").family.createFamily;

  assert.equal(getCreateFamilyStartCopy(english).primaryActionLabel, "Start family setup");
  assert.equal(getCreateFamilyStartCopy(spanish).primaryActionLabel, "Comenzar configuración familiar");
  assert.equal(getCreateFamilyInviteMethodTabs(spanish)[1].label, "Invitación por usuario");
  assert.equal(
    buildCreateFamilyGeneratedInviteLinks(
      [
        {
          inviteId: "invite-2",
          inviteType: "direct",
          inviteUrl: "http://localhost/invite/family/direct-token",
          ok: true,
        },
      ],
      spanish,
    )[0]?.label,
    "Invitación por usuario",
  );
});

test("create family details fields collect profile and image upload without raw storage key UI", () => {
  const fields = getCreateFamilyDetailsFields(getMessages("en").family.createFamily);

  assert.deepEqual(
    fields.map((field) => field.id),
    ["name", "description", "image"],
  );
  assert.equal(fields.some((field) => /storage/i.test(field.label)), false);
});

test("create family invite contract uses link and username tabs", () => {
  assert.deepEqual(getCreateFamilyInviteMethodTabs(getMessages("en").family.createFamily), [
    { id: "link", label: "Invite link" },
    { id: "username", label: "Username invite" },
  ]);
});

test("create family review contract returns profile and staged invite summaries plus recoverable warnings", () => {
  const draft = stageUsernameInvite(
    stageInviteLink(
      stageImage(updateDetails(createInitialCreateFamilyDraft(), { name: "Friday Table" }), {
        pictureUrl: "/api/family-images/staged/friday.webp",
        storageKey: "family-images/staged/user-1/friday.webp",
      }),
      { usageType: "single_use" },
    ),
    { username: "missing-user" },
  );

  const sections = buildCreateFamilyReviewSections(draft, ["User not found"], getMessages("en").family.createFamily);

  assert.deepEqual(sections.profile, {
    description: "No description",
    image: "Image staged",
    name: "Friday Table",
  });
  assert.deepEqual(sections.invites, ["Single-use invite link", "Username invite for @missing-user"]);
  assert.deepEqual(sections.warning, {
    message:
      "The family was created, but User not found. Retry those invites from Edit Family or Manage Families.",
    title: "Recoverable warning",
  });
});

test("create family completion contract exposes generated invite URLs once", () => {
  const generated = buildCreateFamilyGeneratedInviteLinks(
    [
      {
        inviteId: "invite-1",
        inviteType: "link",
        inviteUrl: "http://localhost/invite/family/link-token",
        ok: true,
      },
      {
        inviteId: "invite-2",
        inviteType: "direct",
        inviteUrl: "http://localhost/invite/family/direct-token",
        ok: true,
      },
      {
        inviteId: "invite-3",
        inviteType: "direct",
        message: "User not found",
        ok: false,
      },
    ],
    getMessages("en").family.createFamily,
  );

  assert.deepEqual(generated, [
    {
      id: "invite-1",
      inputId: "create-family-review-generated-invite-input-invite-1",
      label: "Invite link",
      url: "http://localhost/invite/family/link-token",
    },
    {
      id: "invite-2",
      inputId: "create-family-review-generated-invite-input-invite-2",
      label: "Username invite",
      url: "http://localhost/invite/family/direct-token",
    },
  ]);
});
