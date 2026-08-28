"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  const [verification, setVerification] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  /*
   * ---------------------------------------------------------
   * FETCH VERIFICATION
   * ---------------------------------------------------------
   */

  const fetchVerification = useCallback(async () => {
    if (!id) return;

    setVerificationLoading(true);

    const { data, error } = await supabase
      .from("verification_submissions")
      .select("*")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(
        "Kolo verification lookup:",
        error.message
      );

      setVerification(null);
    } else {
      setVerification(data || null);
    }

    setVerificationLoading(false);
  }, [id, supabase]);

  /*
   * ---------------------------------------------------------
   * FETCH GROUP DATA
   * ---------------------------------------------------------
   */

  const fetchAllData = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    /*
     * GROUP
     */
    const { data: groupData, error: groupError } =
      await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

    if (groupError || !groupData) {
      console.error(
        "Unable to load group:",
        groupError
      );

      setGroup(null);
      setLoading(false);
      return;
    }

    setGroup(groupData);

    /*
     * MEMBERS
     */
    const { data: memberData, error: membersError } =
      await supabase
        .from("group_members")
        .select(
          `
          user_id,
          role,
          joined_at,
          rotation_position,
          has_received_payout,
          payout_amount
        `
        )
        .eq("group_id", id);

    if (membersError) {
      console.error(
        "Unable to load members:",
        membersError
      );

      setMembers([]);
    } else if (memberData?.length) {
      const userIds = memberData.map(
        (member: any) => member.user_id
      );

      const {
        data: profilesData,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url"
        )
        .in("id", userIds);

      const membersWithProfiles =
        memberData.map((member: any) => {
          const profile =
            profilesData?.find(
              (profile: any) =>
                profile.id === member.user_id
            );

          return {
            ...member,
            profiles:
              profile || {
                full_name: `User ${member.user_id.slice(
                  0,
                  6
                )}`,
                avatar_url: null,
              },
          };
        });

      setMembers(
        membersWithProfiles
      );
    } else {
      setMembers([]);
    }

    /*
     * CONTRIBUTIONS
     */
    const {
      data: contributionData,
      error: contributionError,
    } = await supabase
      .from("contributions")
      .select("*")
      .eq("group_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (contributionError) {
      console.error(
        "Unable to load contributions:",
        contributionError
      );

      setContributions([]);
    } else {
      setContributions(
        contributionData || []
      );
    }

    setLoading(false);
  }, [id, supabase, router]);

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!id) return;

    fetchAllData();
    fetchVerification();
  }, [
    id,
    fetchAllData,
    fetchVerification,
  ]);

  /*
   * ---------------------------------------------------------
   * REFRESH WHEN USER RETURNS TO PAGE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleFocus = () => {
      fetchAllData();
      fetchVerification();
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        fetchAllData();
        fetchVerification();
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    fetchAllData,
    fetchVerification,
  ]);

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  const formatNaira = (
    amount: number
  ) =>
    `₦${Number(amount || 0).toLocaleString(
      "en-NG"
    )}`;

  const formatDate = (
    dateStr: string
  ) => {
    if (!dateStr) return "—";

    return new Date(
      dateStr
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getInitials = (
    name: string
  ) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  /*
   * ---------------------------------------------------------
   * CALCULATED VALUES
   * ---------------------------------------------------------
   */

  const totalContributions =
    contributions
      .filter(
        (c) => c.status === "completed"
      )
      .reduce(
        (sum, c) =>
          sum + Number(c.amount || 0),
        0
      );

  const pendingMembers =
    contributions.filter(
      (c) => c.status === "pending"
    ).length;

  const contributionAmount =
    Number(
      group?.contribution_amount || 50000
    );

  const isRotatingAjo =
    Array.isArray(
      group?.rotation_order
    ) &&
    group.rotation_order.length > 0;

  const totalPayout =
    contributionAmount *
    members.length;

  /*
   * IMPORTANT:
   * A user is an admin if:
   *
   * 1. They are explicitly an admin in
   *    group_members
   *
   * OR
   *
   * 2. They created the group.
   */

  const isAdmin =
    Boolean(
      group?.created_by ===
        currentUserId
    ) ||
    members.some(
      (member: any) =>
        member.user_id ===
          currentUserId &&
        member.role === "admin"
    );

  /*
   * ---------------------------------------------------------
   * PAYOUT
   * ---------------------------------------------------------
   */

  const handleMarkPayout = async () => {
    /*
     * Double protection in UI.
     */
    if (!isAdmin) {
      return;
    }

    if (!isRotatingAjo) {
      return;
    }

    setProcessingPayout(true);

    try {
      const currentIndex =
        Number(
          group.current_rotation_index ||
            0
        );

      const currentRecipientId =
        group.rotation_order?.[
          currentIndex
        ];

      if (!currentRecipientId) {
        throw new Error(
          "No current payout recipient."
        );
      }

      /*
       * Mark current recipient as paid.
       */
      const {
        error: memberError,
      } = await supabase
        .from("group_members")
        .update({
          has_received_payout: true,
          payout_received_at:
            new Date().toISOString(),
          payout_amount: totalPayout,
        })
        .eq("group_id", id)
        .eq(
          "user_id",
          currentRecipientId
        );

      if (memberError) {
        throw memberError;
      }

      /*
       * Move rotation forward.
       */
      const nextIndex =
        (currentIndex + 1) %
        group.rotation_order.length;

      const {
        error: groupUpdateError,
      } = await supabase
        .from("groups")
        .update({
          current_rotation_index:
            nextIndex,

          last_payout_date:
            new Date().toISOString(),

          next_payout_date:
            new Date(
              Date.now() +
                30 *
                  24 *
                  60 *
                  60 *
                  1000
            ).toISOString(),
        })
        .eq("id", id);

      if (groupUpdateError) {
        throw groupUpdateError;
      }

      await fetchAllData();
    } catch (error) {
      console.error(
        "Payout error:",
        error
      );
    } finally {
      setProcessingPayout(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          color: "#3e4a3d",
          fontSize: "16px",
        }}
      >
        Loading group details...
      </div>
    );
  }

  if (!group) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          color: "#3e4a3d",
          fontSize: "16px",
        }}
      >
        Group not found.
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * VERIFICATION STATES
   * ---------------------------------------------------------
   */

  const verificationStatus =
    verification?.status || null;

  const verificationSubmitted =
    verificationStatus ===
      "submitted" ||
    verificationStatus ===
      "under_review";

  const verificationVerified =
    verificationStatus ===
    "verified";

  const verificationNeedsChanges =
    verificationStatus ===
    "needs_changes";

  const verificationRejected =
    verificationStatus ===
    "rejected";

  /*
   * Admin can start/restart only when:
   *
   * - no submission exists
   * - needs_changes
   * - rejected
   *
   * They cannot restart while submitted,
   * under review or verified.
   */

  const canStartVerification =
    isAdmin &&
    !verificationSubmitted &&
    !verificationVerified;

  return (
    <>
      {/* =====================================================
          TOP HEADER
      ====================================================== */}

      <header
        className="group-header"
        style={{
          width: "100%",
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor:
            "rgba(248, 249, 255, 0.7)",
          backdropFilter:
            "blur(12px)",
          borderBottom:
            "1px solid rgba(189, 202, 186, 0.3)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: "24px",
          marginLeft: "-24px",
          marginRight: "-24px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        <div
          className="header-inner"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            padding: "12px 0",
            maxWidth: "1280px",
            margin: "0 auto",
            width: "100%",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <Link
              href="/groups"
              style={{
                color: "#3e4a3d",
                textDecoration:
                  "none",
                display: "flex",
                alignItems:
                  "center",
              }}
            >
              <span className="material-symbols-outlined">
                arrow_back
              </span>
            </Link>

            <div>
              <h2
                className="group-title"
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: 600,
                  fontFamily:
                    "'Inter', sans-serif",
                  color: "#006b2c",
                }}
              >
                {group.name}
              </h2>

              {isRotatingAjo && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#825100",
                    fontFamily:
                      "'Geist', sans-serif",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "4px",
                  }}
                >
                  <span className="material-symbols-outlined">
                    cached
                  </span>

                  Rotating Ajo
                </span>
              )}
            </div>
          </div>

          <div
            className="header-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                fetchAllData();
                fetchVerification();
              }}
              title="Refresh"
              style={{
                padding: "8px",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  "#e5eeff",
                color: "#006b2c",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <span className="material-symbols-outlined">
                refresh
              </span>
            </button>

            {/* ADMIN ONLY */}
            {isAdmin && (
              <Link
                href={`/groups/${id}/add-members`}
                className="add-members-btn"
                style={{
                  padding:
                    "10px 20px",
                  backgroundColor:
                    "#006b2c",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: "14px",
                  fontFamily:
                    "'Geist', sans-serif",
                  textDecoration:
                    "none",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  whiteSpace:
                    "nowrap",
                }}
              >
                <span className="material-symbols-outlined">
                  person_add
                </span>

                <span className="btn-label">
                  Add Members
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          KOLO VERIFICATION
      ====================================================== */}

      <section
        id="verification"
        style={{
          marginBottom: "24px",
          borderRadius: "14px",
          border:
            "1px solid rgba(189, 202, 186, 0.55)",
          backgroundColor:
            verificationVerified
              ? "#eff8f2"
              : "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding:
              "18px 20px",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius:
                  "10px",
                backgroundColor:
                  verificationVerified
                    ? "#006b2c"
                    : "#eff8f2",
                color:
                  verificationVerified
                    ? "#ffffff"
                    : "#006b2c",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined">
                {verificationVerified
                  ? "verified"
                  : "verified_user"}
              </span>
            </div>

            <div>
              <div
                style={{
                  color:
                    "#006b2c",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing:
                    "0.1em",
                  marginBottom:
                    "4px",
                }}
              >
                KOLO TRUST
              </div>

              <h3
                style={{
                  margin: 0,
                  color:
                    "#0b1c30",
                  fontSize:
                    "16px",
                  fontWeight:
                    650,
                  fontFamily:
                    "'Inter', sans-serif",
                }}
              >
                {verificationVerified
                  ? "Kolo Verified Cooperative"
                  : verificationStatus ===
                        "submitted" ||
                    verificationStatus ===
                        "under_review"
                  ? "Verification under review"
                  : verificationNeedsChanges
                  ? "Verification needs changes"
                  : verificationRejected
                  ? "Verification not approved"
                  : "Become Kolo Verified"}
              </h3>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color:
                    "#526171",
                  fontSize:
                    "10px",
                  lineHeight: 1.5,
                }}
              >
                {verificationVerified
                  ? "The submitted cooperative information has completed Kolo's recorded verification review."
                  : verificationSubmitted
                  ? "Your verification submission has been received and is waiting for review."
                  : verificationNeedsChanges
                  ? "Kolo has requested changes before this cooperative can be verified."
                  : verificationRejected
                  ? "This submission did not pass the recorded review. The administrator can correct the issues and submit again."
                  : "Submit your cooperative information for review and give members a clearer trust signal."}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "8px",
            }}
          >
            {/* ADMIN ONLY */}
            {canStartVerification && (
              <Link
                href={`/groups/${id}/verification`}
                style={{
                  border: "none",
                  borderRadius:
                    "8px",
                  padding:
                    "10px 14px",
                  backgroundColor:
                    "#006b2c",
                  color:
                    "#ffffff",
                  fontSize: "9px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "6px",
                  textDecoration:
                    "none",
                  whiteSpace:
                    "nowrap",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize:
                      "16px",
                  }}
                >
                  {verificationNeedsChanges ||
                  verificationRejected
                    ? "edit"
                    : "arrow_forward"}
                </span>

                {verificationNeedsChanges ||
                verificationRejected
                  ? "Update Verification"
                  : "Start Verification"}
              </Link>
            )}

            {verificationSubmitted && (
              <span
                style={{
                  padding:
                    "7px 10px",
                  borderRadius:
                    "999px",
                  backgroundColor:
                    "#fff4df",
                  color:
                    "#825100",
                  fontSize: "7px",
                  fontWeight: 800,
                  letterSpacing:
                    ".06em",
                }}
              >
                UNDER REVIEW
              </span>
            )}

            {verificationVerified && (
              <span
                style={{
                  padding:
                    "7px 10px",
                  borderRadius:
                    "999px",
                  backgroundColor:
                    "#dff2e5",
                  color:
                    "#006b2c",
                  fontSize: "7px",
                  fontWeight: 800,
                  letterSpacing:
                    ".06em",
                }}
              >
                ✓ VERIFIED
              </span>
            )}

            {verificationNeedsChanges && (
              <span
                style={{
                  padding:
                    "7px 10px",
                  borderRadius:
                    "999px",
                  backgroundColor:
                    "#fff4df",
                  color:
                    "#825100",
                  fontSize: "7px",
                  fontWeight: 800,
                }}
              >
                ACTION REQUIRED
              </span>
            )}
          </div>
        </div>

        {/* VERIFICATION PROGRESS */}

        <div
          className="verification-steps"
          style={{
            borderTop:
              "1px solid rgba(189, 202, 186, 0.35)",
            padding:
              "13px 20px",
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "8px",
            backgroundColor:
              "rgba(248,249,255,.55)",
          }}
        >
          {[
            [
              "1",
              "Cooperative",
              Boolean(
                verification
                  ?.cooperative_name
              ),
            ],
            [
              "2",
              "Administrator",
              Boolean(
                verification
                  ?.administrator_user_id
              ),
            ],
            [
              "3",
              "Account",
              Boolean(
                verification
                  ?.account_name
              ),
            ],
            [
              "4",
              "Review",
              verificationVerified,
            ],
          ].map(
            ([
              number,
              label,
              done,
            ]) => (
              <div
                key={String(
                  number
                )}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "7px",
                  color: done
                    ? "#006b2c"
                    : "#89949f",
                  fontSize: "7px",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "19px",
                    height: "19px",
                    borderRadius:
                      "50%",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    backgroundColor:
                      done
                        ? "#dff2e5"
                        : "#eef2f0",
                    color: done
                      ? "#006b2c"
                      : "#89949f",
                    fontSize:
                      "7px",
                  }}
                >
                  {done
                    ? "✓"
                    : number}
                </span>

                {label}
              </div>
            )
          )}
        </div>
      </section>

      {/* =====================================================
          KPI ROW
      ====================================================== */}

      <section
        className="kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "20px",
          marginBottom:
            "24px",
        }}
      >
        {[
          {
            label:
              "Total Pooled",
            value:
              formatNaira(
                group.pool_amount ||
                  totalContributions ||
                  0
              ),
            sub: `Cycle ${
              group.cycle_number ||
              1
            }`,
          },

          {
            label:
              "Contribution",
            value:
              formatNaira(
                contributionAmount
              ),
            sub:
              "Per member / cycle",
          },

          {
            label: "Members",
            value: `${members.length} / ${
              group.max_members ||
              20
            }`,
            sub: `${Math.round(
              (members.length /
                (group.max_members ||
                  20)) *
                100
            )}% filled`,
          },

          {
            label:
              isRotatingAjo
                ? "Next Payout"
                : "Status",

            value: isRotatingAjo
              ? group.next_payout_date
                ? formatDate(
                    group.next_payout_date
                  )
                : "TBD"
              : group.status ===
                "active"
              ? "Active"
              : group.status ||
                "Active",

            sub: isRotatingAjo
              ? `${formatNaira(
                  totalPayout
                )} pool`
              : `${pendingMembers} pending`,
          },
        ].map(
          (kpi) => (
            <div
              key={kpi.label}
              className="kpi-card"
              style={{
                background:
                  "rgba(255,255,255,.8)",
                backdropFilter:
                  "blur(12px)",
                border:
                  "1px solid rgba(226,232,240,.8)",
                boxShadow:
                  "0 4px 20px rgba(15,23,42,.04)",
                borderRadius:
                  "12px",
                padding:
                  "22px",
              }}
            >
              <p
                style={{
                  fontSize:
                    "13px",
                  fontWeight:
                    500,
                  fontFamily:
                    "'Geist', sans-serif",
                  color:
                    "#3e4a3d",
                  marginBottom:
                    "6px",
                }}
              >
                {kpi.label}
              </p>

              <h3
                className="kpi-value"
                style={{
                  fontSize:
                    "24px",
                  fontWeight:
                    700,
                  fontFamily:
                    "'Inter', sans-serif",
                  color:
                    kpi.label ===
                    "Total Pooled"
                      ? "#006b2c"
                      : "#0b1c30",
                  marginBottom:
                    "4px",
                }}
              >
                {kpi.value}
              </h3>

              <p
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#6e7b6c",
                  fontFamily:
                    "'Geist', sans-serif",
                }}
              >
                {kpi.sub}
              </p>
            </div>
          )
        )}
      </section>

      {/* =====================================================
          ROTATING AJO
      ====================================================== */}

      {isRotatingAjo && (
        <section
          className="ajo-tracker"
          style={{
            background:
              "rgba(255,255,255,.8)",
            backdropFilter:
              "blur(12px)",
            border:
              "1px solid rgba(255,221,184,.5)",
            boxShadow:
              "0 4px 20px rgba(130,81,0,.06)",
            borderRadius:
              "12px",
            padding:
              "24px",
            marginBottom:
              "24px",
          }}
        >
          <div
            className="ajo-header"
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "20px",
              flexWrap:
                "wrap",
              gap: "12px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius:
                    "12px",
                  backgroundColor:
                    "rgba(130,81,0,.1)",
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
                    color:
                      "#825100",
                    fontSize:
                      "28px",
                  }}
                >
                  cached
                </span>
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize:
                      "20px",
                    fontWeight:
                      600,
                    color:
                      "#0b1c30",
                  }}
                >
                  Rotating Ajo —
                  Payout Order
                </h3>

                <p
                  style={{
                    fontSize:
                      "13px",
                    color:
                      "#3e4a3d",
                  }}
                >
                  Each member
                  receives{" "}
                  <strong>
                    {formatNaira(
                      totalPayout
                    )}
                  </strong>{" "}
                  when it's
                  their turn
                </p>
              </div>
            </div>

            {group.next_payout_date && (
              <div
                style={{
                  textAlign:
                    "right",
                }}
              >
                <p
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "#6e7b6c",
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".05em",
                  }}
                >
                  Next Payout
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      "18px",
                    fontWeight:
                      600,
                    color:
                      "#825100",
                  }}
                >
                  {formatDate(
                    group.next_payout_date
                  )}
                </p>
              </div>
            )}
          </div>

          <div
            className="rotation-timeline"
            style={{
              display:
                "flex",
              alignItems:
                "center",
              overflowX:
                "auto",
              padding:
                "20px 8px",
              gap: "0",
            }}
          >
            {group.rotation_order.map(
              (
                userId: string,
                index: number
              ) => {
                const member =
                  members.find(
                    (m: any) =>
                      m.user_id ===
                      userId
                  );

                const isCurrentRecipient =
                  index ===
                  group.current_rotation_index;

                const hasReceived =
                  member?.has_received_payout;

                const memberName =
                  member?.profiles
                    ?.full_name ||
                  `User ${userId.slice(
                    0,
                    6
                  )}`;

                const isPast =
                  index <
                  group.current_rotation_index;

                return (
                  <div
                    key={userId}
                    className="rotation-item"
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius:
                            "50%",
                          backgroundColor:
                            isCurrentRecipient
                              ? "#825100"
                              : hasReceived
                              ? "#006b2c"
                              : "#e5eeff",
                          color:
                            isCurrentRecipient ||
                            hasReceived
                              ? "#ffffff"
                              : "#3e4a3d",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontWeight:
                            700,
                          fontSize:
                            "15px",
                          border:
                            isCurrentRecipient
                              ? "3px solid #ffddb8"
                              : hasReceived
                              ? "3px solid #62df7d"
                              : "2px solid rgba(189,202,186,.3)",
                        }}
                      >
                        {hasReceived ? (
                          <span className="material-symbols-outlined">
                            check
                          </span>
                        ) : isCurrentRecipient ? (
                          <span className="material-symbols-outlined">
                            arrow_circle_down
                          </span>
                        ) : (
                          getInitials(
                            memberName
                          )
                        )}
                      </div>

                      <span
                        className="rotation-name"
                        style={{
                          fontSize:
                            "11px",
                          fontWeight:
                            500,
                          textAlign:
                            "center",
                          maxWidth:
                            "65px",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          color:
                            "#0b1c30",
                        }}
                      >
                        {memberName}
                      </span>

                      <span
                        style={{
                          fontSize:
                            "10px",
                          color:
                            isCurrentRecipient
                              ? "#825100"
                              : hasReceived
                              ? "#006b2c"
                              : "#6e7b6c",
                          fontWeight:
                            600,
                        }}
                      >
                        {isCurrentRecipient
                          ? "Receiving"
                          : hasReceived
                          ? `Got ${formatNaira(
                              member?.payout_amount ||
                                totalPayout
                            )}`
                          : `#${
                              index +
                              1
                            }`}
                      </span>
                    </div>

                    {index <
                      group.rotation_order
                        .length -
                        1 && (
                      <div
                        style={{
                          width:
                            "28px",
                          height:
                            "2px",
                          backgroundColor:
                            isPast
                              ? "#006b2c"
                              : "#e5eeff",
                          margin:
                            "0 2px",
                          marginBottom:
                            "20px",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* ADMIN ONLY */}
          {isAdmin && (
            <div
              style={{
                marginTop:
                  "20px",
                paddingTop:
                  "20px",
                borderTop:
                  "1px solid rgba(189,202,186,.3)",
              }}
            >
              <button
                onClick={
                  handleMarkPayout
                }
                disabled={
                  processingPayout
                }
                style={{
                  width: "100%",
                  padding:
                    "14px",
                  backgroundColor:
                    processingPayout
                      ? "#6e7b6c"
                      : "#825100",
                  color:
                    "#ffffff",
                  borderRadius:
                    "8px",
                  border: "none",
                  cursor:
                    processingPayout
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    600,
                  fontSize:
                    "14px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: "8px",
                }}
              >
                <span className="material-symbols-outlined">
                  payments
                </span>

                {processingPayout
                  ? "Processing..."
                  : `Mark Payout Complete — ${formatNaira(
                      totalPayout
                    )}`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          MEMBERS + SIDEBAR
      ====================================================== */}

      <div
        className="members-layout"
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(3, 1fr)",
          gap: "24px",
        }}
      >
        <div
          className="members-table-wrap"
          style={{
            gridColumn:
              "span 2",
          }}
        >
          <div
            style={{
              background:
                "rgba(255,255,255,.8)",
              backdropFilter:
                "blur(12px)",
              border:
                "1px solid rgba(226,232,240,.8)",
              boxShadow:
                "0 4px 20px rgba(15,23,42,.04)",
              borderRadius:
                "12px",
              overflow:
                "hidden",
            }}
          >
            <div
              className="table-header"
              style={{
                padding:
                  "16px 20px",
                borderBottom:
                  "1px solid rgba(189,202,186,.3)",
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                flexWrap:
                  "wrap",
                gap: "8px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize:
                    "18px",
                  fontWeight:
                    600,
                  fontFamily:
                    "'Inter', sans-serif",
                }}
              >
                Members (
                {members.length})
              </h4>

              <div
                style={{
                  display:
                    "flex",
                  gap: "8px",
                  alignItems:
                    "center",
                }}
              >
                <button
                  onClick={
                    fetchAllData
                  }
                  style={{
                    background:
                      "none",
                    border:
                      "none",
                    cursor:
                      "pointer",
                    color:
                      "#6e7b6c",
                    padding:
                      "4px",
                  }}
                >
                  <span className="material-symbols-outlined">
                    refresh
                  </span>
                </button>

                {/* ADMIN ONLY */}
                {isAdmin && (
                  <Link
                    href={`/groups/${id}/add-members`}
                    style={{
                      color:
                        "#006b2c",
                      fontSize:
                        "14px",
                      fontWeight:
                        500,
                      textDecoration:
                        "none",
                    }}
                  >
                    + Add Members
                  </Link>
                )}
              </div>
            </div>

            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              {members.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "60px 24px",
                    textAlign:
                      "center",
                    color:
                      "#3e4a3d",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize:
                        "48px",
                      display:
                        "block",
                      marginBottom:
                        "16px",
                      color:
                        "#bdcaba",
                    }}
                  >
                    groups
                  </span>

                  <p
                    style={{
                      fontSize:
                        "14px",
                    }}
                  >
                    No members yet.
                  </p>

                  {/* ADMIN ONLY */}
                  {isAdmin && (
                    <Link
                      href={`/groups/${id}/add-members`}
                      style={{
                        color:
                          "#006b2c",
                        fontWeight:
                          600,
                        textDecoration:
                          "underline",
                        marginTop:
                          "8px",
                        display:
                          "inline-block",
                      }}
                    >
                      Invite members now
                    </Link>
                  )}
                </div>
              ) : (
                <table
                  className="members-table"
                  style={{
                    width:
                      "100%",
                    textAlign:
                      "left",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "500px",
                  }}
                >
                  <thead
                    style={{
                      backgroundColor:
                        "#eff4ff",
                      fontSize:
                        "13px",
                      fontWeight:
                        500,
                      color:
                        "#3e4a3d",
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding:
                            "14px 20px",
                        }}
                      >
                        Member
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 20px",
                        }}
                      >
                        Role
                      </th>

                      {isRotatingAjo && (
                        <th
                          style={{
                            padding:
                              "14px 20px",
                          }}
                        >
                          Pos
                        </th>
                      )}

                      <th
                        style={{
                          padding:
                            "14px 20px",
                        }}
                      >
                        Contribution
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 20px",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map(
                      (member: any) => {
                        const contribution =
                          contributions.find(
                            (c: any) =>
                              c.user_id ===
                              member.user_id
                          );

                        const memberName =
                          member
                            .profiles
                            ?.full_name ||
                          `User ${member.user_id.slice(
                            0,
                            6
                          )}`;

                        return (
                          <tr
                            key={
                              member.user_id
                            }
                            style={{
                              borderBottom:
                                "1px solid rgba(189,202,186,.2)",
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "14px 20px",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  gap: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    width:
                                      "32px",
                                    height:
                                      "32px",
                                    borderRadius:
                                      "50%",
                                    backgroundColor:
                                      member.user_id ===
                                      currentUserId
                                        ? "#00873a"
                                        : "#dae2fd",
                                    color:
                                      member.user_id ===
                                      currentUserId
                                        ? "#ffffff"
                                        : "#5c647a",
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    fontWeight:
                                      700,
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  {getInitials(
                                    memberName
                                  )}
                                </div>

                                <span
                                  style={{
                                    fontSize:
                                      "14px",
                                    fontWeight:
                                      500,
                                  }}
                                >
                                  {memberName}

                                  {member.user_id ===
                                    currentUserId &&
                                    " (You)"}
                                </span>
                              </div>
                            </td>

                            <td
                              style={{
                                padding:
                                  "14px 20px",
                              }}
                            >
                              <span
                                style={{
                                  padding:
                                    "4px 10px",
                                  borderRadius:
                                    "9999px",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    600,
                                  backgroundColor:
                                    member.role ===
                                    "admin"
                                      ? "rgba(0,107,44,.1)"
                                      : "rgba(130,81,0,.1)",
                                  color:
                                    member.role ===
                                    "admin"
                                      ? "#006b2c"
                                      : "#825100",
                                  textTransform:
                                    "capitalize",
                                }}
                              >
                                {member.role}
                              </span>
                            </td>

                            {isRotatingAjo && (
                              <td
                                style={{
                                  padding:
                                    "14px 20px",
                                  fontSize:
                                    "13px",
                                }}
                              >
                                #
                                {member.rotation_position ||
                                  "—"}
                              </td>
                            )}

                            <td
                              style={{
                                padding:
                                  "14px 20px",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {contribution
                                ? formatNaira(
                                    contribution.amount
                                  )
                                : "—"}
                            </td>

                            <td
                              style={{
                                padding:
                                  "14px 20px",
                              }}
                            >
                              {isRotatingAjo ? (
                                member.has_received_payout ? (
                                  <span
                                    style={{
                                      color:
                                        "#006b2c",
                                      fontSize:
                                        "12px",
                                      fontWeight:
                                        600,
                                    }}
                                  >
                                    ✓ Paid
                                  </span>
                                ) : group
                                    .rotation_order?.[
                                    group.current_rotation_index
                                  ] ===
                                  member.user_id ? (
                                  <span
                                    style={{
                                      color:
                                        "#825100",
                                      fontSize:
                                        "12px",
                                      fontWeight:
                                        600,
                                    }}
                                  >
                                    ↓ Current
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color:
                                        "#6e7b6c",
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    Waiting
                                  </span>
                                )
                              ) : (
                                <span
                                  style={{
                                    color:
                                      "#6e7b6c",
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================
            RIGHT SIDEBAR
        ==================================================== */}

        <div
          className="right-sidebar"
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              padding:
                "24px",
              borderRadius:
                "12px",
              backgroundColor:
                "#0b1c30",
              color:
                "#f8f9ff",
            }}
          >
            <p
              style={{
                fontSize:
                  "14px",
                opacity: 0.8,
                marginBottom:
                  "4px",
              }}
            >
              Contribution per
              member
            </p>

            <h3
              style={{
                fontSize:
                  "28px",
                fontWeight:
                  600,
                color:
                  "#62df7d",
                marginBottom:
                  "16px",
              }}
            >
              {formatNaira(
                contributionAmount
              )}
            </h3>

            <Link
              href={`/payments?groupId=${group.id}&amount=${contributionAmount}`}
              className="contribute-btn"
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "16px",
                backgroundColor:
                  "#006b2c",
                color:
                  "#ffffff",
                borderRadius:
                  "8px",
                fontWeight:
                  500,
                fontSize:
                  "14px",
                textDecoration:
                  "none",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                gap: "8px",
              }}
            >
              <span className="material-symbols-outlined">
                bolt
              </span>

              Make Contribution
            </Link>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,.8)",
              border:
                "1px solid rgba(0,107,44,.1)",
              boxShadow:
                "0 4px 20px rgba(15,23,42,.04)",
              borderRadius:
                "12px",
              padding:
                "24px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "8px",
                marginBottom:
                  "16px",
                color:
                  "#006b2c",
              }}
            >
              <span className="material-symbols-outlined">
                info
              </span>

              <h4
                style={{
                  margin: 0,
                  fontSize:
                    "14px",
                  fontWeight:
                    700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    ".05em",
                }}
              >
                Group Info
              </h4>
            </div>

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "12px",
                fontSize:
                  "14px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span
                  style={{
                    color:
                      "#3e4a3d",
                  }}
                >
                  Type
                </span>

                <span
                  style={{
                    fontWeight:
                      500,
                    color:
                      isRotatingAjo
                        ? "#825100"
                        : "#006b2c",
                  }}
                >
                  {isRotatingAjo
                    ? "Rotating Ajo"
                    : "Fixed Savings"}
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span>
                  Cycle
                </span>

                <span
                  style={{
                    fontWeight:
                      500,
                  }}
                >
                  #
                  {group.cycle_number ||
                    1}
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span>
                  Contribution
                </span>

                <span
                  style={{
                    fontWeight:
                      500,
                    color:
                      "#006b2c",
                  }}
                >
                  {formatNaira(
                    contributionAmount
                  )}
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span>
                  Created
                </span>

                <span
                  style={{
                    fontWeight:
                      500,
                  }}
                >
                  {formatDate(
                    group.created_at
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          RESPONSIVE
      ====================================================== */}

      <style jsx>{`
        @media (max-width: 700px) {
          .verification-steps {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 900px) {
          .kpi-grid {
            grid-template-columns: repeat(
              2,
              1fr
            ) !important;
          }
        }

        @media (max-width: 768px) {
          .members-layout {
            grid-template-columns: 1fr !important;
          }

          .members-table-wrap {
            grid-column: span 1 !important;
          }

          .right-sidebar {
            order: -1;
          }

          .group-title {
            font-size: 20px !important;
          }

          .add-members-btn
            .btn-label {
            display: none;
          }

          .add-members-btn {
            padding: 10px 14px !important;
          }
        }

        @media (max-width: 500px) {
          .kpi-grid {
            grid-template-columns: 1fr !important;
          }

          .kpi-card {
            padding: 16px !important;
          }

          .kpi-value {
            font-size: 20px !important;
          }

          .header-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .rotation-timeline {
            gap: 4px !important;
          }

          .rotation-item {
            transform: scale(
              0.9
            );
          }

          .members-table {
            font-size: 12px !important;
          }

          .members-table th,
          .members-table td {
            padding: 10px 12px !important;
          }

          .contribute-btn {
            font-size: 13px !important;
            padding: 14px !important;
          }
        }
      `}</style>
    </>
  );
}


// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState, useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// export default function GroupDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const supabase = createClient();

//   const [group, setGroup] = useState<any>(null);
//   const [members, setMembers] = useState<any[]>([]);
//   const [contributions, setContributions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState<string>("");
//   const [processingPayout, setProcessingPayout] = useState(false);
//   const [verification, setVerification] = useState<any>(null);
//   const [verificationLoading, setVerificationLoading] = useState(false);
//   const [verificationMessage, setVerificationMessage] = useState("");

//   const fetchVerification = useCallback(async () => {
//     if (!id) return;

//     const { data, error } = await supabase
//       .from("verification_submissions")
//       .select("*")
//       .eq("group_id", id)
//       .order("created_at", { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     if (!error) {
//       setVerification(data || null);
//     } else {
//       // The verification table may not exist yet. Keep the page usable.
//       console.warn("Kolo verification table is not available yet:", error.message);
//       setVerification(null);
//     }
//   }, [id, supabase]);

//   const fetchAllData = useCallback(async () => {
//     setLoading(true);
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) { router.push("/login"); return; }
//     setCurrentUserId(user.id);

//     const { data: groupData } = await supabase.from("groups").select("*").eq("id", id).single();
//     if (groupData) setGroup(groupData);

//     const { data: memberData } = await supabase.from("group_members").select("user_id, role, joined_at, rotation_position, has_received_payout, payout_amount").eq("group_id", id);

//     if (memberData && memberData.length > 0) {
//       const userIds = memberData.map((m: any) => m.user_id);
//       const { data: profilesData } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
//       const membersWithProfiles = memberData.map((m: any) => {
//         const profile = profilesData?.find((p: any) => p.id === m.user_id);
//         return { ...m, profiles: profile || { full_name: `User ${m.user_id.slice(0, 6)}`, avatar_url: null } };
//       });
//       setMembers(membersWithProfiles);
//     } else {
//       setMembers([]);
//     }

//     const { data: contribData } = await supabase.from("contributions").select("*").eq("group_id", id).order("created_at", { ascending: false });
//     if (contribData) setContributions(contribData);

//     setLoading(false);
//   }, [id, supabase, router]);

//   useEffect(() => {
//     if (id) {
//       fetchAllData();
//       fetchVerification();
//     }
//   }, [id, fetchAllData, fetchVerification]);

//   useEffect(() => {
//     const handleRefresh = () => fetchAllData();
//     window.addEventListener("focus", handleRefresh);
//     document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") handleRefresh(); });
//     return () => { window.removeEventListener("focus", handleRefresh); document.removeEventListener("visibilitychange", handleRefresh); };
//   }, [fetchAllData]);

//   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
//   const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
//   const getInitials = (name: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

//   const totalContributions = contributions.filter((c) => c.status === "completed").reduce((sum, c) => sum + c.amount, 0);
//   const pendingMembers = contributions.filter((c) => c.status === "pending").length;
//   const contributionAmount = group?.contribution_amount || 50000;
//   const isRotatingAjo = group?.rotation_order && group.rotation_order.length > 0;
//   const totalPayout = contributionAmount * members.length;

//   const handleStartVerification = async () => {
//     if (!group || !currentUserId) return;

//     setVerificationLoading(true);
//     setVerificationMessage("");

//     const payload = {
//       group_id: id,
//       submitted_by: currentUserId,
//       status: "submitted",
//       cooperative_name: group.name || "",
//       cooperative_description: group.description || "",
//       administrator_user_id: currentUserId,
//       submitted_at: new Date().toISOString(),
//     };

//     const { data, error } = await supabase
//       .from("verification_submissions")
//       .insert(payload)
//       .select("*")
//       .single();

//     if (error) {
//       console.error("Verification submission error:", error);
//       setVerificationMessage(
//         error.message.includes("verification_submissions")
//           ? "Verification storage is not connected yet. Run the Kolo verification SQL in Supabase first."
//           : error.message
//       );
//     } else {
//       setVerification(data);
//       setVerificationMessage("Verification submitted. Kolo can now review this cooperative.");
//     }

//     setVerificationLoading(false);
//   };

//   const handleMarkPayout = async () => {
//     if (!isRotatingAjo) return;
//     setProcessingPayout(true);
//     try {
//       const currentRecipientId = group.rotation_order[group.current_rotation_index];
      
//       await supabase.from("group_members").update({
//         has_received_payout: true, payout_received_at: new Date().toISOString(), payout_amount: totalPayout,
//       }).eq("group_id", id).eq("user_id", currentRecipientId);

//       const nextIndex = (group.current_rotation_index + 1) % group.rotation_order.length;
//       await supabase.from("groups").update({
//         current_rotation_index: nextIndex, last_payout_date: new Date().toISOString(),
//         next_payout_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
//       }).eq("id", id);

//       await fetchAllData();
//     } catch (err) { console.error("Payout error:", err); }
//     finally { setProcessingPayout(false); }
//   };

//   if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Loading group details...</div>;
//   if (!group) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Group not found.</div>;

//   const isAdmin = members.find((m: any) => m.user_id === currentUserId && m.role === "admin") || group.created_by === currentUserId;

//   return (
//     <>
//       {/* Top Header */}
//       <header className="group-header" style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
//         <div className="header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", maxWidth: "1280px", margin: "0 auto", width: "100%", gap: "12px", flexWrap: "wrap" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
//             <Link href="/groups" style={{ color: "#3e4a3d", textDecoration: "none", display: "flex", alignItems: "center" }}><span className="material-symbols-outlined">arrow_back</span></Link>
//             <div>
//               <h2 className="group-title" style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#006b2c" }}>{group.name}</h2>
//               {isRotatingAjo && (
//                 <span style={{ fontSize: "12px", color: "#825100", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo
//                 </span>
//               )}
//             </div>
//           </div>
//           <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
//             <button onClick={fetchAllData} title="Refresh" style={{ padding: "8px", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "#e5eeff", color: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span></button>
//             {isAdmin && (
//               <Link href={`/groups/${id}/add-members`} className="add-members-btn" style={{ padding: "10px 20px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
//                 <span className="material-symbols-outlined">person_add</span><span className="btn-label">Add Members</span>
//               </Link>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* KOLO VERIFICATION */}
//       <section
//         id="verification"
//         style={{
//           marginBottom: "24px",
//           borderRadius: "14px",
//           border: "1px solid rgba(189, 202, 186, 0.55)",
//           background: verification?.status === "verified" ? "#eff8f2" : "#ffffff",
//           overflow: "hidden",
//         }}
//       >
//         <div
//           style={{
//             padding: "18px 20px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             gap: "16px",
//             flexWrap: "wrap",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//             <div
//               style={{
//                 width: "40px",
//                 height: "40px",
//                 borderRadius: "10px",
//                 backgroundColor:
//                   verification?.status === "verified" ? "#006b2c" : "#eff8f2",
//                 color:
//                   verification?.status === "verified" ? "#ffffff" : "#006b2c",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 flexShrink: 0,
//               }}
//             >
//               <span className="material-symbols-outlined">
//                 {verification?.status === "verified"
//                   ? "verified"
//                   : "verified_user"}
//               </span>
//             </div>

//             <div>
//               <div
//                 style={{
//                   color: "#006b2c",
//                   fontSize: "9px",
//                   fontWeight: 800,
//                   letterSpacing: "0.1em",
//                   marginBottom: "4px",
//                 }}
//               >
//                 KOLO TRUST
//               </div>

//               <h3
//                 style={{
//                   margin: 0,
//                   color: "#0b1c30",
//                   fontSize: "16px",
//                   fontWeight: 650,
//                   fontFamily: "'Inter', sans-serif",
//                 }}
//               >
//                 {verification?.status === "verified"
//                   ? "Kolo Verified Cooperative"
//                   : verification?.status === "under_review" ||
//                     verification?.status === "submitted"
//                   ? "Verification under review"
//                   : verification?.status === "needs_changes"
//                   ? "Verification needs changes"
//                   : verification?.status === "rejected"
//                   ? "Verification not approved"
//                   : "Become Kolo Verified"}
//               </h3>

//               <p
//                 style={{
//                   margin: "4px 0 0",
//                   color: "#526171",
//                   fontSize: "10px",
//                   lineHeight: 1.5,
//                 }}
//               >
//                 {verification?.status === "verified"
//                   ? "The submitted cooperative information has completed Kolo's recorded verification review."
//                   : verification?.status === "submitted" ||
//                     verification?.status === "under_review"
//                   ? "Your verification submission has been received and is waiting for review."
//                   : verification?.status === "needs_changes"
//                   ? "Kolo has requested changes before this cooperative can be verified."
//                   : verification?.status === "rejected"
//                   ? "This submission did not pass the recorded review. A new submission can be made after the issues are resolved."
//                   : "Submit your cooperative information for review and give members a clearer trust signal."}
//               </p>
//             </div>
//           </div>

//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//             }}
//           >
//             {verification?.status !== "verified" &&
//               verification?.status !== "submitted" &&
//               verification?.status !== "under_review" && (
//                 <button
//                   onClick={handleStartVerification}
//                   disabled={verificationLoading}
//                   style={{
//                     border: "none",
//                     borderRadius: "8px",
//                     padding: "10px 14px",
//                     backgroundColor: "#006b2c",
//                     color: "#ffffff",
//                     cursor: verificationLoading ? "wait" : "pointer",
//                     fontSize: "9px",
//                     fontWeight: 700,
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "6px",
//                     opacity: verificationLoading ? 0.7 : 1,
//                   }}
//                 >
//                   <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
//                     {verificationLoading ? "progress_activity" : "arrow_forward"}
//                   </span>
//                   {verificationLoading ? "Submitting..." : "Start Verification"}
//                 </button>
//               )}

//             {verification?.status === "verified" && (
//               <span
//                 style={{
//                   padding: "7px 10px",
//                   borderRadius: "999px",
//                   backgroundColor: "#dff2e5",
//                   color: "#006b2c",
//                   fontSize: "7px",
//                   fontWeight: 800,
//                   letterSpacing: ".06em",
//                 }}
//               >
//                 ✓ VERIFIED
//               </span>
//             )}
//           </div>
//         </div>

//         <div
//           className="verification-steps"
//           style={{
//             borderTop: "1px solid rgba(189, 202, 186, 0.35)",
//             padding: "13px 20px",
//             display: "grid",
//             gridTemplateColumns: "repeat(4, 1fr)",
//             gap: "8px",
//             className: "verification-steps",
//             backgroundColor: "rgba(248,249,255,.55)",
//           }}
//         >
//           {[
//             ["1", "Cooperative", Boolean(verification?.cooperative_name)],
//             ["2", "Administrator", Boolean(verification?.administrator_user_id)],
//             ["3", "Account", Boolean(verification?.account_name)],
//             ["4", "Review", verification?.status === "verified"],
//           ].map(([number, label, done]) => (
//             <div
//               key={String(number)}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "7px",
//                 color: done ? "#006b2c" : "#89949f",
//                 fontSize: "7px",
//                 fontWeight: 700,
//               }}
//             >
//               <span
//                 style={{
//                   width: "19px",
//                   height: "19px",
//                   borderRadius: "50%",
//                   display: "grid",
//                   placeItems: "center",
//                   backgroundColor: done ? "#dff2e5" : "#eef2f0",
//                   color: done ? "#006b2c" : "#89949f",
//                   fontSize: "7px",
//                 }}
//               >
//                 {done ? "✓" : number}
//               </span>
//               {label}
//             </div>
//           ))}
//         </div>

//         {verificationMessage && (
//           <div
//             style={{
//               padding: "10px 20px",
//               backgroundColor: "#fff9eb",
//               color: "#825100",
//               fontSize: "8px",
//               borderTop: "1px solid rgba(189, 202, 186, 0.3)",
//             }}
//           >
//             {verificationMessage}
//           </div>
//         )}
//       </section>

//       {/* KPI Row */}
//       <section className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
//         {[
//           { label: "Total Pooled", value: formatNaira(group.pool_amount || 0), sub: `Cycle ${group.cycle_number || 1}` },
//           { label: "Contribution", value: formatNaira(contributionAmount), sub: "Per member / cycle" },
//           { label: "Members", value: `${members.length} / ${group.max_members || 20}`, sub: `${Math.round((members.length / (group.max_members || 20)) * 100)}% filled` },
//           { label: isRotatingAjo ? "Next Payout" : "Status", value: isRotatingAjo ? (group.next_payout_date ? formatDate(group.next_payout_date) : "TBD") : (group.status === "active" ? "Active" : group.status || "Active"), sub: isRotatingAjo ? `${formatNaira(totalPayout)} pool` : `${pendingMembers} pending` },
//         ].map((kpi) => (
//           <div key={kpi.label} className="kpi-card" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "22px" }}>
//             <p style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", marginBottom: "6px" }}>{kpi.label}</p>
//             <h3 className="kpi-value" style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: kpi.label === "Total Pooled" ? "#006b2c" : "#0b1c30", marginBottom: "4px" }}>{kpi.value}</h3>
//             <p style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{kpi.sub}</p>
//           </div>
//         ))}
//       </section>

//       {/* ROTATING AJO TRACKER */}
//       {isRotatingAjo && (
//         <section className="ajo-tracker" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 221, 184, 0.5)", boxShadow: "0 4px 20px rgba(130, 81, 0, 0.06)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
//           <div className="ajo-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//               <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(130, 81, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//                 <span className="material-symbols-outlined" style={{ color: "#825100", fontSize: "28px" }}>cached</span>
//               </div>
//               <div>
//                 <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#0b1c30" }}>Rotating Ajo — Payout Order</h3>
//                 <p style={{ fontSize: "13px", color: "#3e4a3d" }}>
//                   Each member receives <strong>{formatNaira(totalPayout)}</strong> when it's their turn
//                   {group.current_rotation_index !== undefined && ` • ${group.rotation_order.length - group.current_rotation_index - 1} before next round`}
//                 </p>
//               </div>
//             </div>
//             {group.next_payout_date && (
//               <div style={{ textAlign: "right" }}>
//                 <p style={{ fontSize: "11px", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Geist', sans-serif" }}>Next Payout</p>
//                 <p style={{ fontSize: "18px", fontWeight: 600, color: "#825100" }}>{formatDate(group.next_payout_date)}</p>
//               </div>
//             )}
//           </div>

//           <div className="rotation-timeline" style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "20px 8px", gap: "0" }}>
//             {group.rotation_order.map((userId: string, index: number) => {
//               const member = members.find((m: any) => m.user_id === userId);
//               const isCurrentRecipient = index === group.current_rotation_index;
//               const hasReceived = member?.has_received_payout;
//               const memberName = member?.profiles?.full_name || `User ${userId.slice(0, 6)}`;
//               const isPast = index < group.current_rotation_index;

//               return (
//                 <div key={userId} className="rotation-item" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
//                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
//                     <div style={{
//                       width: "52px", height: "52px", borderRadius: "50%",
//                       backgroundColor: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#e5eeff",
//                       color: isCurrentRecipient || hasReceived ? "#ffffff" : "#3e4a3d",
//                       display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "15px",
//                       border: isCurrentRecipient ? "3px solid #ffddb8" : hasReceived ? "3px solid #62df7d" : "2px solid rgba(189, 202, 186, 0.3)",
//                       boxShadow: isCurrentRecipient ? "0 0 16px rgba(130, 81, 0, 0.3)" : "none", position: "relative",
//                     }}>
//                       {hasReceived ? <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>check</span>
//                         : isCurrentRecipient ? <span className="material-symbols-outlined" style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>arrow_circle_down</span>
//                         : getInitials(memberName)}
//                       {isCurrentRecipient && !hasReceived && (
//                         <span style={{ position: "absolute", top: "-8px", right: "-8px", backgroundColor: "#006b2c", color: "#fff", fontSize: "9px", padding: "2px 6px", borderRadius: "8px", fontWeight: 700 }}>NOW</span>
//                       )}
//                     </div>
//                     <span className="rotation-name" style={{ fontSize: "11px", fontWeight: 500, textAlign: "center", maxWidth: "65px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0b1c30" }}>{memberName}</span>
//                     <span style={{ fontSize: "10px", color: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#6e7b6c", fontWeight: 600 }}>
//                       {isCurrentRecipient ? "Receiving" : hasReceived ? `Got ${formatNaira(member?.payout_amount || totalPayout)}` : `#${index + 1}`}
//                     </span>
//                   </div>
//                   {index < group.rotation_order.length - 1 && (
//                     <div style={{ width: "28px", height: "2px", backgroundColor: isPast ? "#006b2c" : "#e5eeff", margin: "0 2px", marginBottom: "20px", flexShrink: 0 }} />
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {isAdmin && (
//             <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(189, 202, 186, 0.3)" }}>
//               <button onClick={handleMarkPayout} disabled={processingPayout}
//                 className="payout-btn"
//                 style={{ width: "100%", padding: "14px", backgroundColor: processingPayout ? "#6e7b6c" : "#825100", color: "#ffffff", borderRadius: "8px", border: "none", cursor: processingPayout ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(130, 81, 0, 0.2)", transition: "all 0.2s" }}>
//                 <span className="material-symbols-outlined">payments</span>
//                 {processingPayout ? "Processing..." : `Mark Payout Complete — ${formatNaira(totalPayout)}`}
//               </button>
//             </div>
//           )}
//         </section>
//       )}

//       {/* Members Table + Right Sidebar */}
//       <div className="members-layout" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//         <div className="members-table-wrap" style={{ gridColumn: "span 2" }}>
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", overflow: "hidden" }}>
//             <div className="table-header" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
//               <h4 style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Members ({members.length})</h4>
//               <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
//                 <button onClick={fetchAllData} style={{ background: "none", border: "none", cursor: "pointer", color: "#6e7b6c", padding: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>refresh</span></button>
//                 {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none" }}>+ Add Members</Link>}
//               </div>
//             </div>
//             <div style={{ overflowX: "auto" }}>
//               {members.length === 0 ? (
//                 <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
//                   <p style={{ fontSize: "14px" }}>No members yet.</p>
//                   {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontWeight: 600, textDecoration: "underline", marginTop: "8px", display: "inline-block" }}>Invite members now</Link>}
//                 </div>
//               ) : (
//                 <table className="members-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: "500px" }}>
//                   <thead style={{ backgroundColor: "#eff4ff", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
//                     <tr>
//                       <th style={{ padding: "14px 20px" }}>Member</th>
//                       <th style={{ padding: "14px 20px" }}>Role</th>
//                       {isRotatingAjo && <th style={{ padding: "14px 20px" }}>Pos</th>}
//                       <th style={{ padding: "14px 20px" }}>Contribution</th>
//                       <th style={{ padding: "14px 20px" }}>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {members.map((m: any) => {
//                       const contrib = contributions.find((c: any) => c.user_id === m.user_id);
//                       const memberName = m.profiles?.full_name || `User ${m.user_id.slice(0, 6)}`;
//                       return (
//                         <tr key={m.user_id} style={{ borderBottom: "1px solid rgba(189, 202, 186, 0.2)", transition: "background-color 0.2s", cursor: "pointer" }}
//                           onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff4ff"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
//                           <td style={{ padding: "14px 20px" }}>
//                             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                               <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: m.user_id === currentUserId ? "#00873a" : "#dae2fd", color: m.user_id === currentUserId ? "#f7fff2" : "#5c647a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>{getInitials(memberName)}</div>
//                               <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{memberName}{m.user_id === currentUserId && " (You)"}</span>
//                             </div>
//                           </td>
//                           <td style={{ padding: "14px 20px" }}>
//                             <span style={{ padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, backgroundColor: m.role === "admin" ? "rgba(0, 107, 44, 0.1)" : "rgba(130, 81, 0, 0.1)", color: m.role === "admin" ? "#006b2c" : "#825100", textTransform: "capitalize", fontFamily: "'Geist', sans-serif" }}>{m.role}</span>
//                           </td>
//                           {isRotatingAjo && <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500 }}>#{m.rotation_position || "—"}</td>}
//                           <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{contrib ? formatNaira(contrib.amount) : "—"}</td>
//                           <td style={{ padding: "14px 20px" }}>
//                             {isRotatingAjo ? (
//                               m.has_received_payout ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#006b2c", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Paid</span>
//                               ) : group.rotation_order?.[group.current_rotation_index] === m.user_id ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#825100", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_circle_down</span> Current</span>
//                               ) : (
//                                 <span style={{ fontSize: "12px", color: "#6e7b6c", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span> Waiting</span>
//                               )
//                             ) : <span style={{ fontSize: "12px", color: "#6e7b6c" }}>—</span>}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Right Sidebar */}
//         <div className="right-sidebar" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//           <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "#0b1c30", color: "#f8f9ff", position: "relative", overflow: "hidden" }}>
//             <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", backgroundColor: "rgba(0, 107, 44, 0.2)", borderRadius: "50%", filter: "blur(40px)" }} />
//             <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "4px", position: "relative", zIndex: 10 }}>Contribution per member</p>
//             <h3 style={{ fontSize: "28px", fontWeight: 600, color: "#62df7d", marginBottom: isRotatingAjo ? "8px" : "16px", position: "relative", zIndex: 10 }}>{formatNaira(contributionAmount)}</h3>
//             {isRotatingAjo && (
//               <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px", position: "relative", zIndex: 10 }}>
//                 Total pool per round: <strong style={{ color: "#ffddb8" }}>{formatNaira(totalPayout)}</strong>
//               </p>
//             )}
//             <Link href={`/payments?groupId=${group.id}&amount=${contributionAmount}`}
//               className="contribute-btn"
//               style={{ width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative", zIndex: 10, boxSizing: "border-box" }}>
//               <span className="material-symbols-outlined">bolt</span> Make Contribution
//             </Link>
//           </div>

//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0, 107, 44, 0.1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#006b2c" }}>
//               <span className="material-symbols-outlined">info</span>
//               <h4 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Group Info</h4>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ color: "#3e4a3d" }}>Type</span>
//                 <span style={{ fontWeight: 500, color: isRotatingAjo ? "#825100" : "#006b2c", display: "flex", alignItems: "center", gap: "4px" }}>
//                   {isRotatingAjo ? <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo</> : <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>savings</span> Fixed Savings</>}
//                 </span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Cycle</span><span style={{ fontWeight: 500 }}>#{group.cycle_number || 1}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Contribution</span><span style={{ fontWeight: 500, color: "#006b2c" }}>{formatNaira(contributionAmount)}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Created</span><span style={{ fontWeight: 500 }}>{formatDate(group.created_at)}</span></div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Responsive Styles */}
//       <style jsx>{`
//         @media (max-width: 700px) {
//           .verification-steps { grid-template-columns: 1fr 1fr !important; }
//         }

//         @media (max-width: 900px) {
//           .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
//         }
//         @media (max-width: 768px) {
//           .members-layout { grid-template-columns: 1fr !important; }
//           .members-table-wrap { grid-column: span 1 !important; }
//           .right-sidebar { order: -1; }
//           .group-title { font-size: 20px !important; }
//           .add-members-btn .btn-label { display: none; }
//           .add-members-btn { padding: 10px 14px !important; }
//         }
//         @media (max-width: 500px) {
//           .kpi-grid { grid-template-columns: 1fr !important; }
//           .kpi-card { padding: 16px !important; }
//           .kpi-value { font-size: 20px !important; }
//           .header-inner { flex-direction: column !important; align-items: flex-start !important; }
//           .header-actions { width: 100%; justify-content: flex-end; }
//           .rotation-timeline { gap: 4px !important; }
//           .rotation-item { transform: scale(0.9); }
//           .members-table { font-size: 12px !important; }
//           .members-table th, .members-table td { padding: 10px 12px !important; }
//           .contribute-btn { font-size: 13px !important; padding: 14px !important; }
//         }
//       `}</style>
//     </>
//   );
// }




// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState, useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// export default function GroupDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const supabase = createClient();

//   const [group, setGroup] = useState<any>(null);
//   const [members, setMembers] = useState<any[]>([]);
//   const [contributions, setContributions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState<string>("");
//   const [processingPayout, setProcessingPayout] = useState(false);

//   const fetchAllData = useCallback(async () => {
//     setLoading(true);
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) { router.push("/login"); return; }
//     setCurrentUserId(user.id);

//     const { data: groupData } = await supabase.from("groups").select("*").eq("id", id).single();
//     if (groupData) setGroup(groupData);

//     const { data: memberData } = await supabase.from("group_members").select("user_id, role, joined_at, rotation_position, has_received_payout, payout_amount").eq("group_id", id);

//     if (memberData && memberData.length > 0) {
//       const userIds = memberData.map((m: any) => m.user_id);
//       const { data: profilesData } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
//       const membersWithProfiles = memberData.map((m: any) => {
//         const profile = profilesData?.find((p: any) => p.id === m.user_id);
//         return { ...m, profiles: profile || { full_name: `User ${m.user_id.slice(0, 6)}`, avatar_url: null } };
//       });
//       setMembers(membersWithProfiles);
//     } else {
//       setMembers([]);
//     }

//     const { data: contribData } = await supabase.from("contributions").select("*").eq("group_id", id).order("created_at", { ascending: false });
//     if (contribData) setContributions(contribData);

//     setLoading(false);
//   }, [id, supabase, router]);

//   useEffect(() => { if (id) fetchAllData(); }, [id, fetchAllData]);

//   useEffect(() => {
//     const handleRefresh = () => fetchAllData();
//     window.addEventListener("focus", handleRefresh);
//     document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") handleRefresh(); });
//     return () => { window.removeEventListener("focus", handleRefresh); document.removeEventListener("visibilitychange", handleRefresh); };
//   }, [fetchAllData]);

//   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
//   const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
//   const getInitials = (name: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

//   const totalContributions = contributions.filter((c) => c.status === "completed").reduce((sum, c) => sum + c.amount, 0);
//   const pendingMembers = contributions.filter((c) => c.status === "pending").length;
//   const contributionAmount = group?.contribution_amount || 50000;
//   const isRotatingAjo = group?.rotation_order && group.rotation_order.length > 0;
//   const totalPayout = contributionAmount * members.length;

//   const handleMarkPayout = async () => {
//     if (!isRotatingAjo) return;
//     setProcessingPayout(true);
//     try {
//       const currentRecipientId = group.rotation_order[group.current_rotation_index];
      
//       await supabase.from("group_members").update({
//         has_received_payout: true, payout_received_at: new Date().toISOString(), payout_amount: totalPayout,
//       }).eq("group_id", id).eq("user_id", currentRecipientId);

//       const nextIndex = (group.current_rotation_index + 1) % group.rotation_order.length;
//       await supabase.from("groups").update({
//         current_rotation_index: nextIndex, last_payout_date: new Date().toISOString(),
//         next_payout_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
//       }).eq("id", id);

//       await fetchAllData();
//     } catch (err) { console.error("Payout error:", err); }
//     finally { setProcessingPayout(false); }
//   };

//   if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Loading group details...</div>;
//   if (!group) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Group not found.</div>;

//   const isAdmin = members.find((m: any) => m.user_id === currentUserId && m.role === "admin") || group.created_by === currentUserId;

//   return (
//     <>
//       {/* Top Header */}
//       <header className="group-header" style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
//         <div className="header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", maxWidth: "1280px", margin: "0 auto", width: "100%", gap: "12px", flexWrap: "wrap" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
//             <Link href="/groups" style={{ color: "#3e4a3d", textDecoration: "none", display: "flex", alignItems: "center" }}><span className="material-symbols-outlined">arrow_back</span></Link>
//             <div>
//               <h2 className="group-title" style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#006b2c" }}>{group.name}</h2>
//               {isRotatingAjo && (
//                 <span style={{ fontSize: "12px", color: "#825100", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo
//                 </span>
//               )}
//             </div>
//           </div>
//           <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
//             <button onClick={fetchAllData} title="Refresh" style={{ padding: "8px", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "#e5eeff", color: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span></button>
//             {isAdmin && (
//               <Link href={`/groups/${id}/add-members`} className="add-members-btn" style={{ padding: "10px 20px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
//                 <span className="material-symbols-outlined">person_add</span><span className="btn-label">Add Members</span>
//               </Link>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* KPI Row */}
//       <section className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
//         {[
//           { label: "Total Pooled", value: formatNaira(group.pool_amount || 0), sub: `Cycle ${group.cycle_number || 1}` },
//           { label: "Contribution", value: formatNaira(contributionAmount), sub: "Per member / cycle" },
//           { label: "Members", value: `${members.length} / ${group.max_members || 20}`, sub: `${Math.round((members.length / (group.max_members || 20)) * 100)}% filled` },
//           { label: isRotatingAjo ? "Next Payout" : "Status", value: isRotatingAjo ? (group.next_payout_date ? formatDate(group.next_payout_date) : "TBD") : (group.status === "active" ? "Active" : group.status || "Active"), sub: isRotatingAjo ? `${formatNaira(totalPayout)} pool` : `${pendingMembers} pending` },
//         ].map((kpi) => (
//           <div key={kpi.label} className="kpi-card" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "22px" }}>
//             <p style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", marginBottom: "6px" }}>{kpi.label}</p>
//             <h3 className="kpi-value" style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: kpi.label === "Total Pooled" ? "#006b2c" : "#0b1c30", marginBottom: "4px" }}>{kpi.value}</h3>
//             <p style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{kpi.sub}</p>
//           </div>
//         ))}
//       </section>

//       {/* ROTATING AJO TRACKER */}
//       {isRotatingAjo && (
//         <section className="ajo-tracker" style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 221, 184, 0.5)", boxShadow: "0 4px 20px rgba(130, 81, 0, 0.06)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
//           <div className="ajo-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//               <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(130, 81, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//                 <span className="material-symbols-outlined" style={{ color: "#825100", fontSize: "28px" }}>cached</span>
//               </div>
//               <div>
//                 <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#0b1c30" }}>Rotating Ajo — Payout Order</h3>
//                 <p style={{ fontSize: "13px", color: "#3e4a3d" }}>
//                   Each member receives <strong>{formatNaira(totalPayout)}</strong> when it's their turn
//                   {group.current_rotation_index !== undefined && ` • ${group.rotation_order.length - group.current_rotation_index - 1} before next round`}
//                 </p>
//               </div>
//             </div>
//             {group.next_payout_date && (
//               <div style={{ textAlign: "right" }}>
//                 <p style={{ fontSize: "11px", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Geist', sans-serif" }}>Next Payout</p>
//                 <p style={{ fontSize: "18px", fontWeight: 600, color: "#825100" }}>{formatDate(group.next_payout_date)}</p>
//               </div>
//             )}
//           </div>

//           <div className="rotation-timeline" style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "20px 8px", gap: "0" }}>
//             {group.rotation_order.map((userId: string, index: number) => {
//               const member = members.find((m: any) => m.user_id === userId);
//               const isCurrentRecipient = index === group.current_rotation_index;
//               const hasReceived = member?.has_received_payout;
//               const memberName = member?.profiles?.full_name || `User ${userId.slice(0, 6)}`;
//               const isPast = index < group.current_rotation_index;

//               return (
//                 <div key={userId} className="rotation-item" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
//                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
//                     <div style={{
//                       width: "52px", height: "52px", borderRadius: "50%",
//                       backgroundColor: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#e5eeff",
//                       color: isCurrentRecipient || hasReceived ? "#ffffff" : "#3e4a3d",
//                       display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "15px",
//                       border: isCurrentRecipient ? "3px solid #ffddb8" : hasReceived ? "3px solid #62df7d" : "2px solid rgba(189, 202, 186, 0.3)",
//                       boxShadow: isCurrentRecipient ? "0 0 16px rgba(130, 81, 0, 0.3)" : "none", position: "relative",
//                     }}>
//                       {hasReceived ? <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>check</span>
//                         : isCurrentRecipient ? <span className="material-symbols-outlined" style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>arrow_circle_down</span>
//                         : getInitials(memberName)}
//                       {isCurrentRecipient && !hasReceived && (
//                         <span style={{ position: "absolute", top: "-8px", right: "-8px", backgroundColor: "#006b2c", color: "#fff", fontSize: "9px", padding: "2px 6px", borderRadius: "8px", fontWeight: 700 }}>NOW</span>
//                       )}
//                     </div>
//                     <span className="rotation-name" style={{ fontSize: "11px", fontWeight: 500, textAlign: "center", maxWidth: "65px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0b1c30" }}>{memberName}</span>
//                     <span style={{ fontSize: "10px", color: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#6e7b6c", fontWeight: 600 }}>
//                       {isCurrentRecipient ? "Receiving" : hasReceived ? `Got ${formatNaira(member?.payout_amount || totalPayout)}` : `#${index + 1}`}
//                     </span>
//                   </div>
//                   {index < group.rotation_order.length - 1 && (
//                     <div style={{ width: "28px", height: "2px", backgroundColor: isPast ? "#006b2c" : "#e5eeff", margin: "0 2px", marginBottom: "20px", flexShrink: 0 }} />
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {isAdmin && (
//             <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(189, 202, 186, 0.3)" }}>
//               <button onClick={handleMarkPayout} disabled={processingPayout}
//                 className="payout-btn"
//                 style={{ width: "100%", padding: "14px", backgroundColor: processingPayout ? "#6e7b6c" : "#825100", color: "#ffffff", borderRadius: "8px", border: "none", cursor: processingPayout ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(130, 81, 0, 0.2)", transition: "all 0.2s" }}>
//                 <span className="material-symbols-outlined">payments</span>
//                 {processingPayout ? "Processing..." : `Mark Payout Complete — ${formatNaira(totalPayout)}`}
//               </button>
//             </div>
//           )}
//         </section>
//       )}

//       {/* Members Table + Right Sidebar */}
//       <div className="members-layout" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//         <div className="members-table-wrap" style={{ gridColumn: "span 2" }}>
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", overflow: "hidden" }}>
//             <div className="table-header" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
//               <h4 style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Members ({members.length})</h4>
//               <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
//                 <button onClick={fetchAllData} style={{ background: "none", border: "none", cursor: "pointer", color: "#6e7b6c", padding: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>refresh</span></button>
//                 {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none" }}>+ Add Members</Link>}
//               </div>
//             </div>
//             <div style={{ overflowX: "auto" }}>
//               {members.length === 0 ? (
//                 <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
//                   <p style={{ fontSize: "14px" }}>No members yet.</p>
//                   {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontWeight: 600, textDecoration: "underline", marginTop: "8px", display: "inline-block" }}>Invite members now</Link>}
//                 </div>
//               ) : (
//                 <table className="members-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: "500px" }}>
//                   <thead style={{ backgroundColor: "#eff4ff", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
//                     <tr>
//                       <th style={{ padding: "14px 20px" }}>Member</th>
//                       <th style={{ padding: "14px 20px" }}>Role</th>
//                       {isRotatingAjo && <th style={{ padding: "14px 20px" }}>Pos</th>}
//                       <th style={{ padding: "14px 20px" }}>Contribution</th>
//                       <th style={{ padding: "14px 20px" }}>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {members.map((m: any) => {
//                       const contrib = contributions.find((c: any) => c.user_id === m.user_id);
//                       const memberName = m.profiles?.full_name || `User ${m.user_id.slice(0, 6)}`;
//                       return (
//                         <tr key={m.user_id} style={{ borderBottom: "1px solid rgba(189, 202, 186, 0.2)", transition: "background-color 0.2s", cursor: "pointer" }}
//                           onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff4ff"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
//                           <td style={{ padding: "14px 20px" }}>
//                             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                               <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: m.user_id === currentUserId ? "#00873a" : "#dae2fd", color: m.user_id === currentUserId ? "#f7fff2" : "#5c647a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>{getInitials(memberName)}</div>
//                               <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{memberName}{m.user_id === currentUserId && " (You)"}</span>
//                             </div>
//                           </td>
//                           <td style={{ padding: "14px 20px" }}>
//                             <span style={{ padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, backgroundColor: m.role === "admin" ? "rgba(0, 107, 44, 0.1)" : "rgba(130, 81, 0, 0.1)", color: m.role === "admin" ? "#006b2c" : "#825100", textTransform: "capitalize", fontFamily: "'Geist', sans-serif" }}>{m.role}</span>
//                           </td>
//                           {isRotatingAjo && <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500 }}>#{m.rotation_position || "—"}</td>}
//                           <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{contrib ? formatNaira(contrib.amount) : "—"}</td>
//                           <td style={{ padding: "14px 20px" }}>
//                             {isRotatingAjo ? (
//                               m.has_received_payout ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#006b2c", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Paid</span>
//                               ) : group.rotation_order?.[group.current_rotation_index] === m.user_id ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#825100", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_circle_down</span> Current</span>
//                               ) : (
//                                 <span style={{ fontSize: "12px", color: "#6e7b6c", display: "flex", alignItems: "center", gap: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span> Waiting</span>
//                               )
//                             ) : <span style={{ fontSize: "12px", color: "#6e7b6c" }}>—</span>}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Right Sidebar */}
//         <div className="right-sidebar" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//           <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "#0b1c30", color: "#f8f9ff", position: "relative", overflow: "hidden" }}>
//             <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", backgroundColor: "rgba(0, 107, 44, 0.2)", borderRadius: "50%", filter: "blur(40px)" }} />
//             <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "4px", position: "relative", zIndex: 10 }}>Contribution per member</p>
//             <h3 style={{ fontSize: "28px", fontWeight: 600, color: "#62df7d", marginBottom: isRotatingAjo ? "8px" : "16px", position: "relative", zIndex: 10 }}>{formatNaira(contributionAmount)}</h3>
//             {isRotatingAjo && (
//               <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px", position: "relative", zIndex: 10 }}>
//                 Total pool per round: <strong style={{ color: "#ffddb8" }}>{formatNaira(totalPayout)}</strong>
//               </p>
//             )}
//             <Link href={`/payments?groupId=${group.id}&amount=${contributionAmount}`}
//               className="contribute-btn"
//               style={{ width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative", zIndex: 10, boxSizing: "border-box" }}>
//               <span className="material-symbols-outlined">bolt</span> Make Contribution
//             </Link>
//           </div>

//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0, 107, 44, 0.1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#006b2c" }}>
//               <span className="material-symbols-outlined">info</span>
//               <h4 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Group Info</h4>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ color: "#3e4a3d" }}>Type</span>
//                 <span style={{ fontWeight: 500, color: isRotatingAjo ? "#825100" : "#006b2c", display: "flex", alignItems: "center", gap: "4px" }}>
//                   {isRotatingAjo ? <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo</> : <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>savings</span> Fixed Savings</>}
//                 </span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Cycle</span><span style={{ fontWeight: 500 }}>#{group.cycle_number || 1}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Contribution</span><span style={{ fontWeight: 500, color: "#006b2c" }}>{formatNaira(contributionAmount)}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Created</span><span style={{ fontWeight: 500 }}>{formatDate(group.created_at)}</span></div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Responsive Styles */}
//       <style jsx>{`
//         @media (max-width: 900px) {
//           .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
//         }
//         @media (max-width: 768px) {
//           .members-layout { grid-template-columns: 1fr !important; }
//           .members-table-wrap { grid-column: span 1 !important; }
//           .right-sidebar { order: -1; }
//           .group-title { font-size: 20px !important; }
//           .add-members-btn .btn-label { display: none; }
//           .add-members-btn { padding: 10px 14px !important; }
//         }
//         @media (max-width: 500px) {
//           .kpi-grid { grid-template-columns: 1fr !important; }
//           .kpi-card { padding: 16px !important; }
//           .kpi-value { font-size: 20px !important; }
//           .header-inner { flex-direction: column !important; align-items: flex-start !important; }
//           .header-actions { width: 100%; justify-content: flex-end; }
//           .rotation-timeline { gap: 4px !important; }
//           .rotation-item { transform: scale(0.9); }
//           .members-table { font-size: 12px !important; }
//           .members-table th, .members-table td { padding: 10px 12px !important; }
//           .contribute-btn { font-size: 13px !important; padding: 14px !important; }
//         }
//       `}</style>
//     </>
//   );
// }



// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState, useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// export default function GroupDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const supabase = createClient();

//   const [group, setGroup] = useState<any>(null);
//   const [members, setMembers] = useState<any[]>([]);
//   const [contributions, setContributions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState<string>("");
//   const [processingPayout, setProcessingPayout] = useState(false);

//   const fetchAllData = useCallback(async () => {
//     setLoading(true);
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) { router.push("/login"); return; }
//     setCurrentUserId(user.id);

//     const { data: groupData } = await supabase.from("groups").select("*").eq("id", id).single();
//     if (groupData) setGroup(groupData);

//     const { data: memberData } = await supabase.from("group_members").select("user_id, role, joined_at, rotation_position, has_received_payout, payout_amount").eq("group_id", id);

//     if (memberData && memberData.length > 0) {
//       const userIds = memberData.map((m: any) => m.user_id);
//       const { data: profilesData } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
//       const membersWithProfiles = memberData.map((m: any) => {
//         const profile = profilesData?.find((p: any) => p.id === m.user_id);
//         return { ...m, profiles: profile || { full_name: `User ${m.user_id.slice(0, 6)}`, avatar_url: null } };
//       });
//       setMembers(membersWithProfiles);
//     } else {
//       setMembers([]);
//     }

//     const { data: contribData } = await supabase.from("contributions").select("*").eq("group_id", id).order("created_at", { ascending: false });
//     if (contribData) setContributions(contribData);

//     setLoading(false);
//   }, [id, supabase, router]);

//   useEffect(() => { if (id) fetchAllData(); }, [id, fetchAllData]);

//   useEffect(() => {
//     const handleRefresh = () => fetchAllData();
//     window.addEventListener("focus", handleRefresh);
//     document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") handleRefresh(); });
//     return () => { window.removeEventListener("focus", handleRefresh); document.removeEventListener("visibilitychange", handleRefresh); };
//   }, [fetchAllData]);

//   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
//   const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
//   const getInitials = (name: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

//   const totalContributions = contributions.filter((c) => c.status === "completed").reduce((sum, c) => sum + c.amount, 0);
//   const pendingMembers = contributions.filter((c) => c.status === "pending").length;
//   const contributionAmount = group?.contribution_amount || 50000;
//   const isRotatingAjo = group?.rotation_order && group.rotation_order.length > 0;
//   const totalPayout = contributionAmount * members.length;

//   const handleMarkPayout = async () => {
//     if (!isRotatingAjo) return;
//     setProcessingPayout(true);
//     try {
//       const currentRecipientId = group.rotation_order[group.current_rotation_index];
      
//       await supabase.from("group_members").update({
//         has_received_payout: true,
//         payout_received_at: new Date().toISOString(),
//         payout_amount: totalPayout,
//       }).eq("group_id", id).eq("user_id", currentRecipientId);

//       const nextIndex = (group.current_rotation_index + 1) % group.rotation_order.length;
//       await supabase.from("groups").update({
//         current_rotation_index: nextIndex,
//         last_payout_date: new Date().toISOString(),
//         next_payout_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
//       }).eq("id", id);

//       await fetchAllData();
//     } catch (err) {
//       console.error("Payout error:", err);
//     } finally {
//       setProcessingPayout(false);
//     }
//   };

//   if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Loading group details...</div>;
//   if (!group) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>Group not found.</div>;

//   const isAdmin = members.find((m: any) => m.user_id === currentUserId && m.role === "admin") || group.created_by === currentUserId;

//   return (
//     <>
//       {/* Top Header */}
//       <header style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//             <Link href="/groups" style={{ color: "#3e4a3d", textDecoration: "none", display: "flex", alignItems: "center" }}><span className="material-symbols-outlined">arrow_back</span></Link>
//             <div>
//               <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#006b2c" }}>{group.name}</h2>
//               {isRotatingAjo && (
//                 <span style={{ fontSize: "12px", color: "#825100", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo
//                 </span>
//               )}
//             </div>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//             <button onClick={fetchAllData} title="Refresh" style={{ padding: "8px", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "#e5eeff", color: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span></button>
//             {isAdmin && (
//               <Link href={`/groups/${id}/add-members`} style={{ padding: "10px 20px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
//                 <span className="material-symbols-outlined">person_add</span>Add Members
//               </Link>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* KPI Row */}
//       <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "24px" }}>
//         {[
//           { label: "Total Pooled", value: formatNaira(group.pool_amount || 0), sub: `Cycle ${group.cycle_number || 1}` },
//           { label: "Contribution", value: formatNaira(contributionAmount), sub: "Per member / cycle" },
//           { label: "Members", value: `${members.length} / ${group.max_members || 20}`, sub: `${Math.round((members.length / (group.max_members || 20)) * 100)}% filled` },
//           { label: isRotatingAjo ? "Next Payout" : "Status", value: isRotatingAjo ? (group.next_payout_date ? formatDate(group.next_payout_date) : "TBD") : (group.status === "active" ? "Active" : group.status || "Active"), sub: isRotatingAjo ? `${formatNaira(totalPayout)} pool` : `${pendingMembers} pending` },
//         ].map((kpi) => (
//           <div key={kpi.label} style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px" }}>
//             <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", marginBottom: "8px" }}>{kpi.label}</p>
//             <h3 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: kpi.label === "Total Pooled" ? "#006b2c" : "#0b1c30", marginBottom: "4px" }}>{kpi.value}</h3>
//             <p style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{kpi.sub}</p>
//           </div>
//         ))}
//       </section>

//       {/* ROTATING AJO TRACKER */}
//       {isRotatingAjo && (
//         <section style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 221, 184, 0.5)", boxShadow: "0 4px 20px rgba(130, 81, 0, 0.06)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
//           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//               <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(130, 81, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                 <span className="material-symbols-outlined" style={{ color: "#825100", fontSize: "28px" }}>cached</span>
//               </div>
//               <div>
//                 <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#0b1c30" }}>Rotating Ajo — Payout Order</h3>
//                 <p style={{ fontSize: "13px", color: "#3e4a3d" }}>
//                   Each member receives <strong>{formatNaira(totalPayout)}</strong> when it's their turn
//                   {group.current_rotation_index !== undefined && ` • ${group.rotation_order.length - group.current_rotation_index - 1} people before next round`}
//                 </p>
//               </div>
//             </div>
//             {group.next_payout_date && (
//               <div style={{ textAlign: "right" }}>
//                 <p style={{ fontSize: "11px", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Geist', sans-serif" }}>Next Payout</p>
//                 <p style={{ fontSize: "18px", fontWeight: 600, color: "#825100" }}>{formatDate(group.next_payout_date)}</p>
//               </div>
//             )}
//           </div>

//           {/* Rotation Timeline */}
//           <div style={{ display: "flex", alignItems: "center", gap: "0", overflowX: "auto", padding: "20px 8px" }}>
//             {group.rotation_order.map((userId: string, index: number) => {
//               const member = members.find((m: any) => m.user_id === userId);
//               const isCurrentRecipient = index === group.current_rotation_index;
//               const hasReceived = member?.has_received_payout;
//               const memberName = member?.profiles?.full_name || `User ${userId.slice(0, 6)}`;
//               const isPast = index < group.current_rotation_index;

//               return (
//                 <div key={userId} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
//                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
//                     <div style={{
//                       width: "56px", height: "56px", borderRadius: "50%",
//                       backgroundColor: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#e5eeff",
//                       color: isCurrentRecipient || hasReceived ? "#ffffff" : "#3e4a3d",
//                       display: "flex", alignItems: "center", justifyContent: "center",
//                       fontWeight: 700, fontSize: "16px",
//                       border: isCurrentRecipient ? "3px solid #ffddb8" : hasReceived ? "3px solid #62df7d" : "2px solid rgba(189, 202, 186, 0.3)",
//                       boxShadow: isCurrentRecipient ? "0 0 16px rgba(130, 81, 0, 0.3)" : "none",
//                       position: "relative",
//                     }}>
//                       {hasReceived ? (
//                         <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>check</span>
//                       ) : isCurrentRecipient ? (
//                         <span className="material-symbols-outlined" style={{ fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>arrow_circle_down</span>
//                       ) : (
//                         getInitials(memberName)
//                       )}
//                       {isCurrentRecipient && !hasReceived && (
//                         <span style={{ position: "absolute", top: "-8px", right: "-8px", backgroundColor: "#006b2c", color: "#fff", fontSize: "9px", padding: "2px 6px", borderRadius: "8px", fontWeight: 700 }}>NOW</span>
//                       )}
//                     </div>
//                     <span style={{ fontSize: "11px", fontWeight: 500, textAlign: "center", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0b1c30" }}>
//                       {memberName}
//                     </span>
//                     <span style={{ fontSize: "10px", color: isCurrentRecipient ? "#825100" : hasReceived ? "#006b2c" : "#6e7b6c", fontWeight: 600 }}>
//                       {isCurrentRecipient ? "Receiving" : hasReceived ? `Got ${formatNaira(member?.payout_amount || totalPayout)}` : `#${index + 1}`}
//                     </span>
//                   </div>
//                   {index < group.rotation_order.length - 1 && (
//                     <div style={{ width: "36px", height: "2px", backgroundColor: isPast ? "#006b2c" : "#e5eeff", margin: "0 4px", marginBottom: "20px" }} />
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           {/* Admin Payout Button */}
//           {isAdmin && (
//             <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(189, 202, 186, 0.3)" }}>
//               <button
//                 onClick={handleMarkPayout}
//                 disabled={processingPayout}
//                 style={{
//                   width: "100%", padding: "14px", backgroundColor: processingPayout ? "#6e7b6c" : "#825100",
//                   color: "#ffffff", borderRadius: "8px", border: "none", cursor: processingPayout ? "not-allowed" : "pointer",
//                   fontWeight: 600, fontSize: "14px", fontFamily: "'Geist', sans-serif",
//                   display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
//                   boxShadow: "0 4px 12px rgba(130, 81, 0, 0.2)", transition: "all 0.2s",
//                 }}
//               >
//                 <span className="material-symbols-outlined">payments</span>
//                 {processingPayout ? "Processing..." : `Mark Payout Complete — ${formatNaira(totalPayout)}`}
//               </button>
//               <p style={{ fontSize: "11px", color: "#6e7b6c", textAlign: "center", marginTop: "8px", fontFamily: "'Geist', sans-serif" }}>
//                 This will mark the current recipient as paid and move to the next person in rotation.
//               </p>
//             </div>
//           )}
//         </section>
//       )}

//       {/* Members Table */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//         <div style={{ gridColumn: "span 2" }}>
//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", overflow: "hidden" }}>
//             <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <h4 style={{ fontSize: "18px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Members ({members.length})</h4>
//               <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
//                 <button onClick={fetchAllData} style={{ background: "none", border: "none", cursor: "pointer", color: "#6e7b6c", padding: "4px" }}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>refresh</span></button>
//                 {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none" }}>+ Add Members</Link>}
//               </div>
//             </div>
//             <div style={{ overflowX: "auto" }}>
//               {members.length === 0 ? (
//                 <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
//                   <p style={{ fontSize: "14px" }}>No members yet.</p>
//                   {isAdmin && <Link href={`/groups/${id}/add-members`} style={{ color: "#006b2c", fontWeight: 600, textDecoration: "underline", marginTop: "8px", display: "inline-block" }}>Invite members now</Link>}
//                 </div>
//               ) : (
//                 <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
//                   <thead style={{ backgroundColor: "#eff4ff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
//                     <tr>
//                       <th style={{ padding: "16px 24px" }}>Member</th>
//                       <th style={{ padding: "16px 24px" }}>Role</th>
//                       {isRotatingAjo && <th style={{ padding: "16px 24px" }}>Position</th>}
//                       <th style={{ padding: "16px 24px" }}>Contribution</th>
//                       <th style={{ padding: "16px 24px" }}>Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {members.map((m: any) => {
//                       const contrib = contributions.find((c: any) => c.user_id === m.user_id);
//                       const memberName = m.profiles?.full_name || `User ${m.user_id.slice(0, 6)}`;
//                       return (
//                         <tr key={m.user_id} style={{ borderBottom: "1px solid rgba(189, 202, 186, 0.2)", transition: "background-color 0.2s", cursor: "pointer" }}
//                           onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff4ff"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
//                           <td style={{ padding: "16px 24px" }}>
//                             <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                               <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: m.user_id === currentUserId ? "#00873a" : "#dae2fd", color: m.user_id === currentUserId ? "#f7fff2" : "#5c647a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>{getInitials(memberName)}</div>
//                               <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{memberName}{m.user_id === currentUserId && " (You)"}</span>
//                             </div>
//                           </td>
//                           <td style={{ padding: "16px 24px" }}>
//                             <span style={{ padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, backgroundColor: m.role === "admin" ? "rgba(0, 107, 44, 0.1)" : "rgba(130, 81, 0, 0.1)", color: m.role === "admin" ? "#006b2c" : "#825100", textTransform: "capitalize", fontFamily: "'Geist', sans-serif" }}>{m.role}</span>
//                           </td>
//                           {isRotatingAjo && (
//                             <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500 }}>
//                               #{m.rotation_position || "—"}
//                             </td>
//                           )}
//                           <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{contrib ? formatNaira(contrib.amount) : "—"}</td>
//                           <td style={{ padding: "16px 24px" }}>
//                             {isRotatingAjo ? (
//                               m.has_received_payout ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#006b2c", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
//                                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Paid
//                                 </span>
//                               ) : group.rotation_order?.[group.current_rotation_index] === m.user_id ? (
//                                 <span style={{ fontSize: "12px", fontWeight: 600, color: "#825100", fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
//                                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_circle_down</span> Current
//                                 </span>
//                               ) : (
//                                 <span style={{ fontSize: "12px", color: "#6e7b6c", display: "flex", alignItems: "center", gap: "4px" }}>
//                                   <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span> Waiting
//                                 </span>
//                               )
//                             ) : (
//                               <span style={{ fontSize: "12px", color: "#6e7b6c" }}>—</span>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Right Sidebar */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//           <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "#0b1c30", color: "#f8f9ff", position: "relative", overflow: "hidden" }}>
//             <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", backgroundColor: "rgba(0, 107, 44, 0.2)", borderRadius: "50%", filter: "blur(40px)" }} />
//             <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "4px", position: "relative", zIndex: 10 }}>
//               Contribution per member
//             </p>
//             <h3 style={{ fontSize: "28px", fontWeight: 600, color: "#62df7d", marginBottom: isRotatingAjo ? "8px" : "16px", position: "relative", zIndex: 10 }}>{formatNaira(contributionAmount)}</h3>
//             {isRotatingAjo && (
//               <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "16px", position: "relative", zIndex: 10 }}>
//                 Total pool per round: <strong style={{ color: "#ffddb8" }}>{formatNaira(totalPayout)}</strong>
//               </p>
//             )}
//             <Link
//               href={`/payments?groupId=${group.id}&amount=${contributionAmount}`}
//               style={{ width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative", zIndex: 10, boxSizing: "border-box" }}
//             >
//               <span className="material-symbols-outlined">bolt</span>
//               Make Contribution
//             </Link>
//           </div>

//           <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0, 107, 44, 0.1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px" }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#006b2c" }}>
//               <span className="material-symbols-outlined">info</span>
//               <h4 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Group Info</h4>
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ color: "#3e4a3d" }}>Type</span>
//                 <span style={{ fontWeight: 500, color: isRotatingAjo ? "#825100" : "#006b2c", display: "flex", alignItems: "center", gap: "4px" }}>
//                   {isRotatingAjo ? (
//                     <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cached</span> Rotating Ajo</>
//                   ) : (
//                     <><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>savings</span> Fixed Savings</>
//                   )}
//                 </span>
//               </div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Cycle</span><span style={{ fontWeight: 500 }}>#{group.cycle_number || 1}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Contribution</span><span style={{ fontWeight: 500, color: "#006b2c" }}>{formatNaira(contributionAmount)}</span></div>
//               <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#3e4a3d" }}>Created</span><span style={{ fontWeight: 500 }}>{formatDate(group.created_at)}</span></div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// interface GroupData {
//   id: string;
//   name: string;
//   description: string;
//   pool_amount: number;
//   member_count: number;
//   max_members: number;
//   status: string;
//   cycle_number: number;
//   created_by: string;
//   created_at: string;
// }

// interface MemberData {
//   user_id: string;
//   role: string;
//   joined_at: string;
//   profiles: {
//     full_name: string;
//     avatar_url: string;
//   } | null;
// }

// interface ContributionData {
//   id: string;
//   amount: number;
//   status: string;
//   user_id: string;
//   created_at: string;
// }

// export default function GroupDetailPage() {
//   const { id } = useParams();
//   const supabase = createClient();

//   const [group, setGroup] = useState<GroupData | null>(null);
//   const [members, setMembers] = useState<MemberData[]>([]);
//   const [contributions, setContributions] = useState<ContributionData[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState<string>("");

//   useEffect(() => {
//     async function fetchGroupData() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) return;
//       setCurrentUserId(user.id);

//       const { data: groupData } = await supabase
//         .from("groups")
//         .select("*")
//         .eq("id", id)
//         .single();

//       if (groupData) setGroup(groupData);

//       const { data: memberData } = await supabase
//         .from("group_members")
//         .select("user_id, role, joined_at, profiles(full_name, avatar_url)")
//         .eq("group_id", id);

//       if (memberData) setMembers(memberData);

//       const { data: contribData } = await supabase
//         .from("contributions")
//         .select("*")
//         .eq("group_id", id)
//         .order("created_at", { ascending: false });

//       if (contribData) setContributions(contribData);

//       setLoading(false);
//     }

//     if (id) fetchGroupData();
//   }, [id, supabase]);

//   const formatNaira = (amount: number) =>
//     `₦${amount.toLocaleString("en-NG")}`;

//   const formatDate = (dateStr: string) =>
//     new Date(dateStr).toLocaleDateString("en-US", {
//       month: "short",
//       day: "2-digit",
//       year: "numeric",
//     });

//   const getInitials = (name: string) =>
//     name
//       ?.split(" ")
//       .map((n) => n[0])
//       .join("")
//       .toUpperCase()
//       .slice(0, 2) || "??";

//   const totalContributions = contributions
//     .filter((c) => c.status === "completed")
//     .reduce((sum, c) => sum + c.amount, 0);

//   const pendingMembers = contributions.filter(
//     (c) => c.status === "pending"
//   ).length;

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//           fontFamily: "'Inter', sans-serif",
//           color: "#3e4a3d",
//           fontSize: "16px",
//         }}
//       >
//         Loading group details...
//       </div>
//     );
//   }

//   if (!group) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//           fontFamily: "'Inter', sans-serif",
//           color: "#3e4a3d",
//           fontSize: "16px",
//         }}
//       >
//         Group not found.
//       </div>
//     );
//   }

//   // Check if current user is admin OR the creator of the group
//   const isAdmin =
//     members.find((m) => m.user_id === currentUserId && m.role === "admin") ||
//     group.created_by === currentUserId;

//   return (
//     <>
//       <TopHeader groupName={group.name} groupId={group.id} isAdmin={!!isAdmin} />
//       <KPISection
//         group={group}
//         members={members}
//         contributions={contributions}
//         totalContributions={totalContributions}
//         pendingMembers={pendingMembers}
//         formatNaira={formatNaira}
//       />
//       <MainGrid
//         group={group}
//         members={members}
//         contributions={contributions}
//         currentUserId={currentUserId}
//         isAdmin={!!isAdmin}
//         formatNaira={formatNaira}
//         formatDate={formatDate}
//         getInitials={getInitials}
//       />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader({
//   groupName,
//   groupId,
//   isAdmin,
// }: {
//   groupName: string;
//   groupId: string;
//   isAdmin: boolean;
// }) {
//   return (
//     <header
//       style={{
//         width: "100%",
//         position: "sticky",
//         top: 0,
//         zIndex: 40,
//         backgroundColor: "rgba(248, 249, 255, 0.7)",
//         backdropFilter: "blur(12px)",
//         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         marginBottom: "24px",
//         marginLeft: "-24px",
//         marginRight: "-24px",
//         paddingLeft: "24px",
//         paddingRight: "24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "12px 0",
//           maxWidth: "1280px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <Link
//             href="/groups"
//             style={{
//               color: "#3e4a3d",
//               textDecoration: "none",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <span className="material-symbols-outlined">arrow_back</span>
//           </Link>
//           <h2
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#006b2c",
//             }}
//           >
//             {groupName}
//           </h2>
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           {/* ADD MEMBERS BUTTON — visible for admins */}
//           {isAdmin && (
//             <Link
//               href={`/groups/${groupId}/add-members`}
//               style={{
//                 padding: "10px 20px",
//                 backgroundColor: "#006b2c",
//                 color: "#ffffff",
//                 borderRadius: "8px",
//                 fontWeight: 500,
//                 fontSize: "14px",
//                 fontFamily: "'Geist', sans-serif",
//                 textDecoration: "none",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 transition: "all 0.2s",
//               }}
//             >
//               <span className="material-symbols-outlined">person_add</span>
//               Add Members
//             </Link>
//           )}

//           <button
//             style={{
//               padding: "8px",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#3e4a3d",
//             }}
//           >
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//           <img
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               objectFit: "cover",
//               border: "1px solid rgba(189, 202, 186, 0.3)",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAgkpe5fuiIHhciMzpc9H4Sw2aQl3XHek9HIZhHL9p75TXWAIFphJjjchwNp9mkIouwY1h3bCd0h_zsz-TwwGvQgn35PLBRrnqRog3oZ8TtBrrzu3_vjroEVNM0adC8G5-C3k-FDiTCWrJPFq1FhLV0877_wU3SQbWL3QCQ5vKCQGddl_85UxUM9tcHwqPPn8J1JHtp7sHwIlPiv3vurYzdLuKzhjZERFK6dwIPM9crqe1kq0sBvHGFbyCAzGtHiHbf7a3yL7tnz2X"
//           />
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    KPI SECTION
//    =========================== */
// function KPISection({
//   group,
//   members,
//   contributions,
//   totalContributions,
//   pendingMembers,
//   formatNaira,
// }: {
//   group: any;
//   members: any[];
//   contributions: any[];
//   totalContributions: number;
//   pendingMembers: number;
//   formatNaira: (amount: number) => string;
// }) {
//   const fillPercentage =
//     group.max_members > 0
//       ? Math.round((members.length / group.max_members) * 100)
//       : 0;

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(4, 1fr)",
//         gap: "24px",
//         marginBottom: "24px",
//       }}
//     >
//       {[
//         {
//           label: "Total Pooled",
//           value: formatNaira(group.pool_amount || 0),
//           change: `Cycle ${group.cycle_number || 1}`,
//           trend: "trending_up",
//           large: true,
//         },
//         {
//           label: "Members",
//           value: `${members.length} / ${group.max_members || 20}`,
//           change: `${fillPercentage}% filled`,
//           trend: "",
//           large: false,
//           progress: fillPercentage,
//         },
//         {
//           label: "Contributions",
//           value: formatNaira(totalContributions),
//           change: `${contributions.length} total`,
//           trend: "",
//           large: false,
//         },
//         {
//           label: "Status",
//           value: group.status === "active" ? "Active" : group.status || "Active",
//           change: `${pendingMembers} pending`,
//           trend: "",
//           large: false,
//           gauge: fillPercentage,
//         },
//       ].map((kpi) => (
//         <div
//           key={kpi.label}
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//               marginBottom: "8px",
//             }}
//           >
//             {kpi.label}
//           </p>
//           {kpi.gauge != null ? (
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 flex: 1,
//               }}
//             >
//               <div
//                 style={{
//                   position: "relative",
//                   width: "96px",
//                   height: "96px",
//                   marginTop: "8px",
//                 }}
//               >
//                 <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
//                   <circle cx="48" cy="48" r="40" fill="transparent" stroke="#dce9ff" strokeWidth="8" />
//                   <circle
//                     cx="48" cy="48" r="40" fill="transparent" stroke="#006b2c" strokeWidth="8"
//                     strokeDasharray="251.2"
//                     strokeDashoffset={251.2 - (251.2 * kpi.gauge) / 100}
//                     style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
//                   />
//                 </svg>
//                 <span
//                   style={{
//                     position: "absolute", inset: 0, display: "flex",
//                     alignItems: "center", justifyContent: "center",
//                     fontSize: "20px", fontWeight: 600, color: "#0b1c30",
//                   }}
//                 >
//                   {kpi.gauge}%
//                 </span>
//               </div>
//             </div>
//           ) : (
//             <>
//               <h3
//                 style={{
//                   fontSize: kpi.large ? "32px" : "24px",
//                   lineHeight: kpi.large ? "40px" : "32px",
//                   letterSpacing: "-0.02em",
//                   fontWeight: 700,
//                   fontFamily: "'Inter', sans-serif",
//                   color: kpi.large ? "#006b2c" : "#0b1c30",
//                 }}
//               >
//                 {kpi.value}
//               </h3>
//               {kpi.progress !== undefined && (
//                 <div
//                   style={{
//                     width: "100%", height: "8px", backgroundColor: "#dce9ff",
//                     borderRadius: "9999px", overflow: "hidden", marginTop: "24px",
//                   }}
//                 >
//                   <div style={{ height: "100%", width: `${kpi.progress}%`, backgroundColor: "#006b2c" }} />
//                 </div>
//               )}
//               {kpi.change && (
//                 <div
//                   style={{
//                     display: "flex", alignItems: "center", gap: "8px",
//                     color: kpi.trend ? "#006b2c" : "#6e7b6c",
//                     fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", marginTop: "24px",
//                   }}
//                 >
//                   {kpi.trend && <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{kpi.trend}</span>}
//                   <span>{kpi.change}</span>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       ))}
//     </section>
//   );
// }

// /* ===========================
//    MAIN GRID
//    =========================== */
// function MainGrid({
//   group,
//   members,
//   contributions,
//   currentUserId,
//   isAdmin,
//   formatNaira,
//   formatDate,
//   getInitials,
// }: {
//   group: any;
//   members: any[];
//   contributions: any[];
//   currentUserId: string;
//   isAdmin: boolean;
//   formatNaira: (amount: number) => string;
//   formatDate: (dateStr: string) => string;
//   getInitials: (name: string) => string;
// }) {
//   return (
//     <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//       {/* Left: Member Table */}
//       <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "24px" }}>
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px", overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               padding: "16px 24px", borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//               display: "flex", justifyContent: "space-between", alignItems: "center",
//             }}
//           >
//             <h4 style={{ fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
//               Members ({members.length})
//             </h4>
//             {isAdmin && (
//               <Link
//                 href={`/groups/${group.id}/add-members`}
//                 style={{ color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none" }}
//               >
//                 + Add Members
//               </Link>
//             )}
//           </div>

//           <div style={{ overflowX: "auto" }}>
//             {members.length === 0 ? (
//               <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
//                 <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
//                 <p>No members yet.</p>
//                 {isAdmin && (
//                   <Link href={`/groups/${group.id}/add-members`} style={{ color: "#006b2c", fontWeight: 600, textDecoration: "underline", marginTop: "8px", display: "inline-block" }}>
//                     Invite members now →
//                   </Link>
//                 )}
//               </div>
//             ) : (
//               <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
//                 <thead style={{ backgroundColor: "#eff4ff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
//                   <tr>
//                     <th style={{ padding: "16px 24px" }}>Member</th>
//                     <th style={{ padding: "16px 24px" }}>Role</th>
//                     <th style={{ padding: "16px 24px" }}>Contribution</th>
//                     <th style={{ padding: "16px 24px" }}>Joined</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {members.map((m) => {
//                     const memberContrib = contributions.find((c) => c.user_id === m.user_id);
//                     return (
//                       <tr
//                         key={m.user_id}
//                         style={{ borderBottom: "1px solid rgba(189, 202, 186, 0.2)", transition: "background-color 0.2s", cursor: "pointer" }}
//                         onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff4ff"; }}
//                         onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
//                       >
//                         <td style={{ padding: "16px 24px" }}>
//                           <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                             <div
//                               style={{
//                                 width: "32px", height: "32px", borderRadius: "50%",
//                                 backgroundColor: m.user_id === currentUserId ? "#00873a" : "#dae2fd",
//                                 color: m.user_id === currentUserId ? "#f7fff2" : "#5c647a",
//                                 display: "flex", alignItems: "center", justifyContent: "center",
//                                 fontWeight: 700, fontSize: "12px",
//                               }}
//                             >
//                               {m.profiles?.full_name ? getInitials(m.profiles.full_name) : "??"}
//                             </div>
//                             <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>
//                               {m.profiles?.full_name || "Unknown User"}
//                               {m.user_id === currentUserId && " (You)"}
//                             </span>
//                           </div>
//                         </td>
//                         <td style={{ padding: "16px 24px" }}>
//                           <span
//                             style={{
//                               padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
//                               backgroundColor: m.role === "admin" ? "rgba(0, 107, 44, 0.1)" : "rgba(130, 81, 0, 0.1)",
//                               color: m.role === "admin" ? "#006b2c" : "#825100",
//                               textTransform: "capitalize", fontFamily: "'Geist', sans-serif",
//                             }}
//                           >
//                             {m.role}
//                           </span>
//                         </td>
//                         <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>
//                           {memberContrib ? formatNaira(memberContrib.amount) : "—"}
//                         </td>
//                         <td style={{ padding: "16px 24px", fontSize: "14px", color: "#3e4a3d" }}>
//                           {formatDate(m.joined_at)}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Right: Quick Pay + Info */}
//       <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//         <div
//           style={{
//             padding: "24px", borderRadius: "12px", backgroundColor: "#0b1c30", color: "#f8f9ff",
//             boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", position: "relative", overflow: "hidden",
//           }}
//         >
//           <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", backgroundColor: "rgba(0, 107, 44, 0.2)", borderRadius: "50%", filter: "blur(40px)" }} />
//           <div style={{ position: "relative", zIndex: 10, marginBottom: "24px" }}>
//             <p style={{ fontSize: "14px", opacity: 0.8, fontFamily: "'Geist', sans-serif", marginBottom: "8px" }}>Group Pool</p>
//             <h3 style={{ fontSize: "24px", fontWeight: 600, color: "#62df7d" }}>{formatNaira(group.pool_amount || 0)}</h3>
//           </div>
//           <Link
//             href="/payments"
//             style={{
//               width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff",
//               borderRadius: "8px", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif",
//               textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center",
//               gap: "16px", position: "relative", zIndex: 10, boxSizing: "border-box",
//             }}
//           >
//             <span className="material-symbols-outlined">bolt</span>
//             Make Contribution
//           </Link>
//         </div>

//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)",
//             border: "1px solid rgba(0, 107, 44, 0.1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px", padding: "24px",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", color: "#006b2c" }}>
//             <span className="material-symbols-outlined">info</span>
//             <h4 style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>Group Info</h4>
//           </div>
//           <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//             {[
//               ["Description", group.description || "No description"],
//               ["Cycle", `#${group.cycle_number || 1}`],
//               ["Created", formatDate(group.created_at)],
//               ["Status", group.status || "active"],
//             ].map(([label, value]) => (
//               <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ fontSize: "14px", color: "#3e4a3d" }}>{label}</span>
//                 <span style={{
//                   fontSize: "14px", fontWeight: 500, textTransform: label === "Status" ? "capitalize" : "none",
//                   color: label === "Status" && value === "active" ? "#006b2c" : label === "Status" ? "#825100" : "#0b1c30",
//                   textAlign: "right", maxWidth: label === "Description" ? "60%" : "none",
//                 }}>
//                   {value}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// interface GroupData {
//   id: string;
//   name: string;
//   description: string;
//   pool_amount: number;
//   member_count: number;
//   max_members: number;
//   status: string;
//   cycle_number: number;
//   created_by: string;
//   created_at: string;
// }

// interface MemberData {
//   user_id: string;
//   role: string;
//   joined_at: string;
//   profiles: {
//     full_name: string;
//     avatar_url: string;
//   } | null;
// }

// interface ContributionData {
//   id: string;
//   amount: number;
//   status: string;
//   user_id: string;
//   created_at: string;
// }

// export default function GroupDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const supabase = createClient();

//   const [group, setGroup] = useState<GroupData | null>(null);
//   const [members, setMembers] = useState<MemberData[]>([]);
//   const [contributions, setContributions] = useState<ContributionData[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentUserId, setCurrentUserId] = useState<string>("");

//   useEffect(() => {
//     async function fetchGroupData() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) return;
//       setCurrentUserId(user.id);

//       // Fetch group
//       const { data: groupData } = await supabase
//         .from("groups")
//         .select("*")
//         .eq("id", id)
//         .single();

//       if (groupData) setGroup(groupData);

//       // Fetch members with profiles
//       const { data: memberData } = await supabase
//         .from("group_members")
//         .select("user_id, role, joined_at, profiles(full_name, avatar_url)")
//         .eq("group_id", id);

//       if (memberData) setMembers(memberData);

//       // Fetch contributions
//       const { data: contribData } = await supabase
//         .from("contributions")
//         .select("*")
//         .eq("group_id", id)
//         .order("created_at", { ascending: false });

//       if (contribData) setContributions(contribData);

//       setLoading(false);
//     }

//     fetchGroupData();
//   }, [id, supabase]);

//   const formatNaira = (amount: number) => {
//     return `₦${amount.toLocaleString("en-NG")}`;
//   };

//   const formatDate = (dateStr: string) => {
//     const d = new Date(dateStr);
//     return d.toLocaleDateString("en-US", {
//       month: "short",
//       day: "2-digit",
//       year: "numeric",
//     });
//   };

//   const getInitials = (name: string) => {
//     return (
//       name
//         ?.split(" ")
//         .map((n) => n[0])
//         .join("")
//         .toUpperCase()
//         .slice(0, 2) || "??"
//     );
//   };

//   const totalContributions = contributions
//     .filter((c) => c.status === "completed")
//     .reduce((sum, c) => sum + c.amount, 0);

//   const pendingMembers = contributions.filter(
//     (c) => c.status === "pending"
//   ).length;

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//           fontFamily: "'Inter', sans-serif",
//           color: "#3e4a3d",
//           fontSize: "16px",
//         }}
//       >
//         Loading group details...
//       </div>
//     );
//   }

//   if (!group) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//           fontFamily: "'Inter', sans-serif",
//           color: "#3e4a3d",
//           fontSize: "16px",
//         }}
//       >
//         Group not found.
//       </div>
//     );
//   }

//   const isAdmin = members.find(
//     (m) => m.user_id === currentUserId && m.role === "admin"
//   );

//   return (
//     <>
//       <TopHeader groupName={group.name} groupId={group.id} isAdmin={!!isAdmin} />
//       <KPISection
//         group={group}
//         members={members}
//         contributions={contributions}
//         totalContributions={totalContributions}
//         pendingMembers={pendingMembers}
//         formatNaira={formatNaira}
//       />
//       <MainGrid
//         group={group}
//         members={members}
//         contributions={contributions}
//         currentUserId={currentUserId}
//         isAdmin={!!isAdmin}
//         formatNaira={formatNaira}
//         formatDate={formatDate}
//         getInitials={getInitials}
//       />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader({
//   groupName,
//   groupId,
//   isAdmin,
// }: {
//   groupName: string;
//   groupId: string;
//   isAdmin: boolean;
// }) {
//   return (
//     <header
//       style={{
//         width: "100%",
//         position: "sticky",
//         top: 0,
//         zIndex: 40,
//         backgroundColor: "rgba(248, 249, 255, 0.7)",
//         backdropFilter: "blur(12px)",
//         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         marginBottom: "24px",
//         marginLeft: "-24px",
//         marginRight: "-24px",
//         paddingLeft: "24px",
//         paddingRight: "24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "12px 0",
//           maxWidth: "1280px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <Link
//             href="/groups"
//             style={{
//               color: "#3e4a3d",
//               textDecoration: "none",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <span className="material-symbols-outlined">arrow_back</span>
//           </Link>
//           <h2
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#006b2c",
//             }}
//           >
//             {groupName}
//           </h2>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           {isAdmin && (
//             <Link
//               href={`/groups/${groupId}/add-members`}
//               style={{
//                 padding: "10px 20px",
//                 backgroundColor: "#006b2c",
//                 color: "#ffffff",
//                 borderRadius: "8px",
//                 fontWeight: 500,
//                 fontSize: "14px",
//                 fontFamily: "'Geist', sans-serif",
//                 textDecoration: "none",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 transition: "all 0.2s",
//               }}
//             >
//               <span className="material-symbols-outlined">person_add</span>
//               Add Members
//             </Link>
//           )}
//           <button
//             style={{
//               padding: "8px",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#3e4a3d",
//             }}
//           >
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//           <img
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               objectFit: "cover",
//               border: "1px solid rgba(189, 202, 186, 0.3)",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAgkpe5fuiIHhciMzpc9H4Sw2aQl3XHek9HIZhHL9p75TXWAIFphJjjchwNp9mkIouwY1h3bCd0h_zsz-TwwGvQgn35PLBRrnqRog3oZ8TtBrrzu3_vjroEVNM0adC8G5-C3k-FDiTCWrJPFq1FhLV0877_wU3SQbWL3QCQ5vKCQGddl_85UxUM9tcHwqPPn8J1JHtp7sHwIlPiv3vurYzdLuKzhjZERFK6dwIPM9crqe1kq0sBvHGFbyCAzGtHiHbf7a3yL7tnz2X"
//           />
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    KPI SECTION
//    =========================== */
// function KPISection({
//   group,
//   members,
//   contributions,
//   totalContributions,
//   pendingMembers,
//   formatNaira,
// }: {
//   group: any;
//   members: any[];
//   contributions: any[];
//   totalContributions: number;
//   pendingMembers: number;
//   formatNaira: (amount: number) => string;
// }) {
//   const fillPercentage =
//     group.max_members > 0
//       ? Math.round((members.length / group.max_members) * 100)
//       : 0;

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(4, 1fr)",
//         gap: "24px",
//         marginBottom: "24px",
//       }}
//     >
//       {[
//         {
//           label: "Total Pooled",
//           value: formatNaira(group.pool_amount || 0),
//           change: `Cycle ${group.cycle_number || 1}`,
//           trend: "trending_up",
//           large: true,
//         },
//         {
//           label: "Members",
//           value: `${members.length} / ${group.max_members || 20}`,
//           change: `${fillPercentage}% filled`,
//           trend: "",
//           large: false,
//           progress: fillPercentage,
//         },
//         {
//           label: "Contributions",
//           value: formatNaira(totalContributions),
//           change: `${contributions.length} total`,
//           trend: "",
//           large: false,
//         },
//         {
//           label: "Status",
//           value:
//             group.status === "active"
//               ? "Active"
//               : group.status || "Active",
//           change: `${pendingMembers} pending`,
//           trend: "",
//           large: false,
//           gauge: fillPercentage,
//         },
//       ].map((kpi) => (
//         <div
//           key={kpi.label}
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//               marginBottom: "8px",
//             }}
//           >
//             {kpi.label}
//           </p>
//           {kpi.gauge ? (
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 flex: 1,
//               }}
//             >
//               <div
//                 style={{
//                   position: "relative",
//                   width: "96px",
//                   height: "96px",
//                   marginTop: "8px",
//                 }}
//               >
//                 <svg
//                   width="96"
//                   height="96"
//                   style={{ transform: "rotate(-90deg)" }}
//                 >
//                   <circle
//                     cx="48"
//                     cy="48"
//                     r="40"
//                     fill="transparent"
//                     stroke="#dce9ff"
//                     strokeWidth="8"
//                   />
//                   <circle
//                     cx="48"
//                     cy="48"
//                     r="40"
//                     fill="transparent"
//                     stroke="#006b2c"
//                     strokeWidth="8"
//                     strokeDasharray="251.2"
//                     strokeDashoffset={251.2 - (251.2 * kpi.gauge) / 100}
//                     style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
//                   />
//                 </svg>
//                 <span
//                   style={{
//                     position: "absolute",
//                     inset: 0,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     fontSize: "20px",
//                     fontWeight: 600,
//                     color: "#0b1c30",
//                   }}
//                 >
//                   {kpi.gauge}%
//                 </span>
//               </div>
//             </div>
//           ) : (
//             <>
//               <h3
//                 style={{
//                   fontSize: kpi.large ? "32px" : "24px",
//                   lineHeight: kpi.large ? "40px" : "32px",
//                   letterSpacing: "-0.02em",
//                   fontWeight: 700,
//                   fontFamily: "'Inter', sans-serif",
//                   color: kpi.large ? "#006b2c" : "#0b1c30",
//                 }}
//               >
//                 {kpi.value}
//               </h3>
//               {kpi.progress !== undefined && (
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "8px",
//                     backgroundColor: "#dce9ff",
//                     borderRadius: "9999px",
//                     overflow: "hidden",
//                     marginTop: "24px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       height: "100%",
//                       width: `${kpi.progress}%`,
//                       backgroundColor: "#006b2c",
//                     }}
//                   />
//                 </div>
//               )}
//               {kpi.change && (
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                     color: kpi.trend ? "#006b2c" : "#6e7b6c",
//                     fontSize: "12px",
//                     fontWeight: 600,
//                     fontFamily: "'Geist', sans-serif",
//                     marginTop: "24px",
//                   }}
//                 >
//                   {kpi.trend && (
//                     <span
//                       className="material-symbols-outlined"
//                       style={{ fontSize: "16px" }}
//                     >
//                       {kpi.trend}
//                     </span>
//                   )}
//                   <span>{kpi.change}</span>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       ))}
//     </section>
//   );
// }

// /* ===========================
//    MAIN GRID
//    =========================== */
// function MainGrid({
//   group,
//   members,
//   contributions,
//   currentUserId,
//   isAdmin,
//   formatNaira,
//   formatDate,
//   getInitials,
// }: {
//   group: any;
//   members: any[];
//   contributions: any[];
//   currentUserId: string;
//   isAdmin: boolean;
//   formatNaira: (amount: number) => string;
//   formatDate: (dateStr: string) => string;
//   getInitials: (name: string) => string;
// }) {
//   return (
//     <div
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(3, 1fr)",
//         gap: "24px",
//       }}
//     >
//       {/* Left: Member Table */}
//       <div
//         style={{
//           gridColumn: "span 2",
//           display: "flex",
//           flexDirection: "column",
//           gap: "24px",
//         }}
//       >
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               padding: "16px 24px",
//               borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <h4
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               Members ({members.length})
//             </h4>
//             {isAdmin && (
//               <Link
//                 href={`/groups/${group.id}/add-members`}
//                 style={{
//                   color: "#006b2c",
//                   fontSize: "14px",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   textDecoration: "none",
//                 }}
//               >
//                 + Add Members
//               </Link>
//             )}
//           </div>

//           <div style={{ overflowX: "auto" }}>
//             {members.length === 0 ? (
//               <div
//                 style={{
//                   padding: "60px 24px",
//                   textAlign: "center",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{
//                     fontSize: "48px",
//                     display: "block",
//                     marginBottom: "16px",
//                     color: "#bdcaba",
//                   }}
//                 >
//                   groups
//                 </span>
//                 <p>No members yet. Invite people to join this group.</p>
//               </div>
//             ) : (
//               <table
//                 style={{
//                   width: "100%",
//                   textAlign: "left",
//                   borderCollapse: "collapse",
//                 }}
//               >
//                 <thead
//                   style={{
//                     backgroundColor: "#eff4ff",
//                     fontSize: "14px",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   <tr>
//                     <th style={{ padding: "16px 24px" }}>Member</th>
//                     <th style={{ padding: "16px 24px" }}>Role</th>
//                     <th style={{ padding: "16px 24px" }}>Contribution</th>
//                     <th style={{ padding: "16px 24px" }}>Joined</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {members.map((m) => {
//                     const memberContrib = contributions.find(
//                       (c) => c.user_id === m.user_id
//                     );
//                     return (
//                       <tr
//                         key={m.user_id}
//                         style={{
//                           borderBottom:
//                             "1px solid rgba(189, 202, 186, 0.2)",
//                           transition: "background-color 0.2s",
//                           cursor: "pointer",
//                         }}
//                         onMouseEnter={(e) => {
//                           e.currentTarget.style.backgroundColor = "#eff4ff";
//                         }}
//                         onMouseLeave={(e) => {
//                           e.currentTarget.style.backgroundColor =
//                             "transparent";
//                         }}
//                       >
//                         <td style={{ padding: "16px 24px" }}>
//                           <div
//                             style={{
//                               display: "flex",
//                               alignItems: "center",
//                               gap: "16px",
//                             }}
//                           >
//                             <div
//                               style={{
//                                 width: "32px",
//                                 height: "32px",
//                                 borderRadius: "50%",
//                                 backgroundColor:
//                                   m.user_id === currentUserId
//                                     ? "#00873a"
//                                     : "#dae2fd",
//                                 color:
//                                   m.user_id === currentUserId
//                                     ? "#f7fff2"
//                                     : "#5c647a",
//                                 display: "flex",
//                                 alignItems: "center",
//                                 justifyContent: "center",
//                                 fontWeight: 700,
//                                 fontSize: "12px",
//                               }}
//                             >
//                               {m.profiles?.full_name
//                                 ? getInitials(m.profiles.full_name)
//                                 : "??"}
//                             </div>
//                             <span
//                               style={{
//                                 fontSize: "14px",
//                                 fontWeight: 500,
//                                 fontFamily: "'Geist', sans-serif",
//                               }}
//                             >
//                               {m.profiles?.full_name || "Unknown User"}
//                               {m.user_id === currentUserId && " (You)"}
//                             </span>
//                           </div>
//                         </td>
//                         <td style={{ padding: "16px 24px" }}>
//                           <span
//                             style={{
//                               padding: "4px 12px",
//                               borderRadius: "9999px",
//                               fontSize: "12px",
//                               fontWeight: 600,
//                               backgroundColor:
//                                 m.role === "admin"
//                                   ? "rgba(0, 107, 44, 0.1)"
//                                   : "rgba(130, 81, 0, 0.1)",
//                               color:
//                                 m.role === "admin" ? "#006b2c" : "#825100",
//                               textTransform: "capitalize",
//                               fontFamily: "'Geist', sans-serif",
//                             }}
//                           >
//                             {m.role}
//                           </span>
//                         </td>
//                         <td
//                           style={{
//                             padding: "16px 24px",
//                             fontSize: "14px",
//                             fontWeight: 500,
//                             fontFamily: "'Geist', sans-serif",
//                           }}
//                         >
//                           {memberContrib
//                             ? formatNaira(memberContrib.amount)
//                             : "—"}
//                         </td>
//                         <td
//                           style={{
//                             padding: "16px 24px",
//                             fontSize: "14px",
//                             color: "#3e4a3d",
//                           }}
//                         >
//                           {formatDate(m.joined_at)}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Right: Quick Pay + Info */}
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           gap: "24px",
//         }}
//       >
//         {/* Quick Pay */}
//         <div
//           style={{
//             padding: "24px",
//             borderRadius: "12px",
//             backgroundColor: "#0b1c30",
//             color: "#f8f9ff",
//             boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               position: "absolute",
//               top: "-40px",
//               right: "-40px",
//               width: "160px",
//               height: "160px",
//               backgroundColor: "rgba(0, 107, 44, 0.2)",
//               borderRadius: "50%",
//               filter: "blur(40px)",
//             }}
//           />
//           <div
//             style={{
//               position: "relative",
//               zIndex: 10,
//               marginBottom: "24px",
//             }}
//           >
//             <p
//               style={{
//                 fontSize: "14px",
//                 opacity: 0.8,
//                 fontFamily: "'Geist', sans-serif",
//                 marginBottom: "8px",
//               }}
//             >
//               Group Pool
//             </p>
//             <h3
//               style={{
//                 fontSize: "24px",
//                 fontWeight: 600,
//                 color: "#62df7d",
//               }}
//             >
//               {formatNaira(group.pool_amount || 0)}
//             </h3>
//           </div>
//           <Link
//             href="/payments"
//             style={{
//               width: "100%",
//               padding: "16px",
//               backgroundColor: "#006b2c",
//               color: "#ffffff",
//               borderRadius: "8px",
//               fontWeight: 500,
//               fontSize: "14px",
//               fontFamily: "'Geist', sans-serif",
//               border: "none",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               gap: "16px",
//               textDecoration: "none",
//               position: "relative",
//               zIndex: 10,
//               transition: "all 0.2s",
//               boxSizing: "border-box",
//             }}
//           >
//             <span className="material-symbols-outlined">bolt</span>
//             Make Contribution
//           </Link>
//         </div>

//         {/* Group Info */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(0, 107, 44, 0.1)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "16px",
//               marginBottom: "16px",
//               color: "#006b2c",
//             }}
//           >
//             <span className="material-symbols-outlined">info</span>
//             <h4
//               style={{
//                 fontSize: "14px",
//                 fontWeight: 700,
//                 fontFamily: "'Geist', sans-serif",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//               }}
//             >
//               Group Info
//             </h4>
//           </div>
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "12px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span style={{ fontSize: "14px", color: "#3e4a3d" }}>
//                 Description
//               </span>
//               <span
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: 500,
//                   textAlign: "right",
//                   maxWidth: "60%",
//                 }}
//               >
//                 {group.description || "No description"}
//               </span>
//             </div>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span style={{ fontSize: "14px", color: "#3e4a3d" }}>
//                 Cycle
//               </span>
//               <span style={{ fontSize: "14px", fontWeight: 500 }}>
//                 #{group.cycle_number || 1}
//               </span>
//             </div>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span style={{ fontSize: "14px", color: "#3e4a3d" }}>
//                 Created
//               </span>
//               <span style={{ fontSize: "14px", fontWeight: 500 }}>
//                 {formatDate(group.created_at)}
//               </span>
//             </div>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span style={{ fontSize: "14px", color: "#3e4a3d" }}>
//                 Status
//               </span>
//               <span
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: 500,
//                   color: group.status === "active" ? "#006b2c" : "#825100",
//                   textTransform: "capitalize",
//                 }}
//               >
//                 {group.status || "active"}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



// "use client";

// import { useParams } from "next/navigation";

// export default function GroupDetailPage() {
//   const { id } = useParams();

//   return (
//     <>
//       <TopHeader />
//       <KPISection />
//       <MainGrid />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader() {
//   return (
//     <header
//       style={{
//         width: "100%",
//         position: "sticky",
//         top: 0,
//         zIndex: 40,
//         backgroundColor: "rgba(248, 249, 255, 0.7)",
//         backdropFilter: "blur(12px)",
//         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         marginBottom: "24px",
//         marginLeft: "-24px",
//         marginRight: "-24px",
//         paddingLeft: "24px",
//         paddingRight: "24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "12px 0",
//           maxWidth: "1280px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <h2
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#006b2c",
//             }}
//           >
//             Lagos Investment Circle
//           </h2>
//           <span
//             style={{
//               backgroundColor: "rgba(130, 81, 0, 0.1)",
//               color: "#825100",
//               padding: "4px 16px",
//               borderRadius: "9999px",
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 600,
//               fontFamily: "'Geist', sans-serif",
//               textTransform: "uppercase",
//               letterSpacing: "0.05em",
//             }}
//           >
//             Premium Tier
//           </span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
//           <div style={{ position: "relative" }}>
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 position: "absolute",
//                 left: "16px",
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 color: "#6e7b6c",
//               }}
//             >
//               search
//             </span>
//             <input
//               type="text"
//               placeholder="Search activities..."
//               style={{
//                 padding: "8px 24px 8px 48px",
//                 backgroundColor: "#eff4ff",
//                 border: "none",
//                 borderRadius: "9999px",
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 outline: "none",
//                 width: "256px",
//                 boxSizing: "border-box",
//               }}
//             />
//           </div>
//           <button
//             style={{
//               padding: "8px",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#3e4a3d",
//             }}
//           >
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//           <button
//             style={{
//               padding: "8px",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#3e4a3d",
//             }}
//           >
//             <span className="material-symbols-outlined">help</span>
//           </button>
//           <img
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               objectFit: "cover",
//               border: "1px solid rgba(189, 202, 186, 0.3)",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAgkpe5fuiIHhciMzpc9H4Sw2aQl3XHek9HIZhHL9p75TXWAIFphJjjchwNp9mkIouwY1h3bCd0h_zsz-TwwGvQgn35PLBRrnqRog3oZ8TtBrrzu3_vjroEVNM0adC8G5-C3k-FDiTCWrJPFq1FhLV0877_wU3SQbWL3QCQ5vKCQGddl_85UxUM9tcHwqPPn8J1JHtp7sHwIlPiv3vurYzdLuKzhjZERFK6dwIPM9crqe1kq0sBvHGFbyCAzGtHiHbf7a3yL7tnz2X"
//           />
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    KPI SECTION
//    =========================== */
// function KPISection() {
//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(4, 1fr)",
//         gap: "24px",
//         marginBottom: "24px",
//       }}
//     >
//       {[
//         {
//           label: "Total Pooled",
//           value: "₦12,450,000",
//           change: "+12.5% vs last cycle",
//           trend: "trending_up",
//           large: true,
//         },
//         {
//           label: "Next Payout Date",
//           value: "Oct 28, 2023",
//           change: "To: Tunde Adeniyi",
//           trend: "",
//           large: false,
//         },
//         {
//           label: "Current Cycle Members",
//           value: "18 / 20",
//           change: "",
//           trend: "",
//           large: false,
//           progress: 90,
//         },
//         {
//           label: "Financial Health",
//           value: "85%",
//           change: "Stable Liquidity",
//           trend: "",
//           large: false,
//           gauge: 85,
//         },
//       ].map((kpi) => (
//         <div
//           key={kpi.label}
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//               marginBottom: "8px",
//             }}
//           >
//             {kpi.label}
//           </p>
//           {kpi.gauge ? (
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 flex: 1,
//               }}
//             >
//               <div
//                 style={{
//                   position: "relative",
//                   width: "96px",
//                   height: "96px",
//                   marginTop: "8px",
//                 }}
//               >
//                 <svg
//                   width="96"
//                   height="96"
//                   style={{ transform: "rotate(-90deg)" }}
//                 >
//                   <circle
//                     cx="48"
//                     cy="48"
//                     r="40"
//                     fill="transparent"
//                     stroke="#dce9ff"
//                     strokeWidth="8"
//                   />
//                   <circle
//                     cx="48"
//                     cy="48"
//                     r="40"
//                     fill="transparent"
//                     stroke="#006b2c"
//                     strokeWidth="8"
//                     strokeDasharray="251.2"
//                     strokeDashoffset="37.6"
//                     style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
//                   />
//                 </svg>
//                 <span
//                   style={{
//                     position: "absolute",
//                     inset: 0,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 600,
//                     fontFamily: "'Inter', sans-serif",
//                     color: "#0b1c30",
//                   }}
//                 >
//                   85%
//                 </span>
//               </div>
//               <p
//                 style={{
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#006b2c",
//                   marginTop: "16px",
//                 }}
//               >
//                 Stable Liquidity
//               </p>
//             </div>
//           ) : (
//             <>
//               <h3
//                 style={{
//                   fontSize: kpi.large ? "32px" : "24px",
//                   lineHeight: kpi.large ? "40px" : "32px",
//                   letterSpacing: "-0.02em",
//                   fontWeight: 700,
//                   fontFamily: "'Inter', sans-serif",
//                   color: kpi.large ? "#006b2c" : "#0b1c30",
//                 }}
//               >
//                 {kpi.value}
//               </h3>
//               {kpi.progress && (
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "8px",
//                     backgroundColor: "#dce9ff",
//                     borderRadius: "9999px",
//                     overflow: "hidden",
//                     marginTop: "24px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       height: "100%",
//                       width: `${kpi.progress}%`,
//                       backgroundColor: "#006b2c",
//                     }}
//                   />
//                 </div>
//               )}
//               {kpi.change && (
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                     color: kpi.trend ? "#006b2c" : "#6e7b6c",
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     fontFamily: "'Geist', sans-serif",
//                     marginTop: "24px",
//                   }}
//                 >
//                   {kpi.trend && (
//                     <span
//                       className="material-symbols-outlined"
//                       style={{ fontSize: "16px" }}
//                     >
//                       {kpi.trend}
//                     </span>
//                   )}
//                   <span>{kpi.change}</span>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       ))}
//     </section>
//   );
// }

// /* ===========================
//    MAIN GRID
//    =========================== */
// function MainGrid() {
//   const members = [
//     {
//       name: "Chioma Okeke",
//       amount: "₦500,000",
//       status: "Paid",
//       statusColor: "#006b2c",
//       score: 782,
//       scoreWidth: 80,
//       scoreColor: "#006b2c",
//       img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNC2HPe5OO4z_26K01sTHGAH1fTRhlLZIlBzIf1tLgyfSrS1PjtdQlsSW3Zot8iJEGyIaNpSc-VEBF_4vgsSWIn-WJm5aqCp6IUA7XtU-_r8n_mwKB6ylmrXnuuZaeq96fqputhZUoGICYNU6cbKNgYlYk3lotZHPS5vb_Dj-B6ThYetSGiiPy9TCKMRcglcn82COPt-Bw8zrWHuun3lbnVfPxk6EcSW9BvJn3nSKpxzxJFvADxqn9CECOSzDyBGeKmInin06VJENN",
//     },
//     {
//       name: "Babajide Sanwo",
//       amount: "₦500,000",
//       status: "Pending",
//       statusColor: "#825100",
//       score: 715,
//       scoreWidth: 70,
//       scoreColor: "#825100",
//       img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDM95r0AENnYvPzlHllh6cTskhKTYfapAF4VdZSpd41qPRcoNuwtmKBzBeOZFp1anVOdPyEIhf6bZ-HAeP8wUpJQBfDgDnSYG05D3LLLzLo3oFqHAyWG8vChCRGIkSpPxzMkzhvPb8htF3wRdf0VBbUN7zbvza5BJ2ag8cz54DoDd-DSFkVdWyPZ7OwudC8odbYDbuG51FR8m5D6LHbxZCEE90eXk3eFNcVL-lRSQYMDRjeC_hQDqOg0og-DF1QVump0hejpy1RSDUj",
//     },
//     {
//       name: "Ayo Dele",
//       amount: "₦500,000",
//       status: "Late",
//       statusColor: "#ba1a1a",
//       score: 640,
//       scoreWidth: 40,
//       scoreColor: "#ba1a1a",
//       img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6hvEDn25xY0FIErGGlQTY2TvCZkj5-nqhDNfqY2TJ1g-aAY3dsZK_FmBo1UQUxqw0B46izFuDRzmmUVhktc6Y5lKPOTj-OBGjm4puHx4TD1M5jB48DWxPq2eGPms4fDn6ha_i3phVmSy3qeo-EwGgHB-6AGXJh_6koX6TA_wzc1QCdZpnsGQ5caXXSjwaXC2pLcWRssZ2ziHkewRunjZc1_70FMpR8iREvUuZ5jZf_ls4SmEQGCbvjXTS72dRfoXITgkkJmiIIcNf",
//     },
//   ];

//   const timeline = [
//     {
//       title: "Pool Disbursement",
//       date: "Sept 28, 2023 • Paid to Ifeoma A.",
//       complete: true,
//       current: false,
//     },
//     {
//       title: "Oct Contributions Open",
//       date: "Oct 01, 2023 • Ongoing",
//       complete: false,
//       current: true,
//     },
//     {
//       title: "Contribution Deadline",
//       date: "Oct 25, 2023 • 8 days left",
//       complete: false,
//       current: false,
//     },
//   ];

//   return (
//     <div
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(3, 1fr)",
//         gap: "24px",
//       }}
//     >
//       {/* Left: Member Table + Documents */}
//       <div
//         style={{
//           gridColumn: "span 2",
//           display: "flex",
//           flexDirection: "column",
//           gap: "24px",
//         }}
//       >
//         {/* Member Table */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               padding: "16px 24px",
//               borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <h4
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               Member Contributions
//             </h4>
//             <button
//               style={{
//                 color: "#006b2c",
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//               }}
//             >
//               View All
//             </button>
//           </div>
//           <div style={{ overflowX: "auto" }}>
//             <table
//               style={{
//                 width: "100%",
//                 textAlign: "left",
//                 borderCollapse: "collapse",
//               }}
//             >
//               <thead
//                 style={{
//                   backgroundColor: "#eff4ff",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 <tr>
//                   <th style={{ padding: "16px 24px" }}>Member</th>
//                   <th style={{ padding: "16px 24px" }}>Contribution</th>
//                   <th style={{ padding: "16px 24px" }}>Status</th>
//                   <th style={{ padding: "16px 24px" }}>Credit Score</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {members.map((m) => (
//                   <tr
//                     key={m.name}
//                     style={{
//                       borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//                       transition: "background-color 0.2s",
//                       cursor: "pointer",
//                     }}
//                     onMouseEnter={(e) => {
//                       e.currentTarget.style.backgroundColor = "#eff4ff";
//                     }}
//                     onMouseLeave={(e) => {
//                       e.currentTarget.style.backgroundColor = "transparent";
//                     }}
//                   >
//                     <td style={{ padding: "16px 24px" }}>
//                       <div
//                         style={{
//                           display: "flex",
//                           alignItems: "center",
//                           gap: "16px",
//                         }}
//                       >
//                         <div
//                           style={{
//                             width: "32px",
//                             height: "32px",
//                             borderRadius: "50%",
//                             overflow: "hidden",
//                             backgroundColor: "#dae2fd",
//                           }}
//                         >
//                           <img
//                             style={{
//                               width: "100%",
//                               height: "100%",
//                               objectFit: "cover",
//                             }}
//                             alt={m.name}
//                             src={m.img}
//                           />
//                         </div>
//                         <span
//                           style={{
//                             fontSize: "14px",
//                             lineHeight: "20px",
//                             letterSpacing: "0.01em",
//                             fontWeight: 500,
//                             fontFamily: "'Geist', sans-serif",
//                           }}
//                         >
//                           {m.name}
//                         </span>
//                       </div>
//                     </td>
//                     <td
//                       style={{
//                         padding: "16px 24px",
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 500,
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       {m.amount}
//                     </td>
//                     <td style={{ padding: "16px 24px" }}>
//                       <span
//                         style={{
//                           padding: "4px 16px",
//                           borderRadius: "9999px",
//                           fontSize: "12px",
//                           lineHeight: "16px",
//                           letterSpacing: "0.03em",
//                           fontWeight: 600,
//                           fontFamily: "'Geist', sans-serif",
//                           backgroundColor: `${m.statusColor}10`,
//                           color: m.statusColor,
//                         }}
//                       >
//                         {m.status}
//                       </span>
//                     </td>
//                     <td style={{ padding: "16px 24px" }}>
//                       <div
//                         style={{
//                           display: "flex",
//                           alignItems: "center",
//                           gap: "8px",
//                         }}
//                       >
//                         <span
//                           style={{
//                             fontSize: "14px",
//                             lineHeight: "20px",
//                             letterSpacing: "0.01em",
//                             fontWeight: 500,
//                             fontFamily: "'Geist', sans-serif",
//                             color: "#0b1c30",
//                           }}
//                         >
//                           {m.score}
//                         </span>
//                         <div
//                           style={{
//                             width: "64px",
//                             height: "6px",
//                             backgroundColor: "#e5eeff",
//                             borderRadius: "9999px",
//                             overflow: "hidden",
//                           }}
//                         >
//                           <div
//                             style={{
//                               height: "100%",
//                               width: `${m.scoreWidth}%`,
//                               backgroundColor: m.scoreColor,
//                             }}
//                           />
//                         </div>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Documents */}
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: "24px",
//           }}
//         >
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.8)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.8)",
//               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//               borderRadius: "12px",
//               padding: "24px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "16px",
//                 marginBottom: "24px",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ color: "#006b2c" }}
//               >
//                 description
//               </span>
//               <h4
//                 style={{
//                   fontSize: "24px",
//                   lineHeight: "32px",
//                   letterSpacing: "-0.01em",
//                   fontWeight: 600,
//                   fontFamily: "'Inter', sans-serif",
//                 }}
//               >
//                 Group Bylaws
//               </h4>
//             </div>
//             <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
//               {[
//                 "Investment_Bylaws_v2.pdf",
//                 "Emergency_Exit_Rules.pdf",
//               ].map((file) => (
//                 <li
//                   key={file}
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     cursor: "pointer",
//                     padding: "8px 0",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#3e4a3d",
//                       transition: "color 0.2s",
//                     }}
//                   >
//                     {file}
//                   </span>
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ color: "#6e7b6c" }}
//                   >
//                     download
//                   </span>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.8)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.8)",
//               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//               borderRadius: "12px",
//               padding: "24px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "16px",
//                 marginBottom: "24px",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ color: "#006b2c" }}
//               >
//                 gavel
//               </span>
//               <h4
//                 style={{
//                   fontSize: "24px",
//                   lineHeight: "32px",
//                   letterSpacing: "-0.01em",
//                   fontWeight: 600,
//                   fontFamily: "'Inter', sans-serif",
//                 }}
//               >
//                 Loan Terms
//               </h4>
//             </div>
//             <div
//               style={{
//                 backgroundColor: "#eff4ff",
//                 padding: "16px",
//                 borderRadius: "8px",
//                 border: "1px solid rgba(189, 202, 186, 0.3)",
//               }}
//             >
//               <p
//                 style={{
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#3e4a3d",
//                   fontStyle: "italic",
//                 }}
//               >
//                 &quot;All loans must be repaid with a 5% interest rate to the
//                 group pool within 90 days of disbursement.&quot;
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Right: Quick Pay + AI + Timeline */}
//       <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//         {/* Quick Pay */}
//         <div
//           style={{
//             padding: "24px",
//             borderRadius: "12px",
//             backgroundColor: "#0b1c30",
//             color: "#f8f9ff",
//             boxShadow:
//               "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//             display: "flex",
//             flexDirection: "column",
//             gap: "24px",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               position: "absolute",
//               top: "-40px",
//               right: "-40px",
//               width: "160px",
//               height: "160px",
//               backgroundColor: "rgba(0, 107, 44, 0.2)",
//               borderRadius: "50%",
//               filter: "blur(40px)",
//             }}
//           />
//           <div style={{ position: "relative", zIndex: 10 }}>
//             <p
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 opacity: 0.8,
//                 marginBottom: "8px",
//               }}
//             >
//               Your Contribution
//             </p>
//             <h3
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 color: "#62df7d",
//               }}
//             >
//               ₦500,000.00
//             </h3>
//           </div>
//           <button
//             style={{
//               width: "100%",
//               padding: "16px",
//               backgroundColor: "#006b2c",
//               color: "#ffffff",
//               borderRadius: "8px",
//               fontWeight: 500,
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontFamily: "'Geist', sans-serif",
//               border: "none",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               gap: "16px",
//               position: "relative",
//               zIndex: 10,
//               transition: "all 0.2s",
//             }}
//           >
//             <span className="material-symbols-outlined">bolt</span>
//             Monnify Quick-Pay
//           </button>
//         </div>

//         {/* AI Insight */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(0, 107, 44, 0.1)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//             backgroundImage:
//               "linear-gradient(135deg, rgba(0, 107, 44, 0.05) 0%, rgba(130, 81, 0, 0.05) 100%)",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "16px",
//               marginBottom: "16px",
//               color: "#006b2c",
//             }}
//           >
//             <span className="material-symbols-outlined">auto_awesome</span>
//             <h4
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 700,
//                 fontFamily: "'Geist', sans-serif",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//               }}
//             >
//               AI Treasurer Insight
//             </h4>
//           </div>
//           <p
//             style={{
//               fontSize: "16px",
//               lineHeight: "24px",
//               color: "#3e4a3d",
//               lineHeight: 1.6,
//             }}
//           >
//             Current liquidity is{" "}
//             <span style={{ color: "#006b2c", fontWeight: 700 }}>Optimal</span>.
//             The group is on track for the October payout. However, note that 2
//             members are still pending for this cycle. If payments aren&apos;t
//             received by the 25th, the reserve pool will be utilized to guarantee
//             the scheduled payout.
//           </p>
//         </div>

//         {/* Timeline */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid rgba(226, 232, 240, 0.8)",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             padding: "24px",
//           }}
//         >
//           <h4
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               marginBottom: "24px",
//             }}
//           >
//             Timeline
//           </h4>
//           <div
//             style={{
//               position: "relative",
//               display: "flex",
//               flexDirection: "column",
//               gap: "40px",
//             }}
//           >
//             {/* Vertical line */}
//             <div
//               style={{
//                 position: "absolute",
//                 left: "11px",
//                 top: "8px",
//                 bottom: "8px",
//                 width: "2px",
//                 backgroundColor: "rgba(189, 202, 186, 0.3)",
//               }}
//             />
//             {timeline.map((item, i) => (
//               <div
//                 key={item.title}
//                 style={{ position: "relative", paddingLeft: "40px" }}
//               >
//                 <div
//                   style={{
//                     position: "absolute",
//                     left: 0,
//                     top: "4px",
//                     width: "24px",
//                     height: "24px",
//                     borderRadius: "50%",
//                     backgroundColor: item.complete
//                       ? "#006b2c"
//                       : item.current
//                       ? "#7ffc97"
//                       : "#e5eeff",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     border: "4px solid #f8f9ff",
//                   }}
//                 >
//                   {item.complete ? (
//                     <span
//                       className="material-symbols-outlined"
//                       style={{
//                         fontSize: "12px",
//                         color: "#ffffff",
//                       }}
//                     >
//                       check
//                     </span>
//                   ) : item.current ? (
//                     <span
//                       className="material-symbols-outlined"
//                       style={{
//                         fontSize: "12px",
//                         color: "#006b2c",
//                       }}
//                     >
//                       schedule
//                     </span>
//                   ) : (
//                     <div
//                       style={{
//                         width: "6px",
//                         height: "6px",
//                         borderRadius: "50%",
//                         backgroundColor: "#6e7b6c",
//                       }}
//                     />
//                   )}
//                 </div>
//                 <div>
//                   <p
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: item.complete || item.current ? "#0b1c30" : "#6e7b6c",
//                     }}
//                   >
//                     {item.title}
//                   </p>
//                   <p
//                     style={{
//                       fontSize: "12px",
//                       lineHeight: "16px",
//                       letterSpacing: "0.03em",
//                       fontWeight: 600,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#6e7b6c",
//                     }}
//                   >
//                     {item.date}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }