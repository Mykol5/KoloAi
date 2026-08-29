"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Step =
  | 1
  | 2
  | 3
  | 4;

type UserRole =
  | "admin"
  | "member"
  | string;

interface FormData {
  name: string;
  description: string;
  category: string;
  template: string;
  contributionAmount: string;
  payoutFrequency: string;
  interestRate: string;
  maxMembers: string;
  votingThreshold: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  category: "Investment",
  template: "Fixed Savings",
  contributionAmount: "",
  payoutFrequency: "monthly",
  interestRate: "0",
  maxMembers: "12",
  votingThreshold: "simple",
};

/* =========================================================
   HELPERS
========================================================= */

function formatNaira(
  value: string | number
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₦0";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}

/* =========================================================
   PAGE
========================================================= */

export default function CreateGroupPage() {
  const supabase =
    createClient();

  const [step, setStep] =
    useState<Step>(1);

  const [form, setForm] =
    useState<FormData>(
      INITIAL_FORM
    );

  const [
    loadingAccess,
    setLoadingAccess,
  ] = useState(true);

  const [
    authorized,
    setAuthorized,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* =======================================================
     CHECK ADMIN ACCESS
  ======================================================= */

  const checkAccess =
    useCallback(
      async () => {
        setLoadingAccess(
          true
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
            window.location.href =
              "/login";
            return;
          }

          /*
           * We use group_members to determine
           * whether this user has an admin role.
           *
           * If your application has a dedicated
           * profiles.role column later, this can
           * be changed to that source.
           */

          const {
            data,
            error:
              membershipError,
          } =
            await supabase
              .from(
                "group_members"
              )
              .select(
                "role"
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "role",
                "admin"
              )
              .limit(1);

          if (membershipError) {
            console.error(
              "Admin access lookup error:",
              membershipError
            );

            /*
             * Do NOT grant access if the
             * permission lookup fails.
             */
            setAuthorized(
              false
            );

            setError(
              "We could not verify your administrator access."
            );

            return;
          }

          const isAdmin =
            Boolean(
              data &&
                data.length >
                  0
            );

          setAuthorized(
            isAdmin
          );

          if (!isAdmin) {
            setError(
              "Only administrators can create Kolo groups."
            );
          }
        } catch (err) {
          console.error(
            "Access check error:",
            err
          );

          setAuthorized(
            false
          );

          setError(
            "Unable to verify your access."
          );
        } finally {
          setLoadingAccess(
            false
          );
        }
      },
      [supabase]
    );

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  /* =======================================================
     FORM UPDATE
  ======================================================= */

  const updateField = <
    K extends keyof FormData
  >(
    field: K,
    value: FormData[K]
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateStep =
    (
      targetStep: Step
    ) => {
      if (
        targetStep ===
        1
      ) {
        if (
          !form.name.trim()
        ) {
          setError(
            "Please enter a group name."
          );
          return false;
        }

        if (
          form.name.trim()
            .length < 3
        ) {
          setError(
            "Group name must be at least 3 characters."
          );
          return false;
        }

        if (
          !form.description.trim()
        ) {
          setError(
            "Please enter a group description."
          );
          return false;
        }
      }

      if (
        targetStep ===
        2
      ) {
        const contribution =
          Number(
            form.contributionAmount
          );

        if (
          !Number.isFinite(
            contribution
          ) ||
          contribution <= 0
        ) {
          setError(
            "Enter a valid contribution amount."
          );
          return false;
        }

        const members =
          Number(
            form.maxMembers
          );

        if (
          !Number.isInteger(
            members
          ) ||
          members < 2
        ) {
          setError(
            "A group must have at least 2 members."
          );
          return false;
        }

        if (
          members > 1000
        ) {
          setError(
            "Maximum group size is 1,000 members."
          );
          return false;
        }

        const interest =
          Number(
            form.interestRate
          );

        if (
          !Number.isFinite(
            interest
          ) ||
          interest < 0 ||
          interest > 100
        ) {
          setError(
            "Interest rate must be between 0 and 100."
          );
          return false;
        }
      }

      return true;
    };

  /* =======================================================
     NEXT
  ======================================================= */

  const nextStep =
    () => {
      setError("");

      if (
        !validateStep(
          step
        )
      ) {
        return;
      }

      if (
        step <
        4
      ) {
        setStep(
          (step +
            1) as Step
        );
      }
    };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previousStep =
    () => {
      setError("");

      if (
        step >
        1
      ) {
        setStep(
          (step -
            1) as Step
        );
      }
    };

  /* =======================================================
     CREATE GROUP
  ======================================================= */

  const handleCreateGroup =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (!authorized) {
        setError(
          "Only administrators can create Kolo groups."
        );
        return;
      }

      /*
       * Validate all important fields
       */
      if (
        !validateStep(1) ||
        !validateStep(2)
      ) {
        return;
      }

      setSubmitting(
        true
      );

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        /*
         * SECOND permission check immediately
         * before creating the group.
         *
         * This is important because UI permission
         * checks are never enough.
         */

        const {
          data:
            adminMemberships,
          error:
            adminCheckError,
        } =
          await supabase
            .from(
              "group_members"
            )
            .select(
              "group_id, role"
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "role",
              "admin"
            )
            .limit(1);

        if (
          adminCheckError
        ) {
          throw new Error(
            "Unable to verify administrator permission."
          );
        }

        if (
          !adminMemberships ||
          adminMemberships.length ===
            0
        ) {
          throw new Error(
            "Only administrators can create groups."
          );
        }

        const contribution =
          Number(
            form.contributionAmount
          );

        const maxMembers =
          Number(
            form.maxMembers
          );

        const interestRate =
          Number(
            form.interestRate
          );

        /*
         * New groups remain ACTIVE in your
         * current database architecture.
         *
         * Kolo verification is determined by
         * verification_submissions.
         *
         * Therefore:
         *
         * active !== Kolo verified
         *
         * This prevents us from breaking your
         * existing groups.
         */

        const {
          data: group,
          error:
            groupError,
        } =
          await supabase
            .from(
              "groups"
            )
            .insert({
              name:
                form.name.trim(),

              description:
                form.description.trim(),

              pool_amount:
                0,

              member_count:
                1,

              max_members:
                maxMembers,

              status:
                "active",

              cycle_number:
                1,

              created_by:
                user.id,

              contribution_amount:
                contribution,

              next_due_date:
                null,

              rotation_order:
                [user.id],

              current_rotation_index:
                0,

              next_payout_date:
                null,

              last_payout_date:
                null,

              category:
                form.category,

              template:
                form.template,

              payout_frequency:
                form.payoutFrequency,

              interest_rate:
                interestRate,

              voting_threshold:
                form.votingThreshold,
            })
            .select()
            .single();

        if (
          groupError ||
          !group
        ) {
          console.error(
            "Create group error:",
            groupError
          );

          throw new Error(
            groupError?.message ||
              "Unable to create group."
          );
        }

        /*
         * Add creator as group admin.
         *
         * We do this AFTER group creation.
         */

        const {
          error:
            memberError,
        } =
          await supabase
            .from(
              "group_members"
            )
            .insert({
              user_id:
                user.id,

              group_id:
                group.id,

              role:
                "admin",
            });

        if (
          memberError
        ) {
          /*
           * The group was created but
           * membership creation failed.
           *
           * We surface a clear error rather
           * than pretending everything worked.
           */

          console.error(
            "Group membership creation error:",
            memberError
          );

          throw new Error(
            `Group was created, but administrator membership could not be created: ${memberError.message}`
          );
        }

        setSuccess(
          "Group created successfully."
        );

        /*
         * Redirect to the new group after
         * a short delay so the user can see
         * confirmation.
         */

        setTimeout(() => {
          window.location.href =
            `/groups/${group.id}`;
        }, 900);
      } catch (err: any) {
        console.error(
          "Create group failed:",
          err
        );

        setError(
          err?.message ||
            "Something went wrong while creating the group."
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
     STEP TITLES
  ======================================================= */

  const stepTitles =
    useMemo(
      () => [
        "Group basics",
        "Contribution rules",
        "Governance",
        "Review",
      ],
      []
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingAccess
  ) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#f7faf7",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding:
            "24px",
          fontFamily:
            "Inter, Geist, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background:
              "#fff",
            padding:
              "32px",
            borderRadius:
              "16px",
            boxShadow:
              "0 8px 30px rgba(15,23,42,0.06)",
            textAlign:
              "center",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize:
                "34px",
              color:
                "#006b2c",
            }}
          >
            admin_panel_settings
          </span>

          <p
            style={{
              margin:
                "12px 0 0",
              color:
                "#3e4a3d",
              fontSize:
                "14px",
            }}
          >
            Checking administrator access...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     UNAUTHORIZED
  ======================================================= */

  if (!authorized) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          background:
            "#f7faf7",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding:
            "24px",
          fontFamily:
            "Inter, Geist, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width:
              "100%",
            maxWidth:
              "520px",
            background:
              "#fff",
            borderRadius:
              "18px",
            padding:
              "40px",
            textAlign:
              "center",
            boxShadow:
              "0 12px 40px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              width:
                "64px",
              height:
                "64px",
              margin:
                "0 auto 18px",
              borderRadius:
                "50%",
              background:
                "#fff0ef",
              color:
                "#ba1a1a",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize:
                  "32px",
              }}
            >
              lock
            </span>
          </div>

          <h1
            style={{
              margin:
                "0 0 8px",
              color:
                "#0b1c30",
              fontSize:
                "24px",
              fontWeight:
                700,
            }}
          >
            Administrator access required
          </h1>

          <p
            style={{
              color:
                "#5c647a",
              fontSize:
                "14px",
              lineHeight:
                1.6,
              margin:
                "0 0 24px",
            }}
          >
            Only Kolo administrators can
            create groups. Please contact
            an administrator if you need
            a group created.
          </p>

          {error && (
            <div
              style={{
                padding:
                  "12px 14px",
                background:
                  "#fff0ef",
                color:
                  "#93000a",
                borderRadius:
                  "9px",
                fontSize:
                  "13px",
                marginBottom:
                  "18px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/groups";
            }}
            style={{
              width:
                "100%",
              padding:
                "13px",
              border:
                "none",
              borderRadius:
                "10px",
              background:
                "#0b1c30",
              color:
                "#fff",
              fontWeight:
                600,
              cursor:
                "pointer",
            }}
          >
            Back to Groups
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f7faf7",
        fontFamily:
          "Inter, Geist, system-ui, sans-serif",
        color:
          "#0b1c30",
      }}
    >
      <div
        style={{
          maxWidth:
            "1000px",
          margin:
            "0 auto",
          padding:
            "36px 20px 80px",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            marginBottom:
              "28px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/groups";
            }}
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap:
                "6px",
              border:
                "none",
              background:
                "transparent",
              color:
                "#5c647a",
              cursor:
                "pointer",
              padding:
                "0",
              fontSize:
                "13px",
              marginBottom:
                "18px",
            }}
          >
            <span className="material-symbols-outlined">
              arrow_back
            </span>

            Back to Groups
          </button>

          <h1
            style={{
              margin:
                "0 0 8px",
              fontSize:
                "32px",
              lineHeight:
                1.2,
              fontWeight:
                750,
              letterSpacing:
                "-0.03em",
            }}
          >
            Create a Kolo group
          </h1>

          <p
            style={{
              margin: 0,
              color:
                "#5c647a",
              fontSize:
                "14px",
              lineHeight:
                1.6,
              maxWidth:
                "650px",
            }}
          >
            Set up the group's contribution
            rules and governance. After
            creation, the group can complete
            Kolo verification before members
            can make contributions.
          </p>
        </div>

        {/* =================================================
            STEP INDICATOR
        ================================================= */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap:
              "8px",
            marginBottom:
              "28px",
          }}
        >
          {stepTitles.map(
            (
              title,
              index
            ) => {
              const number =
                index + 1;

              const active =
                number ===
                step;

              const completed =
                number <
                step;

              return (
                <div
                  key={
                    title
                  }
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <div
                    style={{
                      height:
                        "4px",
                      borderRadius:
                        "999px",
                      background:
                        active ||
                        completed
                          ? "#006b2c"
                          : "#dfe7df",
                    }}
                  />

                  <div
                    style={{
                      marginTop:
                        "8px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "7px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          "22px",
                        height:
                          "22px",
                        borderRadius:
                          "50%",
                        background:
                          active ||
                          completed
                            ? "#006b2c"
                            : "#e8eee8",
                        color:
                          active ||
                          completed
                            ? "#fff"
                            : "#6e7b6c",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize:
                          "11px",
                        fontWeight:
                          700,
                      }}
                    >
                      {completed
                        ? "✓"
                        : number}
                    </div>

                    <span
                      style={{
                        fontSize:
                          "11px",
                        color:
                          active
                            ? "#006b2c"
                            : "#6e7b6c",
                        fontWeight:
                          active
                            ? 700
                            : 500,
                      }}
                    >
                      {
                        title
                      }
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              gap:
                "10px",
              padding:
                "14px 16px",
              marginBottom:
                "20px",
              background:
                "#fff0ef",
              border:
                "1px solid rgba(186,26,26,0.15)",
              borderRadius:
                "10px",
              color:
                "#93000a",
              fontSize:
                "13px",
              lineHeight:
                1.5,
            }}
          >
            <span className="material-symbols-outlined">
              error
            </span>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <div
            style={{
              padding:
                "14px 16px",
              marginBottom:
                "20px",
              background:
                "rgba(0,107,44,0.08)",
              border:
                "1px solid rgba(0,107,44,0.15)",
              borderRadius:
                "10px",
              color:
                "#006b2c",
              fontSize:
                "13px",
              fontWeight:
                600,
            }}
          >
            {success}
          </div>
        )}

        {/* =================================================
            FORM CARD
        ================================================= */}

        <form
          onSubmit={
            handleCreateGroup
          }
        >
          <div
            style={{
              background:
                "#fff",
              border:
                "1px solid #e2e8e2",
              borderRadius:
                "18px",
              boxShadow:
                "0 8px 30px rgba(15,23,42,0.05)",
              overflow:
                "hidden",
            }}
          >
            {/* =============================================
                STEP 1
            ============================================= */}

            {step ===
              1 && (
              <section
                style={{
                  padding:
                    "30px",
                }}
              >
                <StepHeading
                  icon="groups"
                  title="Group basics"
                  description="Give your group a clear identity so members know what it is about."
                />

                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      "20px",
                  }}
                >
                  <Field
                    label="Group name"
                    required
                  >
                    <input
                      value={
                        form.name
                      }
                      onChange={(
                        e
                      ) =>
                        updateField(
                          "name",
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. Ajo Osu"
                      style={
                        INPUT_STYLE
                      }
                      maxLength={
                        100
                      }
                    />
                  </Field>

                  <Field
                    label="Description"
                    required
                  >
                    <textarea
                      value={
                        form.description
                      }
                      onChange={(
                        e
                      ) =>
                        updateField(
                          "description",
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Describe the purpose of this group..."
                      style={{
                        ...INPUT_STYLE,
                        minHeight:
                          "120px",
                        resize:
                          "vertical",
                      }}
                      maxLength={
                        500
                      }
                    />
                  </Field>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap:
                        "20px",
                    }}
                  >
                    <Field
                      label="Group category"
                    >
                      <select
                        value={
                          form.category
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "category",
                            e
                              .target
                              .value
                          )
                        }
                        style={
                          INPUT_STYLE
                        }
                      >
                        <option>
                          Investment
                        </option>
                        <option>
                          Savings
                        </option>
                        <option>
                          Cooperative
                        </option>
                        <option>
                          Ajo / Rotating Savings
                        </option>
                        <option>
                          Emergency Fund
                        </option>
                        <option>
                          Other
                        </option>
                      </select>
                    </Field>

                    <Field
                      label="Group template"
                    >
                      <select
                        value={
                          form.template
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "template",
                            e
                              .target
                              .value
                          )
                        }
                        style={
                          INPUT_STYLE
                        }
                      >
                        <option>
                          Fixed Savings
                        </option>
                        <option>
                          Rotating Ajo
                        </option>
                        <option>
                          Cooperative Savings
                        </option>
                        <option>
                          Investment Pool
                        </option>
                      </select>
                    </Field>
                  </div>
                </div>
              </section>
            )}

            {/* =============================================
                STEP 2
            ============================================= */}

            {step ===
              2 && (
              <section
                style={{
                  padding:
                    "30px",
                }}
              >
                <StepHeading
                  icon="payments"
                  title="Contribution rules"
                  description="Define how members will contribute and how the group operates financially."
                />

                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      "20px",
                  }}
                >
                  <Field
                    label="Contribution amount"
                    required
                    hint="Amount each member is expected to contribute per cycle."
                  >
                    <div
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <span
                        style={{
                          position:
                            "absolute",
                          left:
                            "14px",
                          top:
                            "50%",
                          transform:
                            "translateY(-50%)",
                          color:
                            "#5c647a",
                          fontWeight:
                            600,
                        }}
                      >
                        ₦
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          form.contributionAmount
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "contributionAmount",
                            e
                              .target
                              .value
                          )
                        }
                        placeholder="50,000"
                        style={{
                          ...INPUT_STYLE,
                          paddingLeft:
                            "34px",
                        }}
                      />
                    </div>
                  </Field>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap:
                        "20px",
                    }}
                  >
                    <Field
                      label="Payout frequency"
                    >
                      <select
                        value={
                          form.payoutFrequency
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "payoutFrequency",
                            e
                              .target
                              .value
                          )
                        }
                        style={
                          INPUT_STYLE
                        }
                      >
                        <option value="weekly">
                          Weekly
                        </option>

                        <option value="biweekly">
                          Every 2 weeks
                        </option>

                        <option value="monthly">
                          Monthly
                        </option>

                        <option value="quarterly">
                          Quarterly
                        </option>
                      </select>
                    </Field>

                    <Field
                      label="Maximum members"
                    >
                      <input
                        type="number"
                        min="2"
                        max="1000"
                        value={
                          form.maxMembers
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "maxMembers",
                            e
                              .target
                              .value
                          )
                        }
                        style={
                          INPUT_STYLE
                        }
                      />
                    </Field>
                  </div>

                  <Field
                    label="Interest / return rate"
                    hint="Use 0 if the group does not use interest or investment returns."
                  >
                    <div
                      style={{
                        position:
                          "relative",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          form.interestRate
                        }
                        onChange={(
                          e
                        ) =>
                          updateField(
                            "interestRate",
                            e
                              .target
                              .value
                          )
                        }
                        style={{
                          ...INPUT_STYLE,
                          paddingRight:
                            "42px",
                        }}
                      />

                      <span
                        style={{
                          position:
                            "absolute",
                          right:
                            "14px",
                          top:
                            "50%",
                          transform:
                            "translateY(-50%)",
                          color:
                            "#5c647a",
                        }}
                      >
                        %
                      </span>
                    </div>
                  </Field>
                </div>
              </section>
            )}

            {/* =============================================
                STEP 3
            ============================================= */}

            {step ===
              3 && (
              <section
                style={{
                  padding:
                    "30px",
                }}
              >
                <StepHeading
                  icon="how_to_vote"
                  title="Governance"
                  description="Set the basic decision-making rule for the group."
                />

                <Field
                  label="Voting threshold"
                >
                  <select
                    value={
                      form.votingThreshold
                    }
                    onChange={(
                      e
                    ) =>
                      updateField(
                        "votingThreshold",
                        e
                          .target
                          .value
                      )
                    }
                    style={
                      INPUT_STYLE
                    }
                  >
                    <option value="simple">
                      Simple majority
                    </option>

                    <option value="two_thirds">
                      Two-thirds majority
                    </option>

                    <option value="unanimous">
                      Unanimous
                    </option>
                  </select>
                </Field>

                <div
                  style={{
                    marginTop:
                      "24px",
                    padding:
                      "18px",
                    borderRadius:
                      "12px",
                    background:
                      "#f5faf5",
                    border:
                      "1px solid #dce8dc",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      gap:
                        "12px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          "#006b2c",
                      }}
                    >
                      verified_user
                    </span>

                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "5px",
                          fontSize:
                            "14px",
                        }}
                      >
                        Kolo verification
                      </strong>

                      <p
                        style={{
                          margin: 0,
                          color:
                            "#5c647a",
                          fontSize:
                            "13px",
                          lineHeight:
                            1.6,
                        }}
                      >
                        Creating this group does
                        not automatically make it
                        Kolo verified. The group must
                        complete the verification
                        process and receive an
                        approved contribution account
                        before contributions can be
                        accepted through Kolo.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop:
                      "16px",
                    padding:
                      "18px",
                    borderRadius:
                      "12px",
                    background:
                      "#fff9ed",
                    border:
                      "1px solid #f1dfb8",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      gap:
                        "12px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          "#825100",
                      }}
                    >
                      account_balance
                    </span>

                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "5px",
                          fontSize:
                            "14px",
                          color:
                            "#5c3a00",
                        }}
                      >
                        Contribution account
                      </strong>

                      <p
                        style={{
                          margin: 0,
                          color:
                            "#6e5a37",
                          fontSize:
                            "13px",
                          lineHeight:
                            1.6,
                        }}
                      >
                        The contribution account
                        shown to members will come
                        from the group's approved
                        Kolo verification record.
                        Members should never transfer
                        money to an unapproved account.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =============================================
                STEP 4
            ============================================= */}

            {step ===
              4 && (
              <section
                style={{
                  padding:
                    "30px",
                }}
              >
                <StepHeading
                  icon="fact_check"
                  title="Review group"
                  description="Check the details before creating the group."
                />

                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      "10px",
                  }}
                >
                  <ReviewRow
                    label="Group name"
                    value={
                      form.name ||
                      "—"
                    }
                  />

                  <ReviewRow
                    label="Category"
                    value={
                      form.category
                    }
                  />

                  <ReviewRow
                    label="Template"
                    value={
                      form.template
                    }
                  />

                  <ReviewRow
                    label="Contribution"
                    value={formatNaira(
                      form.contributionAmount
                    )}
                  />

                  <ReviewRow
                    label="Payout frequency"
                    value={
                      form.payoutFrequency
                    }
                  />

                  <ReviewRow
                    label="Maximum members"
                    value={
                      form.maxMembers
                    }
                  />

                  <ReviewRow
                    label="Interest / return"
                    value={`${form.interestRate}%`}
                  />

                  <ReviewRow
                    label="Voting"
                    value={
                      form.votingThreshold ===
                      "simple"
                        ? "Simple majority"
                        : form.votingThreshold ===
                          "two_thirds"
                        ? "Two-thirds majority"
                        : "Unanimous"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop:
                      "22px",
                    padding:
                      "18px",
                    borderRadius:
                      "12px",
                    background:
                      "#f5faf5",
                    border:
                      "1px solid #dce8dc",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "12px",
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          "#006b2c",
                      }}
                    >
                      info
                    </span>

                    <p
                      style={{
                        margin: 0,
                        fontSize:
                          "13px",
                        color:
                          "#3e4a3d",
                        lineHeight:
                          1.6,
                      }}
                    >
                      You are creating this
                      group as an administrator.
                      The group will still need
                      Kolo verification before
                      members can use the approved
                      contribution account.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* =============================================
                FOOTER ACTIONS
            ============================================= */}

            <div
              style={{
                borderTop:
                  "1px solid #e5ebe5",
                padding:
                  "18px 30px",
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  "12px",
              }}
            >
              <button
                type="button"
                onClick={
                  previousStep
                }
                disabled={
                  step ===
                  1 ||
                  submitting
                }
                style={{
                  padding:
                    "11px 20px",
                  border:
                    "1px solid #d6dfd6",
                  borderRadius:
                    "9px",
                  background:
                    "#fff",
                  color:
                    step ===
                    1
                      ? "#a5afa5"
                      : "#0b1c30",
                  cursor:
                    step ===
                      1 ||
                    submitting
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    600,
                  fontSize:
                    "13px",
                }}
              >
                Back
              </button>

              {step <
              4 ? (
                <button
                  type="button"
                  onClick={
                    nextStep
                  }
                  style={{
                    padding:
                      "11px 24px",
                    border:
                      "none",
                    borderRadius:
                      "9px",
                    background:
                      "#006b2c",
                    color:
                      "#fff",
                    cursor:
                      "pointer",
                    fontWeight:
                      700,
                    fontSize:
                      "13px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "7px",
                  }}
                >
                  Continue

                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  style={{
                    padding:
                      "12px 26px",
                    border:
                      "none",
                    borderRadius:
                      "9px",
                    background:
                      submitting
                        ? "#7d9985"
                        : "#006b2c",
                    color:
                      "#fff",
                    cursor:
                      submitting
                        ? "not-allowed"
                        : "pointer",
                    fontWeight:
                      700,
                    fontSize:
                      "13px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                  }}
                >
                  <span className="material-symbols-outlined">
                    {submitting
                      ? "progress_activity"
                      : "add_circle"}
                  </span>

                  {submitting
                    ? "Creating..."
                    : "Create Group"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style jsx>{`
        @media (max-width: 700px) {
          .group-form-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          main {
            padding: 0 !important;
          }

          section {
            padding: 22px !important;
          }

          form > div > div:last-child {
            padding: 16px 22px !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   STEP HEADING
========================================================= */

function StepHeading({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "flex-start",
        gap:
          "14px",
        marginBottom:
          "28px",
      }}
    >
      <div
        style={{
          width:
            "44px",
          height:
            "44px",
          flexShrink:
            0,
          borderRadius:
            "11px",
          background:
            "rgba(0,107,44,0.08)",
          color:
            "#006b2c",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        <span className="material-symbols-outlined">
          {icon}
        </span>
      </div>

      <div>
        <h2
          style={{
            margin:
              "0 0 5px",
            fontSize:
              "20px",
            fontWeight:
              700,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            color:
              "#5c647a",
            fontSize:
              "13px",
            lineHeight:
              1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display:
            "block",
          marginBottom:
            "7px",
          fontSize:
            "13px",
          fontWeight:
            600,
          color:
            "#0b1c30",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color:
                "#ba1a1a",
              marginLeft:
                "3px",
            }}
          >
            *
          </span>
        )}
      </label>

      {children}

      {hint && (
        <p
          style={{
            margin:
              "6px 0 0",
            fontSize:
              "11px",
            color:
              "#6e7b6c",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   REVIEW ROW
========================================================= */

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        justifyContent:
          "space-between",
        gap:
          "20px",
        padding:
          "13px 15px",
        border:
          "1px solid #e4ebe4",
        borderRadius:
          "9px",
        background:
          "#fcfefc",
      }}
    >
      <span
        style={{
          fontSize:
            "13px",
          color:
            "#6e7b6c",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize:
            "13px",
          fontWeight:
            650,
          color:
            "#0b1c30",
          textAlign:
            "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const INPUT_STYLE: React.CSSProperties =
  {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding:
      "13px 14px",
    border:
      "1px solid #d8e2d8",
    borderRadius:
      "9px",
    background:
      "#fff",
    color:
      "#0b1c30",
    outline:
      "none",
    fontSize:
      "14px",
    fontFamily:
      "Inter, Geist, system-ui, sans-serif",
  };


// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// type Step = 1 | 2 | 3 | 4;

// interface GroupForm {
//   name: string;
//   category: string;
//   description: string;
//   template: string;
//   contributionAmount: number;
//   payoutFrequency: string;
//   interestRate: number;
//   maxMembers: number;
//   votingThreshold: string;
// }

// export default function CreateGroupPage() {
//   const router = useRouter();
//   const supabase = createClient();

//   const [currentStep, setCurrentStep] = useState<Step>(1);
//   const [loading, setLoading] = useState(false);
//   const [form, setForm] = useState<GroupForm>({
//     name: "", category: "Investment", description: "", template: "Fixed Savings",
//     contributionAmount: 50000, payoutFrequency: "monthly", interestRate: 8.5,
//     maxMembers: 12, votingThreshold: "simple",
//   });

//   const updateForm = (field: keyof GroupForm, value: any) => { setForm((prev) => ({ ...prev, [field]: value })); };
//   const navigateWizard = (direction: number) => {
//     const nextStep = currentStep + direction;
//     if (nextStep < 1 || nextStep > 4) return;
//     setCurrentStep(nextStep as Step);
//   };

//   const handleLaunch = async () => {
//     setLoading(true);
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
//       const isRotatingAjo = form.template === "Rotating Ajo";
//       const { data: group, error } = await supabase.from("groups").insert({
//         name: form.name, description: form.description, max_members: form.maxMembers,
//         contribution_amount: form.contributionAmount, created_by: user.id,
//         status: "active", cycle_number: 1,
//         rotation_order: isRotatingAjo ? [user.id] : [],
//         current_rotation_index: isRotatingAjo ? 0 : 0,
//         next_payout_date: isRotatingAjo ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
//       }).select().single();
//       if (error) throw error;
//       await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "admin", rotation_position: 1 });
//       await supabase.from("groups").update({ member_count: 1 }).eq("id", group.id);
//       router.push(`/groups/${group.id}`);
//     } catch (err) { console.error("Failed to create group:", err); }
//     finally { setLoading(false); }
//   };

//   const templates = [
//     { id: "SME Fund", icon: "business_center", title: "SME Fund", desc: "Collaborative business loans with fixed monthly returns." },
//     { id: "Fixed Savings", icon: "savings", title: "Fixed Savings", desc: "Goal-oriented group savings with high-yield interest." },
//     { id: "Rotating Ajo", icon: "cached", title: "Rotating Ajo", desc: "Traditional rotating credit with digitized payout orders." },
//   ];

//   const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", backgroundColor: "#ffffff", border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "8px", outline: "none", fontSize: "15px", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", boxSizing: "border-box" };
//   const sel: React.CSSProperties = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236e7b6c' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "40px" };
//   const fi = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)"; };
//   const fo = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none"; };

//   const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

//   return (
//     <div style={{ backgroundColor: "#eff4ff", minHeight: "100vh" }}>
//       <div className="wizard-container" style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 24px" }}>
//         {/* Header */}
//         <div style={{ textAlign: "center", marginBottom: "32px" }}>
//           <h1 className="wizard-title" style={{ fontSize: "40px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "8px" }}>Create Your Wealth Circle</h1>
//           <p style={{ fontSize: "17px", color: "#3e4a3d" }}>Launch a transparent, AI-governed financial group in minutes.</p>
//         </div>

//         {/* Progress Indicator */}
//         <div className="progress-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "600px", margin: "0 auto 36px", position: "relative", padding: "0 10px" }}>
//           <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: "2px", backgroundColor: "#e5eeff", transform: "translateY(-50%)", zIndex: 0 }} />
//           <div style={{ position: "absolute", top: "50%", left: 0, height: "2px", backgroundColor: "#006b2c", transform: "translateY(-50%)", zIndex: 0, transition: "width 0.5s", width: progressWidth }} />
//           {["Info", "Financials", "Governance", "Review"].map((label, i) => {
//             const stepNum = i + 1;
//             const isComplete = stepNum < currentStep;
//             const isActive = stepNum === currentStep;
//             return (
//               <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative", zIndex: 10 }}>
//                 <div style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isComplete || isActive ? "#006b2c" : "#e5eeff", color: isComplete || isActive ? "#ffffff" : "#3e4a3d", boxShadow: isActive ? "0 0 0 4px rgba(0, 107, 44, 0.2)" : "0 0 0 4px #f8f9ff", fontWeight: 700, fontSize: "13px", transition: "all 0.3s" }}>
//                   {isComplete ? <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check</span> : stepNum}
//                 </div>
//                 <span className="progress-label" style={{ fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: isActive ? "#006b2c" : "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
//               </div>
//             );
//           })}
//         </div>

//         {/* STEP 1 */}
//         {currentStep === 1 && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//             <div className="templates-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
//               {templates.map((tpl) => (
//                 <button key={tpl.id} onClick={() => updateForm("template", tpl.id)}
//                   className="template-card"
//                   style={{ background: form.template === tpl.id ? "rgba(0, 107, 44, 0.05)" : "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: form.template === tpl.id ? "2px solid #006b2c" : "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "20px", borderRadius: "12px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
//                   <span className="material-symbols-outlined" style={{ color: "#006b2c", marginBottom: "12px", display: "block", fontSize: "26px" }}>{tpl.icon}</span>
//                   <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>{tpl.title}</h3>
//                   <p className="template-desc" style={{ fontSize: "12px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{tpl.desc}</p>
//                 </button>
//               ))}
//             </div>
//             <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "32px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "20px" }}>
//               <div className="form-row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
//                 <div><label style={lbl}>Group Name</label><input type="text" placeholder="e.g., Tech Visionaries 2026" value={form.name} onChange={(e) => updateForm("name", e.target.value)} style={inp} onFocus={fi} onBlur={fo} /></div>
//                 <div><label style={lbl}>Category</label><select value={form.category} onChange={(e) => updateForm("category", e.target.value)} style={sel}><option>Investment</option><option>Social Savings</option><option>Real Estate</option><option>Emergency Fund</option></select></div>
//               </div>
//               <div><label style={lbl}>Description</label><textarea placeholder="Briefly describe the purpose..." rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} style={{ ...inp, resize: "vertical" }} onFocus={fi} onBlur={fo} /></div>
//             </div>
//           </div>
//         )}

//         {/* STEP 2 */}
//         {currentStep === 2 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "32px", borderRadius: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}><span className="material-symbols-outlined" style={{ color: "#006b2c" }}>payments</span><h2 style={{ fontSize: "22px", fontWeight: 600 }}>Financial Framework</h2></div>
//             <div className="financials-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
//               <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//                 <div><label style={lbl}>Monthly Contribution (₦)</label><div style={{ position: "relative" }}><span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#3e4a3d", fontSize: "15px" }}>₦</span><input type="number" value={form.contributionAmount} onChange={(e) => updateForm("contributionAmount", Number(e.target.value))} style={{ ...inp, paddingLeft: "40px" }} onFocus={fi} onBlur={fo} /></div></div>
//                 <div><label style={lbl}>Payout Frequency</label><div style={{ display: "flex", gap: "12px" }}>{["monthly", "quarterly"].map((freq) => (<button key={freq} onClick={() => updateForm("payoutFrequency", freq)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: form.payoutFrequency === freq ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.payoutFrequency === freq ? "rgba(0, 107, 44, 0.1)" : "transparent", color: form.payoutFrequency === freq ? "#006b2c" : "#3e4a3d", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", cursor: "pointer", textTransform: "capitalize" }}>{freq}</button>))}</div></div>
//                 <div><label style={lbl}>Max Members</label><input type="number" value={form.maxMembers} onChange={(e) => updateForm("maxMembers", Number(e.target.value))} min={2} max={50} style={inp} onFocus={fi} onBlur={fo} /></div>
//               </div>
//               <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//                 <div><label style={{ ...lbl, display: "flex", justifyContent: "space-between" }}>Interest Rate <span style={{ color: "#006b2c" }}>{form.interestRate}% p.a.</span></label><input type="range" min={1} max={20} step={0.5} value={form.interestRate} onChange={(e) => updateForm("interestRate", Number(e.target.value))} style={{ width: "100%", accentColor: "#006b2c" }} /></div>
//                 <div style={{ padding: "20px", backgroundColor: "#eff4ff", borderRadius: "8px", border: "1px solid rgba(189, 202, 186, 0.2)" }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#006b2c", marginBottom: "6px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span><span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "'Geist', sans-serif" }}>Smart Insight</span></div>
//                   <p style={{ fontSize: "12px", color: "#3e4a3d" }}>With {form.maxMembers} members contributing ₦{form.contributionAmount.toLocaleString()}, your pool grows to ₦{(form.contributionAmount * form.maxMembers * 12).toLocaleString()} annually.</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* STEP 3 */}
//         {currentStep === 3 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "32px", borderRadius: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}><span className="material-symbols-outlined" style={{ color: "#006b2c" }}>gavel</span><h2 style={{ fontSize: "22px", fontWeight: 600 }}>Governance & Consensus</h2></div>
//             <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
//               <div className="voting-card" style={{ display: "flex", alignItems: "flex-start", gap: "20px", padding: "20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid rgba(189, 202, 186, 0.3)", flexWrap: "wrap" }}>
//                 <div style={{ width: "44px", height: "44px", borderRadius: "8px", backgroundColor: "#00873a", display: "flex", alignItems: "center", justifyContent: "center", color: "#f7fff2", flexShrink: 0 }}><span className="material-symbols-outlined">how_to_vote</span></div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>Voting Threshold</h4>
//                   <p style={{ fontSize: "13px", color: "#3e4a3d", marginBottom: "20px" }}>How many members must approve changes?</p>
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
//                     {[{ value: "simple", label: "51%" }, { value: "super", label: "66%" }, { value: "unanimous", label: "100%" }].map((opt) => (
//                       <button key={opt.value} onClick={() => updateForm("votingThreshold", opt.value)}
//                         style={{ padding: "8px 18px", borderRadius: "9999px", border: form.votingThreshold === opt.value ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.votingThreshold === opt.value ? "#006b2c" : "transparent", color: form.votingThreshold === opt.value ? "#ffffff" : "#3e4a3d", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>{opt.label}</button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//               <div>
//                 <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Role Assignments</h4>
//                 <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", flexWrap: "wrap", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "28px", height: "28px", borderRadius: "4px", backgroundColor: "#cbdbf5", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>shield</span></div><span style={{ fontSize: "13px", fontWeight: 500 }}>Administrator (You)</span></div><span style={{ fontSize: "11px", color: "#3e4a3d" }}>Full Control</span></div>
//                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", border: "2px dashed rgba(189, 202, 186, 0.3)", borderRadius: "8px", flexWrap: "wrap", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#3e4a3d" }}><div style={{ width: "28px", height: "28px", borderRadius: "4px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span></div><span style={{ fontSize: "13px", fontWeight: 500 }}>Add Auditor...</span></div><span style={{ color: "#006b2c", fontWeight: 700, fontSize: "12px" }}>Invite</span></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* STEP 4 */}
//         {currentStep === 4 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "32px", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
//             <div style={{ position: "absolute", top: 0, right: 0, padding: "30px", opacity: 0.08 }}><span className="material-symbols-outlined" style={{ fontSize: "100px", color: "#006b2c" }}>verified</span></div>
//             <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "48px", position: "relative", zIndex: 10 }}>
//               <div style={{ width: "64px", height: "64px", backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}><span className="material-symbols-outlined" style={{ fontSize: "36px" }}>auto_awesome</span></div>
//               <h2 style={{ fontSize: "28px", fontWeight: 700 }}>Almost Ready to Launch</h2>
//               <p style={{ color: "#3e4a3d", maxWidth: "400px", fontSize: "15px" }}>Review your Wealth Circle configuration before finalizing.</p>
//             </div>
//             <div className="review-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderTop: "1px solid rgba(189, 202, 186, 0.3)", paddingTop: "32px", position: "relative", zIndex: 10 }}>
//               <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//                 <div><span style={tag}>Identity</span><p style={{ fontSize: "22px", fontWeight: 600 }}>{form.name || "Untitled"}</p><p style={{ fontSize: "13px", color: "#3e4a3d" }}>{form.template} • {form.category}</p></div>
//                 <div><span style={tag}>Financial Structure</span><div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}><div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "16px" }}>₦{form.contributionAmount.toLocaleString()}</p><p style={{ fontSize: "11px", color: "#3e4a3d" }}>/month</p></div><div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "16px" }}>{form.interestRate}%</p><p style={{ fontSize: "11px", color: "#3e4a3d" }}>Yield p.a.</p></div><div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "16px" }}>{form.maxMembers}</p><p style={{ fontSize: "11px", color: "#3e4a3d" }}>Max Members</p></div></div></div>
//               </div>
//               <div><div style={{ backgroundColor: "rgba(220, 233, 255, 0.5)", padding: "20px", borderRadius: "8px" }}><span style={tag}>Smart Rules</span><ul style={{ display: "flex", flexDirection: "column", gap: "6px", listStyle: "none", padding: 0 }}><li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "16px" }}>check_circle</span>AI-Automated Payouts</li><li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "16px" }}>check_circle</span>{form.votingThreshold === "simple" ? "51%" : form.votingThreshold === "super" ? "66%" : "100%"} Consensus</li><li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "16px" }}>check_circle</span>Encrypted Audit Logging</li></ul></div></div>
//             </div>
//           </div>
//         )}

//         {/* Navigation */}
//         <div className="wizard-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "36px", flexWrap: "wrap", gap: "12px" }}>
//           <button onClick={() => navigateWizard(-1)} disabled={currentStep === 1}
//             style={{ padding: "14px 32px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", cursor: currentStep === 1 ? "not-allowed" : "pointer", opacity: currentStep === 1 ? 0.3 : 1 }}>Back</button>
//           <div style={{ display: "flex", gap: "12px" }}>
//             <Link href="/groups" style={{ padding: "14px 32px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", textDecoration: "none" }}>Cancel</Link>
//             {currentStep < 4 ? (
//               <button onClick={() => navigateWizard(1)} style={{ padding: "14px 48px", backgroundColor: "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>Continue</button>
//             ) : (
//               <button onClick={handleLaunch} disabled={loading || !form.name.trim()}
//                 style={{ padding: "14px 48px", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: loading || !form.name.trim() ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>{loading ? "Creating..." : "Launch Group"}</button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Mobile Responsive Styles */}
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .wizard-title { font-size: 28px !important; }
//           .templates-grid { grid-template-columns: 1fr !important; }
//           .template-card { padding: 16px !important; }
//           .template-desc { font-size: 11px !important; }
//           .form-row-2 { grid-template-columns: 1fr !important; }
//           .financials-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
//           .review-grid { grid-template-columns: 1fr !important; }
//           .wizard-nav { flex-direction: column !important; align-items: stretch !important; }
//           .wizard-nav button, .wizard-nav a { text-align: center; justify-content: center; width: 100%; }
//           .progress-bar { max-width: 100% !important; }
//           .progress-label { font-size: 9px !important; }
//           .voting-card { flex-direction: column !important; }
//         }
//         @media (max-width: 400px) {
//           .wizard-container { padding: 24px 16px !important; }
//           .wizard-title { font-size: 24px !important; }
//         }
//       `}</style>
//     </div>
//   );
// }

// const lbl: React.CSSProperties = { fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", marginBottom: "6px", display: "block" };
// const tag: React.CSSProperties = { fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" };
// const rule: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" };





// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// type Step = 1 | 2 | 3 | 4;

// interface GroupForm {
//   name: string;
//   category: string;
//   description: string;
//   template: string;
//   contributionAmount: number;
//   payoutFrequency: string;
//   interestRate: number;
//   maxMembers: number;
//   votingThreshold: string;
// }

// export default function CreateGroupPage() {
//   const router = useRouter();
//   const supabase = createClient();

//   const [currentStep, setCurrentStep] = useState<Step>(1);
//   const [loading, setLoading] = useState(false);
//   const [form, setForm] = useState<GroupForm>({
//     name: "",
//     category: "Investment",
//     description: "",
//     template: "Fixed Savings",
//     contributionAmount: 50000,
//     payoutFrequency: "monthly",
//     interestRate: 8.5,
//     maxMembers: 12,
//     votingThreshold: "simple",
//   });

//   const updateForm = (field: keyof GroupForm, value: any) => {
//     setForm((prev) => ({ ...prev, [field]: value }));
//   };

//   const navigateWizard = (direction: number) => {
//     const nextStep = currentStep + direction;
//     if (nextStep < 1 || nextStep > 4) return;
//     setCurrentStep(nextStep as Step);
//   };

// const handleLaunch = async () => {
//   setLoading(true);
//   try {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;

//     const isRotatingAjo = form.template === "Rotating Ajo";

//     const { data: group, error } = await supabase
//       .from("groups")
//       .insert({
//         name: form.name,
//         description: form.description,
//         max_members: form.maxMembers,
//         contribution_amount: form.contributionAmount,
//         created_by: user.id,
//         status: "active",
//         cycle_number: 1,
//         rotation_order: isRotatingAjo ? [user.id] : [], // Start with creator
//         current_rotation_index: isRotatingAjo ? 0 : 0,
//         next_payout_date: isRotatingAjo ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null, // 30 days from now
//       })
//       .select()
//       .single();

//     if (error) throw error;

//     // Add creator as admin with rotation position 1
//     await supabase.from("group_members").insert({
//       group_id: group.id,
//       user_id: user.id,
//       role: "admin",
//       rotation_position: 1,
//     });

//     await supabase.from("groups").update({ member_count: 1 }).eq("id", group.id);
//     router.push(`/groups/${group.id}`);
//   } catch (err) {
//     console.error("Failed to create group:", err);
//   } finally {
//     setLoading(false);
//   }
// };

//   const templates = [
//     { id: "SME Fund", icon: "business_center", title: "SME Fund", desc: "Collaborative business loans with fixed monthly returns." },
//     { id: "Fixed Savings", icon: "savings", title: "Fixed Savings", desc: "Goal-oriented group savings with high-yield interest." },
//     { id: "Rotating Ajo", icon: "cached", title: "Rotating Ajo", desc: "Traditional rotating credit with digitized payout orders." },
//   ];

//   const inputStyle: React.CSSProperties = {
//     width: "100%", padding: "16px", backgroundColor: "#ffffff",
//     border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "8px", outline: "none",
//     fontSize: "16px", lineHeight: "24px", fontFamily: "'Inter', sans-serif",
//     transition: "all 0.2s", boxSizing: "border-box",
//   };

//   const selectStyle: React.CSSProperties = {
//     ...inputStyle, cursor: "pointer", appearance: "none",
//     backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236e7b6c' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
//     backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "40px",
//   };

//   const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
//   };
//   const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none";
//   };

//   const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

//   return (
//     <div style={{ backgroundColor: "#eff4ff", minHeight: "100vh" }}>
//       <div style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 24px" }}>
//         {/* Header */}
//         <div style={{ textAlign: "center", marginBottom: "40px" }}>
//           <h1 style={{ fontSize: "48px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "8px" }}>
//             Create Your Wealth Circle
//           </h1>
//           <p style={{ fontSize: "18px", color: "#3e4a3d" }}>
//             Launch a transparent, AI-governed financial group in minutes.
//           </p>
//         </div>

//         {/* Progress Indicator */}
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "672px", margin: "0 auto 40px", position: "relative" }}>
//           <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: "2px", backgroundColor: "#e5eeff", transform: "translateY(-50%)", zIndex: 0 }} />
//           <div style={{ position: "absolute", top: "50%", left: 0, height: "2px", backgroundColor: "#006b2c", transform: "translateY(-50%)", zIndex: 0, transition: "width 0.5s", width: progressWidth }} />
//           {["Info", "Financials", "Governance", "Review"].map((label, i) => {
//             const stepNum = i + 1;
//             const isComplete = stepNum < currentStep;
//             const isActive = stepNum === currentStep;
//             return (
//               <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", position: "relative", zIndex: 10 }}>
//                 <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isComplete || isActive ? "#006b2c" : "#e5eeff", color: isComplete || isActive ? "#ffffff" : "#3e4a3d", boxShadow: isActive ? "0 0 0 4px rgba(0, 107, 44, 0.2)" : "0 0 0 4px #f8f9ff", fontWeight: 700, fontSize: "14px", transition: "all 0.3s" }}>
//                   {isComplete ? <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check</span> : stepNum}
//                 </div>
//                 <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: isActive ? "#006b2c" : "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
//               </div>
//             );
//           })}
//         </div>

//         {/* STEP 1: Basic Info */}
//         {currentStep === 1 && (
//           <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//               {templates.map((tpl) => (
//                 <button key={tpl.id} onClick={() => updateForm("template", tpl.id)}
//                   style={{ background: form.template === tpl.id ? "rgba(0, 107, 44, 0.05)" : "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: form.template === tpl.id ? "2px solid #006b2c" : "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "24px", borderRadius: "12px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
//                   <span className="material-symbols-outlined" style={{ color: "#006b2c", marginBottom: "16px", display: "block", fontSize: "28px" }}>{tpl.icon}</span>
//                   <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>{tpl.title}</h3>
//                   <p style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{tpl.desc}</p>
//                 </button>
//               ))}
//             </div>
//             <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "24px" }}>
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
//                 <div>
//                   <label style={lbl}>Group Name</label>
//                   <input type="text" placeholder="e.g., Tech Visionaries 2026" value={form.name} onChange={(e) => updateForm("name", e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
//                 </div>
//                 <div>
//                   <label style={lbl}>Category</label>
//                   <select value={form.category} onChange={(e) => updateForm("category", e.target.value)} style={selectStyle}>
//                     <option>Investment</option><option>Social Savings</option><option>Real Estate</option><option>Emergency Fund</option>
//                   </select>
//                 </div>
//               </div>
//               <div>
//                 <label style={lbl}>Description</label>
//                 <textarea placeholder="Briefly describe the purpose..." rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* STEP 2: Financials */}
//         {currentStep === 2 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
//               <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>payments</span>
//               <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Financial Framework</h2>
//             </div>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px" }}>
//               <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//                 <div>
//                   <label style={lbl}>Monthly Contribution (₦)</label>
//                   <div style={{ position: "relative" }}>
//                     <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#3e4a3d", fontSize: "16px" }}>₦</span>
//                     <input type="number" value={form.contributionAmount} onChange={(e) => updateForm("contributionAmount", Number(e.target.value))} style={{ ...inputStyle, paddingLeft: "48px" }} onFocus={focusIn} onBlur={focusOut} />
//                   </div>
//                 </div>
//                 <div>
//                   <label style={lbl}>Payout Frequency</label>
//                   <div style={{ display: "flex", gap: "16px" }}>
//                     {["monthly", "quarterly"].map((freq) => (
//                       <button key={freq} onClick={() => updateForm("payoutFrequency", freq)}
//                         style={{ flex: 1, padding: "8px", borderRadius: "8px", border: form.payoutFrequency === freq ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.payoutFrequency === freq ? "rgba(0, 107, 44, 0.1)" : "transparent", color: form.payoutFrequency === freq ? "#006b2c" : "#3e4a3d", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>
//                         {freq}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//                 <div>
//                   <label style={lbl}>Max Members</label>
//                   <input type="number" value={form.maxMembers} onChange={(e) => updateForm("maxMembers", Number(e.target.value))} min={2} max={50} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
//                 </div>
//               </div>
//               <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//                 <div>
//                   <label style={{ ...lbl, display: "flex", justifyContent: "space-between" }}>Target Interest Rate <span style={{ color: "#006b2c" }}>{form.interestRate}% p.a.</span></label>
//                   <input type="range" min={1} max={20} step={0.5} value={form.interestRate} onChange={(e) => updateForm("interestRate", Number(e.target.value))} style={{ width: "100%", accentColor: "#006b2c", height: "8px" }} />
//                 </div>
//                 <div style={{ padding: "24px", backgroundColor: "#eff4ff", borderRadius: "8px", border: "1px solid rgba(189, 202, 186, 0.2)" }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#006b2c", marginBottom: "8px" }}>
//                     <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span>
//                     <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif" }}>Smart Treasurer Insight</span>
//                   </div>
//                   <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                     With {form.maxMembers} members contributing ₦{form.contributionAmount.toLocaleString()}, your group pool will grow to ₦{(form.contributionAmount * form.maxMembers * 12).toLocaleString()} annually.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* STEP 3: Governance */}
//         {currentStep === 3 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
//               <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>gavel</span>
//               <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Governance & Consensus</h2>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
//               <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", padding: "24px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid rgba(189, 202, 186, 0.3)" }}>
//                 <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "#00873a", display: "flex", alignItems: "center", justifyContent: "center", color: "#f7fff2", flexShrink: 0 }}><span className="material-symbols-outlined">how_to_vote</span></div>
//                 <div style={{ flex: 1 }}>
//                   <h4 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Voting Threshold</h4>
//                   <p style={{ fontSize: "14px", color: "#3e4a3d", marginBottom: "24px" }}>How many members must approve a new investment or payout change?</p>
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                     {[{ value: "simple", label: "Simple Majority (51%)" }, { value: "super", label: "Super Majority (66%)" }, { value: "unanimous", label: "Unanimous (100%)" }].map((opt) => (
//                       <button key={opt.value} onClick={() => updateForm("votingThreshold", opt.value)}
//                         style={{ padding: "8px 24px", borderRadius: "9999px", border: form.votingThreshold === opt.value ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.votingThreshold === opt.value ? "#006b2c" : "transparent", color: form.votingThreshold === opt.value ? "#ffffff" : "#3e4a3d", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", cursor: "pointer", transition: "all 0.2s" }}>
//                         {opt.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//               <div>
//                 <h4 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>Role Assignments</h4>
//                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
//                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px" }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: "16px" }}><div style={{ width: "32px", height: "32px", borderRadius: "4px", backgroundColor: "#cbdbf5", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>shield</span></div><span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>Administrator (You)</span></div>
//                     <span style={{ fontSize: "12px", color: "#3e4a3d" }}>Full Control</span>
//                   </div>
//                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "2px dashed rgba(189, 202, 186, 0.3)", borderRadius: "8px" }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#3e4a3d" }}><div style={{ width: "32px", height: "32px", borderRadius: "4px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span></div><span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>Add Auditor...</span></div>
//                     <span style={{ color: "#006b2c", fontWeight: 700, fontSize: "12px" }}>Invite</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* STEP 4: Review */}
//         {currentStep === 4 && (
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
//             <div style={{ position: "absolute", top: 0, right: 0, padding: "40px", opacity: 0.1 }}><span className="material-symbols-outlined" style={{ fontSize: "120px", color: "#006b2c" }}>verified</span></div>
//             <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 10 }}>
//               <div style={{ width: "80px", height: "80px", backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}><span className="material-symbols-outlined" style={{ fontSize: "48px" }}>auto_awesome</span></div>
//               <h2 style={{ fontSize: "32px", fontWeight: 700 }}>Almost Ready to Launch</h2>
//               <p style={{ color: "#3e4a3d", maxWidth: "448px" }}>Review your Wealth Circle configuration before finalizing.</p>
//             </div>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", borderTop: "1px solid rgba(189, 202, 186, 0.3)", paddingTop: "40px", position: "relative", zIndex: 10 }}>
//               <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//                 <div>
//                   <span style={tag}>Identity</span>
//                   <p style={{ fontSize: "24px", fontWeight: 600 }}>{form.name || "Untitled Group"}</p>
//                   <p style={{ fontSize: "14px", color: "#3e4a3d" }}>{form.template} • {form.category}</p>
//                 </div>
//                 <div>
//                   <span style={tag}>Financial Structure</span>
//                   <div style={{ display: "flex", gap: "40px" }}>
//                     <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>₦{form.contributionAmount.toLocaleString()}</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>/month</p></div>
//                     <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>{form.interestRate}%</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>Yield p.a.</p></div>
//                     <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>{form.maxMembers}</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>Max Members</p></div>
//                   </div>
//                 </div>
//               </div>
//               <div>
//                 <div style={{ backgroundColor: "rgba(220, 233, 255, 0.5)", padding: "24px", borderRadius: "8px" }}>
//                   <span style={tag}>Smart Rules</span>
//                   <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0 }}>
//                     <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>AI-Automated Payout Schedules</li>
//                     <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>{form.votingThreshold === "simple" ? "51%" : form.votingThreshold === "super" ? "66%" : "100%"} Consensus</li>
//                     <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>Encrypted Audit Logging</li>
//                   </ul>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Navigation */}
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px" }}>
//           <button onClick={() => navigateWizard(-1)} disabled={currentStep === 1}
//             style={{ padding: "16px 40px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", cursor: currentStep === 1 ? "not-allowed" : "pointer", opacity: currentStep === 1 ? 0.3 : 1 }}>
//             Back
//           </button>
//           <div style={{ display: "flex", gap: "16px" }}>
//             <Link href="/groups" style={{ padding: "16px 40px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", textDecoration: "none" }}>Cancel</Link>
//             {currentStep < 4 ? (
//               <button onClick={() => navigateWizard(1)} style={{ padding: "16px 64px", backgroundColor: "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>Continue</button>
//             ) : (
//               <button onClick={handleLaunch} disabled={loading || !form.name.trim()}
//                 style={{ padding: "16px 64px", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: loading || !form.name.trim() ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>
//                 {loading ? "Creating..." : "Launch Group"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// const lbl: React.CSSProperties = { fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", marginBottom: "8px", display: "block" };
// const tag: React.CSSProperties = { fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" };
// const rule: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" };