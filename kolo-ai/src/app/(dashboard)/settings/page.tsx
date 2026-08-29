"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type SettingsTab =
  | "hub"
  | "profile";

type ModalType =
  | "security"
  | "notifications"
  | "preferences"
  | "ai"
  | "compliance"
  | null;

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;

  payout_bank_name:
    | string
    | null;

  payout_account_name:
    | string
    | null;

  payout_account_number:
    | string
    | null;

  payout_account_verified:
    | boolean
    | null;

  created_at: string;
  updated_at: string;
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(
  name: string
) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "U"
  );
}

function maskAccountNumber(
  value: string
) {
  if (!value) return "";

  if (value.length <= 4) {
    return value;
  }

  return `${"•".repeat(
    Math.max(
      value.length - 4,
      4
    )
  )}${value.slice(-4)}`;
}

/* =========================================================
   MAIN SETTINGS PAGE
========================================================= */

export default function SettingsPage() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>(
      "hub"
    );

  const [fading, setFading] =
    useState(false);

  const switchTab = (
    tab: SettingsTab
  ) => {
    if (
      tab === activeTab
    ) {
      return;
    }

    setFading(true);

    setTimeout(() => {
      setActiveTab(tab);

      setTimeout(() => {
        setFading(false);
      }, 50);
    }, 200);
  };

  return (
    <div
      className="settings-layout"
      style={{
        display: "flex",
        gap: "40px",
        maxWidth: "1100px",
        margin: "0 auto",
        alignItems:
          "flex-start",
        padding:
          "20px",
        boxSizing:
          "border-box",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div
        className="settings-sidebar"
        style={{
          width: "240px",
          flexShrink: 0,
          position:
            "sticky",
          top: "80px",
        }}
      >
        <div
          style={{
            marginBottom:
              "32px",
          }}
        >
          <h2
            className="sidebar-title"
            style={{
              fontSize:
                "28px",
              fontWeight:
                700,
              fontFamily:
                "'Inter', sans-serif",
              color:
                "#0b1c30",
              margin:
                "0 0 4px",
            }}
          >
            Settings
          </h2>

          <p
            style={{
              color:
                "#3e4a3d",
              fontSize:
                "14px",
              lineHeight:
                1.5,
              margin: 0,
            }}
          >
            Manage your profile,
            security and Kolo
            preferences.
          </p>
        </div>

        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap: "4px",
          }}
        >
          {[
            {
              key:
                "hub" as SettingsTab,
              label:
                "Overview",
              icon:
                "dashboard",
              desc:
                "Settings hub & summaries",
            },
            {
              key:
                "profile" as SettingsTab,
              label:
                "Edit Profile",
              icon:
                "person",
              desc:
                "Personal & payout information",
            },
          ].map(
            (tab) => (
              <button
                key={
                  tab.key
                }
                onClick={() =>
                  switchTab(
                    tab.key
                  )
                }
                style={{
                  width:
                    "100%",
                  textAlign:
                    "left",
                  padding:
                    "16px",
                  border:
                    "none",
                  cursor:
                    "pointer",
                  backgroundColor:
                    activeTab ===
                    tab.key
                      ? "#ffffff"
                      : "transparent",
                  boxShadow:
                    activeTab ===
                    tab.key
                      ? "0 2px 8px rgba(0,0,0,0.06)"
                      : "none",
                  transition:
                    "background-color 0.3s, box-shadow 0.3s",
                  display:
                    "flex",
                  alignItems:
                    "flex-start",
                  gap:
                    "12px",
                  borderRadius:
                    "12px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize:
                      "22px",
                    color:
                      activeTab ===
                      tab.key
                        ? "#006b2c"
                        : "#3e4a3d",
                    marginTop:
                      "2px",
                  }}
                >
                  {
                    tab.icon
                  }
                </span>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "15px",
                      fontWeight:
                        600,
                      color:
                        activeTab ===
                        tab.key
                          ? "#006b2c"
                          : "#0b1c30",
                      marginBottom:
                        "2px",
                    }}
                  >
                    {
                      tab.label
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#6e7b6c",
                    }}
                  >
                    {
                      tab.desc
                    }
                  </div>
                </div>

                {activeTab ===
                  tab.key && (
                  <div
                    style={{
                      width:
                        "4px",
                      height:
                        "40px",
                      backgroundColor:
                        "#006b2c",
                      borderRadius:
                        "2px",
                      alignSelf:
                        "center",
                    }}
                  />
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div
        className="settings-content"
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            opacity:
              fading
                ? 0
                : 1,
            transition:
              "opacity 0.2s ease",
          }}
        >
          {activeTab ===
            "hub" && (
            <SettingsHub
              onSwitchToProfile={() =>
                switchTab(
                  "profile"
                )
              }
            />
          )}

          {activeTab ===
            "profile" && (
            <EditProfile />
          )}
        </div>
      </div>

      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style jsx>{`
        @media (max-width: 768px) {
          .settings-layout {
            flex-direction: column !important;
            gap: 20px !important;
            padding: 14px !important;
          }

          .settings-sidebar {
            width: 100% !important;
            position: static !important;
          }

          .sidebar-title {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   SETTINGS HUB
========================================================= */

function SettingsHub({
  onSwitchToProfile,
}: {
  onSwitchToProfile: () => void;
}) {
  const supabase =
    createClient();

  const [user, setUser] =
    useState<any>(null);

  const [profile, setProfile] =
    useState<Profile | null>(
      null
    );

  const [
    activeModal,
    setActiveModal,
  ] =
    useState<ModalType>(null);

  const [
    modalClosing,
    setModalClosing,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const loadData =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const {
            data: {
              user: authUser,
            },
          } =
            await supabase.auth.getUser();

          if (!authUser) {
            setLoading(false);
            return;
          }

          setUser(
            authUser
          );

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(
                `
                id,
                full_name,
                avatar_url,
                phone,
                payout_bank_name,
                payout_account_name,
                payout_account_number,
                payout_account_verified,
                created_at,
                updated_at
              `
              )
              .eq(
                "id",
                authUser.id
              )
              .maybeSingle();

          if (error) {
            console.error(
              "Settings profile error:",
              error
            );
          }

          setProfile(
            data as Profile
          );
        } catch (error) {
          console.error(
            "Settings load error:",
            error
          );
        } finally {
          setLoading(false);
        }
      },
      [supabase]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeModal =
    () => {
      setModalClosing(
        true
      );

      setTimeout(() => {
        setActiveModal(
          null
        );

        setModalClosing(
          false
        );
      }, 200);
    };

  const fullName =
    profile?.full_name ||
    user?.user_metadata
      ?.full_name ||
    user?.email
      ?.split("@")[0] ||
    "User";

  const memberSince =
    profile?.created_at
      ? new Date(
          profile.created_at
        ).toLocaleDateString(
          "en-NG",
          {
            month:
              "long",
            year:
              "numeric",
          }
        )
      : "Recently";

  const payoutConfigured =
    Boolean(
      profile
        ?.payout_bank_name &&
        profile
          ?.payout_account_name &&
        profile
          ?.payout_account_number
    );

  if (loading) {
    return (
      <div
        style={{
          padding:
            "60px",
          textAlign:
            "center",
          color:
            "#3e4a3d",
        }}
      >
        Loading settings...
      </div>
    );
  }

  const cards = [
    {
      id:
        "security" as ModalType,
      icon:
        "shield_lock",
      title:
        "Security & Access",
      desc:
        "Account security and sign-in protection.",
      status:
        "Account Protected",
      color:
        "#006b2c",
      items: [
        {
          l:
            "Authentication",
          v:
            "Supabase Auth",
          a: true,
        },
        {
          l:
            "Email",
          v:
            user?.email ||
            "Not available",
          a: true,
        },
        {
          l:
            "Two-factor",
          v:
            "Manage in security settings",
          a: false,
        },
      ],
    },

    {
      id:
        "notifications" as ModalType,
      icon:
        "notifications_active",
      title:
        "Notifications",
      desc:
        "Contribution and payout alerts.",
      status:
        "Manage Alerts",
      color:
        "#565e74",
      items: [
        {
          l:
            "Contribution reminders",
          v:
            "Available",
          a: true,
        },
        {
          l:
            "Payment review",
          v:
            "Available",
          a: true,
        },
        {
          l:
            "Payout alerts",
          v:
            "Available",
          a: true,
        },
      ],
    },

    {
      id:
        "preferences" as ModalType,
      icon:
        "tune",
      title:
        "Preferences",
      desc:
        "Currency and application preferences.",
      status:
        "NGN • English",
      color:
        "#3e4a3d",
      items: [
        {
          l:
            "Currency",
          v:
            "NGN (₦)",
          a: true,
        },
        {
          l:
            "Language",
          v:
            "English",
          a: true,
        },
        {
          l:
            "Theme",
          v:
            "System",
          a: true,
        },
      ],
    },

    {
      id:
        "ai" as ModalType,
      icon:
        "psychology_alt",
      title:
        "AI Personalization",
      desc:
        "Treasurer AI uses your group data.",
      status:
        "Active",
      color:
        "#006b2c",
      items: [
        {
          l:
            "Treasurer AI",
          v:
            "Available",
          a: true,
        },
        {
          l:
            "Group analysis",
          v:
            "Enabled",
          a: true,
        },
        {
          l:
            "Financial insights",
          v:
            "Enabled",
          a: true,
        },
      ],
    },

    {
      id:
        "compliance" as ModalType,
      icon:
        "gavel",
      title:
        "Privacy & Compliance",
      desc:
        "Manage your personal data.",
      status:
        "Available",
      color:
        "#ba1a1a",
      items: [
        {
          l:
            "Data export",
          v:
            "Available",
          a: true,
        },
        {
          l:
            "Profile deletion",
          v:
            "Request available",
          a: true,
        },
      ],
    },
  ];

  return (
    <div>
      {/* =====================================================
          PROFILE SUMMARY
      ===================================================== */}

      <div
        className="hub-top-row"
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(12, 1fr)",
          gap:
            "20px",
          marginBottom:
            "24px",
        }}
      >
        <div
          className="hub-profile"
          style={{
            gridColumn:
              "span 8",
            background:
              "rgba(255,255,255,0.8)",
            backdropFilter:
              "blur(12px)",
            border:
              "1px solid rgba(226,232,240,0.8)",
            boxShadow:
              "0 4px 20px rgba(15,23,42,0.04)",
            borderRadius:
              "14px",
            padding:
              "24px",
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "20px",
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              width:
                "80px",
              height:
                "80px",
              borderRadius:
                "50%",
              backgroundColor:
                "#00873a",
              color:
                "#f7fff2",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontSize:
                "30px",
              fontWeight:
                700,
              border:
                "4px solid #00873a",
              flexShrink:
                0,
              overflow:
                "hidden",
            }}
          >
            {profile
              ?.avatar_url ? (
              <img
                src={
                  profile.avatar_url
                }
                alt="Profile"
                style={{
                  width:
                    "100%",
                  height:
                    "100%",
                  objectFit:
                    "cover",
                }}
              />
            ) : (
              getInitials(
                fullName
              )
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth:
                "150px",
            }}
          >
            <h3
              style={{
                fontSize:
                  "22px",
                fontWeight:
                  600,
                margin:
                  "0 0 4px",
              }}
            >
              {fullName}
            </h3>

            <p
              style={{
                color:
                  "#3e4a3d",
                fontSize:
                  "13px",
                margin:
                  "0 0 6px",
                wordBreak:
                  "break-all",
              }}
            >
              {user?.email}
            </p>

            <p
              style={{
                color:
                  "#6e7b6c",
                fontSize:
                  "11px",
                margin:
                  "0 0 12px",
              }}
            >
              Member since{" "}
              {memberSince}
            </p>

            <button
              onClick={
                onSwitchToProfile
              }
              style={{
                padding:
                  "8px 18px",
                backgroundColor:
                  "#0b1c30",
                color:
                  "#fff",
                borderRadius:
                  "8px",
                border:
                  "none",
                cursor:
                  "pointer",
                fontWeight:
                  500,
                fontSize:
                  "13px",
              }}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* PAYOUT CARD */}

        <div
          className="hub-plan"
          style={{
            gridColumn:
              "span 4",
            background:
              "linear-gradient(135deg,#0b1c30,#1e3a5f)",
            color:
              "#fff",
            padding:
              "24px",
            borderRadius:
              "14px",
            display:
              "flex",
            flexDirection:
              "column",
            justifyContent:
              "space-between",
          }}
        >
          <div>
            <h3
              style={{
                fontSize:
                  "18px",
                fontWeight:
                  600,
                color:
                  "#62df7d",
                margin:
                  "0 0 10px",
              }}
            >
              Personal Payout
            </h3>

            <p
              style={{
                fontSize:
                  "13px",
                opacity:
                  0.75,
                lineHeight:
                  1.5,
                margin: 0,
              }}
            >
              {payoutConfigured
                ? "Your payout account is configured."
                : "Add a bank account to receive eligible payouts."}
            </p>
          </div>

          <button
            onClick={
              onSwitchToProfile
            }
            style={{
              width:
                "100%",
              padding:
                "12px",
              backgroundColor:
                "rgba(255,255,255,0.1)",
              border:
                "1px solid rgba(255,255,255,0.2)",
              borderRadius:
                "8px",
              color:
                "#fff",
              fontWeight:
                500,
              fontSize:
                "14px",
              cursor:
                "pointer",
              marginTop:
                "16px",
            }}
          >
            {payoutConfigured
              ? "Manage Payout Account"
              : "Add Payout Account"}
          </button>
        </div>
      </div>

      {/* =====================================================
          SETTINGS CARDS
      ===================================================== */}

      <div
        className="cards-grid"
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(2, 1fr)",
          gap:
            "20px",
          marginBottom:
            "32px",
        }}
      >
        {cards.map(
          (card) => (
            <div
              key={
                card.id
              }
              onClick={() =>
                setActiveModal(
                  card.id
                )
              }
              className="card-item"
              style={{
                background:
                  "rgba(255,255,255,0.8)",
                backdropFilter:
                  "blur(12px)",
                border:
                  "1px solid rgba(226,232,240,0.8)",
                boxShadow:
                  "0 4px 20px rgba(15,23,42,0.04)",
                borderRadius:
                  "14px",
                padding:
                  "22px",
                cursor:
                  "pointer",
                transition:
                  "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(
                e
              ) => {
                e.currentTarget.style.transform =
                  "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(15,23,42,0.08)";
              }}
              onMouseLeave={(
                e
              ) => {
                e.currentTarget.style.transform =
                  "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(15,23,42,0.04)";
              }}
            >
              <div
                style={{
                  width:
                    "44px",
                  height:
                    "44px",
                  borderRadius:
                    "10px",
                  backgroundColor:
                    `${card.color}15`,
                  color:
                    card.color,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  marginBottom:
                    "14px",
                }}
              >
                <span className="material-symbols-outlined">
                  {
                    card.icon
                  }
                </span>
              </div>

              <h4
                style={{
                  fontSize:
                    "16px",
                  fontWeight:
                    600,
                  margin:
                    "0 0 4px",
                }}
              >
                {
                  card.title
                }
              </h4>

              <p
                className="card-desc"
                style={{
                  color:
                    "#3e4a3d",
                  fontSize:
                    "13px",
                  margin:
                    "0 0 14px",
                }}
              >
                {
                  card.desc
                }
              </p>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  paddingTop:
                    "12px",
                  borderTop:
                    "1px solid rgba(189,202,186,0.3)",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "11px",
                    fontWeight:
                      600,
                    color:
                      card.color,
                  }}
                >
                  {
                    card.status
                  }
                </span>

                <span className="material-symbols-outlined">
                  arrow_forward
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* =====================================================
          DANGER ZONE
      ===================================================== */}

      <div
        className="danger-zone"
        style={{
          padding:
            "20px",
          border:
            "1px solid rgba(186,26,26,0.2)",
          borderRadius:
            "14px",
          backgroundColor:
            "rgba(186,26,26,0.05)",
          display:
            "flex",
          justifyContent:
            "space-between",
          flexWrap:
            "wrap",
          gap:
            "12px",
          alignItems:
            "center",
        }}
      >
        <div>
          <h5
            style={{
              fontSize:
                "16px",
              fontWeight:
                600,
              color:
                "#ba1a1a",
              margin:
                "0 0 2px",
            }}
          >
            Account Management
          </h5>

          <p
            style={{
              fontSize:
                "13px",
              color:
                "rgba(147,0,10,0.7)",
              margin: 0,
            }}
          >
            Request account
            deactivation or
            deletion.
          </p>
        </div>

        <button
          onClick={() =>
            setActiveModal(
              "compliance"
            )
          }
          style={{
            padding:
              "10px 24px",
            backgroundColor:
              "#ba1a1a",
            color:
              "#fff",
            borderRadius:
              "8px",
            border:
              "none",
            cursor:
              "pointer",
            fontWeight:
              600,
            fontSize:
              "13px",
          }}
        >
          Manage
        </button>
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {activeModal && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex:
              100,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            backgroundColor:
              "rgba(11,28,48,0.5)",
            backdropFilter:
              "blur(4px)",
            padding:
              "24px",
            opacity:
              modalClosing
                ? 0
                : 1,
            transition:
              "opacity 0.2s",
          }}
          onClick={
            closeModal
          }
        >
          <div
            className="modal-content"
            style={{
              background:
                "#fff",
              borderRadius:
                "16px",
              padding:
                "28px",
              maxWidth:
                "480px",
              width:
                "100%",
              maxHeight:
                "80vh",
              overflow:
                "auto",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.25)",
              transform:
                modalClosing
                  ? "scale(0.95)"
                  : "scale(1)",
              transition:
                "transform 0.2s",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {activeModal ===
              "compliance" ? (
              <ComplianceModal
                supabase={
                  supabase
                }
                userId={
                  user?.id
                }
                onClose={
                  closeModal
                }
              />
            ) : (
              <GenericSettingsModal
                type={
                  activeModal
                }
                profile={
                  profile
                }
                onClose={
                  closeModal
                }
              />
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .hub-top-row {
            grid-template-columns: 1fr !important;
          }

          .hub-profile,
          .hub-plan {
            grid-column: span 1 !important;
          }

          .cards-grid {
            grid-template-columns: 1fr !important;
          }

          .danger-zone {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   GENERIC SETTINGS MODAL
========================================================= */

function GenericSettingsModal({
  type,
  profile,
  onClose,
}: {
  type: Exclude<
    ModalType,
    "compliance" | null
  >;
  profile: Profile | null;
  onClose: () => void;
}) {
  const config: Record<
    Exclude<
      ModalType,
      "compliance" | null
    >,
    {
      title: string;
      icon: string;
      description: string;
    }
  > = {
    security: {
      title:
        "Security & Access",
      icon:
        "shield_lock",
      description:
        "Your authentication is managed securely through Supabase Auth.",
    },

    notifications: {
      title:
        "Notifications",
      icon:
        "notifications_active",
      description:
        "Notification controls can be connected to your contribution and payout events.",
    },

    preferences: {
      title:
        "Preferences",
      icon:
        "tune",
      description:
        "Your Kolo application currently operates primarily in NGN and English.",
    },

    ai: {
      title:
        "AI Personalization",
      icon:
        "psychology_alt",
      description:
        "Treasurer AI analyzes group data available to your account.",
    },
  };

  const current =
    config[type];

  return (
    <>
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
          }}
        >
          <div
            style={{
              width:
                "38px",
              height:
                "38px",
              borderRadius:
                "9px",
              backgroundColor:
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
              {
                current.icon
              }
            </span>
          </div>

          <h3
            style={{
              fontSize:
                "18px",
              fontWeight:
                600,
              margin: 0,
            }}
          >
            {
              current.title
            }
          </h3>
        </div>

        <button
          onClick={
            onClose
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
          }}
        >
          <span className="material-symbols-outlined">
            close
          </span>
        </button>
      </div>

      <p
        style={{
          fontSize:
            "14px",
          color:
            "#3e4a3d",
          lineHeight:
            1.6,
        }}
      >
        {
          current.description
        }
      </p>

      {type ===
        "security" && (
        <div
          style={{
            backgroundColor:
              "#eff4ff",
            borderRadius:
              "10px",
            padding:
              "14px",
            marginTop:
              "16px",
          }}
        >
          <strong>
            Account email
          </strong>

          <p
            style={{
              margin:
                "4px 0 0",
              fontSize:
                "13px",
              color:
                "#3e4a3d",
              wordBreak:
                "break-all",
            }}
          >
            {/* Security modal deliberately does not expose
                passwords or authentication secrets. */}
            Authentication
            is securely
            handled by your
            account provider.
          </p>
        </div>
      )}

      {type ===
        "notifications" && (
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap:
              "10px",
            marginTop:
              "16px",
          }}
        >
          {[
            "Contribution reminders",
            "Payment review notifications",
            "Payout notifications",
          ].map(
            (item) => (
              <div
                key={item}
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "12px",
                  border:
                    "1px solid rgba(189,202,186,0.3)",
                  borderRadius:
                    "9px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "13px",
                    fontWeight:
                      500,
                  }}
                >
                  {item}
                </span>

                <span
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "#006b2c",
                    backgroundColor:
                      "rgba(0,107,44,0.08)",
                    padding:
                      "4px 8px",
                    borderRadius:
                      "999px",
                  }}
                >
                  Available
                </span>
              </div>
            )
          )}
        </div>
      )}

      {type ===
        "preferences" && (
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap:
              "10px",
            marginTop:
              "16px",
          }}
        >
          <InfoRow
            label="Currency"
            value="NGN (₦)"
          />

          <InfoRow
            label="Language"
            value="English"
          />

          <InfoRow
            label="Timezone"
            value="West Africa Time"
          />
        </div>
      )}

      {type ===
        "ai" && (
        <div
          style={{
            marginTop:
              "16px",
            backgroundColor:
              "#eff4ff",
            borderRadius:
              "10px",
            padding:
              "14px",
          }}
        >
          <p
            style={{
              margin:
                "0 0 8px",
              fontSize:
                "13px",
              fontWeight:
                600,
            }}
          >
            Treasurer AI
          </p>

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
            Treasurer AI can
            analyze your
            available group
            contributions,
            pending payments,
            treasury position
            and rotation
            information.
          </p>
        </div>
      )}

      <button
        onClick={
          onClose
        }
        style={{
          width:
            "100%",
          marginTop:
            "24px",
          padding:
            "12px",
          backgroundColor:
            "#0b1c30",
          color:
            "#fff",
          border:
            "none",
          borderRadius:
            "9px",
          cursor:
            "pointer",
          fontWeight:
            600,
        }}
      >
        Close
      </button>
    </>
  );
}

/* =========================================================
   COMPLIANCE MODAL
========================================================= */

function ComplianceModal({
  supabase,
  userId,
  onClose,
}: {
  supabase: ReturnType<
    typeof createClient
  >;
  userId?: string;
  onClose: () => void;
}) {
  const [
    exporting,
    setExporting,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const exportData =
    async () => {
      if (!userId) return;

      setExporting(
        true
      );
      setMessage("");

      try {
        const [
          profileResult,
          membershipResult,
          contributionResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq(
              "id",
              userId
            )
            .maybeSingle(),

          supabase
            .from(
              "group_members"
            )
            .select(
              "group_id, role"
            )
            .eq(
              "user_id",
              userId
            ),

          supabase
            .from(
              "contributions"
            )
            .select(
              "id, amount, status, group_id, transaction_ref, created_at"
            )
            .eq(
              "user_id",
              userId
            ),
        ]);

        const exportObject =
          {
            exported_at:
              new Date().toISOString(),
            profile:
              profileResult.data ||
              null,
            group_memberships:
              membershipResult.data ||
              [],
            contributions:
              contributionResult.data ||
              [],
          };

        const blob =
          new Blob(
            [
              JSON.stringify(
                exportObject,
                null,
                2
              ),
            ],
            {
              type:
                "application/json",
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          url;

        link.download =
          "kolo-my-data.json";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          url
        );

        setMessage(
          "Your data export has been downloaded."
        );
      } catch (error: any) {
        console.error(
          "Export error:",
          error
        );

        setMessage(
          error?.message ||
            "Unable to export your data."
        );
      } finally {
        setExporting(
          false
        );
      }
    };

  const requestDeletion =
    async () => {
      if (!userId) return;

      const confirmed =
        window.confirm(
          "Are you sure you want to request account deletion? This action should only be used when you are certain."
        );

      if (!confirmed)
        return;

      setDeleting(
        true
      );
      setMessage("");

      try {
        /*
         * IMPORTANT:
         * We do not directly delete the authenticated
         * account from the browser.
         *
         * A proper production implementation should
         * process deletion through a trusted server/
         * Edge Function after checking outstanding
         * group/payment obligations.
         */

        setMessage(
          "Deletion request recorded locally. Connect this action to your secure account-deletion endpoint before production."
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  return (
    <>
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
          }}
        >
          <div
            style={{
              width:
                "38px",
              height:
                "38px",
              borderRadius:
                "9px",
              backgroundColor:
                "rgba(186,26,26,0.08)",
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
            <span className="material-symbols-outlined">
              gavel
            </span>
          </div>

          <h3
            style={{
              fontSize:
                "18px",
              fontWeight:
                600,
              margin: 0,
            }}
          >
            Privacy & Compliance
          </h3>
        </div>

        <button
          onClick={
            onClose
          }
          style={{
            background:
              "none",
            border:
              "none",
            cursor:
              "pointer",
          }}
        >
          <span className="material-symbols-outlined">
            close
          </span>
        </button>
      </div>

      <p
        style={{
          fontSize:
            "13px",
          color:
            "#3e4a3d",
          lineHeight:
            1.6,
        }}
      >
        You can export the
        personal data currently
        accessible through your
        account.
      </p>

      {message && (
        <div
          style={{
            padding:
              "10px 12px",
            backgroundColor:
              "rgba(0,107,44,0.08)",
            color:
              "#006b2c",
            borderRadius:
              "8px",
            fontSize:
              "12px",
            margin:
              "12px 0",
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={
          exportData
        }
        disabled={
          exporting
        }
        style={{
          width:
            "100%",
          padding:
            "12px",
          backgroundColor:
            "#006b2c",
          color:
            "#fff",
          border:
            "none",
          borderRadius:
            "9px",
          cursor:
            exporting
              ? "not-allowed"
              : "pointer",
          fontWeight:
            600,
          marginTop:
            "12px",
        }}
      >
        {exporting
          ? "Preparing export..."
          : "Export My Data"}
      </button>

      <button
        onClick={
          requestDeletion
        }
        disabled={
          deleting
        }
        style={{
          width:
            "100%",
          padding:
            "12px",
          backgroundColor:
            "#fff",
          color:
            "#ba1a1a",
          border:
            "1px solid rgba(186,26,26,0.3)",
          borderRadius:
            "9px",
          cursor:
            deleting
              ? "not-allowed"
              : "pointer",
          fontWeight:
            600,
          marginTop:
            "10px",
        }}
      >
        {deleting
          ? "Processing..."
          : "Request Account Deletion"}
      </button>

      <button
        onClick={
          onClose
        }
        style={{
          width:
            "100%",
          marginTop:
            "16px",
          padding:
            "12px",
          backgroundColor:
            "#0b1c30",
          color:
            "#fff",
          border:
            "none",
          borderRadius:
            "9px",
          cursor:
            "pointer",
          fontWeight:
            600,
        }}
      >
        Close
      </button>
    </>
  );
}

/* =========================================================
   EDIT PROFILE
========================================================= */

function EditProfile() {
  const supabase =
    createClient();

  const [
    user,
    setUser,
  ] =
    useState<any>(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" | "error"
    >("success");

  const [
    fullName,
    setFullName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    bankName,
    setBankName,
  ] =
    useState("");

  const [
    accountName,
    setAccountName,
  ] =
    useState("");

  const [
    accountNumber,
    setAccountNumber,
  ] =
    useState("");

  const [
    showAccount,
    setShowAccount,
  ] =
    useState(false);

  const [
    payoutVerified,
    setPayoutVerified,
  ] =
    useState(false);

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  const loadProfile =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const {
            data: {
              user: authUser,
            },
          } =
            await supabase.auth.getUser();

          if (!authUser) {
            setLoading(false);
            return;
          }

          setUser(
            authUser
          );

          setEmail(
            authUser.email ||
              ""
          );

          const {
            data: profile,
            error,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(
                `
                id,
                full_name,
                phone,
                payout_bank_name,
                payout_account_name,
                payout_account_number,
                payout_account_verified
              `
              )
              .eq(
                "id",
                authUser.id
              )
              .maybeSingle();

          if (error) {
            throw error;
          }

          setFullName(
            profile?.full_name ||
              authUser
                .user_metadata
                ?.full_name ||
              ""
          );

          setPhone(
            profile?.phone ||
              ""
          );

          setBankName(
            profile
              ?.payout_bank_name ||
              ""
          );

          setAccountName(
            profile
              ?.payout_account_name ||
              ""
          );

          setAccountNumber(
            profile
              ?.payout_account_number ||
              ""
          );

          setPayoutVerified(
            Boolean(
              profile
                ?.payout_account_verified
            )
          );
        } catch (error) {
          console.error(
            "Profile load error:",
            error
          );

          setMessage(
            "Unable to load your profile."
          );

          setMessageType(
            "error"
          );
        } finally {
          setLoading(false);
        }
      },
      [supabase]
    );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!user) return;

      setSaving(
        true
      );

      setMessage("");

      try {
        if (
          !fullName.trim()
        ) {
          throw new Error(
            "Full name is required."
          );
        }

        if (
          accountNumber &&
          !/^\d{10}$/.test(
            accountNumber.trim()
          )
        ) {
          throw new Error(
            "Bank account number must contain exactly 10 digits."
          );
        }

        const payload =
          {
            id: user.id,

            full_name:
              fullName.trim(),

            phone:
              phone.trim() ||
              null,

            payout_bank_name:
              bankName.trim() ||
              null,

            payout_account_name:
              accountName.trim() ||
              null,

            payout_account_number:
              accountNumber.trim() ||
              null,

            /*
             * Do NOT allow the member to mark
             * their own payout account as verified.
             *
             * Verification should happen through
             * your trusted admin/backend process.
             */
            payout_account_verified:
              payoutVerified,

            updated_at:
              new Date().toISOString(),
          };

        const {
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .upsert(
              payload,
              {
                onConflict:
                  "id",
              }
            );

        if (error) {
          throw error;
        }

        const {
          error:
            authError,
        } =
          await supabase.auth.updateUser(
            {
              data: {
                full_name:
                  fullName.trim(),
              },
            }
          );

        if (authError) {
          console.warn(
            "Auth metadata update warning:",
            authError
          );
        }

        setMessage(
          "Profile updated successfully."
        );

        setMessageType(
          "success"
        );

        await loadProfile();
      } catch (error: any) {
        console.error(
          "Profile save error:",
          error
        );

        setMessage(
          error?.message ||
            "Failed to save your profile."
        );

        setMessageType(
          "error"
        );
      } finally {
        setSaving(
          false
        );

        setTimeout(() => {
          setMessage("");
        }, 4000);
      }
    };

  /* =======================================================
     SIGN OUT
  ======================================================= */

  const signOut =
    async () => {
      try {
        await supabase.auth.signOut();

        window.location.href =
          "/login";
      } catch (error) {
        console.error(
          "Sign out error:",
          error
        );
      }
    };

  if (loading) {
    return (
      <div
        style={{
          textAlign:
            "center",
          padding:
            "60px",
          color:
            "#3e4a3d",
        }}
      >
        Loading profile...
      </div>
    );
  }

  const initials =
    getInitials(
      fullName ||
        email
    );

  const inputStyle: React.CSSProperties =
    {
      width:
        "100%",
      padding:
        "13px 16px",
      border:
        "1px solid rgba(189,202,186,0.5)",
      borderRadius:
        "10px",
      outline:
        "none",
      fontSize:
        "14px",
      fontFamily:
        "'Inter', sans-serif",
      boxSizing:
        "border-box",
      background:
        "#fff",
      color:
        "#0b1c30",
    };

  const labelStyle: React.CSSProperties =
    {
      fontSize:
        "13px",
      fontWeight:
        500,
      color:
        "#3e4a3d",
      marginBottom:
        "6px",
      display:
        "block",
    };

  return (
    <div>
      {/* MESSAGE */}

      {message && (
        <div
          style={{
            padding:
              "12px 16px",
            borderRadius:
              "10px",
            marginBottom:
              "20px",
            fontSize:
              "14px",
            fontWeight:
              500,
            textAlign:
              "center",
            backgroundColor:
              messageType ===
              "success"
                ? "rgba(0,107,44,0.1)"
                : "#ffdad6",
            color:
              messageType ===
              "success"
                ? "#006b2c"
                : "#93000a",
          }}
        >
          {
            message
          }
        </div>
      )}

      <form
        onSubmit={
          handleSave
        }
        style={{
          display:
            "flex",
          flexDirection:
            "column",
          gap:
            "20px",
        }}
      >
        {/* ===================================================
            PROFILE HEADER
        =================================================== */}

        <div
          className="profile-avatar-card"
          style={{
            background:
              "rgba(255,255,255,0.8)",
            backdropFilter:
              "blur(12px)",
            border:
              "1px solid rgba(226,232,240,0.8)",
            boxShadow:
              "0 4px 20px rgba(15,23,42,0.04)",
            borderRadius:
              "14px",
            padding:
              "28px",
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "24px",
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              width:
                "90px",
              height:
                "90px",
              borderRadius:
                "18px",
              backgroundColor:
                "#00873a",
              color:
                "#f7fff2",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontSize:
                "34px",
              fontWeight:
                700,
              border:
                "4px solid #fff",
              flexShrink:
                0,
            }}
          >
            {initials}
          </div>

          <div
            style={{
              flex: 1,
              minWidth:
                "150px",
            }}
          >
            <h2
              style={{
                fontSize:
                  "24px",
                fontWeight:
                  700,
                margin:
                  "0 0 4px",
              }}
            >
              {fullName ||
                "User"}
            </h2>

            <p
              style={{
                color:
                  "#5c647a",
                fontSize:
                  "14px",
                margin: 0,
                wordBreak:
                  "break-all",
              }}
            >
              {email}
            </p>
          </div>
        </div>

        {/* ===================================================
            PERSONAL INFORMATION
        =================================================== */}

        <div
          style={{
            background:
              "rgba(255,255,255,0.8)",
            backdropFilter:
              "blur(12px)",
            border:
              "1px solid rgba(226,232,240,0.8)",
            boxShadow:
              "0 4px 20px rgba(15,23,42,0.04)",
            borderRadius:
              "14px",
            overflow:
              "hidden",
          }}
        >
          <div
            style={{
              padding:
                "14px 20px",
              borderBottom:
                "1px solid rgba(189,202,186,0.3)",
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "8px",
              backgroundColor:
                "#fff",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color:
                  "#006b2c",
              }}
            >
              person
            </span>

            <h3
              style={{
                fontSize:
                  "16px",
                fontWeight:
                  600,
                margin: 0,
              }}
            >
              Personal Information
            </h3>
          </div>

          <div
            className="profile-form-grid"
            style={{
              padding:
                "20px",
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "20px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                Full Name
              </label>

              <input
                value={
                  fullName
                }
                onChange={(
                  event
                ) =>
                  setFullName(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
                required
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Email
              </label>

              <input
                value={
                  email
                }
                disabled
                style={{
                  ...inputStyle,
                  backgroundColor:
                    "#eff4ff",
                  color:
                    "#6e7b6c",
                }}
              />

              <small
                style={{
                  display:
                    "block",
                  marginTop:
                    "6px",
                  fontSize:
                    "10px",
                  color:
                    "#6e7b6c",
                }}
              >
                Email changes
                should be
                handled through
                account
                verification.
              </small>
            </div>

            <div
              style={{
                gridColumn:
                  "span 2",
              }}
              className="phone-field"
            >
              <label
                style={
                  labelStyle
                }
              >
                Phone Number
              </label>

              <input
                value={
                  phone
                }
                onChange={(
                  event
                ) =>
                  setPhone(
                    event.target
                      .value
                  )
                }
                placeholder="+234 800 000 0000"
                style={
                  inputStyle
                }
              />
            </div>
          </div>
        </div>

        {/* ===================================================
            PERSONAL PAYOUT ACCOUNT
        =================================================== */}

        <div
          style={{
            background:
              "rgba(255,255,255,0.8)",
            backdropFilter:
              "blur(12px)",
            border:
              "1px solid rgba(0,107,44,0.2)",
            boxShadow:
              "0 4px 20px rgba(15,23,42,0.04)",
            borderRadius:
              "14px",
            overflow:
              "hidden",
          }}
        >
          <div
            style={{
              padding:
                "16px 20px",
              borderBottom:
                "1px solid rgba(189,202,186,0.3)",
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "10px",
              backgroundColor:
                "rgba(0,107,44,0.05)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color:
                  "#006b2c",
              }}
            >
              account_balance
            </span>

            <div>
              <h3
                style={{
                  fontSize:
                    "16px",
                  fontWeight:
                    600,
                  margin:
                    "0 0 3px",
                }}
              >
                Personal Payout Account
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize:
                    "11px",
                  color:
                    "#6e7b6c",
                }}
              >
                This is your
                personal account
                for eligible
                payouts. It is
                different from a
                group's contribution
                account.
              </p>
            </div>
          </div>

          <div
            className="profile-form-grid"
            style={{
              padding:
                "20px",
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "20px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                Bank Name
              </label>

              <input
                value={
                  bankName
                }
                onChange={(
                  event
                ) =>
                  setBankName(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Access Bank"
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Account Name
              </label>

              <input
                value={
                  accountName
                }
                onChange={(
                  event
                ) =>
                  setAccountName(
                    event.target
                      .value
                  )
                }
                placeholder="Name on bank account"
                style={
                  inputStyle
                }
              />
            </div>

            <div
              style={{
                gridColumn:
                  "span 2",
              }}
              className="account-number-field"
            >
              <label
                style={
                  labelStyle
                }
              >
                Account Number
              </label>

              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <input
                  type={
                    showAccount
                      ? "text"
                      : "password"
                  }
                  inputMode="numeric"
                  maxLength={
                    10
                  }
                  value={
                    accountNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setAccountNumber(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="10-digit account number"
                  style={{
                    ...inputStyle,
                    paddingRight:
                      "48px",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowAccount(
                      (value) =>
                        !value
                    )
                  }
                  style={{
                    position:
                      "absolute",
                    right:
                      "10px",
                    top:
                      "50%",
                    transform:
                      "translateY(-50%)",
                    background:
                      "none",
                    border:
                      "none",
                    cursor:
                      "pointer",
                    color:
                      "#3e4a3d",
                  }}
                >
                  <span className="material-symbols-outlined">
                    {showAccount
                      ? "visibility_off"
                      : "visibility"}
                  </span>
                </button>
              </div>

              <p
                style={{
                  fontSize:
                    "10px",
                  color:
                    "#6e7b6c",
                  margin:
                    "6px 0 0",
                }}
              >
                {accountNumber
                  ? `Saved account: ${maskAccountNumber(
                      accountNumber
                    )}`
                  : "No payout account added yet."}
              </p>
            </div>

            <div
              style={{
                gridColumn:
                  "span 2",
                padding:
                  "12px",
                backgroundColor:
                  payoutVerified
                    ? "rgba(0,107,44,0.07)"
                    : "#fff7ed",
                borderRadius:
                  "9px",
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "10px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color:
                    payoutVerified
                      ? "#006b2c"
                      : "#825100",
                }}
              >
                {payoutVerified
                  ? "verified"
                  : "info"}
              </span>

              <span
                style={{
                  fontSize:
                    "12px",
                  color:
                    payoutVerified
                      ? "#006b2c"
                      : "#825100",
                }}
              >
                {payoutVerified
                  ? "Your payout account has been verified."
                  : "Your payout account has not been verified yet. Saving these details does not mark the account as verified."}
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div
          className="profile-actions"
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            paddingTop:
              "20px",
            borderTop:
              "1px solid rgba(189,202,186,0.3)",
            flexWrap:
              "wrap",
            gap:
              "12px",
          }}
        >
          <button
            type="button"
            onClick={
              signOut
            }
            style={{
              padding:
                "12px 24px",
              border:
                "1px solid #ba1a1a",
              borderRadius:
                "10px",
              background:
                "transparent",
              color:
                "#ba1a1a",
              fontWeight:
                600,
              fontSize:
                "13px",
              cursor:
                "pointer",
            }}
          >
            Sign Out
          </button>

          <button
            type="submit"
            disabled={
              saving
            }
            style={{
              padding:
                "12px 28px",
              backgroundColor:
                saving
                  ? "#6e7b6c"
                  : "#006b2c",
              color:
                "#fff",
              borderRadius:
                "10px",
              fontWeight:
                700,
              fontSize:
                "14px",
              border:
                "none",
              cursor:
                saving
                  ? "not-allowed"
                  : "pointer",
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "8px",
              boxShadow:
                "0 10px 15px -3px rgba(0,107,44,0.2)",
            }}
          >
            <span className="material-symbols-outlined">
              check_circle
            </span>

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </form>

      {/* =====================================================
          RESPONSIVE
      ===================================================== */}

      <style jsx>{`
        @media (max-width: 600px) {
          .profile-form-grid {
            grid-template-columns: 1fr !important;
          }

          .phone-field,
          .account-number-field {
            grid-column: span 1 !important;
          }

          .profile-avatar-card {
            flex-direction: column !important;
            text-align: center !important;
          }

          .profile-actions {
            flex-direction: column !important;
          }

          .profile-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   SMALL INFO ROW
========================================================= */

function InfoRow({
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
          "12px",
        border:
          "1px solid rgba(189,202,186,0.3)",
        borderRadius:
          "9px",
      }}
    >
      <span
        style={{
          fontSize:
            "13px",
          fontWeight:
            500,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize:
            "12px",
          fontWeight:
            600,
          color:
            "#006b2c",
        }}
      >
        {value}
      </span>
    </div>
  );
}


// "use client";

// import { useState, useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";

// type SettingsTab = "hub" | "profile";

// export default function SettingsPage() {
//   const [activeTab, setActiveTab] = useState<SettingsTab>("hub");
//   const [fading, setFading] = useState(false);

//   const switchTab = (tab: SettingsTab) => {
//     if (tab === activeTab) return;
//     setFading(true);
//     setTimeout(() => {
//       setActiveTab(tab);
//       setTimeout(() => setFading(false), 50);
//     }, 200);
//   };

//   return (
//     <div className="settings-layout" style={{ display: "flex", gap: "40px", maxWidth: "1100px", margin: "0 auto", alignItems: "flex-start" }}>
//       {/* Left Sidebar — ALWAYS FIXED, NEVER MOVES */}
//       <div className="settings-sidebar" style={{ width: "240px", flexShrink: 0, position: "sticky", top: "80px" }}>
//         <div style={{ marginBottom: "32px" }}>
//           <h2 className="sidebar-title" style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>Settings</h2>
//           <p style={{ color: "#3e4a3d", fontSize: "14px", lineHeight: 1.5 }}>Configure your wealth environment and security protocols.</p>
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
//           {[
//             { key: "hub" as SettingsTab, label: "Overview", icon: "dashboard", desc: "Settings hub & summaries" },
//             { key: "profile" as SettingsTab, label: "Edit Profile", icon: "person", desc: "Personal & banking info" },
//           ].map((tab) => (
//             <button key={tab.key} onClick={() => switchTab(tab.key)}
//               style={{
//                 width: "100%", textAlign: "left", padding: "16px", borderRadius: "12px", border: "none", cursor: "pointer",
//                 backgroundColor: activeTab === tab.key ? "#ffffff" : "transparent",
//                 boxShadow: activeTab === tab.key ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
//                 transition: "background-color 0.3s, box-shadow 0.3s",
//                 display: "flex", alignItems: "flex-start", gap: "12px",
//               }}>
//               <span className="material-symbols-outlined" style={{ fontSize: "22px", color: activeTab === tab.key ? "#006b2c" : "#3e4a3d", marginTop: "2px" }}>{tab.icon}</span>
//               <div>
//                 <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: activeTab === tab.key ? "#006b2c" : "#0b1c30", marginBottom: "2px" }}>{tab.label}</div>
//                 <div style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{tab.desc}</div>
//               </div>
//               {activeTab === tab.key && <div style={{ marginLeft: "auto", width: "4px", height: "40px", backgroundColor: "#006b2c", borderRadius: "2px", alignSelf: "center" }} />}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Right Content — ONLY FADES, NEVER MOVES */}
//       <div className="settings-content" style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.2s ease" }}>
//           {activeTab === "hub" && <SettingsHub onSwitchToProfile={() => switchTab("profile")} />}
//           {activeTab === "profile" && <EditProfile />}
//         </div>
//       </div>

//       {/* Mobile responsive styles */}
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .settings-layout { flex-direction: column !important; gap: 20px !important; }
//           .settings-sidebar { width: 100% !important; position: static !important; top: auto !important; }
//           .sidebar-title { font-size: 24px !important; }
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ===================================================================
//    SETTINGS HUB
//    =================================================================== */
// function SettingsHub({ onSwitchToProfile }: { onSwitchToProfile: () => void }) {
//   const supabase = createClient();
//   const [userData, setUserData] = useState<any>(null);
//   const [activeModal, setActiveModal] = useState<string | null>(null);
//   const [modalClosing, setModalClosing] = useState(false);

//   useEffect(() => {
//     async function fetchUser() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         const { data: profile } = await supabase.from("profiles").select("full_name, created_at").eq("id", user.id).maybeSingle();
//         setUserData({
//           name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
//           email: user.email,
//           memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently",
//         });
//       }
//     }
//     fetchUser();
//   }, [supabase]);

//   const closeModal = () => { setModalClosing(true); setTimeout(() => { setActiveModal(null); setModalClosing(false); }, 200); };
//   const getInitials = (n: string) => n?.split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2) || "U";

//   const cards = [
//     { id: "security", icon: "shield_lock", title: "Security & Access", desc: "2FA, hardware keys, session management.", status: "Protected", color: "#006b2c", items: [{ l: "2FA", v: "Enabled", a: true },{ l: "Biometrics", v: "Off", a: false },{ l: "Sessions", v: "2 active", a: true }] },
//     { id: "accounts", icon: "account_balance", title: "Linked Accounts", desc: "Bank accounts, wallets, APIs.", status: "4 Linked", color: "#825100", items: [{ l: "Wema/Monnify", v: "Connected", a: true },{ l: "GTBank", v: "Expired", a: false },{ l: "Access", v: "Connected", a: true }] },
//     { id: "notifications", icon: "notifications_active", title: "Notifications", desc: "Alerts, pings, summaries.", status: "Active", color: "#565e74", items: [{ l: "Push", v: "On", a: true },{ l: "Email", v: "On", a: true },{ l: "SMS", v: "Off", a: false }] },
//     { id: "preferences", icon: "tune", title: "Preferences", desc: "Currency, language, theme.", status: "NGN • WAT", color: "#3e4a3d", items: [{ l: "Currency", v: "NGN (₦)", a: true },{ l: "Language", v: "EN", a: true },{ l: "Theme", v: "Light", a: true }] },
//     { id: "ai", icon: "psychology_alt", title: "AI Personalization", desc: "Risk appetite, reports.", status: "Moderate", color: "#006b2c", items: [{ l: "Risk", v: "Moderate", a: true },{ l: "Reports", v: "Weekly", a: true },{ l: "Learning", v: "Active", a: true }] },
//     { id: "compliance", icon: "gavel", title: "Compliance", desc: "Privacy, data export.", status: "Compliant", color: "#ba1a1a", items: [{ l: "GDPR", v: "Yes", a: true },{ l: "Export", v: "Available", a: true },{ l: "Delete", v: "Request", a: true }] },
//   ];

//   return (
//     <div>
//       <div className="hub-top-row" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px", marginBottom: "24px" }}>
//         <div className="hub-profile" style={{ gridColumn: "span 8", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
//           <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#00873a", color: "#f7fff2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: 700, border: "4px solid #00873a", flexShrink: 0 }}>{getInitials(userData?.name || "U")}</div>
//           <div style={{ flex: 1, minWidth: "150px" }}>
//             <h3 style={{ fontSize: "22px", fontWeight: 600 }}>{userData?.name || "User"}</h3>
//             <p style={{ color: "#3e4a3d", fontSize: "13px", marginBottom: "10px", wordBreak: "break-all" }}>{userData?.email}</p>
//             <button onClick={onSwitchToProfile} style={{ padding: "8px 18px", backgroundColor: "#0b1c30", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "'Geist', sans-serif" }}>Edit Profile</button>
//           </div>
//         </div>
//         <div className="hub-plan" style={{ gridColumn: "span 4", background: "linear-gradient(135deg, #0b1c30, #1e3a5f)", color: "#fff", padding: "24px", borderRadius: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
//           <div><h3 style={{ fontSize: "18px", fontWeight: 600, color: "#62df7d", marginBottom: "10px" }}>Institutional Elite</h3><p style={{ fontSize: "13px", opacity: 0.7, lineHeight: 1.4 }}>Unlimited AI Treasurer • Multi-jurisdictional compliance</p></div>
//           <button style={{ width: "100%", padding: "12px", backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", fontWeight: 500, fontSize: "14px", cursor: "pointer", marginTop: "16px" }}>Manage Subscription</button>
//         </div>
//       </div>

//       <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "32px" }}>
//         {cards.map((c) => (
//           <div key={c.id} onClick={() => setActiveModal(c.id)} className="card-item" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "22px", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
//             onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
//             <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: `${c.color}15`, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><span className="material-symbols-outlined" style={{ fontSize: "24px" }}>{c.icon}</span></div>
//             <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{c.title}</h4>
//             <p className="card-desc" style={{ color: "#3e4a3d", fontSize: "13px", marginBottom: "14px" }}>{c.desc}</p>
//             <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(189,202,186,0.3)" }}><span style={{ fontSize: "11px", fontWeight: 600, color: c.color }}>{c.status}</span><span className="material-symbols-outlined" style={{ color: "#3e4a3d", fontSize: "16px" }}>arrow_forward</span></div>
//           </div>
//         ))}
//       </div>

//       <div className="danger-zone" style={{ padding: "20px", border: "1px solid rgba(186,26,26,0.2)", borderRadius: "14px", backgroundColor: "rgba(186,26,26,0.05)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
//         <div><h5 style={{ fontSize: "16px", fontWeight: 600, color: "#ba1a1a", marginBottom: "2px" }}>Termination Zone</h5><p style={{ fontSize: "13px", color: "rgba(147,0,10,0.7)" }}>Permanently delete your data.</p></div>
//         <button style={{ padding: "10px 32px", backgroundColor: "#ba1a1a", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px", whiteSpace: "nowrap" }}>Deactivate</button>
//       </div>

//       {activeModal && (
//         <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,28,48,0.5)", backdropFilter: "blur(4px)", padding: "24px", opacity: modalClosing ? 0 : 1, transition: "opacity 0.2s" }} onClick={closeModal}>
//           <div className="modal-content" style={{ background: "#fff", borderRadius: "16px", padding: "28px", maxWidth: "480px", width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", transform: modalClosing ? "scale(0.95)" : "scale(1)", transition: "transform 0.2s" }} onClick={(e) => e.stopPropagation()}>
//             {(() => {
//               const card = cards.find((x) => x.id === activeModal);
//               if (!card) return null;
//               return (
//                 <>
//                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: `${card.color}15`, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{card.icon}</span></div><h3 style={{ fontSize: "18px", fontWeight: 600 }}>{card.title}</h3></div>
//                     <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6e7b6c", padding: "4px" }}><span className="material-symbols-outlined">close</span></button>
//                   </div>
//                   {card.items.map((item: any, i: number) => (
//                     <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < card.items.length - 1 ? "1px solid rgba(189,202,186,0.2)" : "none" }}>
//                       <span style={{ fontSize: "14px", fontWeight: 500 }}>{item.l}</span>
//                       <span style={{ fontSize: "12px", fontWeight: 600, color: item.a ? "#006b2c" : "#6e7b6c", backgroundColor: item.a ? "rgba(0,107,44,0.08)" : "rgba(110,123,108,0.08)", padding: "4px 10px", borderRadius: "9999px" }}>{item.v}</span>
//                     </div>
//                   ))}
//                 </>
//               );
//             })()}
//           </div>
//         </div>
//       )}

//       {/* Mobile responsive styles */}
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .hub-top-row { grid-template-columns: 1fr !important; }
//           .hub-profile { grid-column: span 1 !important; }
//           .hub-plan { grid-column: span 1 !important; }
//           .cards-grid { grid-template-columns: 1fr !important; }
//           .card-desc { font-size: 12px !important; }
//           .danger-zone { flex-direction: column !important; align-items: flex-start !important; }
//         }
//         @media (max-width: 400px) {
//           .hub-profile { flex-direction: column !important; text-align: center !important; }
//           .modal-content { padding: 20px !important; margin: 12px !important; }
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ===================================================================
//    EDIT PROFILE
//    =================================================================== */
// function EditProfile() {
//   const supabase = createClient();
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState("");
//   const [messageType, setMessageType] = useState<"success" | "error">("success");
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [showAccount, setShowAccount] = useState(false);

//   useEffect(() => {
//     (async () => {
//       const { data: { user: u } } = await supabase.auth.getUser();
//       if (!u) return;
//       setUser(u);
//       const { data: p } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
//       setFullName(p?.full_name || u.user_metadata?.full_name || "");
//       setEmail(u.email || "");
//       setLoading(false);
//     })();
//   }, [supabase]);

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault(); setSaving(true); setMessage("");
//     try {
//       const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() }, { onConflict: "id" });
//       if (error) throw error;
//       await supabase.auth.updateUser({ data: { full_name: fullName } });
//       setMessage("Profile updated!"); setMessageType("success");
//     } catch (err: any) { setMessage(err.message || "Failed"); setMessageType("error"); }
//     finally { setSaving(false); setTimeout(() => setMessage(""), 3000); }
//   };

//   const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };
//   const initials = (n: string) => n?.split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2) || "U";

//   if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "#3e4a3d" }}>Loading...</div>;

//   const inp: React.CSSProperties = { width: "100%", padding: "13px 16px", border: "1px solid rgba(189,202,186,0.5)", borderRadius: "10px", outline: "none", fontSize: "14px", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" };
//   const lbl: React.CSSProperties = { fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", marginBottom: "6px", display: "block" };

//   return (
//     <div>
//       {message && <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: 500, textAlign: "center", backgroundColor: messageType === "success" ? "rgba(0,107,44,0.1)" : "#ffdad6", color: messageType === "success" ? "#006b2c" : "#93000a" }}>{message}</div>}
//       <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//         <div className="profile-avatar-card" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "28px", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
//           <div style={{ width: "90px", height: "90px", borderRadius: "18px", backgroundColor: "#00873a", color: "#f7fff2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", fontWeight: 700, border: "4px solid #fff", flexShrink: 0 }}>{initials(fullName || email)}</div>
//           <div style={{ flex: 1, minWidth: "150px" }}>
//             <h2 style={{ fontSize: "24px", fontWeight: 700 }}>{fullName || "User"}</h2>
//             <p style={{ color: "#5c647a", fontSize: "14px", wordBreak: "break-all" }}>{email}</p>
//           </div>
//         </div>
//         <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "14px", overflow: "hidden" }}>
//           <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(189,202,186,0.3)", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff" }}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "20px" }}>person</span><h3 style={{ fontSize: "16px", fontWeight: 600 }}>Personal Information</h3></div>
//           <div className="profile-form-grid" style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
//             <div><label style={lbl}>Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inp} /></div>
//             <div><label style={lbl}>Email</label><input value={email} disabled style={{ ...inp, backgroundColor: "#eff4ff", color: "#6e7b6c" }} /></div>
//             <div><label style={lbl}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" style={inp} /></div>
//           </div>
//         </div>
//         <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,107,44,0.2)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "14px", overflow: "hidden" }}>
//           <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(189,202,186,0.3)", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(0,107,44,0.05)" }}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "20px" }}>account_balance</span><h3 style={{ fontSize: "16px", fontWeight: 600 }}>Banking</h3></div>
//           <div className="profile-form-grid" style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
//             <div><label style={lbl}>Bank Name</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} style={inp} /></div>
//             <div><label style={lbl}>Account Number</label><div style={{ position: "relative" }}><input type={showAccount ? "text" : "password"} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={{ ...inp, paddingRight: "44px" }} /><button type="button" onClick={() => setShowAccount(!showAccount)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#3e4a3d" }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{showAccount ? "visibility_off" : "visibility"}</span></button></div></div>
//           </div>
//         </div>
//         <div className="profile-actions" style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", borderTop: "1px solid rgba(189,202,186,0.3)", flexWrap: "wrap", gap: "12px" }}>
//           <button type="button" onClick={signOut} style={{ padding: "12px 24px", border: "1px solid #ba1a1a", borderRadius: "10px", background: "transparent", color: "#ba1a1a", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Sign Out</button>
//           <button type="submit" disabled={saving} style={{ padding: "12px 28px", backgroundColor: saving ? "#6e7b6c" : "#006b2c", color: "#fff", borderRadius: "10px", fontWeight: 700, fontSize: "14px", border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 10px 15px -3px rgba(0,107,44,0.2)" }}><span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>{saving ? "Saving..." : "Save Changes"}</button>
//         </div>
//       </form>

//       {/* Mobile responsive styles */}
//       <style jsx>{`
//         @media (max-width: 600px) {
//           .profile-form-grid { grid-template-columns: 1fr !important; }
//           .profile-avatar-card { flex-direction: column !important; text-align: center !important; }
//           .profile-actions { flex-direction: column !important; }
//           .profile-actions button { width: 100%; justify-content: center; }
//         }
//       `}</style>
//     </div>
//   );
// }



// "use client";

// import { useState, useEffect } from "react";
// import { createClient } from "@/lib/supabase/client";

// type SettingsTab = "hub" | "profile";

// export default function SettingsPage() {
//   const [activeTab, setActiveTab] = useState<SettingsTab>("hub");
//   const [fading, setFading] = useState(false);

//   const switchTab = (tab: SettingsTab) => {
//     if (tab === activeTab) return;
//     setFading(true);
//     setTimeout(() => {
//       setActiveTab(tab);
//       setTimeout(() => setFading(false), 50);
//     }, 200);
//   };

//   return (
//     <div style={{ display: "flex", gap: "40px", maxWidth: "1100px", margin: "0 auto", alignItems: "flex-start" }}>
//       {/* Left Sidebar — ALWAYS FIXED, NEVER MOVES */}
//       <div style={{ width: "240px", flexShrink: 0, position: "sticky", top: "80px" }}>
//         <div style={{ marginBottom: "32px" }}>
//           <h2 style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>Settings</h2>
//           <p style={{ color: "#3e4a3d", fontSize: "14px", lineHeight: 1.5 }}>Configure your wealth environment and security protocols.</p>
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
//           {[
//             { key: "hub" as SettingsTab, label: "Overview", icon: "dashboard", desc: "Settings hub & summaries" },
//             { key: "profile" as SettingsTab, label: "Edit Profile", icon: "person", desc: "Personal & banking info" },
//           ].map((tab) => (
//             <button key={tab.key} onClick={() => switchTab(tab.key)}
//               style={{
//                 width: "100%", textAlign: "left", padding: "16px", borderRadius: "12px", border: "none", cursor: "pointer",
//                 backgroundColor: activeTab === tab.key ? "#ffffff" : "transparent",
//                 boxShadow: activeTab === tab.key ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
//                 transition: "background-color 0.3s, box-shadow 0.3s",
//                 display: "flex", alignItems: "flex-start", gap: "12px",
//               }}>
//               <span className="material-symbols-outlined" style={{ fontSize: "22px", color: activeTab === tab.key ? "#006b2c" : "#3e4a3d", marginTop: "2px" }}>{tab.icon}</span>
//               <div>
//                 <div style={{ fontSize: "15px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: activeTab === tab.key ? "#006b2c" : "#0b1c30", marginBottom: "2px" }}>{tab.label}</div>
//                 <div style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{tab.desc}</div>
//               </div>
//               {activeTab === tab.key && <div style={{ marginLeft: "auto", width: "4px", height: "40px", backgroundColor: "#006b2c", borderRadius: "2px", alignSelf: "center" }} />}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Right Content — ONLY FADES, NEVER MOVES */}
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.2s ease" }}>
//           {activeTab === "hub" && <SettingsHub onSwitchToProfile={() => switchTab("profile")} />}
//           {activeTab === "profile" && <EditProfile />}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ===================================================================
//    SETTINGS HUB
//    =================================================================== */
// function SettingsHub({ onSwitchToProfile }: { onSwitchToProfile: () => void }) {
//   const supabase = createClient();
//   const [userData, setUserData] = useState<any>(null);
//   const [activeModal, setActiveModal] = useState<string | null>(null);
//   const [modalClosing, setModalClosing] = useState(false);

//   useEffect(() => {
//     async function fetchUser() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         const { data: profile } = await supabase.from("profiles").select("full_name, created_at").eq("id", user.id).maybeSingle();
//         setUserData({
//           name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
//           email: user.email,
//           memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently",
//         });
//       }
//     }
//     fetchUser();
//   }, [supabase]);

//   const closeModal = () => { setModalClosing(true); setTimeout(() => { setActiveModal(null); setModalClosing(false); }, 200); };
//   const getInitials = (n: string) => n?.split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2) || "U";

//   const cards = [
//     { id: "security", icon: "shield_lock", title: "Security & Access", desc: "2FA, hardware keys, session management.", status: "Protected", color: "#006b2c", items: [{ l: "2FA", v: "Enabled", a: true },{ l: "Biometrics", v: "Off", a: false },{ l: "Sessions", v: "2 active", a: true }] },
//     { id: "accounts", icon: "account_balance", title: "Linked Accounts", desc: "Bank accounts, wallets, APIs.", status: "4 Linked", color: "#825100", items: [{ l: "Wema/Monnify", v: "Connected", a: true },{ l: "GTBank", v: "Expired", a: false },{ l: "Access", v: "Connected", a: true }] },
//     { id: "notifications", icon: "notifications_active", title: "Notifications", desc: "Alerts, pings, summaries.", status: "Active", color: "#565e74", items: [{ l: "Push", v: "On", a: true },{ l: "Email", v: "On", a: true },{ l: "SMS", v: "Off", a: false }] },
//     { id: "preferences", icon: "tune", title: "Preferences", desc: "Currency, language, theme.", status: "NGN • WAT", color: "#3e4a3d", items: [{ l: "Currency", v: "NGN (₦)", a: true },{ l: "Language", v: "EN", a: true },{ l: "Theme", v: "Light", a: true }] },
//     { id: "ai", icon: "psychology_alt", title: "AI Personalization", desc: "Risk appetite, reports.", status: "Moderate", color: "#006b2c", items: [{ l: "Risk", v: "Moderate", a: true },{ l: "Reports", v: "Weekly", a: true },{ l: "Learning", v: "Active", a: true }] },
//     { id: "compliance", icon: "gavel", title: "Compliance", desc: "Privacy, data export.", status: "Compliant", color: "#ba1a1a", items: [{ l: "GDPR", v: "Yes", a: true },{ l: "Export", v: "Available", a: true },{ l: "Delete", v: "Request", a: true }] },
//   ];

//   return (
//     <div>
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", marginBottom: "24px" }}>
//         <div style={{ gridColumn: "span 8", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", padding: "24px", display: "flex", alignItems: "center", gap: "24px" }}>
//           <div style={{ width: "96px", height: "96px", borderRadius: "50%", backgroundColor: "#00873a", color: "#f7fff2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: 700, border: "4px solid #00873a", flexShrink: 0 }}>{getInitials(userData?.name || "U")}</div>
//           <div style={{ flex: 1 }}>
//             <h3 style={{ fontSize: "24px", fontWeight: 600 }}>{userData?.name || "User"}</h3>
//             <p style={{ color: "#3e4a3d", fontSize: "14px", marginBottom: "12px" }}>{userData?.email}</p>
//             <button onClick={onSwitchToProfile} style={{ padding: "8px 20px", backgroundColor: "#0b1c30", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "14px", fontFamily: "'Geist', sans-serif" }}>Edit Profile</button>
//           </div>
//         </div>
//         <div style={{ gridColumn: "span 4", background: "linear-gradient(135deg, #0b1c30, #1e3a5f)", color: "#fff", padding: "24px", borderRadius: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
//           <div><h3 style={{ fontSize: "18px", fontWeight: 600, color: "#62df7d", marginBottom: "12px" }}>Institutional Elite</h3><p style={{ fontSize: "13px", opacity: 0.7 }}>Unlimited AI Treasurer • Multi-jurisdictional compliance</p></div>
//           <button style={{ width: "100%", padding: "12px", backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", fontWeight: 500, fontSize: "14px", cursor: "pointer", marginTop: "16px" }}>Manage Subscription</button>
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "40px" }}>
//         {cards.map((c) => (
//           <div key={c.id} onClick={() => setActiveModal(c.id)} style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
//             onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
//             <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: `${c.color}15`, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}><span className="material-symbols-outlined" style={{ fontSize: "26px" }}>{c.icon}</span></div>
//             <h4 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px" }}>{c.title}</h4>
//             <p style={{ color: "#3e4a3d", fontSize: "13px", marginBottom: "16px" }}>{c.desc}</p>
//             <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(189,202,186,0.3)" }}><span style={{ fontSize: "11px", fontWeight: 600, color: c.color }}>{c.status}</span><span className="material-symbols-outlined" style={{ color: "#3e4a3d", fontSize: "18px" }}>arrow_forward</span></div>
//           </div>
//         ))}
//       </div>

//       <div style={{ padding: "24px", border: "1px solid rgba(186,26,26,0.2)", borderRadius: "12px", backgroundColor: "rgba(186,26,26,0.05)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
//         <div><h5 style={{ fontSize: "18px", fontWeight: 600, color: "#ba1a1a" }}>Termination Zone</h5><p style={{ fontSize: "14px", color: "rgba(147,0,10,0.7)" }}>Permanently delete your data.</p></div>
//         <button style={{ padding: "12px 40px", backgroundColor: "#ba1a1a", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "14px" }}>Deactivate</button>
//       </div>

//       {activeModal && (
//         <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,28,48,0.5)", backdropFilter: "blur(4px)", padding: "24px", opacity: modalClosing ? 0 : 1, transition: "opacity 0.2s" }} onClick={closeModal}>
//           <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "480px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", transform: modalClosing ? "scale(0.95)" : "scale(1)", transition: "transform 0.2s" }} onClick={(e) => e.stopPropagation()}>
//             {(() => {
//               const card = cards.find((x) => x.id === activeModal);
//               if (!card) return null;
//               return (
//                 <>
//                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: `${card.color}15`, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined">{card.icon}</span></div><h3 style={{ fontSize: "20px", fontWeight: 600 }}>{card.title}</h3></div>
//                     <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6e7b6c" }}><span className="material-symbols-outlined">close</span></button>
//                   </div>
//                   {card.items.map((item: any, i: number) => (
//                     <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i < card.items.length - 1 ? "1px solid rgba(189,202,186,0.2)" : "none" }}>
//                       <span style={{ fontSize: "14px", fontWeight: 500 }}>{item.l}</span>
//                       <span style={{ fontSize: "13px", fontWeight: 600, color: item.a ? "#006b2c" : "#6e7b6c", backgroundColor: item.a ? "rgba(0,107,44,0.08)" : "rgba(110,123,108,0.08)", padding: "4px 12px", borderRadius: "9999px" }}>{item.v}</span>
//                     </div>
//                   ))}
//                 </>
//               );
//             })()}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ===================================================================
//    EDIT PROFILE
//    =================================================================== */
// function EditProfile() {
//   const supabase = createClient();
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState("");
//   const [messageType, setMessageType] = useState<"success" | "error">("success");
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [showAccount, setShowAccount] = useState(false);

//   useEffect(() => {
//     (async () => {
//       const { data: { user: u } } = await supabase.auth.getUser();
//       if (!u) return;
//       setUser(u);
//       const { data: p } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
//       setFullName(p?.full_name || u.user_metadata?.full_name || "");
//       setEmail(u.email || "");
//       setLoading(false);
//     })();
//   }, [supabase]);

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault(); setSaving(true); setMessage("");
//     try {
//       // DIRECT upsert with onConflict to handle missing rows
//       const { error } = await supabase.from("profiles").upsert({
//         id: user.id,
//         full_name: fullName,
//         updated_at: new Date().toISOString(),
//       }, { onConflict: "id" });

//       if (error) {
//         console.error("Upsert error:", error);
//         throw error;
//       }

//       await supabase.auth.updateUser({ data: { full_name: fullName } });
//       setMessage("Profile updated!"); setMessageType("success");
//     } catch (err: any) {
//       setMessage(err.message || "Failed"); setMessageType("error");
//     } finally { setSaving(false); setTimeout(() => setMessage(""), 3000); }
//   };

//   const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };
//   const initials = (n: string) => n?.split(" ").map((x: string) => x[0]).join("").toUpperCase().slice(0, 2) || "U";

//   if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "#3e4a3d" }}>Loading...</div>;

//   const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", border: "1px solid rgba(189,202,186,0.5)", borderRadius: "12px", outline: "none", fontSize: "15px", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" };
//   const lbl: React.CSSProperties = { fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", marginBottom: "8px", display: "block" };

//   return (
//     <div>
//       {message && <div style={{ padding: "12px 16px", borderRadius: "12px", marginBottom: "24px", fontSize: "14px", fontWeight: 500, textAlign: "center", backgroundColor: messageType === "success" ? "rgba(0,107,44,0.1)" : "#ffdad6", color: messageType === "success" ? "#006b2c" : "#93000a" }}>{message}</div>}
//       <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//         <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", padding: "32px", display: "flex", alignItems: "center", gap: "32px" }}>
//           <div style={{ width: "112px", height: "112px", borderRadius: "20px", backgroundColor: "#00873a", color: "#f7fff2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "42px", fontWeight: 700, border: "4px solid #fff", flexShrink: 0 }}>{initials(fullName || email)}</div>
//           <div><h2 style={{ fontSize: "28px", fontWeight: 700 }}>{fullName || "User"}</h2><p style={{ color: "#5c647a", fontSize: "15px" }}>{email}</p></div>
//         </div>
//         <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", overflow: "hidden" }}>
//           <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(189,202,186,0.3)", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff" }}><span className="material-symbols-outlined" style={{ color: "#006b2c" }}>person</span><h3 style={{ fontSize: "18px", fontWeight: 600 }}>Personal Information</h3></div>
//           <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
//             <div><label style={lbl}>Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inp} /></div>
//             <div><label style={lbl}>Email</label><input value={email} disabled style={{ ...inp, backgroundColor: "#eff4ff", color: "#6e7b6c" }} /></div>
//             <div><label style={lbl}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" style={inp} /></div>
//           </div>
//         </div>
//         <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,107,44,0.2)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", overflow: "hidden" }}>
//           <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(189,202,186,0.3)", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(0,107,44,0.05)" }}><span className="material-symbols-outlined" style={{ color: "#006b2c" }}>account_balance</span><h3 style={{ fontSize: "18px", fontWeight: 600 }}>Banking</h3></div>
//           <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
//             <div><label style={lbl}>Bank Name</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} style={inp} /></div>
//             <div><label style={lbl}>Account Number</label><div style={{ position: "relative" }}><input type={showAccount ? "text" : "password"} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={{ ...inp, paddingRight: "48px" }} /><button type="button" onClick={() => setShowAccount(!showAccount)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#3e4a3d" }}><span className="material-symbols-outlined">{showAccount ? "visibility_off" : "visibility"}</span></button></div></div>
//           </div>
//         </div>
//         <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "24px", borderTop: "1px solid rgba(189,202,186,0.3)", flexWrap: "wrap", gap: "16px" }}>
//           <button type="button" onClick={signOut} style={{ padding: "12px 24px", border: "1px solid #ba1a1a", borderRadius: "12px", background: "transparent", color: "#ba1a1a", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Sign Out</button>
//           <button type="submit" disabled={saving} style={{ padding: "12px 32px", backgroundColor: saving ? "#6e7b6c" : "#006b2c", color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "14px", border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 10px 15px -3px rgba(0,107,44,0.2)" }}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>{saving ? "Saving..." : "Save Changes"}</button>
//         </div>
//       </form>
//     </div>
//   );
// }