"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   KOLO DESIGN TOKENS
   ========================================================= */

const NAVY = "#0b1c30";
const GREEN = "#087a3e";
const TEXT = "#526171";
const BORDER = "#e3ebe6";
const MUTED = "#89949f";
const SOFT = "#eff8f2";
const GOLD = "#825100";

/* =========================================================
   TYPES
   ========================================================= */

type Form = {
  cooperative_name: string;
  cooperative_description: string;
  cooperative_location: string;
  member_count: string;
  administrator_name: string;
  administrator_phone: string;
  administrator_email: string;
  administrator_role: string;
  registration_number: string;
  account_name: string;
  bank_name: string;
  account_number: string;
};

const EMPTY: Form = {
  cooperative_name: "",
  cooperative_description: "",
  cooperative_location: "",
  member_count: "",
  administrator_name: "",
  administrator_phone: "",
  administrator_email: "",
  administrator_role: "",
  registration_number: "",
  account_name: "",
  bank_name: "",
  account_number: "",
};

/* =========================================================
   PAGE
   ========================================================= */

export default function VerificationSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);

  const [userId, setUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [existing, setExisting] = useState<any>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD DATA
     ========================================================= */

  useEffect(() => {
    if (id) {
      loadVerification();
    }
  }, [id]);

  async function loadVerification() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      /* -----------------------------------------------------
         Load group
         ----------------------------------------------------- */

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id,name,description,member_count")
        .eq("id", id)
        .single();

      if (groupError || !group) {
        router.push("/groups");
        return;
      }

      setGroupName(group.name || "Savings group");

      /* -----------------------------------------------------
         Check current user's group role
         ----------------------------------------------------- */

      const { data: membership } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      const admin =
        membership?.role === "admin" ||
        membership?.role === "administrator" ||
        membership?.role === "treasurer" ||
        membership?.role === "owner";

      setIsAdmin(Boolean(admin));
      setAccessChecked(true);

      /* -----------------------------------------------------
         Load latest verification submission
         ----------------------------------------------------- */

      const { data: submission } = await supabase
        .from("verification_submissions")
        .select("*")
        .eq("group_id", id)
        .in("status", [
          "draft",
          "submitted",
          "under_review",
          "needs_changes",
          "rejected",
          "verified",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setExisting(submission || null);

      /* -----------------------------------------------------
         Populate form
         ----------------------------------------------------- */

      setForm({
        cooperative_name:
          submission?.cooperative_name || group.name || "",

        cooperative_description:
          submission?.cooperative_description ||
          group.description ||
          "",

        cooperative_location:
          submission?.cooperative_location || "",

        member_count: submission?.member_count
          ? String(submission.member_count)
          : group.member_count
          ? String(group.member_count)
          : "",

        administrator_name:
          submission?.administrator_name || "",

        administrator_phone:
          submission?.administrator_phone || "",

        administrator_email:
          submission?.administrator_email ||
          user.email ||
          "",

        administrator_role:
          submission?.administrator_role || "",

        registration_number:
          submission?.registration_number || "",

        account_name:
          submission?.account_name || "",

        bank_name:
          submission?.bank_name || "",

        account_number:
          submission?.account_number || "",
      });
    } catch (err) {
      console.error("Verification loading error:", err);
      setError("Unable to load verification information.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     FORM
     ========================================================= */

  function updateField(field: keyof Form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  }

  /* =========================================================
     VALIDATION
     ========================================================= */

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (!form.cooperative_name.trim()) {
        return "Enter the cooperative name.";
      }

      if (!form.cooperative_description.trim()) {
        return "Briefly describe the cooperative.";
      }

      if (!form.cooperative_location.trim()) {
        return "Enter the cooperative location.";
      }

      if (
        !form.member_count ||
        Number(form.member_count) < 1
      ) {
        return "Enter the number of members.";
      }
    }

    if (currentStep === 2) {
      if (!form.administrator_name.trim()) {
        return "Enter the administrator's full name.";
      }

      if (!form.administrator_phone.trim()) {
        return "Enter the administrator's phone number.";
      }

      if (!form.administrator_email.trim()) {
        return "Enter the administrator's email.";
      }

      if (!form.administrator_role.trim()) {
        return "Enter the administrator's role.";
      }
    }

    if (currentStep === 3) {
      if (!form.bank_name.trim()) {
        return "Enter the bank name.";
      }

      if (!form.account_name.trim()) {
        return "Enter the account name.";
      }

      if (!/^\d{10}$/.test(form.account_number.trim())) {
        return "Enter a valid 10-digit account number.";
      }
    }

    return "";
  }

  function continueStep() {
    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    setStep((current) => Math.min(current + 1, 4));
  }

  function previousStep() {
    setError("");

    setStep((current) => Math.max(current - 1, 1));
  }

  /* =========================================================
     SUBMIT
     ========================================================= */

  async function submitVerification() {
    if (!isAdmin) {
      setError(
        "Only the cooperative administrator can submit verification."
      );
      return;
    }

    for (const currentStep of [1, 2, 3]) {
      const validationError = validateStep(currentStep);

      if (validationError) {
        setStep(currentStep);
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    setError("");

    const payload = {
      group_id: id,

      submitted_by: userId,

      status: "submitted",

      cooperative_name:
        form.cooperative_name.trim(),

      cooperative_description:
        form.cooperative_description.trim(),

      cooperative_location:
        form.cooperative_location.trim(),

      member_count:
        Number(form.member_count),

      administrator_user_id:
        userId,

      administrator_name:
        form.administrator_name.trim(),

      administrator_phone:
        form.administrator_phone.trim(),

      administrator_email:
        form.administrator_email.trim(),

      administrator_role:
        form.administrator_role.trim(),

      registration_number:
        form.registration_number.trim() || null,

      account_name:
        form.account_name.trim(),

      bank_name:
        form.bank_name.trim(),

      account_number:
        form.account_number.trim(),

      submitted_at:
        new Date().toISOString(),
    };

    let result;

    if (existing?.id) {
      result = await supabase
        .from("verification_submissions")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("verification_submissions")
        .insert(payload)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error(
        "Verification submission error:",
        result.error
      );

      setError(
        result.error.message ||
          "Unable to submit verification."
      );

      return;
    }

    setExisting(result.data);
    setStep(5);
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading || !accessChecked) {
    return (
      <div className="loading">
        <div className="loadingIcon">
          ✓
        </div>

        <p>Loading verification...</p>

        <style jsx>{`
          .loading {
            min-height: 60vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 10px;
            color: ${MUTED};
            font-family: Inter, Geist, system-ui, sans-serif;
          }

          .loadingIcon {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: ${GREEN};
            color: white;
            font-weight: 800;
          }

          .loading p {
            margin: 0;
            font-size: 12px;
          }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     MEMBER ACCESS VIEW
     ========================================================= */

  if (!isAdmin) {
    return (
      <div className="accessPage">
        <div className="accessIcon">
          🔒
        </div>

        <div className="eyebrow">
          KOLO TRUST
        </div>

        <h1>Verification is managed by your administrator</h1>

        <p>
          Only the administrator of{" "}
          <strong>{groupName}</strong> can submit or
          update the cooperative's verification
          information.
        </p>

        <div className="infoCard">
          <div className="infoRow">
            <span>GROUP</span>
            <strong>{groupName}</strong>
          </div>

          <div className="infoRow">
            <span>YOUR ACCESS</span>
            <strong>Member</strong>
          </div>

          <div className="infoRow">
            <span>VERIFICATION</span>
            <strong>
              {existing?.status === "verified"
                ? "Verified"
                : existing?.status === "submitted" ||
                  existing?.status === "under_review"
                ? "Under review"
                : "Not yet verified"}
            </strong>
          </div>
        </div>

        {existing?.status === "verified" ? (
          <div className="verifiedNotice">
            <strong>✓ Kolo Verified</strong>

            <p>
              This cooperative has completed the
              recorded Kolo verification review.
            </p>
          </div>
        ) : (
          <div className="notice">
            <strong>Why does this matter?</strong>

            <p>
              Kolo verification gives members a clearer
              trust signal about the cooperative and the
              person responsible for managing it.
            </p>
          </div>
        )}

        <Link
          href={`/groups/${id}`}
          className="backButton"
        >
          ← Back to group
        </Link>

        <style jsx>{`
          .accessPage {
            max-width: 620px;
            margin: 70px auto;
            padding: 0 20px 40px;
            text-align: center;
            color: ${NAVY};
            font-family: Inter, Geist, system-ui, sans-serif;
          }

          .accessIcon {
            width: 68px;
            height: 68px;
            display: grid;
            place-items: center;
            margin: 0 auto 18px;
            border-radius: 20px;
            background: #f3f5f4;
            font-size: 25px;
          }

          .eyebrow {
            color: ${GREEN};
            font-size: 8px;
            font-weight: 850;
            letter-spacing: .14em;
          }

          h1 {
            margin: 8px 0;
            font-size: 29px;
            line-height: 1.1;
            letter-spacing: -.045em;
          }

          .accessPage > p {
            max-width: 500px;
            margin: 0 auto;
            color: ${TEXT};
            font-size: 11px;
            line-height: 1.7;
          }

          .infoCard {
            margin: 25px 0 12px;
            border: 1px solid ${BORDER};
            border-radius: 12px;
            overflow: hidden;
            text-align: left;
            background: #fff;
          }

          .infoRow {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 14px 16px;
          }

          .infoRow + .infoRow {
            border-top: 1px solid ${BORDER};
          }

          .infoRow span {
            color: ${MUTED};
            font-size: 7px;
            font-weight: 800;
          }

          .infoRow strong {
            color: ${NAVY};
            font-size: 9px;
          }

          .notice,
          .verifiedNotice {
            padding: 14px;
            margin-top: 12px;
            border-radius: 10px;
            background: ${SOFT};
            text-align: left;
          }

          .verifiedNotice {
            background: #e5f5ea;
          }

          .notice strong,
          .verifiedNotice strong {
            color: ${GREEN};
            font-size: 9px;
          }

          .notice p,
          .verifiedNotice p {
            margin: 5px 0 0;
            color: ${TEXT};
            font-size: 8px;
            line-height: 1.6;
          }

          .backButton {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 15px;
            border-radius: 8px;
            background: ${GREEN};
            color: white;
            text-decoration: none;
            font-size: 8px;
            font-weight: 750;
          }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     SUCCESS
     ========================================================= */

  if (step === 5) {
    return (
      <div className="successPage">
        <div className="successIcon">
          ✓
        </div>

        <div className="eyebrow">
          KOLO TRUST
        </div>

        <h1>
          Verification submitted
        </h1>

        <p>
          Your information for{" "}
          <strong>{groupName}</strong>{" "}
          has been submitted successfully and
          is now awaiting review.
        </p>

        <div className="statusCard">
          <div>
            <span>STATUS</span>
            <strong>Under review</strong>
          </div>

          <div>
            <span>REFERENCE</span>
            <strong>
              {existing?.id
                ? existing.id.slice(0, 12)
                : "Created"}
            </strong>
          </div>
        </div>

        <div className="notice">
          <strong>What happens next?</strong>

          <p>
            Kolo will review the submitted
            information and supporting evidence
            before a Verified badge is issued.
          </p>
        </div>

        <div className="successActions">
          <Link href={`/groups/${id}`}>
            Back to group
          </Link>

          <Link
            href="/verification"
            className="secondary"
          >
            View verification
          </Link>
        </div>

        <style jsx>{`
          .successPage {
            max-width: 620px;
            margin: 70px auto;
            padding: 0 20px 40px;
            text-align: center;
            color: ${NAVY};
            font-family:
              Inter,
              Geist,
              system-ui,
              sans-serif;
          }

          .successIcon {
            width: 68px;
            height: 68px;
            display: grid;
            place-items: center;
            margin: 0 auto 18px;
            border-radius: 20px;
            background: ${GREEN};
            color: white;
            font-size: 28px;
            font-weight: 800;
          }

          .eyebrow {
            color: ${GREEN};
            font-size: 8px;
            font-weight: 850;
            letter-spacing: .14em;
          }

          h1 {
            margin: 8px 0;
            font-size: 30px;
            letter-spacing: -.045em;
          }

          .successPage > p {
            color: ${TEXT};
            font-size: 11px;
            line-height: 1.7;
          }

          .statusCard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            margin: 25px 0;
            border: 1px solid ${BORDER};
            border-radius: 12px;
            overflow: hidden;
            text-align: left;
          }

          .statusCard div {
            padding: 16px;
          }

          .statusCard div + div {
            border-left: 1px solid ${BORDER};
          }

          .statusCard span {
            display: block;
            color: ${MUTED};
            font-size: 7px;
            font-weight: 800;
            margin-bottom: 5px;
          }

          .statusCard strong {
            font-size: 10px;
          }

          .notice {
            padding: 14px;
            border-radius: 10px;
            background: ${SOFT};
            text-align: left;
          }

          .notice strong {
            font-size: 9px;
            color: ${GREEN};
          }

          .notice p {
            margin: 5px 0 0;
            color: ${TEXT};
            font-size: 8px;
            line-height: 1.6;
          }

          .successActions {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
          }

          .successActions a {
            padding: 10px 14px;
            border-radius: 8px;
            background: ${GREEN};
            color: white;
            text-decoration: none;
            font-size: 8px;
            font-weight: 750;
          }

          .successActions a.secondary {
            background: #f3f5f4;
            color: ${TEXT};
            border: 1px solid ${BORDER};
          }

          @media (max-width: 600px) {
            .successPage {
              margin: 45px auto;
            }

            .statusCard {
              grid-template-columns: 1fr;
            }

            .statusCard div + div {
              border-left: 0;
              border-top: 1px solid ${BORDER};
            }
          }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     FORM STEPS
     ========================================================= */

  const steps = [
    "Cooperative",
    "Administrator",
    "Account",
    "Review",
  ];

  return (
    <div className="page">
      <header>
        <Link
          href={`/groups/${id}`}
          className="back"
        >
          ← Back to group
        </Link>

        <div className="eyebrow">
          KOLO TRUST
        </div>

        <h1>
          Become Kolo Verified
        </h1>

        <p>
          Help your members know who they are
          saving with.
        </p>
      </header>

      <div className="adminNotice">
        <div className="adminNoticeIcon">
          ✓
        </div>

        <div>
          <strong>
            Administrator verification
          </strong>

          <p>
            You are submitting this information as
            the administrator of {groupName}.
          </p>
        </div>
      </div>

      <div className="steps">
        {steps.map((label, index) => {
          const number = index + 1;

          return (
            <div
              key={label}
              className={`step ${
                step === number ? "active" : ""
              } ${
                step > number ? "complete" : ""
              }`}
            >
              <b>
                {step > number
                  ? "✓"
                  : number}
              </b>

              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="error">
          <span>!</span>
          {error}
        </div>
      )}

      <main>
        {/* ===================================================
            STEP 1
           =================================================== */}

        {step === 1 && (
          <>
            <FormHeader
              number="01"
              title="About the cooperative"
              description="Tell Kolo about the savings group you want to verify."
            />

            <Field
              label="Cooperative name"
              value={form.cooperative_name}
              onChange={(value) =>
                updateField(
                  "cooperative_name",
                  value
                )
              }
              placeholder="e.g. Unity Savings Cooperative"
            />

            <TextArea
              label="Purpose of the cooperative"
              value={
                form.cooperative_description
              }
              onChange={(value) =>
                updateField(
                  "cooperative_description",
                  value
                )
              }
              placeholder="What is this cooperative created to achieve?"
            />

            <div className="two">
              <Field
                label="Location"
                value={
                  form.cooperative_location
                }
                onChange={(value) =>
                  updateField(
                    "cooperative_location",
                    value
                  )
                }
                placeholder="e.g. Abeokuta, Ogun State"
              />

              <Field
                label="Number of members"
                type="number"
                value={form.member_count}
                onChange={(value) =>
                  updateField(
                    "member_count",
                    value
                  )
                }
                placeholder="10"
              />
            </div>

            <Field
              label="Registration / identification number"
              value={
                form.registration_number
              }
              onChange={(value) =>
                updateField(
                  "registration_number",
                  value
                )
              }
              placeholder="Optional"
            />
          </>
        )}

        {/* ===================================================
            STEP 2
           =================================================== */}

        {step === 2 && (
          <>
            <FormHeader
              number="02"
              title="Administrator details"
              description="Identify the person responsible for managing this cooperative."
            />

            <Field
              label="Full name"
              value={
                form.administrator_name
              }
              onChange={(value) =>
                updateField(
                  "administrator_name",
                  value
                )
              }
              placeholder="Administrator's full name"
            />

            <div className="two">
              <Field
                label="Phone number"
                value={
                  form.administrator_phone
                }
                onChange={(value) =>
                  updateField(
                    "administrator_phone",
                    value
                  )
                }
                placeholder="080..."
              />

              <Field
                label="Email address"
                type="email"
                value={
                  form.administrator_email
                }
                onChange={(value) =>
                  updateField(
                    "administrator_email",
                    value
                  )
                }
                placeholder="name@example.com"
              />
            </div>

            <Field
              label="Role"
              value={
                form.administrator_role
              }
              onChange={(value) =>
                updateField(
                  "administrator_role",
                  value
                )
              }
              placeholder="e.g. Treasurer"
            />

            <InfoBox
              title="Identity verification"
              text="Identity documents should be collected through private storage and reviewed before the cooperative receives a Verified badge."
            />
          </>
        )}

        {/* ===================================================
            STEP 3
           =================================================== */}

        {step === 3 && (
          <>
            <FormHeader
              number="03"
              title="Cooperative account"
              description="Tell Kolo which account the cooperative has submitted for verification."
            />

            <div className="accountNotice">
              <strong>
                Kolo does not hold members'
                savings.
              </strong>

              <p>
                The cooperative remains responsible
                for its own funds. Kolo verifies the
                information supplied so members can
                make more informed decisions.
              </p>
            </div>

            <div className="two">
              <Field
                label="Bank name"
                value={form.bank_name}
                onChange={(value) =>
                  updateField(
                    "bank_name",
                    value
                  )
                }
                placeholder="e.g. Access Bank"
              />

              <Field
                label="Account name"
                value={form.account_name}
                onChange={(value) =>
                  updateField(
                    "account_name",
                    value
                  )
                }
                placeholder="Account holder name"
              />
            </div>

            <Field
              label="Account number"
              value={form.account_number}
              onChange={(value) =>
                updateField(
                  "account_number",
                  value
                )
              }
              placeholder="10-digit account number"
              maxLength={10}
            />

            <InfoBox
              title="Private information"
              text="Bank information must never appear on the public group page. It should only be available to authorized verification reviewers."
            />
          </>
        )}

        {/* ===================================================
            STEP 4
           =================================================== */}

        {step === 4 && (
          <>
            <FormHeader
              number="04"
              title="Review & submit"
              description="Make sure the information is accurate before sending it to Kolo for review."
            />

            <ReviewSection title="Cooperative">
              <ReviewItem
                label="Name"
                value={
                  form.cooperative_name
                }
              />

              <ReviewItem
                label="Purpose"
                value={
                  form.cooperative_description
                }
              />

              <ReviewItem
                label="Location"
                value={
                  form.cooperative_location
                }
              />

              <ReviewItem
                label="Members"
                value={form.member_count}
              />

              <ReviewItem
                label="Registration ID"
                value={
                  form.registration_number ||
                  "Not provided"
                }
              />
            </ReviewSection>

            <ReviewSection title="Administrator">
              <ReviewItem
                label="Name"
                value={
                  form.administrator_name
                }
              />

              <ReviewItem
                label="Phone"
                value={
                  form.administrator_phone
                }
              />

              <ReviewItem
                label="Email"
                value={
                  form.administrator_email
                }
              />

              <ReviewItem
                label="Role"
                value={
                  form.administrator_role
                }
              />
            </ReviewSection>

            <ReviewSection title="Cooperative account">
              <ReviewItem
                label="Bank"
                value={form.bank_name}
              />

              <ReviewItem
                label="Account name"
                value={form.account_name}
              />

              <ReviewItem
                label="Account number"
                value={maskAccount(
                  form.account_number
                )}
              />
            </ReviewSection>

            <div className="confirmation">
              <div>✓</div>

              <p>
                I confirm that the information
                submitted is accurate to the best of
                my knowledge and understand that Kolo
                verification is subject to review.
              </p>
            </div>
          </>
        )}

        {/* ===================================================
            ACTIONS
           =================================================== */}

        <div className="actions">
          {step > 1 && (
            <button
              type="button"
              className="secondary"
              onClick={previousStep}
            >
              ← Previous
            </button>
          )}

          {step < 4 && (
            <button
              type="button"
              onClick={continueStep}
            >
              Continue →
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              disabled={saving}
              onClick={submitVerification}
            >
              {saving
                ? "Submitting..."
                : "Submit for verification"}
            </button>
          )}
        </div>
      </main>

      <footer>
        🔒 Sensitive verification information
        should be stored securely. A Kolo Verified
        badge is based on information reviewed by
        Kolo and is not a guarantee against
        financial loss or fraud.
      </footer>

      <style jsx>{styles}</style>
    </div>
  );
}

/* =========================================================
   FORM HEADER
   ========================================================= */

function FormHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="formHeader">
      <span>STEP {number}</span>

      <h2>{title}</h2>

      <p>{description}</p>
    </div>
  );
}

/* =========================================================
   FIELD
   ========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
}

/* =========================================================
   TEXT AREA
   ========================================================= */

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>

      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
}

/* =========================================================
   INFO BOX
   ========================================================= */

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="infoBox">
      <strong>✓ {title}</strong>
      <p>{text}</p>
    </div>
  );
}

/* =========================================================
   REVIEW SECTION
   ========================================================= */

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="review">
      <h3>{title}</h3>

      <div className="reviewGrid">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   REVIEW ITEM
   ========================================================= */

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   ACCOUNT MASK
   ========================================================= */

function maskAccount(value: string) {
  if (!value) return "Not provided";

  if (value.length <= 4) {
    return value;
  }

  return (
    "•".repeat(value.length - 4) +
    value.slice(-4)
  );
}

/* =========================================================
   PAGE STYLES
   ========================================================= */

const styles = `
  .page {
    max-width: 900px;
    margin: 0 auto;
    padding: 8px 0 40px;
    color: ${NAVY};
    font-family: Inter, Geist, system-ui, sans-serif;
  }

  header {
    margin-bottom: 18px;
  }

  .back {
    display: inline-block;
    margin-bottom: 17px;
    color: ${GREEN};
    text-decoration: none;
    font-size: 8px;
    font-weight: 750;
  }

  .eyebrow {
    margin-bottom: 7px;
    color: ${GREEN};
    font-size: 7px;
    font-weight: 850;
    letter-spacing: .14em;
  }

  header h1 {
    margin: 0 0 6px;
    font-size: 30px;
    line-height: 1;
    letter-spacing: -.045em;
  }

  header p {
    margin: 0;
    color: ${TEXT};
    font-size: 10px;
  }

  .adminNotice {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
    border: 1px solid #dcebe1;
    border-radius: 10px;
    background: ${SOFT};
  }

  .adminNoticeIcon {
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 8px;
    background: ${GREEN};
    color: white;
    font-size: 9px;
    font-weight: 800;
  }

  .adminNotice strong {
    display: block;
    color: ${GREEN};
    font-size: 8px;
    font-weight: 800;
  }

  .adminNotice p {
    margin: 3px 0 0;
    color: ${TEXT};
    font-size: 7px;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px;
    border: 1px solid ${BORDER};
    border-radius: 9px;
    background: #fff;
    color: ${MUTED};
    font-size: 7px;
    font-weight: 700;
  }

  .step b {
    width: 23px;
    height: 23px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 7px;
    background: #f1f3f2;
    font-size: 8px;
  }

  .step.active {
    border-color: #b9dec6;
    background: ${SOFT};
    color: ${NAVY};
  }

  .step.active b,
  .step.complete b {
    background: ${GREEN};
    color: #fff;
  }

  .step.complete {
    color: ${GREEN};
  }

  .error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    border: 1px solid #e8ddbd;
    border-radius: 8px;
    background: #fff9eb;
    color: ${GOLD};
    font-size: 8px;
  }

  .error span {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #f2e4bf;
    font-weight: 800;
  }

  main {
    padding: 24px;
    border: 1px solid ${BORDER};
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 10px 35px rgba(11,28,48,.035);
  }

  .formHeader {
    margin-bottom: 22px;
  }

  .formHeader > span {
    color: ${GREEN};
    font-size: 7px;
    font-weight: 850;
    letter-spacing: .12em;
  }

  .formHeader h2 {
    margin: 6px 0 5px;
    font-size: 20px;
    letter-spacing: -.03em;
  }

  .formHeader p {
    max-width: 650px;
    margin: 0;
    color: ${TEXT};
    font-size: 8px;
    line-height: 1.6;
  }

  .field {
    display: block;
    margin-bottom: 14px;
  }

  .field > span {
    display: block;
    margin-bottom: 6px;
    color: ${NAVY};
    font-size: 8px;
    font-weight: 700;
  }

  .field input,
  .field textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 11px;
    border: 1px solid ${BORDER};
    border-radius: 8px;
    outline: none;
    background: #fff;
    color: ${NAVY};
    font: inherit;
    font-size: 9px;
  }

  .field textarea {
    resize: vertical;
    line-height: 1.55;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: #86b99a;
    box-shadow: 0 0 0 3px ${SOFT};
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .infoBox,
  .accountNotice {
    padding: 13px;
    margin-top: 5px;
    border-radius: 9px;
    background: ${SOFT};
  }

  .infoBox strong,
  .accountNotice strong {
    display: block;
    color: ${GREEN};
    font-size: 8px;
  }

  .infoBox p,
  .accountNotice p {
    margin: 5px 0 0;
    color: ${TEXT};
    font-size: 7px;
    line-height: 1.6;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 20px;
    margin-top: 18px;
    border-top: 1px solid ${BORDER};
  }

  .actions button {
    border: 0;
    border-radius: 8px;
    padding: 10px 15px;
    background: ${GREEN};
    color: #fff;
    font-size: 8px;
    font-weight: 750;
    cursor: pointer;
  }

  .actions button:disabled {
    opacity: .6;
    cursor: wait;
  }

  .actions button.secondary {
    border: 1px solid ${BORDER};
    background: #f3f5f4;
    color: ${TEXT};
  }

  .review {
    padding: 14px;
    margin-bottom: 10px;
    border: 1px solid ${BORDER};
    border-radius: 9px;
    background: #fbfcfb;
  }

  .review h3 {
    margin: 0 0 11px;
    color: ${GREEN};
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .reviewGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
  }

  .reviewGrid small {
    display: block;
    margin-bottom: 3px;
    color: ${MUTED};
    font-size: 6px;
  }

  .reviewGrid strong {
    display: block;
    color: ${NAVY};
    font-size: 8px;
    line-height: 1.5;
    word-break: break-word;
  }

  .confirmation {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 12px;
    margin-top: 14px;
    border-radius: 8px;
    background: ${SOFT};
  }

  .confirmation > div {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 50%;
    background: ${GREEN};
    color: #fff;
    font-size: 8px;
    font-weight: 800;
  }

  .confirmation p {
    margin: 0;
    color: ${TEXT};
    font-size: 7px;
    line-height: 1.6;
  }

  footer {
    padding: 11px 4px;
    color: ${MUTED};
    font-size: 7px;
    line-height: 1.6;
  }

  @media (max-width: 700px) {
    .page {
      padding-left: 14px;
      padding-right: 14px;
    }

    .steps {
      grid-template-columns: 1fr 1fr;
    }

    .two,
    .reviewGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    main {
      padding: 17px;
    }

    .step {
      padding: 9px;
    }

    .step span {
      font-size: 6px;
    }

    header h1 {
      font-size: 26px;
    }

    .adminNotice {
      align-items: flex-start;
    }
  }
`;