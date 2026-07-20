"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DashboardData {
  userName: string;
  totalSavings: number;
  monthlyContributions: number;
  groupCount: number;
  memberCount: number;
  healthScore: number;
  transactions: any[];
  groups: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Get user's group memberships
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, groups(*)")
        .eq("user_id", user.id);

      // Get user's contributions
      const { data: contributions } = await supabase
        .from("contributions")
        .select("amount, status, created_at")
        .eq("user_id", user.id);

      // Get recent transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const groups = memberships?.map((m: any) => m.groups) || [];
      const totalMembers = groups.reduce(
        (sum: number, g: any) => sum + (g.member_count || 0),
        0
      );
      const completedContributions =
        contributions?.filter((c: any) => c.status === "completed") || [];
      const totalSavings = completedContributions.reduce(
        (sum: number, c: any) => sum + c.amount,
        0
      );

      const now = new Date();
      const thisMonth = contributions?.filter((c: any) => {
        const d = new Date(c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthlyContributions = thisMonth?.reduce(
        (sum: number, c: any) => sum + c.amount,
        0
      ) || 0;

      const completedCount = completedContributions.length;
      const totalCount = contributions?.length || 1;
      const healthScore = Math.round((completedCount / totalCount) * 100);

      setData({
        userName:
          profile?.full_name || user.user_metadata?.full_name || "Admin",
        totalSavings,
        monthlyContributions,
        groupCount: groups.length,
        memberCount: totalMembers,
        healthScore,
        transactions: transactions || [],
        groups,
      });
      setLoading(false);
    }

    fetchDashboardData();
  }, [supabase]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "'Inter', sans-serif",
          color: "#3e4a3d",
          fontSize: "16px",
        }}
      >
        Loading your dashboard...
      </div>
    );
  }

  return (
    <>
      <TopHeader userName={data?.userName || "Admin"} />
      <KPIRow
        totalSavings={data?.totalSavings || 0}
        monthlyContributions={data?.monthlyContributions || 0}
        groupCount={data?.groupCount || 0}
        memberCount={data?.memberCount || 0}
        healthScore={data?.healthScore || 0}
      />
      <ChartsSection groups={data?.groups || []} />
      <TransactionsTable transactions={data?.transactions || []} />
    </>
  );
}

/* ===========================
   TOP HEADER
   =========================== */
function TopHeader({ userName }: { userName: string }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "40px",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.01em",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            color: "#0b1c30",
          }}
        >
          Welcome back, {userName}
        </h2>
        <p
          style={{
            fontSize: "16px",
            lineHeight: "24px",
            color: "#3e4a3d",
          }}
        >
          Here is your institutional wealth overview for today.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{ position: "relative", width: "256px" }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6e7b6c",
            }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search analytics..."
            style={{
              width: "100%",
              backgroundColor: "#eff4ff",
              border: "1px solid rgba(189, 202, 186, 0.5)",
              borderRadius: "12px",
              padding: "8px 16px 8px 40px",
              fontSize: "14px",
              lineHeight: "20px",
              letterSpacing: "0.01em",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
              outline: "none",
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "#e5eeff",
            border: "none",
            cursor: "pointer",
            color: "#3e4a3d",
            position: "relative",
            transition: "background-color 0.2s",
          }}
        >
          <span className="material-symbols-outlined">notifications</span>
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "10px",
              width: "8px",
              height: "8px",
              backgroundColor: "#ba1a1a",
              borderRadius: "50%",
              border: "2px solid #f8f9ff",
            }}
          />
        </button>
      </div>
    </header>
  );
}

/* ===========================
   KPI ROW
   =========================== */
function KPIRow({
  totalSavings,
  monthlyContributions,
  groupCount,
  memberCount,
  healthScore,
}: {
  totalSavings: number;
  monthlyContributions: number;
  groupCount: number;
  memberCount: number;
  healthScore: number;
}) {
  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG")}`;
  };

  const kpis = [
    {
      label: "Total Savings",
      value: formatNaira(totalSavings),
      change: "+2.4% vs last month",
      icon: "savings",
      iconBg: "rgba(0, 107, 44, 0.1)",
      iconColor: "#006b2c",
      trend: "trending_up",
    },
    {
      label: "Monthly Contributions",
      value: formatNaira(monthlyContributions),
      change: monthlyContributions > 0 ? "+12% growth" : "No contributions yet",
      icon: "payments",
      iconBg: "rgba(86, 94, 116, 0.1)",
      iconColor: "#565e74",
      trend: "arrow_upward",
    },
    {
      label: "Active Groups",
      value: groupCount.toString(),
      change: `${memberCount} Total Members`,
      icon: "group",
      iconBg: "rgba(130, 81, 0, 0.1)",
      iconColor: "#825100",
      trend: "person",
    },
    {
      label: "Health Score",
      value: healthScore.toString(),
      suffix: "/100",
      icon: "verified_user",
      iconBg: "rgba(0, 107, 44, 0.1)",
      iconColor: "#006b2c",
      progress: healthScore,
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "24px",
        marginBottom: "40px",
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            padding: "24px",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0.01em",
                fontWeight: 500,
                fontFamily: "'Geist', sans-serif",
                color: "#3e4a3d",
              }}
            >
              {kpi.label}
            </span>
            <span
              className="material-symbols-outlined"
              style={{
                padding: "6px",
                borderRadius: "8px",
                backgroundColor: kpi.iconBg,
                color: kpi.iconColor,
                fontSize: "20px",
              }}
            >
              {kpi.icon}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              marginBottom: kpi.progress ? "12px" : "8px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "-0.01em",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {kpi.value}
            </span>
            {kpi.suffix && (
              <span
                style={{
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0.01em",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#3e4a3d",
                }}
              >
                {kpi.suffix}
              </span>
            )}
          </div>
          {kpi.progress ? (
            <div
              style={{
                width: "100%",
                height: "6px",
                backgroundColor: "#dce9ff",
                borderRadius: "9999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${kpi.progress}%`,
                  backgroundColor: "#006b2c",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "#006b2c",
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0.03em",
                fontWeight: 600,
                fontFamily: "'Geist', sans-serif",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                {kpi.trend}
              </span>
              <span>{kpi.change}</span>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/* ===========================
   CHARTS SECTION
   =========================== */
function ChartsSection({ groups }: { groups: any[] }) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

  // Generate bars from group data or use defaults
  const bars = groups.length > 0
    ? groups.slice(0, 6).map((g, i) => {
        const maxPool = Math.max(...groups.map((x: any) => x.pool_amount || 0), 1);
        return (g.pool_amount / maxPool) * 100;
      })
    : [40, 55, 45, 70, 85, 100];

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: "24px",
        marginBottom: "40px",
        alignItems: "stretch",
      }}
    >
      {/* Savings Growth Chart */}
      <div
        style={{
          gridColumn: "span 8",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          padding: "24px",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              lineHeight: "28px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Savings Growth
          </h3>
          <select
            style={{
              backgroundColor: "#eff4ff",
              border: "none",
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "0.03em",
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
              padding: "6px 12px",
              borderRadius: "8px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option>Last 6 Months</option>
            <option>Last Year</option>
          </select>
        </div>

        <div style={{ flex: 1, minHeight: "300px", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "0 8px",
              gap: "16px",
            }}
          >
            {bars.map((height, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor:
                    i === bars.length - 1
                      ? "#006b2c"
                      : "rgba(0, 107, 44, 0.1)",
                  borderRadius: "8px 8px 0 0",
                  height: `${Math.max(height, 5)}%`,
                  transition: "background-color 0.2s",
                  cursor: "pointer",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (i !== bars.length - 1) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(0, 107, 44, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (i !== bars.length - 1) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(0, 107, 44, 0.1)";
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "16px",
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "0.03em",
            fontWeight: 600,
            fontFamily: "'Geist', sans-serif",
            color: "#3e4a3d",
            padding: "0 8px",
          }}
        >
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div
        style={{
          gridColumn: "span 4",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Loan Analytics */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            padding: "24px",
            borderRadius: "12px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              lineHeight: "28px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              marginBottom: "40px",
            }}
          >
            Group Portfolio
          </h3>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              padding: "16px 0",
            }}
          >
            <div
              style={{
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                border: "14px solid #e5eeff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-14px",
                  borderRadius: "50%",
                  border: "14px solid #006b2c",
                  borderRightColor: "transparent",
                  borderBottomColor: "transparent",
                  transform: "rotate(45deg)",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.03em",
                    fontWeight: 600,
                    fontFamily: "'Geist', sans-serif",
                    color: "#3e4a3d",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Active
                </p>
                <p
                  style={{
                    fontSize: "24px",
                    lineHeight: "32px",
                    letterSpacing: "-0.01em",
                    fontWeight: 700,
                  }}
                >
                  68%
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#006b2c",
                }}
              />
              <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
                Active: {groups.length}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#e5eeff",
                }}
              />
              <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
                Completed: 0
              </span>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div
          style={{
            backgroundColor: "#00873a",
            color: "#f7fff2",
            padding: "24px",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            border: "1px solid rgba(0, 107, 44, 0.2)",
            boxShadow:
              "0 10px 15px -3px rgba(0, 107, 44, 0.1), 0 4px 6px -2px rgba(0, 107, 44, 0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50%",
              left: "-50%",
              width: "200%",
              height: "200%",
              background:
                "radial-gradient(circle at center, rgba(0, 107, 44, 0.05) 0%, transparent 70%)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
              position: "relative",
              zIndex: 10,
            }}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span
              style={{
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0.03em",
                fontWeight: 700,
                fontFamily: "'Geist', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              AI Intelligence
            </span>
          </div>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "24px",
              position: "relative",
              zIndex: 10,
              fontWeight: 500,
            }}
          >
            {groups.length > 0
              ? `You have ${groups.length} active group${groups.length > 1 ? "s" : ""}. Keep contributing regularly to maximize your returns.`
              : "Start your wealth journey by creating or joining a savings group. Our AI will help you find the perfect match."}
          </p>
          <Link
            href="/groups"
            style={{
              marginTop: "24px",
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "0.03em",
              fontWeight: 700,
              fontFamily: "'Geist', sans-serif",
              background: "none",
              border: "none",
              color: "#f7fff2",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              position: "relative",
              zIndex: 10,
              padding: 0,
              textDecoration: "none",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            {groups.length > 0 ? "Review detailed forecast" : "Explore groups"}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===========================
   TRANSACTIONS TABLE
   =========================== */
function TransactionsTable({ transactions }: { transactions: any[] }) {
  const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
    contribution: {
      icon: "payments",
      bg: "#dae2fd",
      color: "#5c647a",
    },
    disbursement: {
      icon: "account_balance_wallet",
      bg: "#ffddb8",
      color: "#2a1700",
    },
    default: {
      icon: "receipt_long",
      bg: "#7ffc97",
      color: "#002109",
    },
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const displayTransactions =
    transactions.length > 0
      ? transactions
      : [
          {
            id: "demo-1",
            monnify_ref: "MNFY_90218321",
            created_at: new Date().toISOString(),
            amount: 0,
            status: "completed",
            type: "contribution",
          },
        ];

  return (
    <section
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid #E2E8F0",
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "40px",
      }}
    >
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            lineHeight: "28px",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Recent Transactions
        </h3>
        <button
          style={{
            color: "#006b2c",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 700,
            fontFamily: "'Geist', sans-serif",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          View All
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        {transactions.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "#3e4a3d",
              fontSize: "14px",
              lineHeight: "20px",
              letterSpacing: "0.01em",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}
            >
              receipt_long
            </span>
            No transactions yet. Start contributing to a group to see your activity here.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "rgba(239, 244, 255, 0.5)",
                  fontSize: "12px",
                  lineHeight: "16px",
                  letterSpacing: "0.03em",
                  fontWeight: 600,
                  fontFamily: "'Geist', sans-serif",
                  color: "#3e4a3d",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <th style={{ padding: "16px 24px" }}>Type</th>
                <th style={{ padding: "16px 24px" }}>Reference</th>
                <th style={{ padding: "16px 24px" }}>Date</th>
                <th style={{ padding: "16px 24px" }}>Amount</th>
                <th style={{ padding: "16px 24px" }}>Status</th>
              </tr>
            </thead>
            <tbody
              style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}
            >
              {displayTransactions.map((tx) => {
                const iconData = iconMap[tx.type] || iconMap.default;
                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
                      transition: "background-color 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff4ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "16px 24px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: iconData.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: iconData.color,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "18px" }}
                          >
                            {iconData.icon}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "14px",
                            lineHeight: "20px",
                            letterSpacing: "0.01em",
                            fontWeight: 700,
                            fontFamily: "'Geist', sans-serif",
                            textTransform: "capitalize",
                          }}
                        >
                          {tx.type || "Transaction"}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#3e4a3d",
                      }}
                    >
                      {tx.monnify_ref || "N/A"}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        fontSize: "14px",
                        lineHeight: "20px",
                        letterSpacing: "0.01em",
                        fontWeight: 500,
                        fontFamily: "'Geist', sans-serif",
                        color: "#3e4a3d",
                      }}
                    >
                      {formatDate(tx.created_at)}
                    </td>
                    <td
                      style={{
                        padding: "16px 24px",
                        fontWeight: 700,
                        color: tx.type === "disbursement" ? "#ba1a1a" : "#0b1c30",
                      }}
                    >
                      {tx.type === "disbursement" ? "-" : ""}
                      {formatNaira(tx.amount || 0)}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span
                        style={{
                          backgroundColor:
                            tx.status === "completed"
                              ? "rgba(0, 107, 44, 0.1)"
                              : tx.status === "pending"
                              ? "#cbdbf5"
                              : "#ffdad6",
                          color:
                            tx.status === "completed"
                              ? "#006b2c"
                              : tx.status === "pending"
                              ? "#3f465c"
                              : "#93000a",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          textTransform: "uppercase",
                        }}
                      >
                        {tx.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}





// "use client";

// import Link from "next/link";

// export default function DashboardPage() {
//   return (
//     <>
//       <TopHeader />
//       <KPIRow />
//       <ChartsSection />
//       <TransactionsTable />
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
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         marginBottom: "40px",
//       }}
//     >
//       <div>
//         <h2
//           style={{
//             fontSize: "24px",
//             lineHeight: "32px",
//             letterSpacing: "-0.01em",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//             color: "#0b1c30",
//           }}
//         >
//           Welcome back, Admin
//         </h2>
//         <p
//           style={{
//             fontSize: "16px",
//             lineHeight: "24px",
//             color: "#3e4a3d",
//           }}
//         >
//           Here is your institutional wealth overview for today.
//         </p>
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
//         <div style={{ position: "relative", width: "256px" }}>
//           <span
//             className="material-symbols-outlined"
//             style={{
//               position: "absolute",
//               left: "12px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               color: "#6e7b6c",
//             }}
//           >
//             search
//           </span>
//           <input
//             type="text"
//             placeholder="Search analytics..."
//             style={{
//               width: "100%",
//               backgroundColor: "#eff4ff",
//               border: "1px solid rgba(189, 202, 186, 0.5)",
//               borderRadius: "12px",
//               padding: "8px 16px 8px 40px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               outline: "none",
//               transition: "all 0.2s",
//               boxSizing: "border-box",
//             }}
//           />
//         </div>
//         <button
//           style={{
//             width: "40px",
//             height: "40px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             borderRadius: "50%",
//             backgroundColor: "#e5eeff",
//             border: "none",
//             cursor: "pointer",
//             color: "#3e4a3d",
//             position: "relative",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span className="material-symbols-outlined">notifications</span>
//           <span
//             style={{
//               position: "absolute",
//               top: "8px",
//               right: "10px",
//               width: "8px",
//               height: "8px",
//               backgroundColor: "#ba1a1a",
//               borderRadius: "50%",
//               border: "2px solid #f8f9ff",
//             }}
//           />
//         </button>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    KPI ROW
//    =========================== */
// function KPIRow() {
//   const kpis = [
//     {
//       label: "Total Savings",
//       value: "₦45,500,000",
//       change: "+2.4% vs last month",
//       icon: "savings",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       trend: "trending_up",
//     },
//     {
//       label: "Monthly Contributions",
//       value: "₦8,240,500",
//       change: "+12% growth",
//       icon: "payments",
//       iconBg: "rgba(86, 94, 116, 0.1)",
//       iconColor: "#565e74",
//       trend: "arrow_upward",
//     },
//     {
//       label: "Active Groups",
//       value: "42",
//       change: "1,240 Total Members",
//       icon: "group",
//       iconBg: "rgba(130, 81, 0, 0.1)",
//       iconColor: "#825100",
//       trend: "person",
//     },
//     {
//       label: "Health Score",
//       value: "94",
//       suffix: "/100",
//       icon: "verified_user",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       progress: 94,
//     },
//   ];

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(4, 1fr)",
//         gap: "24px",
//         marginBottom: "40px",
//       }}
//     >
//       {kpis.map((kpi) => (
//         <div
//           key={kpi.label}
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid #E2E8F0",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             padding: "24px",
//             borderRadius: "12px",
//             cursor: "pointer",
//             transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.transform = "translateY(-2px)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.transform = "translateY(0)";
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "flex-start",
//               marginBottom: "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#3e4a3d",
//               }}
//             >
//               {kpi.label}
//             </span>
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 padding: "6px",
//                 borderRadius: "8px",
//                 backgroundColor: kpi.iconBg,
//                 color: kpi.iconColor,
//                 fontSize: "20px",
//               }}
//             >
//               {kpi.icon}
//             </span>
//           </div>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "baseline",
//               gap: "8px",
//               marginBottom: kpi.progress ? "12px" : "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 700,
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               {kpi.value}
//             </span>
//             {kpi.suffix && (
//               <span
//                 style={{
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 {kpi.suffix}
//               </span>
//             )}
//           </div>
//           {kpi.progress ? (
//             <div
//               style={{
//                 width: "100%",
//                 height: "6px",
//                 backgroundColor: "#dce9ff",
//                 borderRadius: "9999px",
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: "100%",
//                   width: `${kpi.progress}%`,
//                   backgroundColor: "#006b2c",
//                 }}
//               />
//             </div>
//           ) : (
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "4px",
//                 color: "#006b2c",
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ fontSize: "16px" }}
//               >
//                 {kpi.trend}
//               </span>
//               <span>{kpi.change}</span>
//             </div>
//           )}
//         </div>
//       ))}
//     </section>
//   );
// }

// /* ===========================
//    CHARTS SECTION
//    =========================== */
// function ChartsSection() {
//   const bars = [40, 55, 45, 70, 85, 100];
//   const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(12, 1fr)",
//         gap: "24px",
//         marginBottom: "40px",
//         alignItems: "stretch",
//       }}
//     >
//       {/* Savings Growth Chart */}
//       <div
//         style={{
//           gridColumn: "span 8",
//           background: "rgba(255, 255, 255, 0.8)",
//           backdropFilter: "blur(12px)",
//           border: "1px solid #E2E8F0",
//           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//           padding: "24px",
//           borderRadius: "12px",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "40px",
//           }}
//         >
//           <h3
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//             }}
//           >
//             Savings Growth
//           </h3>
//           <select
//             style={{
//               backgroundColor: "#eff4ff",
//               border: "none",
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 600,
//               fontFamily: "'Geist', sans-serif",
//               padding: "6px 12px",
//               borderRadius: "8px",
//               outline: "none",
//               cursor: "pointer",
//             }}
//           >
//             <option>Last 6 Months</option>
//             <option>Last Year</option>
//           </select>
//         </div>

//         <div style={{ flex: 1, minHeight: "300px", position: "relative" }}>
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               display: "flex",
//               alignItems: "flex-end",
//               justifyContent: "space-between",
//               padding: "0 8px",
//               gap: "16px",
//             }}
//           >
//             {bars.map((height, i) => (
//               <div
//                 key={i}
//                 style={{
//                   flex: 1,
//                   backgroundColor:
//                     i === bars.length - 1
//                       ? "#006b2c"
//                       : "rgba(0, 107, 44, 0.1)",
//                   borderRadius: "8px 8px 0 0",
//                   height: `${height}%`,
//                   transition: "background-color 0.2s",
//                   cursor: "pointer",
//                   position: "relative",
//                 }}
//                 onMouseEnter={(e) => {
//                   if (i !== bars.length - 1) {
//                     e.currentTarget.style.backgroundColor =
//                       "rgba(0, 107, 44, 0.2)";
//                   }
//                 }}
//                 onMouseLeave={(e) => {
//                   if (i !== bars.length - 1) {
//                     e.currentTarget.style.backgroundColor =
//                       "rgba(0, 107, 44, 0.1)";
//                   }
//                 }}
//               />
//             ))}
//           </div>
//         </div>

//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginTop: "16px",
//             fontSize: "12px",
//             lineHeight: "16px",
//             letterSpacing: "0.03em",
//             fontWeight: 600,
//             fontFamily: "'Geist', sans-serif",
//             color: "#3e4a3d",
//             padding: "0 8px",
//           }}
//         >
//           {months.map((m) => (
//             <span key={m}>{m}</span>
//           ))}
//         </div>
//       </div>

//       {/* Right Column */}
//       <div
//         style={{
//           gridColumn: "span 4",
//           display: "flex",
//           flexDirection: "column",
//           gap: "24px",
//         }}
//       >
//         {/* Loan Analytics */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid #E2E8F0",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             padding: "24px",
//             borderRadius: "12px",
//             flex: 1,
//             display: "flex",
//             flexDirection: "column",
//           }}
//         >
//           <h3
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               marginBottom: "40px",
//             }}
//           >
//             Loan Analytics
//           </h3>
//           <div
//             style={{
//               flex: 1,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               position: "relative",
//               padding: "16px 0",
//             }}
//           >
//             <div
//               style={{
//                 width: "160px",
//                 height: "160px",
//                 borderRadius: "50%",
//                 border: "14px solid #e5eeff",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 position: "relative",
//               }}
//             >
//               <div
//                 style={{
//                   position: "absolute",
//                   inset: "-14px",
//                   borderRadius: "50%",
//                   border: "14px solid #006b2c",
//                   borderRightColor: "transparent",
//                   borderBottomColor: "transparent",
//                   transform: "rotate(45deg)",
//                 }}
//               />
//               <div style={{ textAlign: "center" }}>
//                 <p
//                   style={{
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.05em",
//                   }}
//                 >
//                   Utilization
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 700,
//                   }}
//                 >
//                   68%
//                 </p>
//               </div>
//             </div>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "16px",
//               marginTop: "16px",
//             }}
//           >
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <span
//                 style={{
//                   width: "10px",
//                   height: "10px",
//                   borderRadius: "50%",
//                   backgroundColor: "#006b2c",
//                 }}
//               />
//               <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                 Repaid: 72%
//               </span>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <span
//                 style={{
//                   width: "10px",
//                   height: "10px",
//                   borderRadius: "50%",
//                   backgroundColor: "#e5eeff",
//                 }}
//               />
//               <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                 Active: 28%
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* AI Insight */}
//         <div
//           style={{
//             backgroundColor: "#00873a",
//             color: "#f7fff2",
//             padding: "24px",
//             borderRadius: "12px",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             border: "1px solid rgba(0, 107, 44, 0.2)",
//             boxShadow:
//               "0 10px 15px -3px rgba(0, 107, 44, 0.1), 0 4px 6px -2px rgba(0, 107, 44, 0.05)",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               position: "absolute",
//               top: "-50%",
//               left: "-50%",
//               width: "200%",
//               height: "200%",
//               background:
//                 "radial-gradient(circle at center, rgba(0, 107, 44, 0.05) 0%, transparent 70%)",
//               zIndex: 0,
//               pointerEvents: "none",
//             }}
//           />
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               marginBottom: "8px",
//               position: "relative",
//               zIndex: 10,
//             }}
//           >
//             <span className="material-symbols-outlined">auto_awesome</span>
//             <span
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 700,
//                 fontFamily: "'Geist', sans-serif",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//               }}
//             >
//               AI Intelligence
//             </span>
//           </div>
//           <p
//             style={{
//               fontSize: "16px",
//               lineHeight: "24px",
//               position: "relative",
//               zIndex: 10,
//               fontWeight: 500,
//             }}
//           >
//             Predictive Analysis: Group B is likely to exceed contribution
//             targets by{" "}
//             <span
//               style={{
//                 fontWeight: 700,
//                 textDecoration: "underline",
//                 textDecorationColor: "#62df7d",
//                 textUnderlineOffset: "4px",
//               }}
//             >
//               15%
//             </span>{" "}
//             this quarter.
//           </p>
//           <button
//             style={{
//               marginTop: "24px",
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 700,
//               fontFamily: "'Geist', sans-serif",
//               background: "none",
//               border: "none",
//               color: "#f7fff2",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               gap: "4px",
//               position: "relative",
//               zIndex: 10,
//               padding: 0,
//               transition: "transform 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "translateX(4px)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "translateX(0)";
//             }}
//           >
//             Review detailed forecast
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px" }}
//             >
//               arrow_forward
//             </span>
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// }

// /* ===========================
//    TRANSACTIONS TABLE
//    =========================== */
// function TransactionsTable() {
//   const transactions = [
//     {
//       group: "Lagos West Savers",
//       id: "MNFY_90218321",
//       date: "Oct 24, 2023",
//       amount: "₦1,250,000.00",
//       status: "Success",
//       icon: "family_restroom",
//       iconBg: "#dae2fd",
//       iconColor: "#5c647a",
//       isNegative: false,
//     },
//     {
//       group: "Tech Founders Hub",
//       id: "MNFY_88129332",
//       date: "Oct 23, 2023",
//       amount: "₦2,100,000.00",
//       status: "Pending",
//       icon: "business",
//       iconBg: "#ffddb8",
//       iconColor: "#2a1700",
//       isNegative: false,
//     },
//     {
//       group: "Adekunle Gold (Loan)",
//       id: "MNFY_77211029",
//       date: "Oct 22, 2023",
//       amount: "-₦450,000.00",
//       status: "Success",
//       icon: "person",
//       iconBg: "#7ffc97",
//       iconColor: "#002109",
//       isNegative: true,
//     },
//   ];

//   return (
//     <section
//       style={{
//         background: "rgba(255, 255, 255, 0.8)",
//         backdropFilter: "blur(12px)",
//         border: "1px solid #E2E8F0",
//         boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//         borderRadius: "12px",
//         overflow: "hidden",
//         marginBottom: "40px",
//       }}
//     >
//       <div
//         style={{
//           padding: "16px 24px",
//           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           backgroundColor: "#ffffff",
//         }}
//       >
//         <h3
//           style={{
//             fontSize: "18px",
//             lineHeight: "28px",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//           }}
//         >
//           Recent Transactions
//         </h3>
//         <button
//           style={{
//             color: "#006b2c",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 700,
//             fontFamily: "'Geist', sans-serif",
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//           }}
//         >
//           View All
//         </button>
//       </div>

//       <div style={{ overflowX: "auto" }}>
//         <table
//           style={{
//             width: "100%",
//             textAlign: "left",
//             borderCollapse: "collapse",
//           }}
//         >
//           <thead>
//             <tr
//               style={{
//                 backgroundColor: "rgba(239, 244, 255, 0.5)",
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#3e4a3d",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.05em",
//               }}
//             >
//               <th style={{ padding: "16px 24px" }}>Beneficiary / Group</th>
//               <th style={{ padding: "16px 24px" }}>Transaction ID</th>
//               <th style={{ padding: "16px 24px" }}>Date</th>
//               <th style={{ padding: "16px 24px" }}>Amount</th>
//               <th style={{ padding: "16px 24px" }}>Status</th>
//             </tr>
//           </thead>
//           <tbody
//             style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}
//           >
//             {transactions.map((tx) => (
//               <tr
//                 key={tx.id}
//                 style={{
//                   borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//                   transition: "background-color 0.2s",
//                   cursor: "pointer",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.backgroundColor = "#eff4ff";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.backgroundColor = "transparent";
//                 }}
//               >
//                 <td style={{ padding: "16px 24px" }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "16px",
//                     }}
//                   >
//                     <div
//                       style={{
//                         width: "32px",
//                         height: "32px",
//                         borderRadius: "50%",
//                         backgroundColor: tx.iconBg,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         color: tx.iconColor,
//                       }}
//                     >
//                       <span
//                         className="material-symbols-outlined"
//                         style={{ fontSize: "18px" }}
//                       >
//                         {tx.icon}
//                       </span>
//                     </div>
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 700,
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       {tx.group}
//                     </span>
//                   </div>
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontFamily: "monospace",
//                     fontSize: "12px",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   {tx.id}
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   {tx.date}
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontWeight: 700,
//                     color: tx.isNegative ? "#ba1a1a" : "#0b1c30",
//                   }}
//                 >
//                   {tx.amount}
//                 </td>
//                 <td style={{ padding: "16px 24px" }}>
//                   <span
//                     style={{
//                       backgroundColor:
//                         tx.status === "Success"
//                           ? "rgba(0, 107, 44, 0.1)"
//                           : "#cbdbf5",
//                       color:
//                         tx.status === "Success" ? "#006b2c" : "#3f465c",
//                       fontSize: "11px",
//                       fontWeight: 700,
//                       padding: "4px 8px",
//                       borderRadius: "9999px",
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     {tx.status}
//                   </span>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// }


// "use client";

// import { useState } from "react";
// import Link from "next/link";

// export default function DashboardPage() {
//   return (
//     <div
//       style={{
//         backgroundColor: "#f8f9ff",
//         color: "#0b1c30",
//         fontFamily: "'Inter', sans-serif",
//         minHeight: "100vh",
//         display: "flex",
//       }}
//     >
//       <Sidebar />
//       <MainContent />
//       <FloatingAI />
//     </div>
//   );
// }

// /* ===========================
//    SIDEBAR
//    =========================== */
// function Sidebar() {
//   const navItems = [
//     { icon: "dashboard", label: "Dashboard", active: true },
//     { icon: "groups", label: "My Groups", active: false },
//     { icon: "psychology", label: "Treasurer AI", active: false },
//     { icon: "account_balance_wallet", label: "Payments", active: false },
//     { icon: "settings", label: "Settings", active: false },
//   ];

//   return (
//     <aside
//       style={{
//         position: "fixed",
//         left: 0,
//         top: 0,
//         height: "100vh",
//         width: "280px",
//         backgroundColor: "#213145",
//         display: "flex",
//         flexDirection: "column",
//         padding: "24px 16px",
//         gap: "8px",
//         zIndex: 50,
//         boxShadow:
//           "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
//       }}
//     >
//       {/* Logo */}
//       <div style={{ padding: "0 16px", marginBottom: "40px" }}>
//         <h1
//           style={{
//             fontSize: "24px",
//             lineHeight: "32px",
//             letterSpacing: "-0.01em",
//             fontWeight: 900,
//             fontFamily: "'Inter', sans-serif",
//             color: "#ffffff",
//           }}
//         >
//           SaveCircle AI
//         </h1>
//         <p
//           style={{
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             color: "rgba(211, 228, 254, 0.7)",
//           }}
//         >
//           Institutional Wealth
//         </p>
//       </div>

//       {/* Navigation */}
//       <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
//         {navItems.map((item) => (
//           <Link
//             key={item.label}
//             href="#"
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "16px",
//               padding: "12px 24px",
//               borderRadius: "8px",
//               fontWeight: item.active ? 700 : 400,
//               transition: "all 0.2s",
//               textDecoration: "none",
//               backgroundColor: item.active ? "#00873a" : "transparent",
//               color: item.active ? "#f7fff2" : "#d3e4fe",
//               transform: item.active ? "translateX(4px)" : "none",
//             }}
//           >
//             <span className="material-symbols-outlined">{item.icon}</span>
//             <span
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//               }}
//             >
//               {item.label}
//             </span>
//           </Link>
//         ))}
//       </nav>

//       {/* Bottom CTA */}
//       <div
//         style={{
//           marginTop: "auto",
//           padding: "0 16px",
//           paddingTop: "24px",
//           borderTop: "1px solid rgba(211, 228, 254, 0.1)",
//         }}
//       >
//         <button
//           style={{
//             width: "100%",
//             backgroundColor: "#006b2c",
//             color: "#ffffff",
//             padding: "16px",
//             borderRadius: "12px",
//             fontWeight: 700,
//             border: "none",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             gap: "8px",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontFamily: "'Geist', sans-serif",
//             transition: "all 0.2s",
//           }}
//         >
//           <span className="material-symbols-outlined">add</span>
//           New Contribution
//         </button>

//         {/* Profile */}
//         <div
//           style={{
//             marginTop: "24px",
//             display: "flex",
//             alignItems: "center",
//             gap: "16px",
//             padding: "8px",
//             backgroundColor: "rgba(211, 228, 254, 0.05)",
//             borderRadius: "8px",
//           }}
//         >
//           <img
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               objectFit: "cover",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuD98sc4_zsOKM1zxUUqA1UWT-hb3DCKWZC2q8v6wosON1R3NoQuWCUUAS4AS8V8FRG3_JKIXlb59CJ7ZdhPsCnnb7yO4UJB0Qe6tEOKhuHy18mgEMrk7DhatgrAOTs2VY0jFryzf-nrjrtNhnrXSj1SEQpCgiHwQmONDzY4e1dzuJdh6UlcbG4A_ayvCjYotIr_rgA9xyuzJV9wPAmoYw0TCyimzWwCA813j2df2Mhtf8WYAq73aw9JTTk9FoqgkInYTE19VnlCKnyP"
//           />
//           <div style={{ overflow: "hidden" }}>
//             <p
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#ffffff",
//                 whiteSpace: "nowrap",
//                 overflow: "hidden",
//                 textOverflow: "ellipsis",
//               }}
//             >
//               Executive User
//             </p>
//             <p
//               style={{
//                 fontSize: "12px",
//                 color: "#d3e4fe",
//                 whiteSpace: "nowrap",
//                 overflow: "hidden",
//                 textOverflow: "ellipsis",
//               }}
//             >
//               Premium Account
//             </p>
//           </div>
//         </div>
//       </div>
//     </aside>
//   );
// }

// /* ===========================
//    MAIN CONTENT
//    =========================== */
// function MainContent() {
//   return (
//     <main
//       style={{
//         marginLeft: "280px",
//         minHeight: "100vh",
//         display: "flex",
//         flexDirection: "column",
//         padding: "24px",
//         flex: 1,
//       }}
//     >
//       <TopHeader />
//       <KPIRow />
//       <ChartsSection />
//       <TransactionsTable />
//     </main>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader() {
//   return (
//     <header
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         marginBottom: "40px",
//       }}
//     >
//       <div>
//         <h2
//           style={{
//             fontSize: "24px",
//             lineHeight: "32px",
//             letterSpacing: "-0.01em",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//             color: "#0b1c30",
//           }}
//         >
//           Welcome back, Admin
//         </h2>
//         <p
//           style={{
//             fontSize: "16px",
//             lineHeight: "24px",
//             color: "#3e4a3d",
//           }}
//         >
//           Here is your institutional wealth overview for today.
//         </p>
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
//         {/* Search */}
//         <div style={{ position: "relative", width: "256px" }}>
//           <span
//             className="material-symbols-outlined"
//             style={{
//               position: "absolute",
//               left: "12px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               color: "#6e7b6c",
//             }}
//           >
//             search
//           </span>
//           <input
//             type="text"
//             placeholder="Search analytics..."
//             style={{
//               width: "100%",
//               backgroundColor: "#eff4ff",
//               border: "1px solid rgba(189, 202, 186, 0.5)",
//               borderRadius: "12px",
//               padding: "8px 16px 8px 40px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               outline: "none",
//               transition: "all 0.2s",
//               boxSizing: "border-box",
//             }}
//           />
//         </div>
//         {/* Notification */}
//         <button
//           style={{
//             width: "40px",
//             height: "40px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             borderRadius: "50%",
//             backgroundColor: "#e5eeff",
//             border: "none",
//             cursor: "pointer",
//             color: "#3e4a3d",
//             position: "relative",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span className="material-symbols-outlined">notifications</span>
//           <span
//             style={{
//               position: "absolute",
//               top: "8px",
//               right: "10px",
//               width: "8px",
//               height: "8px",
//               backgroundColor: "#ba1a1a",
//               borderRadius: "50%",
//               border: "2px solid #f8f9ff",
//             }}
//           />
//         </button>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    KPI ROW
//    =========================== */
// function KPIRow() {
//   const kpis = [
//     {
//       label: "Total Savings",
//       value: "₦45,500,000",
//       change: "+2.4% vs last month",
//       icon: "savings",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       trend: "trending_up",
//     },
//     {
//       label: "Monthly Contributions",
//       value: "₦8,240,500",
//       change: "+12% growth",
//       icon: "payments",
//       iconBg: "rgba(86, 94, 116, 0.1)",
//       iconColor: "#565e74",
//       trend: "arrow_upward",
//     },
//     {
//       label: "Active Groups",
//       value: "42",
//       change: "1,240 Total Members",
//       icon: "group",
//       iconBg: "rgba(130, 81, 0, 0.1)",
//       iconColor: "#825100",
//       trend: "person",
//     },
//     {
//       label: "Health Score",
//       value: "94",
//       suffix: "/100",
//       icon: "verified_user",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       progress: 94,
//     },
//   ];

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(4, 1fr)",
//         gap: "24px",
//         marginBottom: "40px",
//       }}
//     >
//       {kpis.map((kpi) => (
//         <div
//           key={kpi.label}
//           className="glass-card-hover"
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid #E2E8F0",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             padding: "24px",
//             borderRadius: "12px",
//             cursor: "pointer",
//             transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.transform = "translateY(-2px)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.transform = "translateY(0)";
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "flex-start",
//               marginBottom: "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#3e4a3d",
//               }}
//             >
//               {kpi.label}
//             </span>
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 padding: "6px",
//                 borderRadius: "8px",
//                 backgroundColor: kpi.iconBg,
//                 color: kpi.iconColor,
//                 fontSize: "20px",
//               }}
//             >
//               {kpi.icon}
//             </span>
//           </div>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "baseline",
//               gap: "8px",
//               marginBottom: kpi.progress ? "12px" : "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 700,
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               {kpi.value}
//             </span>
//             {kpi.suffix && (
//               <span
//                 style={{
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 {kpi.suffix}
//               </span>
//             )}
//           </div>
//           {kpi.progress ? (
//             <div
//               style={{
//                 width: "100%",
//                 height: "6px",
//                 backgroundColor: "#dce9ff",
//                 borderRadius: "9999px",
//                 overflow: "hidden",
//               }}
//             >
//               <div
//                 style={{
//                   height: "100%",
//                   width: `${kpi.progress}%`,
//                   backgroundColor: "#006b2c",
//                 }}
//               />
//             </div>
//           ) : (
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "4px",
//                 color: "#006b2c",
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ fontSize: "16px" }}
//               >
//                 {kpi.trend}
//               </span>
//               <span>{kpi.change}</span>
//             </div>
//           )}
//         </div>
//       ))}
//     </section>
//   );
// }

// /* ===========================
//    CHARTS SECTION
//    =========================== */
// function ChartsSection() {
//   const bars = [40, 55, 45, 70, 85, 100];
//   const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

//   return (
//     <section
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(12, 1fr)",
//         gap: "24px",
//         marginBottom: "40px",
//         alignItems: "stretch",
//       }}
//     >
//       {/* Savings Growth Chart */}
//       <div
//         style={{
//           gridColumn: "span 8",
//           background: "rgba(255, 255, 255, 0.8)",
//           backdropFilter: "blur(12px)",
//           border: "1px solid #E2E8F0",
//           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//           padding: "24px",
//           borderRadius: "12px",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "40px",
//           }}
//         >
//           <h3
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//             }}
//           >
//             Savings Growth
//           </h3>
//           <select
//             style={{
//               backgroundColor: "#eff4ff",
//               border: "none",
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 600,
//               fontFamily: "'Geist', sans-serif",
//               padding: "6px 12px",
//               borderRadius: "8px",
//               outline: "none",
//               cursor: "pointer",
//             }}
//           >
//             <option>Last 6 Months</option>
//             <option>Last Year</option>
//           </select>
//         </div>

//         {/* Bar Chart */}
//         <div
//           style={{
//             flex: 1,
//             minHeight: "300px",
//             position: "relative",
//           }}
//         >
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               display: "flex",
//               alignItems: "flex-end",
//               justifyContent: "space-between",
//               padding: "0 8px",
//               gap: "16px",
//             }}
//           >
//             {bars.map((height, i) => (
//               <div
//                 key={i}
//                 style={{
//                   flex: 1,
//                   backgroundColor:
//                     i === bars.length - 1
//                       ? "#006b2c"
//                       : "rgba(0, 107, 44, 0.1)",
//                   borderRadius: "8px 8px 0 0",
//                   height: `${height}%`,
//                   transition: "background-color 0.2s",
//                   cursor: "pointer",
//                   position: "relative",
//                 }}
//                 onMouseEnter={(e) => {
//                   if (i !== bars.length - 1) {
//                     e.currentTarget.style.backgroundColor =
//                       "rgba(0, 107, 44, 0.2)";
//                   }
//                 }}
//                 onMouseLeave={(e) => {
//                   if (i !== bars.length - 1) {
//                     e.currentTarget.style.backgroundColor =
//                       "rgba(0, 107, 44, 0.1)";
//                   }
//                 }}
//               >
//                 {/* Tooltip */}
//                 <div
//                   style={{
//                     position: "absolute",
//                     top: "-28px",
//                     left: "50%",
//                     transform: "translateX(-50%)",
//                     backgroundColor: "#0b1c30",
//                     color: "#f8f9ff",
//                     fontSize: "10px",
//                     padding: "4px 8px",
//                     borderRadius: "4px",
//                     whiteSpace: "nowrap",
//                     display: "none",
//                     fontWeight: 700,
//                   }}
//                   className="bar-tooltip"
//                 >
//                   {i === bars.length - 1
//                     ? "₦45.5M (Current)"
//                     : `₦${(12 + i * 6)}.${i % 2 === 0 ? "4" : "2"}M`}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* X-axis labels */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginTop: "16px",
//             fontSize: "12px",
//             lineHeight: "16px",
//             letterSpacing: "0.03em",
//             fontWeight: 600,
//             fontFamily: "'Geist', sans-serif",
//             color: "#3e4a3d",
//             padding: "0 8px",
//           }}
//         >
//           {months.map((m) => (
//             <span key={m}>{m}</span>
//           ))}
//         </div>
//       </div>

//       {/* Right Column: Loan Analytics + AI Insight */}
//       <div
//         style={{
//           gridColumn: "span 4",
//           display: "flex",
//           flexDirection: "column",
//           gap: "24px",
//         }}
//       >
//         {/* Loan Analytics */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid #E2E8F0",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             padding: "24px",
//             borderRadius: "12px",
//             flex: 1,
//             display: "flex",
//             flexDirection: "column",
//           }}
//         >
//           <h3
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               marginBottom: "40px",
//             }}
//           >
//             Loan Analytics
//           </h3>
//           <div
//             style={{
//               flex: 1,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               position: "relative",
//               padding: "16px 0",
//             }}
//           >
//             {/* Doughnut */}
//             <div
//               style={{
//                 width: "160px",
//                 height: "160px",
//                 borderRadius: "50%",
//                 border: "14px solid #e5eeff",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 position: "relative",
//               }}
//             >
//               <div
//                 style={{
//                   position: "absolute",
//                   inset: "-14px",
//                   borderRadius: "50%",
//                   border: "14px solid #006b2c",
//                   borderRightColor: "transparent",
//                   borderBottomColor: "transparent",
//                   transform: "rotate(45deg)",
//                 }}
//               />
//               <div style={{ textAlign: "center" }}>
//                 <p
//                   style={{
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.05em",
//                   }}
//                 >
//                   Utilization
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 700,
//                   }}
//                 >
//                   68%
//                 </p>
//               </div>
//             </div>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "16px",
//               marginTop: "16px",
//             }}
//           >
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <span
//                 style={{
//                   width: "10px",
//                   height: "10px",
//                   borderRadius: "50%",
//                   backgroundColor: "#006b2c",
//                 }}
//               />
//               <span
//                 style={{
//                   fontSize: "12px",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 Repaid: 72%
//               </span>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <span
//                 style={{
//                   width: "10px",
//                   height: "10px",
//                   borderRadius: "50%",
//                   backgroundColor: "#e5eeff",
//                 }}
//               />
//               <span
//                 style={{
//                   fontSize: "12px",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 Active: 28%
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* AI Insight */}
//         <div
//           style={{
//             backgroundColor: "#00873a",
//             color: "#f7fff2",
//             padding: "24px",
//             borderRadius: "12px",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             border: "1px solid rgba(0, 107, 44, 0.2)",
//             boxShadow:
//               "0 10px 15px -3px rgba(0, 107, 44, 0.1), 0 4px 6px -2px rgba(0, 107, 44, 0.05)",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           {/* Glow effect */}
//           <div
//             style={{
//               position: "absolute",
//               top: "-50%",
//               left: "-50%",
//               width: "200%",
//               height: "200%",
//               background:
//                 "radial-gradient(circle at center, rgba(0, 107, 44, 0.05) 0%, transparent 70%)",
//               zIndex: 0,
//               pointerEvents: "none",
//             }}
//           />
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               marginBottom: "8px",
//               position: "relative",
//               zIndex: 10,
//             }}
//           >
//             <span className="material-symbols-outlined">auto_awesome</span>
//             <span
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 700,
//                 fontFamily: "'Geist', sans-serif",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//               }}
//             >
//               AI Intelligence
//             </span>
//           </div>
//           <p
//             style={{
//               fontSize: "16px",
//               lineHeight: "24px",
//               position: "relative",
//               zIndex: 10,
//               fontWeight: 500,
//             }}
//           >
//             Predictive Analysis: Group B is likely to exceed contribution
//             targets by{" "}
//             <span
//               style={{
//                 fontWeight: 700,
//                 textDecoration: "underline",
//                 textDecorationColor: "#62df7d",
//                 textUnderlineOffset: "4px",
//               }}
//             >
//               15%
//             </span>{" "}
//             this quarter.
//           </p>
//           <button
//             style={{
//               marginTop: "24px",
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 700,
//               fontFamily: "'Geist', sans-serif",
//               background: "none",
//               border: "none",
//               color: "#f7fff2",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               gap: "4px",
//               position: "relative",
//               zIndex: 10,
//               padding: 0,
//               transition: "transform 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "translateX(4px)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "translateX(0)";
//             }}
//           >
//             Review detailed forecast
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px" }}
//             >
//               arrow_forward
//             </span>
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// }

// /* ===========================
//    TRANSACTIONS TABLE
//    =========================== */
// function TransactionsTable() {
//   const transactions = [
//     {
//       group: "Lagos West Savers",
//       id: "MNFY_90218321",
//       date: "Oct 24, 2023",
//       amount: "₦1,250,000.00",
//       status: "Success",
//       icon: "family_restroom",
//       iconBg: "#dae2fd",
//       iconColor: "#5c647a",
//       isNegative: false,
//     },
//     {
//       group: "Tech Founders Hub",
//       id: "MNFY_88129332",
//       date: "Oct 23, 2023",
//       amount: "₦2,100,000.00",
//       status: "Pending",
//       icon: "business",
//       iconBg: "#ffddb8",
//       iconColor: "#2a1700",
//       isNegative: false,
//     },
//     {
//       group: "Adekunle Gold (Loan)",
//       id: "MNFY_77211029",
//       date: "Oct 22, 2023",
//       amount: "-₦450,000.00",
//       status: "Success",
//       icon: "person",
//       iconBg: "#7ffc97",
//       iconColor: "#002109",
//       isNegative: true,
//     },
//   ];

//   return (
//     <section
//       style={{
//         background: "rgba(255, 255, 255, 0.8)",
//         backdropFilter: "blur(12px)",
//         border: "1px solid #E2E8F0",
//         boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//         borderRadius: "12px",
//         overflow: "hidden",
//         marginBottom: "40px",
//       }}
//     >
//       {/* Table Header */}
//       <div
//         style={{
//           padding: "16px 24px",
//           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           backgroundColor: "#ffffff",
//         }}
//       >
//         <h3
//           style={{
//             fontSize: "18px",
//             lineHeight: "28px",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//           }}
//         >
//           Recent Transactions
//         </h3>
//         <button
//           style={{
//             color: "#006b2c",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 700,
//             fontFamily: "'Geist', sans-serif",
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//           }}
//         >
//           View All
//         </button>
//       </div>

//       {/* Table */}
//       <div style={{ overflowX: "auto" }}>
//         <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
//           <thead>
//             <tr
//               style={{
//                 backgroundColor: "rgba(239, 244, 255, 0.5)",
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#3e4a3d",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.05em",
//               }}
//             >
//               <th style={{ padding: "16px 24px" }}>Beneficiary / Group</th>
//               <th style={{ padding: "16px 24px" }}>Transaction ID</th>
//               <th style={{ padding: "16px 24px" }}>Date</th>
//               <th style={{ padding: "16px 24px" }}>Amount</th>
//               <th style={{ padding: "16px 24px" }}>Status</th>
//             </tr>
//           </thead>
//           <tbody style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}>
//             {transactions.map((tx, i) => (
//               <tr
//                 key={tx.id}
//                 style={{
//                   borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//                   transition: "background-color 0.2s",
//                   cursor: "pointer",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.backgroundColor = "#eff4ff";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.backgroundColor = "transparent";
//                 }}
//               >
//                 <td style={{ padding: "16px 24px" }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "16px",
//                     }}
//                   >
//                     <div
//                       style={{
//                         width: "32px",
//                         height: "32px",
//                         borderRadius: "50%",
//                         backgroundColor: tx.iconBg,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         color: tx.iconColor,
//                       }}
//                     >
//                       <span
//                         className="material-symbols-outlined"
//                         style={{ fontSize: "18px" }}
//                       >
//                         {tx.icon}
//                       </span>
//                     </div>
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 700,
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       {tx.group}
//                     </span>
//                   </div>
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontFamily: "monospace",
//                     fontSize: "12px",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   {tx.id}
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   {tx.date}
//                 </td>
//                 <td
//                   style={{
//                     padding: "16px 24px",
//                     fontWeight: 700,
//                     color: tx.isNegative ? "#ba1a1a" : "#0b1c30",
//                   }}
//                 >
//                   {tx.amount}
//                 </td>
//                 <td style={{ padding: "16px 24px" }}>
//                   <span
//                     style={{
//                       backgroundColor:
//                         tx.status === "Success"
//                           ? "rgba(0, 107, 44, 0.1)"
//                           : "#cbdbf5",
//                       color:
//                         tx.status === "Success"
//                           ? "#006b2c"
//                           : "#3f465c",
//                       fontSize: "11px",
//                       fontWeight: 700,
//                       padding: "4px 8px",
//                       borderRadius: "9999px",
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     {tx.status}
//                   </span>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// }

// /* ===========================
//    FLOATING AI BUTTON
//    =========================== */
// function FloatingAI() {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: "24px",
//         right: "24px",
//         zIndex: 100,
//       }}
//     >
//       {/* Chat Bubble */}
//       {isOpen && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "80px",
//             right: 0,
//             backgroundColor: "#0b1c30",
//             color: "#f8f9ff",
//             padding: "24px",
//             borderRadius: "16px",
//             boxShadow:
//               "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
//             width: "256px",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 700,
//               fontFamily: "'Geist', sans-serif",
//               marginBottom: "8px",
//             }}
//           >
//             I&apos;m Treasurer AI
//           </p>
//           <p
//             style={{
//               fontSize: "12px",
//               opacity: 0.8,
//               marginBottom: "16px",
//             }}
//           >
//             I can help you analyze your portfolio or initiate group
//             disbursements. What&apos;s on your mind?
//           </p>
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             <button
//               style={{
//                 width: "100%",
//                 textAlign: "left",
//                 backgroundColor: "rgba(255, 255, 255, 0.1)",
//                 border: "none",
//                 color: "#f8f9ff",
//                 padding: "8px 12px",
//                 borderRadius: "8px",
//                 fontSize: "11px",
//                 cursor: "pointer",
//                 transition: "background-color 0.2s",
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               Analyze loan defaults
//             </button>
//             <button
//               style={{
//                 width: "100%",
//                 textAlign: "left",
//                 backgroundColor: "rgba(255, 255, 255, 0.1)",
//                 border: "none",
//                 color: "#f8f9ff",
//                 padding: "8px 12px",
//                 borderRadius: "8px",
//                 fontSize: "11px",
//                 cursor: "pointer",
//                 transition: "background-color 0.2s",
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               Generate monthly report
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Toggle Button */}
//       <button
//         onClick={() => setIsOpen(!isOpen)}
//         style={{
//           width: "56px",
//           height: "56px",
//           backgroundColor: "#006b2c",
//           color: "#ffffff",
//           borderRadius: "50%",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           border: "none",
//           cursor: "pointer",
//           boxShadow:
//             "0 20px 25px -5px rgba(0, 107, 44, 0.2), 0 10px 10px -5px rgba(0, 107, 44, 0.1)",
//           position: "relative",
//           overflow: "hidden",
//           transition: "all 0.3s",
//         }}
//       >
//         <span
//           className="material-symbols-outlined"
//           style={{ fontSize: "28px", position: "relative", zIndex: 10 }}
//         >
//           {isOpen ? "close" : "psychology"}
//         </span>
//         {!isOpen && (
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               backgroundColor: "rgba(255, 255, 255, 0.2)",
//               animation: "pulse 2s infinite",
//             }}
//           />
//         )}
//       </button>
//     </div>
//   );
// }