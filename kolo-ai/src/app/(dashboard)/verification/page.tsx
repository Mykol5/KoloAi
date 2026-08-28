"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type Status =
  | "verified"
  | "pending"
  | "not_verified";

type Group = {
  id: string;
  name?: string | null;
  status?: string | null;
};

type Membership = {
  group_id: string;
  role?: string | null;
  groups?: Group | null;
};

type Profile = {
  verification_status?: string | null;
  is_verified?: boolean | null;

  admin_verified?: boolean | null;
  identity_verified?: boolean | null;

  group_verified?: boolean | null;
  organization_verified?: boolean | null;

  account_verified?: boolean | null;
  bank_account_verified?: boolean | null;

  verification_submitted_at?: string | null;
  verified_at?: string | null;

  verification_reference?: string | null;
};


/* =========================================================
   DESIGN TOKENS
========================================================= */

const GREEN = "#087A3E";
const GREEN_DARK = "#056431";
const NAVY = "#0B1C30";
const TEXT = "#526171";
const MUTED = "#89949F";
const BORDER = "#E3EBE6";
const SOFT = "#EFF8F2";


/* =========================================================
   PAGE
========================================================= */

export default function VerificationPage() {
  const supabase = createClient();

  const [loading, setLoading] =
    useState(true);

  const [groups, setGroups] =
    useState<Group[]>([]);

  const [selectedGroupId, setSelectedGroupId] =
    useState("");

  const [verification, setVerification] =
    useState<{
      status: Status;
      adminVerified: boolean;
      groupVerified: boolean;
      accountVerified: boolean;
      submittedAt?: string;
      verifiedAt?: string;
      reference?: string;
    } | null>(null);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [error, setError] =
    useState("");


  /* =======================================================
     LOAD VERIFICATION
  ======================================================= */

  const loadVerification =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }


        /* =================================================
           LOAD GROUP MEMBERSHIP + PROFILE
        ================================================= */

        const [
          membershipsResponse,
          profileResponse,
        ] =
          await Promise.all([
            supabase
              .from("group_members")
              .select(
                `
                  group_id,
                  role,
                  groups(
                    id,
                    name,
                    status
                  )
                `
              )
              .eq(
                "user_id",
                user.id
              ),

            supabase
              .from("profiles")
              .select(
                `
                  verification_status,
                  is_verified,
                  admin_verified,
                  identity_verified,
                  group_verified,
                  organization_verified,
                  account_verified,
                  bank_account_verified,
                  verification_submitted_at,
                  verified_at,
                  verification_reference
                `
              )
              .eq(
                "id",
                user.id
              )
              .maybeSingle(),
          ]);


        /* =================================================
           MEMBERSHIP ERROR
        ================================================= */

        if (
          membershipsResponse.error
        ) {
          console.error(
            "Membership error:",
            membershipsResponse.error
          );

          setError(
            "We couldn't load your group information."
          );

          setLoading(false);
          return;
        }


        /* =================================================
           BUILD GROUP LIST
        ================================================= */

        const memberships =
          (membershipsResponse.data ||
            []) as unknown as Membership[];


        const loadedGroups =
          memberships
            .map(
              (membership) =>
                membership.groups
            )
            .filter(Boolean) as Group[];


        setGroups(
          loadedGroups
        );


        if (
          loadedGroups.length === 0
        ) {
          setError(
            "You are not currently a member of any savings group."
          );

          setLoading(false);
          return;
        }


        /* =================================================
           DEFAULT GROUP
        ================================================= */

        const firstGroup =
          loadedGroups[0];

        setSelectedGroupId(
          firstGroup.id
        );


        /* =================================================
           ADMIN ROLE
        ================================================= */

        const firstMembership =
          memberships.find(
            (membership) =>
              membership.group_id ===
              firstGroup.id
          );


        const role =
          String(
            firstMembership?.role ||
              ""
          ).toLowerCase();


        setIsAdmin(
          isAuthorizedAdmin(role)
        );


        /* =================================================
           PROFILE
        ================================================= */

        const profile =
          (profileResponse.data ||
            {}) as Profile;


        setVerification(
          normaliseVerification(
            profile
          )
        );

      } catch (err) {
        console.error(
          "Verification loading error:",
          err
        );

        setError(
          "Something went wrong while loading verification."
        );
      } finally {
        setLoading(false);
      }
    }, [supabase]);


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadVerification();
  }, [
    loadVerification,
  ]);


  /* =======================================================
     GROUP CHANGE
  ======================================================= */

  const handleGroupChange =
    async (
      groupId: string
    ) => {
      setSelectedGroupId(
        groupId
      );

      setError("");

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          return;
        }


        const {
          data: membership,
          error:
            membershipError,
        } =
          await supabase
            .from("group_members")
            .select(
              "role"
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "group_id",
              groupId
            )
            .maybeSingle();


        if (
          membershipError
        ) {
          console.error(
            membershipError
          );

          setIsAdmin(false);
          return;
        }


        const role =
          String(
            membership?.role ||
              ""
          ).toLowerCase();


        setIsAdmin(
          isAuthorizedAdmin(role)
        );

      } catch (err) {
        console.error(
          "Group role lookup:",
          err
        );

        setIsAdmin(false);
      }
    };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <Loading />;
  }


  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    !verification ||
    groups.length === 0
  ) {
    return (
      <div className="empty">

        <div className="emptyIcon">
          !
        </div>

        <h2>
          Verification unavailable
        </h2>

        <p>
          {error ||
            "We couldn't find verification information for your account."}
        </p>

        <Link href="/groups">
          Back to Groups
        </Link>

        <style jsx>{styles}</style>

      </div>
    );
  }


  /* =======================================================
     SELECTED GROUP
  ======================================================= */

  const selectedGroup =
    groups.find(
      (group) =>
        group.id ===
        selectedGroupId
    ) ||
    groups[0];


  const groupName =
    selectedGroup.name ||
    "Your savings group";


  /* =======================================================
     STATUS
  ======================================================= */

  const status =
    verification.status;


  const statusTitle =
    status === "verified"
      ? "Verified information"
      : status === "pending"
      ? "Verification is under review"
      : "Not yet verified";


  const statusDescription =
    status === "verified"
      ? `${groupName} has completed the verification checks currently recorded by Kolo.`
      : status === "pending"
      ? `Verification information has been submitted for ${groupName} and is currently being reviewed.`
      : `${groupName} has not completed Kolo verification yet.`;


  const statusLabel =
    status === "verified"
      ? "VERIFIED"
      : status === "pending"
      ? "UNDER REVIEW"
      : "NOT VERIFIED";


  /* =======================================================
     CHECKS
  ======================================================= */

  const checks = [
    {
      title:
        "Administrator identity",

      description:
        "Identity information for the responsible administrator has been submitted.",

      complete:
        verification.adminVerified,
    },

    {
      title:
        "Cooperative information",

      description:
        "The group or cooperative information has been submitted for review.",

      complete:
        verification.groupVerified,
    },

    {
      title:
        "Account information",

      description:
        "The designated account information has been submitted with the required evidence.",

      complete:
        verification.accountVerified,
    },

    {
      title:
        "Kolo review",

      description:
        "The submitted information has completed Kolo's verification review.",

      complete:
        status === "verified",
    },
  ];


  const completed =
    checks.filter(
      (item) =>
        item.complete
    ).length;


  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="header">

        <div>

          <div className="eyebrow">

            <span>
              ✓
            </span>

            KOLO TRUST

          </div>

          <h1>
            Verification
          </h1>

          <p>
            Understand what Kolo has verified
            and what it has not.
          </p>

        </div>


        <Link
          href="/groups"
          className="back"
        >
          ← My Groups
        </Link>

      </header>


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (

        <div className="errorBox">

          <span className="errorIcon">
            !
          </span>

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ===================================================
          GROUP SELECTOR
      =================================================== */}

      {groups.length > 1 && (

        <div className="selector">

          <label>
            COOPERATIVE
          </label>

          <select
            value={
              selectedGroupId
            }
            onChange={(event) =>
              handleGroupChange(
                event.target.value
              )
            }
          >

            {groups.map(
              (group) => (

                <option
                  key={group.id}
                  value={group.id}
                >
                  {group.name ||
                    "Savings group"}
                </option>

              )
            )}

          </select>

        </div>

      )}


      {/* ===================================================
          STATUS CARD
      =================================================== */}

      <section
        className={
          `status ${status}`
        }
      >

        <div className="statusIcon">

          {status ===
          "verified"
            ? "✓"
            : status ===
              "pending"
            ? "…"
            : "!"}

        </div>


        <div className="statusCopy">

          <span>
            KOLO VERIFICATION STATUS
          </span>

          <h2>
            {statusTitle}
          </h2>

          <p>
            {statusDescription}
          </p>

        </div>


        <div className="pill">

          <i />

          {statusLabel}

        </div>

      </section>


      {/* ===================================================
          ADMIN ONLY ACTION
      =================================================== */}

      {isAdmin && (

        <section className="adminAction">

          <div className="adminIcon">

            <span className="material-symbols-outlined">
              admin_panel_settings
            </span>

          </div>


          <div className="adminCopy">

            <span>
              ADMINISTRATOR ACCESS
            </span>

            <h3>

              {status ===
              "not_verified"
                ? "Complete your group's Kolo verification"
                : status ===
                  "pending"
                ? "Verification is currently under review"
                : "Your group is Kolo Verified"}

            </h3>


            <p>

              {status ===
              "not_verified"
                ? "Submit the required administrator, cooperative and account information so Kolo can review the group."
                : status ===
                  "pending"
                ? "Your submitted information is being reviewed. You can review or continue the verification process."
                : "The submitted information has completed Kolo's current verification process."}

            </p>

          </div>


          {status !==
            "verified" && (

            <Link
              href={`/groups/${selectedGroup.id}/verification/submit`}
              className="adminButton"
            >

              {status ===
              "not_verified"
                ? "Start verification"
                : "Continue verification"}

              <span className="material-symbols-outlined">
                arrow_forward
              </span>

            </Link>

          )}

        </section>

      )}


      {/* ===================================================
          MEMBER VIEW ONLY
      =================================================== */}

      {!isAdmin && (

        <div className="memberNotice">

          <div className="memberNoticeIcon">

            <span className="material-symbols-outlined">
              visibility
            </span>

          </div>


          <div>

            <strong>
              View-only verification
            </strong>

            <p>
              Verification is managed by the
              group's authorized administrator.
              You can view the current status,
              but you cannot submit or change
              verification information.
            </p>

          </div>

        </div>

      )}


      {/* ===================================================
          CHECKS
      =================================================== */}

      <div className="grid">

        <section className="panel">

          <div className="panelHead">

            <div>

              <span>
                VERIFICATION CHECKS
              </span>

              <h2>
                What Kolo checks
              </h2>

            </div>

            <small>
              {completed}/
              {checks.length}
              {" "}
              complete
            </small>

          </div>


          <div className="checks">

            {checks.map(
              (check) => (

                <div
                  className="check"
                  key={check.title}
                >

                  <div
                    className={
                      check.complete
                        ? "checkIcon done"
                        : "checkIcon"
                    }
                  >

                    {check.complete
                      ? "✓"
                      : "—"}

                  </div>


                  <div>

                    <b>
                      {check.title}
                    </b>

                    <p>
                      {check.description}
                    </p>

                  </div>


                  <span
                    className={
                      check.complete
                        ? "confirmed"
                        : "unconfirmed"
                    }
                  >

                    {check.complete
                      ? "Confirmed"
                      : "Not confirmed"}

                  </span>

                </div>

              )
            )}

          </div>

        </section>


        {/* =================================================
            MEANING
        ================================================= */}

        <section className="panel">

          <div className="panelHead">

            <div>

              <span>
                WHAT IT MEANS
              </span>

              <h2>
                Trust, not a guarantee
              </h2>

            </div>

          </div>


          <div className="meaning">

            <div className="meaningIcon">
              ✓
            </div>

            <p>
              Kolo verification means the
              submitted information has passed
              the specific checks shown on this
              page.
            </p>

            <hr />

            <p>
              It does{" "}
              <strong>
                not
              </strong>{" "}
              guarantee that a cooperative
              cannot commit fraud, that members
              will always contribute, or that
              financial loss is impossible.
            </p>

          </div>

        </section>

      </div>


      {/* ===================================================
          RECORD
      =================================================== */}

      <section className="panel record">

        <div className="panelHead">

          <div>

            <span>
              VERIFICATION RECORD
            </span>

            <h2>
              Review details
            </h2>

          </div>


          {verification.reference && (

            <code>
              {verification.reference}
            </code>

          )}

        </div>


        <div className="recordGrid">

          <Record
            label="Cooperative"
            value={groupName}
          />

          <Record
            label="Submitted"
            value={
              formatDate(
                verification.submittedAt
              )
            }
          />

          <Record
            label="Verified"
            value={
              formatDate(
                verification.verifiedAt
              )
            }
          />

          <Record
            label="Status"
            value={
              status === "verified"
                ? "Verification complete"
                : status === "pending"
                ? "Review in progress"
                : "Verification not completed"
            }
          />

        </div>

      </section>


      {/* ===================================================
          HELP
      =================================================== */}

      <section className="help">

        <div className="helpIcon">
          ?
        </div>

        <div>

          <b>
            Something doesn't look right?
          </b>

          <p>
            If verification information appears
            incorrect, contact the group's
            authorized administrator.
          </p>

        </div>

      </section>


      {/* ===================================================
          FOOTNOTE
      =================================================== */}

      <div className="footnote">

        <span>
          ✓
        </span>

        Kolo only displays verification claims
        supported by information available in
        the account. Verification status may
        change after review.

      </div>


      <style jsx>{styles}</style>

    </div>
  );
}


/* =========================================================
   ADMIN ROLE HELPER
========================================================= */

function isAuthorizedAdmin(
  role: string
) {
  return [
    "admin",
    "administrator",
    "owner",
    "treasurer",
  ].includes(
    role.toLowerCase()
  );
}


/* =========================================================
   NORMALISE VERIFICATION
========================================================= */

function normaliseVerification(
  profile: Profile
) {
  const raw =
    String(
      profile.verification_status ||
        ""
    ).toLowerCase();


  let status: Status =
    "not_verified";


  if (
    profile.is_verified === true ||
    [
      "verified",
      "approved",
      "complete",
      "completed",
    ].includes(raw)
  ) {
    status = "verified";

  } else if (
    [
      "pending",
      "under_review",
      "under review",
      "submitted",
      "review",
    ].includes(raw)
  ) {
    status = "pending";
  }


  return {
    status,

    adminVerified:
      Boolean(
        profile.admin_verified ||
          profile.identity_verified
      ),

    groupVerified:
      Boolean(
        profile.group_verified ||
          profile.organization_verified
      ),

    accountVerified:
      Boolean(
        profile.account_verified ||
          profile.bank_account_verified
      ),

    submittedAt:
      profile.verification_submitted_at ||
      undefined,

    verifiedAt:
      profile.verified_at ||
      undefined,

    reference:
      profile.verification_reference ||
      undefined,
  };
}


/* =========================================================
   RECORD COMPONENT
========================================================= */

function Record({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="recordItem">

      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =========================================================
   DATE
========================================================= */

function formatDate(
  value?: string
) {
  if (!value) {
    return "Not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not recorded";
  }

  return date.toLocaleDateString(
    "en-NG",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


/* =========================================================
   LOADING
========================================================= */

function Loading() {
  return (
    <div className="loading">

      <div className="loadingMark">
        ✓
      </div>

      <strong>
        Preparing verification...
      </strong>

      <span>
        Checking your Kolo trust status.
      </span>

      <style jsx>{styles}</style>

    </div>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles = `

.page {
  color: ${NAVY};

  font-family:
    Inter,
    Geist,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  padding-bottom: 42px;
}


/* =========================================================
   HEADER
========================================================= */

.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 24px;

  margin-bottom: 28px;
}

.eyebrow {
  display: flex;
  align-items: center;

  gap: 10px;

  color: ${GREEN};

  font-size: 12px;
  font-weight: 850;

  letter-spacing: .12em;
}

.eyebrow span {
  width: 22px;
  height: 22px;

  display: grid;
  place-items: center;

  border-radius: 7px;

  color: white;

  background:
    ${GREEN};

  font-size: 12px;
}

h1 {
  margin:
    12px 0 8px;

  color:
    ${NAVY};

  font-size: 38px;

  line-height: 1;

  letter-spacing:
    -.045em;

  font-weight: 800;
}

.header p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 15px;
}

.back {
  padding:
    12px 16px;

  border:
    1.5px solid
    ${BORDER};

  border-radius: 12px;

  color:
    ${TEXT};

  background:
    white;

  text-decoration:
    none;

  font-size: 13px;

  font-weight: 750;

  transition: all 0.2s;
}

.back:hover {
  border-color: ${GREEN};
  color: ${GREEN};
}


/* =========================================================
   ERROR
========================================================= */

.errorBox {
  display: flex;
  align-items: center;

  gap: 10px;

  margin-bottom: 16px;

  padding:
    14px 16px;

  border:
    1px solid
    #eadfbd;

  border-radius: 12px;

  background:
    #fff9eb;

  color:
    #855d10;

  font-size: 13px;
}

.errorIcon {
  width: 24px;
  height: 24px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  background:
    #f0e1b7;

  font-weight: 850;
}


/* =========================================================
   SELECTOR
========================================================= */

.selector {
  display: flex;
  align-items: center;

  gap: 12px;

  padding:
    12px 16px;

  margin-bottom: 16px;

  border:
    1.5px solid
    ${BORDER};

  border-radius: 12px;

  background:
    white;
}

.selector label {
  color:
    ${MUTED};

  font-size: 10px;

  font-weight: 850;

  letter-spacing:
    .1em;
}

.selector select {
  border: 0;

  outline: 0;

  color:
    ${NAVY};

  background:
    transparent;

  font-family:
    inherit;

  font-size: 14px;

  font-weight: 750;
}


/* =========================================================
   STATUS
========================================================= */

.status {
  display: flex;
  align-items: center;

  gap: 16px;

  padding: 24px;

  margin-bottom: 16px;

  border:
    1px solid
    ${BORDER};

  border-radius: 16px;

  background:
    white;
}

.status.verified {
  border-color:
    #CDE6D5;

  background:
    ${SOFT};
}

.status.pending {
  border-color:
    #E8DDBD;

  background:
    #FFF9EB;
}

.statusIcon {
  width: 52px;
  height: 52px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 14px;

  color:
    white;

  background:
    ${GREEN};

  font-size: 22px;

  font-weight: 850;
}

.pending .statusIcon {
  background:
    #A66A00;
}

.not_verified .statusIcon {
  background:
    #64707A;
}

.statusCopy {
  flex: 1;
}

.statusCopy > span,
.panelHead span {
  color:
    ${GREEN};

  font-size: 10px;

  font-weight: 850;

  letter-spacing:
    .11em;
}

.statusCopy h2 {
  margin:
    8px 0 8px;

  color:
    ${NAVY};

  font-size: 22px;

  letter-spacing:
    -.025em;
}

.statusCopy p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 14px;

  line-height:
    1.6;
}

.pill {
  display: inline-flex;
  align-items: center;

  gap: 8px;

  padding:
    10px 14px;

  border-radius:
    99px;

  background:
    rgba(
      255,
      255,
      255,
      .72
    );

  color:
    ${GREEN};

  font-size: 11px;

  font-weight: 850;

  letter-spacing:
    .07em;
}

.pill i {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background:
    currentColor;
}

.pending .pill {
  color:
    #A66A00;
}

.not_verified .pill {
  color:
    #64707A;
}


/* =========================================================
   ADMIN ACTION
========================================================= */

.adminAction {
  display: flex;
  align-items: center;

  gap: 16px;

  padding:
    20px 22px;

  margin-bottom: 16px;

  border:
    1px solid
    #CFE5D7;

  border-radius: 14px;

  background:
    linear-gradient(
      135deg,
      #F1FAF4,
      #F8FCF9
    );
}

.adminIcon {
  width: 48px;
  height: 48px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 14px;

  color:
    white;

  background:
    ${GREEN};
}

.adminIcon
.material-symbols-outlined {
  font-size: 24px;
}

.adminCopy {
  flex: 1;
}

.adminCopy > span {
  color:
    ${GREEN};

  font-size: 10px;

  font-weight: 850;

  letter-spacing:
    .1em;
}

.adminCopy h3 {
  margin:
    8px 0 6px;

  color:
    ${NAVY};

  font-size: 16px;
}

.adminCopy p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 13px;

  line-height:
    1.6;
}

.adminButton {
  display: inline-flex;
  align-items: center;

  gap: 8px;

  min-height: 44px;

  padding:
    0 18px;

  border-radius: 12px;

  color:
    white;

  background:
    ${GREEN};

  text-decoration:
    none;

  font-size: 13px;

  font-weight: 800;

  white-space:
    nowrap;

  transition:
    .18s ease;
}

.adminButton:hover {
  background:
    ${GREEN_DARK};

  transform:
    translateY(-2px);

  box-shadow: 0 8px 20px rgba(8, 122, 62, 0.2);
}

.adminButton
.material-symbols-outlined {
  font-size: 20px;
}


/* =========================================================
   MEMBER NOTICE
========================================================= */

.memberNotice {
  display: flex;
  align-items: center;

  gap: 14px;

  padding:
    16px 18px;

  margin-bottom: 16px;

  border:
    1.5px solid
    ${BORDER};

  border-radius: 14px;

  background:
    #F8FAF9;
}

.memberNoticeIcon {
  width: 40px;
  height: 40px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 12px;

  color:
    ${GREEN};

  background:
    #EEF2F0;
}

.memberNoticeIcon
.material-symbols-outlined {
  font-size: 20px;
}

.memberNotice strong {
  display: block;

  margin-bottom: 6px;

  color:
    ${NAVY};

  font-size: 14px;
}

.memberNotice p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 13px;

  line-height:
    1.6;
}


/* =========================================================
   GRID
========================================================= */

.grid {
  display: grid;

  grid-template-columns:
    1.15fr
    .85fr;

  gap: 16px;

  margin-bottom: 16px;
}


/* =========================================================
   PANEL
========================================================= */

.panel {
  overflow: hidden;

  border:
    1px solid
    ${BORDER};

  border-radius: 16px;

  background:
    white;
}

.panelHead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 16px;

  padding:
    20px 22px;

  border-bottom:
    1px solid
    ${BORDER};
}

.panelHead h2 {
  margin:
    8px 0 0;

  color:
    ${NAVY};

  font-size: 20px;

  letter-spacing:
    -.025em;
}

.panelHead > small {
  color:
    ${TEXT};

  font-size: 12px;
}


/* =========================================================
   CHECKS
========================================================= */

.checks {
  padding:
    0 22px;
}

.check {
  display: grid;

  grid-template-columns:
    36px
    1fr
    auto;

  align-items: center;

  gap: 14px;

  padding:
    18px 0;

  border-bottom:
    1px solid
    #EEF2EF;
}

.check:last-child {
  border-bottom:
    0;
}

.checkIcon {
  width: 36px;
  height: 36px;

  display: grid;
  place-items: center;

  border-radius: 10px;

  color:
    ${MUTED};

  background:
    #F1F3F2;

  font-size: 14px;

  font-weight: 850;
}

.checkIcon.done {
  color:
    ${GREEN};

  background:
    ${SOFT};
}

.check b {
  display: block;

  margin-bottom: 6px;

  color:
    ${NAVY};

  font-size: 14px;
}

.check p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 13px;

  line-height:
    1.6;
}

.confirmed,
.unconfirmed {
  font-size: 11px;

  font-weight: 800;

  white-space:
    nowrap;
}

.confirmed {
  color:
    ${GREEN};
}

.unconfirmed {
  color:
    ${MUTED};
}


/* =========================================================
   MEANING
========================================================= */

.meaning {
  padding: 24px;
}

.meaningIcon {
  width: 40px;
  height: 40px;

  display: grid;
  place-items: center;

  margin-bottom: 16px;

  border-radius: 12px;

  color:
    ${GREEN};

  background:
    ${SOFT};

  font-weight: 850;
  font-size: 18px;
}

.meaning p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 14px;

  line-height:
    1.7;
}

.meaning strong {
  color:
    ${NAVY};
}

.meaning hr {
  border: 0;

  border-top:
    1px solid
    ${BORDER};

  margin:
    20px 0;
}


/* =========================================================
   RECORD
========================================================= */

.record {
  margin-bottom: 16px;
}

.record code {
  color:
    ${MUTED};

  font-size: 12px;
}

.recordGrid {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      1fr
    );
}

.recordItem {
  min-height: 90px;

  padding:
    20px 22px;

  border-right:
    1px solid
    ${BORDER};
}

.recordItem:last-child {
  border-right:
    0;
}

.recordItem small {
  display: block;

  margin-bottom: 8px;

  color:
    ${MUTED};

  font-size: 10px;
}

.recordItem strong {
  color:
    ${NAVY};

  font-size: 13px;

  line-height:
    1.5;
}


/* =========================================================
   HELP
========================================================= */

.help {
  display: flex;
  align-items: center;

  gap: 14px;

  padding:
    18px 20px;

  border:
    1.5px solid
    ${BORDER};

  border-radius: 14px;

  background:
    #FBFCFB;
}

.helpIcon {
  width: 36px;
  height: 36px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 10px;

  color:
    ${TEXT};

  background:
    #EEF2F0;

  font-size: 14px;

  font-weight: 850;
}

.help b {
  display: block;

  margin-bottom: 6px;

  color:
    ${NAVY};

  font-size: 14px;
}

.help p {
  margin: 0;

  color:
    ${TEXT};

  font-size: 13px;

  line-height:
    1.6;
}


/* =========================================================
   FOOTNOTE
========================================================= */

.footnote {
  display: flex;

  gap: 10px;

  padding:
    14px 16px;

  color:
    ${MUTED};

  font-size: 12px;

  line-height:
    1.6;
}

.footnote span {
  color:
    ${GREEN};

  font-weight: 800;
}


/* =========================================================
   LOADING
========================================================= */

.loading {
  min-height: 55vh;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  color:
    ${MUTED};

  font-family:
    Inter,
    Geist,
    system-ui,
    sans-serif;
}

.loadingMark {
  width: 52px;
  height: 52px;

  display: grid;
  place-items: center;

  margin-bottom: 16px;

  border-radius: 14px;

  color:
    white;

  background:
    ${GREEN};

  font-weight: 850;
  font-size: 20px;

  box-shadow:
    0 12px 28px
    rgba(
      8,
      122,
      62,
      .15
    );
}

.loading strong {
  color:
    ${NAVY};

  font-size: 16px;
}

.loading span {
  margin-top: 8px;

  font-size: 13px;
}


/* =========================================================
   EMPTY
========================================================= */

.empty {
  min-height: 55vh;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  text-align: center;

  color:
    ${MUTED};

  font-family:
    Inter,
    Geist,
    system-ui,
    sans-serif;
}

.emptyIcon {
  width: 56px;
  height: 56px;

  display: grid;
  place-items: center;

  margin-bottom: 16px;

  border-radius: 16px;

  color:
    ${MUTED};

  background:
    #F1F3F2;

  font-weight: 850;
  font-size: 20px;
}

.empty h2 {
  margin:
    0 0 10px;

  color:
    ${NAVY};

  font-size: 24px;
}

.empty p {
  max-width: 440px;

  margin:
    0 0 20px;

  color:
    ${MUTED};

  font-size: 14px;

  line-height:
    1.6;
}

.empty a {
  color:
    ${GREEN};

  font-size: 13px;

  font-weight: 800;

  text-decoration:
    none;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 800px) {

  .grid {
    grid-template-columns:
      1fr;
  }

  .recordGrid {
    grid-template-columns:
      1fr 1fr;
  }

  .recordItem:nth-child(2) {
    border-right:
      0;
  }

  .recordItem:nth-child(-n+2) {
    border-bottom:
      1px solid
      ${BORDER};
  }

}


@media (max-width: 560px) {

  .header {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .status {
    align-items:
      flex-start;

    flex-wrap:
      wrap;
  }

  .pill {
    margin-left:
      68px;
  }

  .adminAction {
    align-items:
      flex-start;

    flex-wrap:
      wrap;
  }

  .adminCopy {
    min-width:
      calc(
        100% - 64px
      );
  }

  .adminButton {
    margin-left:
      64px;
  }

  .check {
    grid-template-columns:
      36px 1fr;
  }

  .check > span {
    grid-column:
      2;
  }

  .recordGrid {
    grid-template-columns:
      1fr;
  }

  .recordItem {
    border-right:
      0;

    border-bottom:
      1px solid
      ${BORDER};
  }

  .recordItem:last-child {
    border-bottom:
      0;
  }

}

`;



// "use client";

// import { useCallback, useEffect, useState } from "react";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";

// /* =========================================================
//    TYPES
// ========================================================= */

// type Status =
//   | "verified"
//   | "pending"
//   | "not_verified";

// type Group = {
//   id: string;
//   name?: string | null;
//   status?: string | null;
// };

// type Membership = {
//   group_id: string;
//   role?: string | null;
//   groups?: Group | null;
// };

// type Profile = {
//   verification_status?: string | null;
//   is_verified?: boolean | null;

//   admin_verified?: boolean | null;
//   identity_verified?: boolean | null;

//   group_verified?: boolean | null;
//   organization_verified?: boolean | null;

//   account_verified?: boolean | null;
//   bank_account_verified?: boolean | null;

//   verification_submitted_at?: string | null;
//   verified_at?: string | null;

//   verification_reference?: string | null;
// };


// /* =========================================================
//    DESIGN TOKENS
// ========================================================= */

// const GREEN = "#087A3E";
// const GREEN_DARK = "#056431";
// const NAVY = "#0B1C30";
// const TEXT = "#526171";
// const MUTED = "#89949F";
// const BORDER = "#E3EBE6";
// const SOFT = "#EFF8F2";


// /* =========================================================
//    PAGE
// ========================================================= */

// export default function VerificationPage() {
//   const supabase = createClient();

//   const [loading, setLoading] =
//     useState(true);

//   const [groups, setGroups] =
//     useState<Group[]>([]);

//   const [selectedGroupId, setSelectedGroupId] =
//     useState("");

//   const [verification, setVerification] =
//     useState<{
//       status: Status;
//       adminVerified: boolean;
//       groupVerified: boolean;
//       accountVerified: boolean;
//       submittedAt?: string;
//       verifiedAt?: string;
//       reference?: string;
//     } | null>(null);

//   const [isAdmin, setIsAdmin] =
//     useState(false);

//   const [error, setError] =
//     useState("");


//   /* =======================================================
//      LOAD VERIFICATION
//   ======================================================= */

//   const loadVerification =
//     useCallback(async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const {
//           data: {
//             user,
//           },
//         } =
//           await supabase.auth.getUser();

//         if (!user) {
//           setLoading(false);
//           return;
//         }


//         /* =================================================
//            LOAD GROUP MEMBERSHIP + PROFILE
//         ================================================= */

//         const [
//           membershipsResponse,
//           profileResponse,
//         ] =
//           await Promise.all([
//             supabase
//               .from("group_members")
//               .select(
//                 `
//                   group_id,
//                   role,
//                   groups(
//                     id,
//                     name,
//                     status
//                   )
//                 `
//               )
//               .eq(
//                 "user_id",
//                 user.id
//               ),

//             supabase
//               .from("profiles")
//               .select(
//                 `
//                   verification_status,
//                   is_verified,
//                   admin_verified,
//                   identity_verified,
//                   group_verified,
//                   organization_verified,
//                   account_verified,
//                   bank_account_verified,
//                   verification_submitted_at,
//                   verified_at,
//                   verification_reference
//                 `
//               )
//               .eq(
//                 "id",
//                 user.id
//               )
//               .maybeSingle(),
//           ]);


//         /* =================================================
//            MEMBERSHIP ERROR
//         ================================================= */

//         if (
//           membershipsResponse.error
//         ) {
//           console.error(
//             "Membership error:",
//             membershipsResponse.error
//           );

//           setError(
//             "We couldn't load your group information."
//           );

//           setLoading(false);
//           return;
//         }


//         /* =================================================
//            BUILD GROUP LIST
//         ================================================= */

//         const memberships =
//           (membershipsResponse.data ||
//             []) as unknown as Membership[];


//         const loadedGroups =
//           memberships
//             .map(
//               (membership) =>
//                 membership.groups
//             )
//             .filter(Boolean) as Group[];


//         setGroups(
//           loadedGroups
//         );


//         if (
//           loadedGroups.length === 0
//         ) {
//           setError(
//             "You are not currently a member of any savings group."
//           );

//           setLoading(false);
//           return;
//         }


//         /* =================================================
//            DEFAULT GROUP
//         ================================================= */

//         const firstGroup =
//           loadedGroups[0];

//         setSelectedGroupId(
//           firstGroup.id
//         );


//         /* =================================================
//            ADMIN ROLE
//         ================================================= */

//         const firstMembership =
//           memberships.find(
//             (membership) =>
//               membership.group_id ===
//               firstGroup.id
//           );


//         const role =
//           String(
//             firstMembership?.role ||
//               ""
//           ).toLowerCase();


//         setIsAdmin(
//           isAuthorizedAdmin(role)
//         );


//         /* =================================================
//            PROFILE
//         ================================================= */

//         const profile =
//           (profileResponse.data ||
//             {}) as Profile;


//         setVerification(
//           normaliseVerification(
//             profile
//           )
//         );

//       } catch (err) {
//         console.error(
//           "Verification loading error:",
//           err
//         );

//         setError(
//           "Something went wrong while loading verification."
//         );
//       } finally {
//         setLoading(false);
//       }
//     }, [supabase]);


//   /* =======================================================
//      INITIAL LOAD
//   ======================================================= */

//   useEffect(() => {
//     loadVerification();
//   }, [
//     loadVerification,
//   ]);


//   /* =======================================================
//      GROUP CHANGE
//   ======================================================= */

//   const handleGroupChange =
//     async (
//       groupId: string
//     ) => {
//       setSelectedGroupId(
//         groupId
//       );

//       setError("");

//       try {
//         const {
//           data: {
//             user,
//           },
//         } =
//           await supabase.auth.getUser();

//         if (!user) {
//           return;
//         }


//         const {
//           data: membership,
//           error:
//             membershipError,
//         } =
//           await supabase
//             .from("group_members")
//             .select(
//               "role"
//             )
//             .eq(
//               "user_id",
//               user.id
//             )
//             .eq(
//               "group_id",
//               groupId
//             )
//             .maybeSingle();


//         if (
//           membershipError
//         ) {
//           console.error(
//             membershipError
//           );

//           setIsAdmin(false);
//           return;
//         }


//         const role =
//           String(
//             membership?.role ||
//               ""
//           ).toLowerCase();


//         setIsAdmin(
//           isAuthorizedAdmin(role)
//         );

//       } catch (err) {
//         console.error(
//           "Group role lookup:",
//           err
//         );

//         setIsAdmin(false);
//       }
//     };


//   /* =======================================================
//      LOADING
//   ======================================================= */

//   if (loading) {
//     return <Loading />;
//   }


//   /* =======================================================
//      EMPTY
//   ======================================================= */

//   if (
//     !verification ||
//     groups.length === 0
//   ) {
//     return (
//       <div className="empty">

//         <div className="emptyIcon">
//           !
//         </div>

//         <h2>
//           Verification unavailable
//         </h2>

//         <p>
//           {error ||
//             "We couldn't find verification information for your account."}
//         </p>

//         <Link href="/groups">
//           Back to Groups
//         </Link>

//         <style jsx>{styles}</style>

//       </div>
//     );
//   }


//   /* =======================================================
//      SELECTED GROUP
//   ======================================================= */

//   const selectedGroup =
//     groups.find(
//       (group) =>
//         group.id ===
//         selectedGroupId
//     ) ||
//     groups[0];


//   const groupName =
//     selectedGroup.name ||
//     "Your savings group";


//   /* =======================================================
//      STATUS
//   ======================================================= */

//   const status =
//     verification.status;


//   const statusTitle =
//     status === "verified"
//       ? "Verified information"
//       : status === "pending"
//       ? "Verification is under review"
//       : "Not yet verified";


//   const statusDescription =
//     status === "verified"
//       ? `${groupName} has completed the verification checks currently recorded by Kolo.`
//       : status === "pending"
//       ? `Verification information has been submitted for ${groupName} and is currently being reviewed.`
//       : `${groupName} has not completed Kolo verification yet.`;


//   const statusLabel =
//     status === "verified"
//       ? "VERIFIED"
//       : status === "pending"
//       ? "UNDER REVIEW"
//       : "NOT VERIFIED";


//   /* =======================================================
//      CHECKS
     
//      IMPORTANT:
//      This is NOT useMemo.
//      It is deliberately calculated normally because
//      this page has conditional returns above.
//   ======================================================= */

//   const checks = [
//     {
//       title:
//         "Administrator identity",

//       description:
//         "Identity information for the responsible administrator has been submitted.",

//       complete:
//         verification.adminVerified,
//     },

//     {
//       title:
//         "Cooperative information",

//       description:
//         "The group or cooperative information has been submitted for review.",

//       complete:
//         verification.groupVerified,
//     },

//     {
//       title:
//         "Account information",

//       description:
//         "The designated account information has been submitted with the required evidence.",

//       complete:
//         verification.accountVerified,
//     },

//     {
//       title:
//         "Kolo review",

//       description:
//         "The submitted information has completed Kolo's verification review.",

//       complete:
//         status === "verified",
//     },
//   ];


//   const completed =
//     checks.filter(
//       (item) =>
//         item.complete
//     ).length;


//   /* =======================================================
//      RETURN
//   ======================================================= */

//   return (
//     <div className="page">

//       {/* ===================================================
//           HEADER
//       =================================================== */}

//       <header className="header">

//         <div>

//           <div className="eyebrow">

//             <span>
//               ✓
//             </span>

//             KOLO TRUST

//           </div>

//           <h1>
//             Verification
//           </h1>

//           <p>
//             Understand what Kolo has verified
//             and what it has not.
//           </p>

//         </div>


//         <Link
//           href="/groups"
//           className="back"
//         >
//           ← My Groups
//         </Link>

//       </header>


//       {/* ===================================================
//           ERROR
//       =================================================== */}

//       {error && (

//         <div className="errorBox">

//           <span className="errorIcon">
//             !
//           </span>

//           <span>
//             {error}
//           </span>

//         </div>

//       )}


//       {/* ===================================================
//           GROUP SELECTOR
//       =================================================== */}

//       {groups.length > 1 && (

//         <div className="selector">

//           <label>
//             COOPERATIVE
//           </label>

//           <select
//             value={
//               selectedGroupId
//             }
//             onChange={(event) =>
//               handleGroupChange(
//                 event.target.value
//               )
//             }
//           >

//             {groups.map(
//               (group) => (

//                 <option
//                   key={group.id}
//                   value={group.id}
//                 >
//                   {group.name ||
//                     "Savings group"}
//                 </option>

//               )
//             )}

//           </select>

//         </div>

//       )}


//       {/* ===================================================
//           STATUS CARD
//       =================================================== */}

//       <section
//         className={
//           `status ${status}`
//         }
//       >

//         <div className="statusIcon">

//           {status ===
//           "verified"
//             ? "✓"
//             : status ===
//               "pending"
//             ? "…"
//             : "!"}

//         </div>


//         <div className="statusCopy">

//           <span>
//             KOLO VERIFICATION STATUS
//           </span>

//           <h2>
//             {statusTitle}
//           </h2>

//           <p>
//             {statusDescription}
//           </p>

//         </div>


//         <div className="pill">

//           <i />

//           {statusLabel}

//         </div>

//       </section>


//       {/* ===================================================
//           ADMIN ONLY ACTION
//       =================================================== */}

//       {isAdmin && (

//         <section className="adminAction">

//           <div className="adminIcon">

//             <span className="material-symbols-outlined">
//               admin_panel_settings
//             </span>

//           </div>


//           <div className="adminCopy">

//             <span>
//               ADMINISTRATOR ACCESS
//             </span>

//             <h3>

//               {status ===
//               "not_verified"
//                 ? "Complete your group's Kolo verification"
//                 : status ===
//                   "pending"
//                 ? "Verification is currently under review"
//                 : "Your group is Kolo Verified"}

//             </h3>


//             <p>

//               {status ===
//               "not_verified"
//                 ? "Submit the required administrator, cooperative and account information so Kolo can review the group."
//                 : status ===
//                   "pending"
//                 ? "Your submitted information is being reviewed. You can review or continue the verification process."
//                 : "The submitted information has completed Kolo's current verification process."}

//             </p>

//           </div>


//           {status !==
//             "verified" && (

//             <Link
//               href={`/groups/${selectedGroup.id}/verification/submit`}
//               className="adminButton"
//             >

//               {status ===
//               "not_verified"
//                 ? "Start verification"
//                 : "Continue verification"}

//               <span className="material-symbols-outlined">
//                 arrow_forward
//               </span>

//             </Link>

//           )}

//         </section>

//       )}


//       {/* ===================================================
//           MEMBER VIEW ONLY
//       =================================================== */}

//       {!isAdmin && (

//         <div className="memberNotice">

//           <div className="memberNoticeIcon">

//             <span className="material-symbols-outlined">
//               visibility
//             </span>

//           </div>


//           <div>

//             <strong>
//               View-only verification
//             </strong>

//             <p>
//               Verification is managed by the
//               group's authorized administrator.
//               You can view the current status,
//               but you cannot submit or change
//               verification information.
//             </p>

//           </div>

//         </div>

//       )}


//       {/* ===================================================
//           CHECKS
//       =================================================== */}

//       <div className="grid">

//         <section className="panel">

//           <div className="panelHead">

//             <div>

//               <span>
//                 VERIFICATION CHECKS
//               </span>

//               <h2>
//                 What Kolo checks
//               </h2>

//             </div>

//             <small>
//               {completed}/
//               {checks.length}
//               {" "}
//               complete
//             </small>

//           </div>


//           <div className="checks">

//             {checks.map(
//               (check) => (

//                 <div
//                   className="check"
//                   key={check.title}
//                 >

//                   <div
//                     className={
//                       check.complete
//                         ? "checkIcon done"
//                         : "checkIcon"
//                     }
//                   >

//                     {check.complete
//                       ? "✓"
//                       : "—"}

//                   </div>


//                   <div>

//                     <b>
//                       {check.title}
//                     </b>

//                     <p>
//                       {check.description}
//                     </p>

//                   </div>


//                   <span
//                     className={
//                       check.complete
//                         ? "confirmed"
//                         : "unconfirmed"
//                     }
//                   >

//                     {check.complete
//                       ? "Confirmed"
//                       : "Not confirmed"}

//                   </span>

//                 </div>

//               )
//             )}

//           </div>

//         </section>


//         {/* =================================================
//             MEANING
//         ================================================= */}

//         <section className="panel">

//           <div className="panelHead">

//             <div>

//               <span>
//                 WHAT IT MEANS
//               </span>

//               <h2>
//                 Trust, not a guarantee
//               </h2>

//             </div>

//           </div>


//           <div className="meaning">

//             <div className="meaningIcon">
//               ✓
//             </div>

//             <p>
//               Kolo verification means the
//               submitted information has passed
//               the specific checks shown on this
//               page.
//             </p>

//             <hr />

//             <p>
//               It does{" "}
//               <strong>
//                 not
//               </strong>{" "}
//               guarantee that a cooperative
//               cannot commit fraud, that members
//               will always contribute, or that
//               financial loss is impossible.
//             </p>

//           </div>

//         </section>

//       </div>


//       {/* ===================================================
//           RECORD
//       =================================================== */}

//       <section className="panel record">

//         <div className="panelHead">

//           <div>

//             <span>
//               VERIFICATION RECORD
//             </span>

//             <h2>
//               Review details
//             </h2>

//           </div>


//           {verification.reference && (

//             <code>
//               {verification.reference}
//             </code>

//           )}

//         </div>


//         <div className="recordGrid">

//           <Record
//             label="Cooperative"
//             value={groupName}
//           />

//           <Record
//             label="Submitted"
//             value={
//               formatDate(
//                 verification.submittedAt
//               )
//             }
//           />

//           <Record
//             label="Verified"
//             value={
//               formatDate(
//                 verification.verifiedAt
//               )
//             }
//           />

//           <Record
//             label="Status"
//             value={
//               status === "verified"
//                 ? "Verification complete"
//                 : status === "pending"
//                 ? "Review in progress"
//                 : "Verification not completed"
//             }
//           />

//         </div>

//       </section>


//       {/* ===================================================
//           HELP
//       =================================================== */}

//       <section className="help">

//         <div className="helpIcon">
//           ?
//         </div>

//         <div>

//           <b>
//             Something doesn't look right?
//           </b>

//           <p>
//             If verification information appears
//             incorrect, contact the group's
//             authorized administrator.
//           </p>

//         </div>

//       </section>


//       {/* ===================================================
//           FOOTNOTE
//       =================================================== */}

//       <div className="footnote">

//         <span>
//           ✓
//         </span>

//         Kolo only displays verification claims
//         supported by information available in
//         the account. Verification status may
//         change after review.

//       </div>


//       <style jsx>{styles}</style>

//     </div>
//   );
// }


// /* =========================================================
//    ADMIN ROLE HELPER
// ========================================================= */

// function isAuthorizedAdmin(
//   role: string
// ) {
//   return [
//     "admin",
//     "administrator",
//     "owner",
//     "treasurer",
//   ].includes(
//     role.toLowerCase()
//   );
// }


// /* =========================================================
//    NORMALISE VERIFICATION
// ========================================================= */

// function normaliseVerification(
//   profile: Profile
// ) {
//   const raw =
//     String(
//       profile.verification_status ||
//         ""
//     ).toLowerCase();


//   let status: Status =
//     "not_verified";


//   if (
//     profile.is_verified === true ||
//     [
//       "verified",
//       "approved",
//       "complete",
//       "completed",
//     ].includes(raw)
//   ) {
//     status = "verified";

//   } else if (
//     [
//       "pending",
//       "under_review",
//       "under review",
//       "submitted",
//       "review",
//     ].includes(raw)
//   ) {
//     status = "pending";
//   }


//   return {
//     status,

//     adminVerified:
//       Boolean(
//         profile.admin_verified ||
//           profile.identity_verified
//       ),

//     groupVerified:
//       Boolean(
//         profile.group_verified ||
//           profile.organization_verified
//       ),

//     accountVerified:
//       Boolean(
//         profile.account_verified ||
//           profile.bank_account_verified
//       ),

//     submittedAt:
//       profile.verification_submitted_at ||
//       undefined,

//     verifiedAt:
//       profile.verified_at ||
//       undefined,

//     reference:
//       profile.verification_reference ||
//       undefined,
//   };
// }


// /* =========================================================
//    RECORD COMPONENT
// ========================================================= */

// function Record({
//   label,
//   value,
// }: {
//   label: string;
//   value: string;
// }) {
//   return (
//     <div className="recordItem">

//       <small>
//         {label}
//       </small>

//       <strong>
//         {value}
//       </strong>

//     </div>
//   );
// }


// /* =========================================================
//    DATE
// ========================================================= */

// function formatDate(
//   value?: string
// ) {
//   if (!value) {
//     return "Not recorded";
//   }

//   const date =
//     new Date(value);

//   if (
//     Number.isNaN(
//       date.getTime()
//     )
//   ) {
//     return "Not recorded";
//   }

//   return date.toLocaleDateString(
//     "en-NG",
//     {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     }
//   );
// }


// /* =========================================================
//    LOADING
// ========================================================= */

// function Loading() {
//   return (
//     <div className="loading">

//       <div className="loadingMark">
//         ✓
//       </div>

//       <strong>
//         Preparing verification...
//       </strong>

//       <span>
//         Checking your Kolo trust status.
//       </span>

//       <style jsx>{styles}</style>

//     </div>
//   );
// }


// /* =========================================================
//    STYLES
// ========================================================= */

// const styles = `

// .page {
//   color: ${NAVY};

//   font-family:
//     Inter,
//     Geist,
//     system-ui,
//     -apple-system,
//     BlinkMacSystemFont,
//     "Segoe UI",
//     sans-serif;

//   padding-bottom: 42px;
// }


// /* =========================================================
//    HEADER
// ========================================================= */

// .header {
//   display: flex;
//   align-items: flex-end;
//   justify-content: space-between;

//   gap: 20px;

//   margin-bottom: 20px;
// }

// .eyebrow {
//   display: flex;
//   align-items: center;

//   gap: 7px;

//   color: ${GREEN};

//   font-size: 8px;
//   font-weight: 850;

//   letter-spacing: .12em;
// }

// .eyebrow span {
//   width: 17px;
//   height: 17px;

//   display: grid;
//   place-items: center;

//   border-radius: 5px;

//   color: white;

//   background:
//     ${GREEN};

//   font-size: 8px;
// }

// h1 {
//   margin:
//     9px 0 6px;

//   color:
//     ${NAVY};

//   font-size: 31px;

//   line-height: 1;

//   letter-spacing:
//     -.045em;

//   font-weight: 800;
// }

// .header p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 10px;
// }

// .back {
//   padding:
//     9px 12px;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 8px;

//   color:
//     ${TEXT};

//   background:
//     white;

//   text-decoration:
//     none;

//   font-size: 8px;

//   font-weight: 750;
// }


// /* =========================================================
//    ERROR
// ========================================================= */

// .errorBox {
//   display: flex;
//   align-items: center;

//   gap: 8px;

//   margin-bottom: 12px;

//   padding:
//     10px 12px;

//   border:
//     1px solid
//     #eadfbd;

//   border-radius: 9px;

//   background:
//     #fff9eb;

//   color:
//     #855d10;

//   font-size: 8px;
// }

// .errorIcon {
//   width: 19px;
//   height: 19px;

//   display: grid;
//   place-items: center;

//   border-radius: 50%;

//   background:
//     #f0e1b7;

//   font-weight: 850;
// }


// /* =========================================================
//    SELECTOR
// ========================================================= */

// .selector {
//   display: flex;
//   align-items: center;

//   gap: 10px;

//   padding:
//     9px 11px;

//   margin-bottom: 12px;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 9px;

//   background:
//     white;
// }

// .selector label {
//   color:
//     ${MUTED};

//   font-size: 6px;

//   font-weight: 850;

//   letter-spacing:
//     .1em;
// }

// .selector select {
//   border: 0;

//   outline: 0;

//   color:
//     ${NAVY};

//   background:
//     transparent;

//   font-family:
//     inherit;

//   font-size: 8px;

//   font-weight: 750;
// }


// /* =========================================================
//    STATUS
// ========================================================= */

// .status {
//   display: flex;
//   align-items: center;

//   gap: 13px;

//   padding: 18px;

//   margin-bottom: 12px;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 14px;

//   background:
//     white;
// }

// .status.verified {
//   border-color:
//     #CDE6D5;

//   background:
//     ${SOFT};
// }

// .status.pending {
//   border-color:
//     #E8DDBD;

//   background:
//     #FFF9EB;
// }

// .statusIcon {
//   width: 42px;
//   height: 42px;

//   display: grid;
//   place-items: center;

//   flex: 0 0 auto;

//   border-radius: 11px;

//   color:
//     white;

//   background:
//     ${GREEN};

//   font-size: 17px;

//   font-weight: 850;
// }

// .pending .statusIcon {
//   background:
//     #A66A00;
// }

// .not_verified .statusIcon {
//   background:
//     #64707A;
// }

// .statusCopy {
//   flex: 1;
// }

// .statusCopy > span,
// .panelHead span {
//   color:
//     ${GREEN};

//   font-size: 6px;

//   font-weight: 850;

//   letter-spacing:
//     .11em;
// }

// .statusCopy h2 {
//   margin:
//     5px 0 4px;

//   color:
//     ${NAVY};

//   font-size: 15px;

//   letter-spacing:
//     -.025em;
// }

// .statusCopy p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 8px;

//   line-height:
//     1.55;
// }

// .pill {
//   display: inline-flex;
//   align-items: center;

//   gap: 6px;

//   padding:
//     7px 9px;

//   border-radius:
//     99px;

//   background:
//     rgba(
//       255,
//       255,
//       255,
//       .72
//     );

//   color:
//     ${GREEN};

//   font-size: 6px;

//   font-weight: 850;

//   letter-spacing:
//     .07em;
// }

// .pill i {
//   width: 5px;
//   height: 5px;

//   border-radius: 50%;

//   background:
//     currentColor;
// }

// .pending .pill {
//   color:
//     #A66A00;
// }

// .not_verified .pill {
//   color:
//     #64707A;
// }


// /* =========================================================
//    ADMIN ACTION
// ========================================================= */

// .adminAction {
//   display: flex;
//   align-items: center;

//   gap: 12px;

//   padding:
//     14px 15px;

//   margin-bottom: 12px;

//   border:
//     1px solid
//     #CFE5D7;

//   border-radius: 12px;

//   background:
//     linear-gradient(
//       135deg,
//       #F1FAF4,
//       #F8FCF9
//     );
// }

// .adminIcon {
//   width: 38px;
//   height: 38px;

//   display: grid;
//   place-items: center;

//   flex: 0 0 auto;

//   border-radius: 10px;

//   color:
//     white;

//   background:
//     ${GREEN};
// }

// .adminIcon
// .material-symbols-outlined {
//   font-size: 18px;
// }

// .adminCopy {
//   flex: 1;
// }

// .adminCopy > span {
//   color:
//     ${GREEN};

//   font-size: 6px;

//   font-weight: 850;

//   letter-spacing:
//     .1em;
// }

// .adminCopy h3 {
//   margin:
//     4px 0 3px;

//   color:
//     ${NAVY};

//   font-size: 10px;
// }

// .adminCopy p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 7px;

//   line-height:
//     1.55;
// }

// .adminButton {
//   display: inline-flex;
//   align-items: center;

//   gap: 6px;

//   min-height: 34px;

//   padding:
//     0 12px;

//   border-radius: 8px;

//   color:
//     white;

//   background:
//     ${GREEN};

//   text-decoration:
//     none;

//   font-size: 7px;

//   font-weight: 800;

//   white-space:
//     nowrap;

//   transition:
//     .18s ease;
// }

// .adminButton:hover {
//   background:
//     ${GREEN_DARK};

//   transform:
//     translateY(-1px);
// }

// .adminButton
// .material-symbols-outlined {
//   font-size: 13px;
// }


// /* =========================================================
//    MEMBER NOTICE
// ========================================================= */

// .memberNotice {
//   display: flex;
//   align-items: center;

//   gap: 10px;

//   padding:
//     12px 14px;

//   margin-bottom: 12px;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 10px;

//   background:
//     #F8FAF9;
// }

// .memberNoticeIcon {
//   width: 30px;
//   height: 30px;

//   display: grid;
//   place-items: center;

//   flex: 0 0 auto;

//   border-radius: 8px;

//   color:
//     ${GREEN};

//   background:
//     #EEF2F0;
// }

// .memberNoticeIcon
// .material-symbols-outlined {
//   font-size: 15px;
// }

// .memberNotice strong {
//   display: block;

//   margin-bottom: 2px;

//   color:
//     ${NAVY};

//   font-size: 8px;
// }

// .memberNotice p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 7px;

//   line-height:
//     1.5;
// }


// /* =========================================================
//    GRID
// ========================================================= */

// .grid {
//   display: grid;

//   grid-template-columns:
//     1.15fr
//     .85fr;

//   gap: 12px;

//   margin-bottom: 12px;
// }


// /* =========================================================
//    PANEL
// ========================================================= */

// .panel {
//   overflow: hidden;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 13px;

//   background:
//     white;
// }

// .panelHead {
//   display: flex;
//   align-items: flex-end;
//   justify-content: space-between;

//   gap: 12px;

//   padding:
//     17px 18px;

//   border-bottom:
//     1px solid
//     ${BORDER};
// }

// .panelHead h2 {
//   margin:
//     5px 0 0;

//   color:
//     ${NAVY};

//   font-size: 15px;

//   letter-spacing:
//     -.025em;
// }

// .panelHead > small {
//   color:
//     ${TEXT};

//   font-size: 7px;
// }


// /* =========================================================
//    CHECKS
// ========================================================= */

// .checks {
//   padding:
//     0 18px;
// }

// .check {
//   display: grid;

//   grid-template-columns:
//     30px
//     1fr
//     auto;

//   align-items: center;

//   gap: 10px;

//   padding:
//     14px 0;

//   border-bottom:
//     1px solid
//     #EEF2EF;
// }

// .check:last-child {
//   border-bottom:
//     0;
// }

// .checkIcon {
//   width: 27px;
//   height: 27px;

//   display: grid;
//   place-items: center;

//   border-radius: 7px;

//   color:
//     ${MUTED};

//   background:
//     #F1F3F2;

//   font-size: 9px;

//   font-weight: 850;
// }

// .checkIcon.done {
//   color:
//     ${GREEN};

//   background:
//     ${SOFT};
// }

// .check b {
//   display: block;

//   margin-bottom: 3px;

//   color:
//     ${NAVY};

//   font-size: 8px;
// }

// .check p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 7px;

//   line-height:
//     1.5;
// }

// .confirmed,
// .unconfirmed {
//   font-size: 6px;

//   font-weight: 800;

//   white-space:
//     nowrap;
// }

// .confirmed {
//   color:
//     ${GREEN};
// }

// .unconfirmed {
//   color:
//     ${MUTED};
// }


// /* =========================================================
//    MEANING
// ========================================================= */

// .meaning {
//   padding: 19px;
// }

// .meaningIcon {
//   width: 31px;
//   height: 31px;

//   display: grid;
//   place-items: center;

//   margin-bottom: 12px;

//   border-radius: 8px;

//   color:
//     ${GREEN};

//   background:
//     ${SOFT};

//   font-weight: 850;
// }

// .meaning p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 8px;

//   line-height:
//     1.7;
// }

// .meaning strong {
//   color:
//     ${NAVY};
// }

// .meaning hr {
//   border: 0;

//   border-top:
//     1px solid
//     ${BORDER};

//   margin:
//     15px 0;
// }


// /* =========================================================
//    RECORD
// ========================================================= */

// .record {
//   margin-bottom: 12px;
// }

// .record code {
//   color:
//     ${MUTED};

//   font-size: 7px;
// }

// .recordGrid {
//   display: grid;

//   grid-template-columns:
//     repeat(
//       4,
//       1fr
//     );
// }

// .recordItem {
//   min-height: 73px;

//   padding:
//     15px 18px;

//   border-right:
//     1px solid
//     ${BORDER};
// }

// .recordItem:last-child {
//   border-right:
//     0;
// }

// .recordItem small {
//   display: block;

//   margin-bottom: 6px;

//   color:
//     ${MUTED};

//   font-size: 6px;
// }

// .recordItem strong {
//   color:
//     ${NAVY};

//   font-size: 8px;

//   line-height:
//     1.45;
// }


// /* =========================================================
//    HELP
// ========================================================= */

// .help {
//   display: flex;
//   align-items: center;

//   gap: 11px;

//   padding:
//     13px 15px;

//   border:
//     1px solid
//     ${BORDER};

//   border-radius: 11px;

//   background:
//     #FBFCFB;
// }

// .helpIcon {
//   width: 27px;
//   height: 27px;

//   display: grid;
//   place-items: center;

//   flex: 0 0 auto;

//   border-radius: 7px;

//   color:
//     ${TEXT};

//   background:
//     #EEF2F0;

//   font-size: 9px;

//   font-weight: 850;
// }

// .help b {
//   display: block;

//   margin-bottom: 3px;

//   color:
//     ${NAVY};

//   font-size: 8px;
// }

// .help p {
//   margin: 0;

//   color:
//     ${TEXT};

//   font-size: 7px;

//   line-height:
//     1.5;
// }


// /* =========================================================
//    FOOTNOTE
// ========================================================= */

// .footnote {
//   display: flex;

//   gap: 7px;

//   padding:
//     10px 12px;

//   color:
//     ${MUTED};

//   font-size: 7px;

//   line-height:
//     1.55;
// }

// .footnote span {
//   color:
//     ${GREEN};

//   font-weight: 800;
// }


// /* =========================================================
//    LOADING
// ========================================================= */

// .loading {
//   min-height: 55vh;

//   display: flex;
//   flex-direction: column;

//   align-items: center;
//   justify-content: center;

//   color:
//     ${MUTED};

//   font-family:
//     Inter,
//     Geist,
//     system-ui,
//     sans-serif;
// }

// .loadingMark {
//   width: 42px;
//   height: 42px;

//   display: grid;
//   place-items: center;

//   margin-bottom: 10px;

//   border-radius: 11px;

//   color:
//     white;

//   background:
//     ${GREEN};

//   font-weight: 850;

//   box-shadow:
//     0 10px 25px
//     rgba(
//       8,
//       122,
//       62,
//       .12
//     );
// }

// .loading strong {
//   color:
//     ${NAVY};

//   font-size: 9px;
// }

// .loading span {
//   margin-top: 4px;

//   font-size: 7px;
// }


// /* =========================================================
//    EMPTY
// ========================================================= */

// .empty {
//   min-height: 55vh;

//   display: flex;
//   flex-direction: column;

//   align-items: center;
//   justify-content: center;

//   text-align: center;

//   color:
//     ${MUTED};

//   font-family:
//     Inter,
//     Geist,
//     system-ui,
//     sans-serif;
// }

// .emptyIcon {
//   width: 45px;
//   height: 45px;

//   display: grid;
//   place-items: center;

//   margin-bottom: 12px;

//   border-radius: 12px;

//   color:
//     ${MUTED};

//   background:
//     #F1F3F2;

//   font-weight: 850;
// }

// .empty h2 {
//   margin:
//     0 0 7px;

//   color:
//     ${NAVY};

//   font-size: 18px;
// }

// .empty p {
//   max-width: 390px;

//   margin:
//     0 0 13px;

//   color:
//     ${MUTED};

//   font-size: 9px;

//   line-height:
//     1.6;
// }

// .empty a {
//   color:
//     ${GREEN};

//   font-size: 8px;

//   font-weight: 800;

//   text-decoration:
//     none;
// }


// /* =========================================================
//    RESPONSIVE
// ========================================================= */

// @media (max-width: 800px) {

//   .grid {
//     grid-template-columns:
//       1fr;
//   }

//   .recordGrid {
//     grid-template-columns:
//       1fr 1fr;
//   }

//   .recordItem:nth-child(2) {
//     border-right:
//       0;
//   }

//   .recordItem:nth-child(-n+2) {
//     border-bottom:
//       1px solid
//       ${BORDER};
//   }

// }


// @media (max-width: 560px) {

//   .header {
//     align-items:
//       flex-start;

//     flex-direction:
//       column;
//   }

//   .status {
//     align-items:
//       flex-start;

//     flex-wrap:
//       wrap;
//   }

//   .pill {
//     margin-left:
//       55px;
//   }

//   .adminAction {
//     align-items:
//       flex-start;

//     flex-wrap:
//       wrap;
//   }

//   .adminCopy {
//     min-width:
//       calc(
//         100% - 55px
//       );
//   }

//   .adminButton {
//     margin-left:
//       50px;
//   }

//   .check {
//     grid-template-columns:
//       30px 1fr;
//   }

//   .check > span {
//     grid-column:
//       2;
//   }

//   .recordGrid {
//     grid-template-columns:
//       1fr;
//   }

//   .recordItem {
//     border-right:
//       0;

//     border-bottom:
//       1px solid
//       ${BORDER};
//   }

//   .recordItem:last-child {
//     border-bottom:
//       0;
//   }

// }

// `;