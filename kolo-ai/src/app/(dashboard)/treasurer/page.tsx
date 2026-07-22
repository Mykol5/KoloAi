
"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  type: "ai" | "user";
  content: React.ReactNode;
  timestamp: string;
}

export default function TreasurerAIPage() {
  const supabase = createClient();
  const [userName, setUserName] = useState("there");
  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real user + group data
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "there");

        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id, groups(*)")
          .eq("user_id", user.id)
          .limit(1);

        if (memberships && memberships.length > 0) {
          const group = memberships[0].groups;
          const { data: contribData } = await supabase
            .from("contributions")
            .select("id, amount, status")
            .eq("group_id", group.id);

          const pendingCount = contribData?.filter((c: any) => c.status === "pending").length || 0;
          const completedCount = contribData?.filter((c: any) => c.status === "completed").length || 0;
          const totalCount = contribData?.length || 0;

          setGroupData({
            ...group,
            pendingCount,
            completedCount,
            totalCount,
            complianceRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100,
          });
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: (
        <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#0b1c30" }}>
          Good afternoon, {userName}. {!loading && groupData ? (
            <>I&apos;ve analyzed your group{" "}
              <span style={{ fontWeight: 700, color: "#006b2c" }}>{groupData.name}</span>.
              Currently at <strong>{groupData.complianceRate}%</strong> compliance with{" "}
              <strong>{groupData.pendingCount} pending</strong> contribution{groupData.pendingCount !== 1 ? "s" : ""}.
              How can I assist with your treasury today?</>
          ) : !loading ? (
            <>I&apos;m your AI Treasurer. Ask me about your groups, contributions, or financial insights.</>
          ) : (
            <>Loading your group data...</>
          )}
        </p>
      ),
      timestamp: "Just now • Treasurer AI",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleTextareaInput = () => {
    const textarea = textareaRef.current;
    if (textarea) { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; }
  };

  const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

  // REAL DATA: Group Overview
  const handleGroupOverview = () => {
    if (!groupData) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
        content: <p style={{ fontSize: "15px", color: "#0b1c30" }}>You don&apos;t have any active groups yet. Create one to get started with AI-powered insights.</p>,
        timestamp: "Just now • Treasurer AI" }]);
      return;
    }
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
      content: (
        <div>
          <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "14px" }}>Here&apos;s your group overview for <strong style={{ color: "#006b2c" }}>{groupData.name}</strong>:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              ["Total Pool", formatNaira(groupData.pool_amount || 0)],
              ["Members", `${groupData.member_count || 0}/${groupData.max_members || 20}`],
              ["Contributions", `${groupData.totalCount} total (${groupData.completedCount} completed)`],
              ["Compliance Rate", `${groupData.complianceRate}%`],
              ["Pending", `${groupData.pendingCount} payment(s)`],
              ["Cycle", `#${groupData.cycle_number || 1}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(189,202,186,0.15)" }}>
                <span style={{ fontSize: "13px", color: "#3e4a3d" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0b1c30" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ), timestamp: "Just now • Treasurer AI" }]);
  };

  // REAL DATA: Pending Payments
  const handlePendingPayments = () => {
    if (!groupData) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
        content: <p style={{ fontSize: "15px", color: "#0b1c30" }}>No groups found. Create or join a group first.</p>,
        timestamp: "Just now • Treasurer AI" }]);
      return;
    }
    const pendingPercent = Math.round((groupData.pendingCount / (groupData.totalCount || 1)) * 100);
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
      content: (
        <div>
          <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "14px" }}>
            There are <strong style={{ color: "#ba1a1a" }}>{groupData.pendingCount} pending</strong> contributions in {groupData.name}.
          </p>
          {groupData.pendingCount > 0 ? (
            <>
              <p style={{ fontSize: "13px", color: "#3e4a3d", marginBottom: "12px" }}>
                This is {pendingPercent}% of total contributions. Compliance rate: {groupData.complianceRate}%.
              </p>
              <div style={{ backgroundColor: "#ffdad6", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#93000a" }}>
                Recommendation: Send reminders to pending members. Groups with over 20% pending rate are 3x more likely to miss payout deadlines.
              </div>
            </>
          ) : (
            <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#006b2c" }}>
              All contributions are up to date. Your group is in excellent standing.
            </div>
          )}
        </div>
      ), timestamp: "Just now • Treasurer AI" }]);
  };

  // REAL DATA: Smart Insights
  const handleSmartInsights = () => {
    if (!groupData) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
        content: <p style={{ fontSize: "15px", color: "#0b1c30" }}>Join a group to get personalized financial insights.</p>,
        timestamp: "Just now • Treasurer AI" }]);
      return;
    }
    const avgContribution = groupData.totalCount > 0 ? (groupData.pool_amount || 0) / groupData.totalCount : 0;
    const projectedAnnual = avgContribution * (groupData.member_count || 1) * 12;
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
      content: (
        <div>
          <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "14px" }}>Smart Analysis for <strong style={{ color: "#006b2c" }}>{groupData.name}</strong>:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ backgroundColor: "#eff4ff", padding: "14px", borderRadius: "10px" }}>
              <p style={{ fontSize: "12px", color: "#3e4a3d", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Average Contribution</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(avgContribution)}</p>
              <p style={{ fontSize: "12px", color: "#6e7b6c" }}>per member</p>
            </div>
            <div style={{ backgroundColor: "#eff4ff", padding: "14px", borderRadius: "10px" }}>
              <p style={{ fontSize: "12px", color: "#3e4a3d", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Projected Annual Pool</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(projectedAnnual)}</p>
              <p style={{ fontSize: "12px", color: "#6e7b6c" }}>based on current rate</p>
            </div>
            {groupData.member_count > 0 && (
              <div style={{ backgroundColor: "#fefce8", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#825100" }}>
                Suggestion: With {groupData.member_count} members at this rate, you could increase contributions to {formatNaira(avgContribution * 1.25)} to reach goals faster.
              </div>
            )}
          </div>
        </div>
      ), timestamp: "Just now • Treasurer AI" }]);
  };

  // REAL DATA: Rotation Info
  const handleRotationInfo = () => {
    if (!groupData || !groupData.rotation_order || groupData.rotation_order.length === 0) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
        content: (
          <div>
            <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "8px" }}>This group is not set up as a Rotating Ajo.</p>
            <p style={{ fontSize: "13px", color: "#3e4a3d" }}>Rotating Ajo groups have a fixed payout order. Consider creating a Rotating Ajo group for automated payout scheduling.</p>
          </div>
        ), timestamp: "Just now • Treasurer AI" }]);
      return;
    }
    const currentIndex = groupData.current_rotation_index || 0;
    const totalMembers = groupData.rotation_order.length;
    const totalPayout = (groupData.contribution_amount || 0) * totalMembers;
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
      content: (
        <div>
          <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "14px" }}>Rotation Status for <strong style={{ color: "#006b2c" }}>{groupData.name}</strong>:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(189,202,186,0.15)" }}>
              <span style={{ fontSize: "13px" }}>Current Position</span>
              <span style={{ fontWeight: 600, color: "#825100" }}>#{currentIndex + 1} of {totalMembers}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(189,202,186,0.15)" }}>
              <span style={{ fontSize: "13px" }}>Payout Amount</span>
              <span style={{ fontWeight: 600, color: "#006b2c" }}>{formatNaira(totalPayout)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: "13px" }}>Members in Rotation</span>
              <span style={{ fontWeight: 600 }}>{totalMembers}</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#eff4ff", padding: "12px", borderRadius: "8px", marginTop: "12px", fontSize: "13px", color: "#0b1c30" }}>
            {totalMembers - currentIndex - 1} more people before the rotation completes. Next payout estimated in 30 days.
          </div>
        </div>
      ), timestamp: "Just now • Treasurer AI" }]);
  };

  // Report Card
  const handleGenerateReport = () => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + "-report", type: "ai", content: <ReportCard groupData={groupData} formatNaira={formatNaira} />, timestamp: "Just now • Treasurer AI" }]);
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), type: "user", content: <p style={{ fontSize: "15px", color: "#fff", fontWeight: 500 }}>{trimmed}</p>, timestamp: "Just now" }]);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const query = trimmed.toLowerCase();
    if (query.includes("overview") || query.includes("summary") || query.includes("how is my group")) setTimeout(() => handleGroupOverview(), 800);
    else if (query.includes("pending") || query.includes("who hasn't paid") || query.includes("defaulters")) setTimeout(() => handlePendingPayments(), 800);
    else if (query.includes("insight") || query.includes("analysis") || query.includes("suggest")) setTimeout(() => handleSmartInsights(), 800);
    else if (query.includes("rotation") || query.includes("ajo") || query.includes("payout") || query.includes("next")) setTimeout(() => handleRotationInfo(), 800);
    else if (query.includes("report") || query.includes("june")) setTimeout(() => handleGenerateReport(), 800);
    else setTimeout(() => handleDefaultResponse(), 800);
  };

  const handleDefaultResponse = () => {
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai",
      content: (
        <div>
          <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "12px" }}>I can help you with:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { q: "How is my group?", desc: "Group overview" },
              { q: "Who hasn't paid?", desc: "Pending contributions" },
              { q: "Give me insights", desc: "Smart financial analysis" },
              { q: "Show rotation", desc: "Ajo payout information" },
            ].map((item) => (
              <button key={item.q} onClick={() => { setInputValue(item.q); textareaRef.current?.focus(); }}
                style={{ textAlign: "left", padding: "10px 14px", background: "rgba(0,107,44,0.05)", border: "1px solid rgba(0,107,44,0.1)", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#0b1c30", fontFamily: "'Inter', sans-serif" }}>
                <span style={{ fontWeight: 600 }}>&quot;{item.q}&quot;</span> — {item.desc}
              </button>
            ))}
          </div>
        </div>
      ), timestamp: "Just now • Treasurer AI" }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const quickActions = [
    { icon: "show_chart", label: "Group overview", query: "How is my group?" },
    { icon: "receipt_long", label: "Smart insights", query: "Give me insights" },
    { icon: "mail", label: "Pending payments", query: "Who hasn't paid?" },
    { icon: "bolt", label: "Rotation info", query: "Show rotation" },
  ];

  return (
    <div className="treasurer-container" style={{ backgroundColor: "#f8f9ff", color: "#0b1c30", fontFamily: "'Inter', sans-serif", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header className="treasurer-header" style={{ padding: "0 20px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.5)", position: "sticky", top: 0, zIndex: 40, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ padding: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", borderRadius: "8px" }}>
            <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>psychology</span>
          </div>
          <div>
            <h2 className="header-title" style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Treasurer AI Assistant</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#006b2c", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "10px", color: "#3e4a3d", fontWeight: 500 }}>SYSTEM READY</span>
            </div>
          </div>
        </div>
        <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="liquidity-text" style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
            {groupData ? `${formatNaira(groupData.pool_amount || 0)} Pool` : "No groups yet"}
          </span>
          <button style={{ padding: "6px", borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: "#3e4a3d" }}><span className="material-symbols-outlined">more_vert</span></button>
        </div>
      </header>

      <section className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px", background: "linear-gradient(135deg, rgba(0, 107, 44, 0.05) 0%, rgba(203, 219, 245, 0.1) 100%)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "ai" ? (
                <div className="msg-row" style={{ display: "flex", gap: "16px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  </div>
                  <div style={{ maxWidth: "90%", width: "100%" }}>
                    <div className="msg-bubble-ai" style={{ backgroundColor: "#fff", padding: "18px", borderRadius: "14px 14px 14px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(189, 202, 186, 0.3)" }}>{msg.content}</div>
                    <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 500, marginLeft: "8px", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{msg.timestamp}</p>
                  </div>
                </div>
              ) : (
                <div className="msg-row" style={{ display: "flex", gap: "16px", flexDirection: "row-reverse" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#cbdbf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: "1px solid rgba(189, 202, 186, 0.5)" }}>
                    <img style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnUpbxsyCXjZNafL3fmGkjcZfmMKLdbGNge86laiwfUzo2PqXpFvGEyaLmcIfEgM0BqOb1v49rxFryP38Nh1NE7iXVLMtHwmRKhfV1kWBaMU23M6vVRavjjwq_paTkupFoWndJBE2TZUihnNX0joDBp56OwUW6HfqtNCE85DrAo9sbVGDx5ktEJtqRQJ_FcT6YdDDiSXhJ8lp9jx5ul0A3STy85ktl5wgGnllbVO1feF8wp2twdBAhPATbb7n7FFoJwqZWIBo1OEpx" />
                  </div>
                  <div style={{ maxWidth: "80%" }}>
                    <div className="msg-bubble-user" style={{ backgroundColor: "#213145", padding: "18px", borderRadius: "14px 14px 4px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>{msg.content}</div>
                    <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 500, marginRight: "8px", marginTop: "4px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>{msg.timestamp}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </section>

      <footer className="treasurer-footer" style={{ padding: "0 20px 20px 20px", backgroundColor: "rgba(248, 249, 255, 0.8)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="quick-actions" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => { setInputValue(action.query); textareaRef.current?.focus(); }}
                className="quick-btn" style={{ whiteSpace: "nowrap", padding: "7px 14px", backgroundColor: "#fff", border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "20px", fontSize: "12px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{action.icon}</span> {action.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", backgroundColor: "#fff", border: "1px solid rgba(189, 202, 186, 0.8)", borderRadius: "20px", padding: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <button style={{ padding: "10px", background: "transparent", border: "none", cursor: "pointer", color: "#3e4a3d", flexShrink: 0 }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>attach_file</span></button>
            <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onInput={handleTextareaInput} onKeyDown={handleKeyDown} placeholder="Ask Treasurer AI anything..." rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 0", fontSize: "15px", fontFamily: "'Inter', sans-serif", resize: "none", maxHeight: "100px" }} />
            <button onClick={handleSend} style={{ padding: "10px", backgroundColor: "#006b2c", color: "#fff", borderRadius: "14px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(0,107,44,0.2)", flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
          <p className="footer-text" style={{ textAlign: "center", fontSize: "10px", color: "#3e4a3d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Treasurer AI powered by <span style={{ color: "#006b2c", fontWeight: 700 }}>SafeGuard 2.0</span> Banking Protocols
          </p>
        </div>
      </footer>

      <style jsx>{`
        @media (max-width: 768px) {
          .treasurer-header { padding: 0 14px !important; height: 52px !important; }
          .header-title { font-size: 13px !important; }
          .liquidity-text { display: none !important; }
          .chat-scroll { padding: 14px !important; }
          .msg-row { gap: 10px !important; }
          .msg-bubble-ai, .msg-bubble-user { padding: 14px !important; border-radius: 12px !important; }
          .treasurer-footer { padding: 0 14px 14px 14px !important; }
          .quick-btn { font-size: 11px !important; padding: 6px 10px !important; }
          .footer-text { font-size: 9px !important; }
        }
        @media (max-width: 400px) {
          .treasurer-header { padding: 0 10px !important; }
          .chat-scroll { padding: 10px !important; }
          .msg-bubble-ai, .msg-bubble-user { padding: 12px !important; font-size: 13px !important; }
        }
      `}</style>
    </div>
  );
}

/* ===========================
   REPORT CARD
   =========================== */
function ReportCard({ groupData, formatNaira }: { groupData: any; formatNaira: (a: number) => string }) {
  return (
    <div>
      <div className="report-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>
            {groupData?.name || "Group"} Financial Summary
          </h3>
          <p style={{ fontSize: "10px", color: "#3e4a3d" }}>Generated on {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid rgba(189, 202, 186, 0.3)", background: "transparent", cursor: "pointer" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>download</span></button>
          <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid rgba(189, 202, 186, 0.3)", background: "transparent", cursor: "pointer" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>share</span></button>
        </div>
      </div>

      <div style={{ backgroundColor: "#eff4ff", padding: "16px", borderRadius: "10px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700 }}>Total Pool</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(groupData?.pool_amount || 0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700 }}>Compliance</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: groupData?.complianceRate > 80 ? "#006b2c" : "#825100" }}>{groupData?.complianceRate || 0}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: 700 }}>Members</span>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>{groupData?.member_count || 0}/{groupData?.max_members || 20}</span>
        </div>
      </div>

      <div className="summary-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Contributions", value: groupData?.totalCount || 0 },
          { label: "Completed", value: groupData?.completedCount || 0 },
          { label: "Pending", value: groupData?.pendingCount || 0 },
        ].map((item) => (
          <div key={item.label} style={{ padding: "10px", backgroundColor: "#eff4ff", borderRadius: "10px" }}>
            <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</p>
            <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>{item.value}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 500px) {
          .summary-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}



// "use client";

// import { useState, useRef, useEffect } from "react";

// interface Message {
//   id: string;
//   type: "ai" | "user";
//   content: React.ReactNode;
//   timestamp: string;
// }

// export default function TreasurerAIPage() {
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: "1",
//       type: "ai",
//       content: (
//         <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#0b1c30" }}>
//           Good afternoon, Alex. I&apos;ve analyzed the{" "}
//           <span style={{ fontWeight: 700, color: "#006b2c" }}>Strategic Growth Fund</span>{" "}
//           for June. The group is currently at 94% contribution compliance. How
//           can I assist with your treasury duties today?
//         </p>
//       ),
//       timestamp: "Just now • Treasurer AI",
//     },
//   ]);
//   const [inputValue, setInputValue] = useState("");
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const textareaRef = useRef<HTMLTextAreaElement>(null);

//   const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
//   useEffect(() => { scrollToBottom(); }, [messages]);

//   const handleTextareaInput = () => {
//     const textarea = textareaRef.current;
//     if (textarea) { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; }
//   };

//   const handleSendDefaulters = () => {
//     const newAiMessage: Message = {
//       id: Date.now().toString() + "-ai", type: "ai",
//       content: (
//         <div>
//           <p style={{ fontSize: "15px", color: "#0b1c30", marginBottom: "16px" }}>There are currently 4 members with pending contributions for June. Here is the breakdown:</p>
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             {[
//               { initials: "JD", name: "Jordan Davenport", since: "Member since Jan 2023", amount: "$2,500.00", status: "Overdue 3d", urgent: true },
//               { initials: "SC", name: "Sarah Chen", since: "Member since Mar 2023", amount: "$2,500.00", status: "Overdue 1d", urgent: true },
//               { initials: "MK", name: "Marcus Knight", since: "Member since Nov 2022", amount: "$5,000.00", status: "Pending", urgent: false },
//             ].map((member) => (
//               <div key={member.name} className="defaulter-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "10px", border: "1px solid rgba(189, 202, 186, 0.2)", backgroundColor: "#ffffff", flexWrap: "wrap", gap: "8px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                   <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "#3e4a3d", flexShrink: 0 }}>{member.initials}</div>
//                   <div>
//                     <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>{member.name}</p>
//                     <p style={{ fontSize: "10px", color: "#3e4a3d" }}>{member.since}</p>
//                   </div>
//                 </div>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>{member.amount}</span>
//                   <span style={{ padding: "4px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", backgroundColor: member.urgent ? "#ffdad6" : "#d3e4fe", color: member.urgent ? "#93000a" : "#3e4a3d" }}>{member.status}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <button style={{ width: "100%", marginTop: "16px", padding: "10px", backgroundColor: "rgba(0, 107, 44, 0.05)", color: "#006b2c", fontSize: "13px", fontWeight: 700, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "1px solid rgba(0, 107, 44, 0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
//             <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>notifications</span> Send Reminders to All
//           </button>
//         </div>
//       ),
//       timestamp: "Just now • Treasurer AI",
//     };
//     setMessages((prev) => [...prev, newAiMessage]);
//   };

//   const handleGenerateReport = () => {
//     setMessages((prev) => [...prev, { id: Date.now().toString() + "-report", type: "ai", content: <ReportCard />, timestamp: "Just now • Treasurer AI" }]);
//   };

//   const handleSend = () => {
//     const trimmed = inputValue.trim();
//     if (!trimmed) return;
//     setMessages((prev) => [...prev, { id: Date.now().toString(), type: "user", content: <p style={{ fontSize: "15px", color: "#fff", fontWeight: 500 }}>{trimmed}</p>, timestamp: "Just now" }]);
//     setInputValue("");
//     if (textareaRef.current) textareaRef.current.style.height = "auto";
//     if (trimmed.toLowerCase().includes("who hasn't paid") || trimmed.toLowerCase().includes("defaulters") || trimmed.toLowerCase().includes("pending")) setTimeout(() => handleSendDefaulters(), 800);
//     else if (trimmed.toLowerCase().includes("report") || trimmed.toLowerCase().includes("summary") || trimmed.toLowerCase().includes("june")) setTimeout(() => handleGenerateReport(), 800);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

//   const quickActions = [
//     { icon: "show_chart", label: "Projected yields for Q3", query: "What are the projected yields for Q3?" },
//     { icon: "receipt_long", label: "Tax statement 2023", query: "Generate tax statement for 2023" },
//     { icon: "mail", label: "Draft delinquency notice", query: "Draft a delinquency notice" },
//     { icon: "bolt", label: "Optimize cash flow", query: "How can I optimize cash flow?" },
//   ];

//   return (
//     <div className="treasurer-container" style={{ backgroundColor: "#f8f9ff", color: "#0b1c30", fontFamily: "'Inter', sans-serif", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
//       {/* Top Bar */}
//       <header className="treasurer-header" style={{ padding: "0 20px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.5)", position: "sticky", top: 0, zIndex: 40, flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//           <div style={{ padding: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", borderRadius: "8px" }}>
//             <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>psychology</span>
//           </div>
//           <div>
//             <h2 className="header-title" style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Treasurer AI Assistant</h2>
//             <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
//               <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#006b2c", animation: "pulse 2s infinite" }} />
//               <span style={{ fontSize: "10px", color: "#3e4a3d", fontWeight: 500 }}>SYSTEM READY</span>
//             </div>
//           </div>
//         </div>
//         <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <span className="liquidity-text" style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>Global Liquidity: <span style={{ color: "#006b2c", fontWeight: 700 }}>$1,248,300.00</span></span>
//           <button style={{ padding: "6px", borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent", color: "#3e4a3d" }}><span className="material-symbols-outlined">more_vert</span></button>
//         </div>
//       </header>

//       {/* Chat Messages */}
//       <section className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px", background: "linear-gradient(135deg, rgba(0, 107, 44, 0.05) 0%, rgba(203, 219, 245, 0.1) 100%)" }}>
//         <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
//           {messages.map((msg) => (
//             <div key={msg.id}>
//               {msg.type === "ai" ? (
//                 <div className="msg-row" style={{ display: "flex", gap: "16px" }}>
//                   <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
//                     <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>psychology</span>
//                   </div>
//                   <div style={{ maxWidth: "90%", width: "100%" }}>
//                     <div className="msg-bubble-ai" style={{ backgroundColor: "#fff", padding: "18px", borderRadius: "14px 14px 14px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(189, 202, 186, 0.3)" }}>{msg.content}</div>
//                     <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 500, marginLeft: "8px", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{msg.timestamp}</p>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="msg-row" style={{ display: "flex", gap: "16px", flexDirection: "row-reverse" }}>
//                   <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#cbdbf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: "1px solid rgba(189, 202, 186, 0.5)" }}>
//                     <img style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnUpbxsyCXjZNafL3fmGkjcZfmMKLdbGNge86laiwfUzo2PqXpFvGEyaLmcIfEgM0BqOb1v49rxFryP38Nh1NE7iXVLMtHwmRKhfV1kWBaMU23M6vVRavjjwq_paTkupFoWndJBE2TZUihnNX0joDBp56OwUW6HfqtNCE85DrAo9sbVGDx5ktEJtqRQJ_FcT6YdDDiSXhJ8lp9jx5ul0A3STy85ktl5wgGnllbVO1feF8wp2twdBAhPATbb7n7FFoJwqZWIBo1OEpx" />
//                   </div>
//                   <div style={{ maxWidth: "80%" }}>
//                     <div className="msg-bubble-user" style={{ backgroundColor: "#213145", padding: "18px", borderRadius: "14px 14px 4px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>{msg.content}</div>
//                     <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 500, marginRight: "8px", marginTop: "4px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>{msg.timestamp}</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           ))}
//           <div ref={chatEndRef} />
//         </div>
//       </section>

//       {/* Input Area */}
//       <footer className="treasurer-footer" style={{ padding: "0 20px 20px 20px", backgroundColor: "rgba(248, 249, 255, 0.8)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
//         <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
//           <div className="quick-actions" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
//             {quickActions.map((action) => (
//               <button key={action.label} onClick={() => { setInputValue(action.query); textareaRef.current?.focus(); }}
//                 className="quick-btn" style={{ whiteSpace: "nowrap", padding: "7px 14px", backgroundColor: "#fff", border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "20px", fontSize: "12px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
//                 <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{action.icon}</span> {action.label}
//               </button>
//             ))}
//           </div>
//           <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", backgroundColor: "#fff", border: "1px solid rgba(189, 202, 186, 0.8)", borderRadius: "20px", padding: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
//             <button style={{ padding: "10px", background: "transparent", border: "none", cursor: "pointer", color: "#3e4a3d", flexShrink: 0 }}><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>attach_file</span></button>
//             <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onInput={handleTextareaInput} onKeyDown={handleKeyDown} placeholder="Ask Treasurer AI anything..." rows={1}
//               style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 0", fontSize: "15px", fontFamily: "'Inter', sans-serif", resize: "none", maxHeight: "100px" }} />
//             <button onClick={handleSend} style={{ padding: "10px", backgroundColor: "#006b2c", color: "#fff", borderRadius: "14px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(0,107,44,0.2)", flexShrink: 0 }}>
//               <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>send</span>
//             </button>
//           </div>
//           <p className="footer-text" style={{ textAlign: "center", fontSize: "10px", color: "#3e4a3d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
//             Treasurer AI powered by <span style={{ color: "#006b2c", fontWeight: 700 }}>SafeGuard 2.0</span> Banking Protocols
//           </p>
//         </div>
//       </footer>

//       {/* Mobile responsive styles */}
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .treasurer-header { padding: 0 14px !important; height: 52px !important; }
//           .header-title { font-size: 13px !important; }
//           .liquidity-text { display: none !important; }
//           .chat-scroll { padding: 14px !important; }
//           .msg-row { gap: 10px !important; }
//           .msg-bubble-ai, .msg-bubble-user { padding: 14px !important; border-radius: 12px !important; }
//           .treasurer-footer { padding: 0 14px 14px 14px !important; }
//           .quick-btn { font-size: 11px !important; padding: 6px 10px !important; }
//           .footer-text { font-size: 9px !important; }
//           .defaulter-row { flex-direction: column !important; align-items: flex-start !important; }
//         }
//         @media (max-width: 400px) {
//           .treasurer-header { padding: 0 10px !important; }
//           .chat-scroll { padding: 10px !important; }
//           .msg-bubble-ai, .msg-bubble-user { padding: 12px !important; font-size: 13px !important; }
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ===========================
//    REPORT CARD
//    =========================== */
// function ReportCard() {
//   const weeks = [
//     { label: "WK1", actual: 85, height: 60 },
//     { label: "WK2", actual: 90, height: 75 },
//     { label: "WK3", actual: 95, height: 90 },
//     { label: "WK4", actual: 70, height: 85 },
//   ];

//   return (
//     <div>
//       <div className="report-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
//         <div>
//           <h3 style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>June Financial Summary</h3>
//           <p style={{ fontSize: "10px", color: "#3e4a3d" }}>Strategic Growth Fund • Generated on Jun 28</p>
//         </div>
//         <div style={{ display: "flex", gap: "6px" }}>
//           <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid rgba(189, 202, 186, 0.3)", background: "transparent", cursor: "pointer" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>download</span></button>
//           <button style={{ padding: "6px", borderRadius: "6px", border: "1px solid rgba(189, 202, 186, 0.3)", background: "transparent", cursor: "pointer" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>share</span></button>
//         </div>
//       </div>

//       <div className="chart-wrap" style={{ position: "relative", height: "200px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid rgba(189, 202, 186, 0.1)", padding: "16px", overflow: "hidden", marginBottom: "16px" }}>
//         <div style={{ position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none" }}>
//           <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 100 L0 80 Q 25 70 50 85 T 100 60 L 100 100 Z" fill="url(#gradient)" /><defs><linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style={{ stopColor: "rgb(0,107,44)", stopOpacity: 1 }} /><stop offset="100%" style={{ stopColor: "rgb(0,107,44)", stopOpacity: 0 }} /></linearGradient></defs></svg>
//         </div>
//         <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
//           <div className="chart-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
//             <div>
//               <span style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 700, textTransform: "uppercase" }}>Total Equity</span>
//               <div style={{ fontSize: "20px", fontWeight: 700, color: "#006b2c" }}>$412,850.12</div>
//               <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#006b2c" }}><span className="material-symbols-outlined" style={{ fontSize: "10px" }}>trending_up</span><span style={{ fontSize: "9px", fontWeight: 700 }}>+12.4% vs May</span></div>
//             </div>
//             <div style={{ display: "flex", gap: "8px" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#006b2c" }} /><span style={{ fontSize: "9px", fontWeight: 500 }}>Actual</span></div>
//               <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#cbdbf5" }} /><span style={{ fontSize: "9px", fontWeight: 500 }}>Projected</span></div>
//             </div>
//           </div>
//           <div className="bars-row" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px", padding: "0 4px", height: "90px" }}>
//             {weeks.map((week) => (
//               <div key={week.label} style={{ flex: 1, backgroundColor: "rgba(203, 219, 245, 0.4)", borderRadius: "6px 6px 0 0", height: `${week.height}%`, position: "relative" }}>
//                 <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderRadius: "6px 6px 0 0", height: `${week.actual}%`, backgroundColor: week.label === "WK4" ? "#006b2c" : week.label === "WK3" ? "rgba(0, 107, 44, 0.4)" : "rgba(0, 107, 44, 0.2)", transition: "all 1s" }} />
//                 <span style={{ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "9px", fontWeight: 700, color: "#3e4a3d" }}>{week.label}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className="summary-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
//         {[{ label: "Contributions", value: "$82,000" },{ label: "Investments", value: "$320,500" },{ label: "Reserved", value: "$10,350" }].map((item) => (
//           <div key={item.label} style={{ padding: "10px", backgroundColor: "#eff4ff", borderRadius: "10px" }}>
//             <p style={{ fontSize: "9px", color: "#3e4a3d", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</p>
//             <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>{item.value}</p>
//           </div>
//         ))}
//       </div>

//       <style jsx>{`
//         @media (max-width: 500px) {
//           .chart-wrap { height: 160px !important; padding: 12px !important; }
//           .chart-top { flex-direction: column !important; }
//           .bars-row { height: 70px !important; gap: 6px !important; }
//           .summary-cards { grid-template-columns: 1fr !important; }
//         }
//       `}</style>
//     </div>
//   );
// }






// // "use client";

// // import { useState, useRef, useEffect } from "react";

// // interface Message {
// //   id: string;
// //   type: "ai" | "user";
// //   content: React.ReactNode;
// //   timestamp: string;
// // }

// // export default function TreasurerAIPage() {
// //   const [messages, setMessages] = useState<Message[]>([
// //     {
// //       id: "1",
// //       type: "ai",
// //       content: (
// //         <p className="text-body-md text-on-surface leading-relaxed">
// //           Good afternoon, Alex. I&apos;ve analyzed the{" "}
// //           <span className="font-bold text-primary">Strategic Growth Fund</span>{" "}
// //           for June. The group is currently at 94% contribution compliance. How
// //           can I assist with your treasury duties today?
// //         </p>
// //       ),
// //       timestamp: "Just now • Treasurer AI",
// //     },
// //   ]);
// //   const [inputValue, setInputValue] = useState("");
// //   const chatEndRef = useRef<HTMLDivElement>(null);
// //   const textareaRef = useRef<HTMLTextAreaElement>(null);

// //   const scrollToBottom = () => {
// //     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
// //   };

// //   useEffect(() => {
// //     scrollToBottom();
// //   }, [messages]);

// //   const handleTextareaInput = () => {
// //     const textarea = textareaRef.current;
// //     if (textarea) {
// //       textarea.style.height = "auto";
// //       textarea.style.height = textarea.scrollHeight + "px";
// //     }
// //   };

// //   const handleSendDefaulters = () => {
// //     const newAiMessage: Message = {
// //       id: Date.now().toString() + "-ai",
// //       type: "ai",
// //       content: (
// //         <div className="space-y-md">
// //           <p className="text-body-md text-on-surface">
// //             There are currently 4 members with pending contributions for June.
// //             Here is the breakdown:
// //           </p>
// //           <div className="space-y-2">
// //             {[
// //               {
// //                 initials: "JD",
// //                 name: "Jordan Davenport",
// //                 since: "Member since Jan 2023",
// //                 amount: "$2,500.00",
// //                 status: "Overdue 3d",
// //                 urgent: true,
// //               },
// //               {
// //                 initials: "SC",
// //                 name: "Sarah Chen",
// //                 since: "Member since Mar 2023",
// //                 amount: "$2,500.00",
// //                 status: "Overdue 1d",
// //                 urgent: true,
// //               },
// //               {
// //                 initials: "MK",
// //                 name: "Marcus Knight",
// //                 since: "Member since Nov 2022",
// //                 amount: "$5,000.00",
// //                 status: "Pending",
// //                 urgent: false,
// //               },
// //             ].map((member) => (
// //               <div
// //                 key={member.name}
// //                 className="flex items-center justify-between p-3 rounded-xl border transition-colors"
// //                 style={{
// //                   backgroundColor: "#ffffff",
// //                   borderColor: "rgba(189, 202, 186, 0.2)",
// //                 }}
// //               >
// //                 <div
// //                   style={{ display: "flex", alignItems: "center", gap: "16px" }}
// //                 >
// //                   <div
// //                     style={{
// //                       width: "32px",
// //                       height: "32px",
// //                       borderRadius: "50%",
// //                       backgroundColor: "#dce9ff",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                     }}
// //                   >
// //                     <span
// //                       style={{
// //                         fontSize: "12px",
// //                         fontWeight: 700,
// //                         color: "#3e4a3d",
// //                       }}
// //                     >
// //                       {member.initials}
// //                     </span>
// //                   </div>
// //                   <div>
// //                     <p
// //                       style={{
// //                         fontSize: "14px",
// //                         lineHeight: "20px",
// //                         letterSpacing: "0.01em",
// //                         fontWeight: 700,
// //                         fontFamily: "'Geist', sans-serif",
// //                         color: "#0b1c30",
// //                       }}
// //                     >
// //                       {member.name}
// //                     </p>
// //                     <p
// //                       style={{
// //                         fontSize: "10px",
// //                         color: "#3e4a3d",
// //                       }}
// //                     >
// //                       {member.since}
// //                     </p>
// //                   </div>
// //                 </div>
// //                 <div
// //                   style={{
// //                     display: "flex",
// //                     alignItems: "center",
// //                     gap: "24px",
// //                   }}
// //                 >
// //                   <span
// //                     style={{
// //                       fontSize: "14px",
// //                       lineHeight: "20px",
// //                       letterSpacing: "0.01em",
// //                       fontWeight: 700,
// //                       fontFamily: "'Geist', sans-serif",
// //                       color: "#0b1c30",
// //                     }}
// //                   >
// //                     {member.amount}
// //                   </span>
// //                   <span
// //                     style={{
// //                       padding: "4px 8px",
// //                       borderRadius: "9999px",
// //                       fontSize: "10px",
// //                       fontWeight: 700,
// //                       textTransform: "uppercase",
// //                       letterSpacing: "0.05em",
// //                       backgroundColor: member.urgent
// //                         ? "#ffdad6"
// //                         : "#d3e4fe",
// //                       color: member.urgent ? "#93000a" : "#3e4a3d",
// //                     }}
// //                   >
// //                     {member.status}
// //                   </span>
// //                 </div>
// //               </div>
// //             ))}
// //           </div>
// //           <button
// //             style={{
// //               width: "100%",
// //               padding: "8px",
// //               backgroundColor: "rgba(0, 107, 44, 0.05)",
// //               color: "#006b2c",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 700,
// //               fontFamily: "'Geist', sans-serif",
// //               borderRadius: "8px",
// //               border: "1px solid rgba(0, 107, 44, 0.2)",
// //               cursor: "pointer",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               gap: "8px",
// //               transition: "background-color 0.2s",
// //             }}
// //           >
// //             <span
// //               className="material-symbols-outlined"
// //               style={{ fontSize: "14px" }}
// //             >
// //               notifications
// //             </span>
// //             Send Reminders to All
// //           </button>
// //         </div>
// //       ),
// //       timestamp: "Just now • Treasurer AI",
// //     };
// //     setMessages((prev) => [...prev, newAiMessage]);
// //   };

// //   const handleGenerateReport = () => {
// //     const newAiMessage: Message = {
// //       id: Date.now().toString() + "-report",
// //       type: "ai",
// //       content: <ReportCard />,
// //       timestamp: "Just now • Treasurer AI",
// //     };
// //     setMessages((prev) => [...prev, newAiMessage]);
// //   };

// //   const handleSend = () => {
// //     const trimmed = inputValue.trim();
// //     if (!trimmed) return;

// //     const userMessage: Message = {
// //       id: Date.now().toString(),
// //       type: "user",
// //       content: (
// //         <p className="text-body-md text-white font-medium">{trimmed}</p>
// //       ),
// //       timestamp: "Just now",
// //     };
// //     setMessages((prev) => [...prev, userMessage]);
// //     setInputValue("");

// //     // Reset textarea height
// //     if (textareaRef.current) {
// //       textareaRef.current.style.height = "auto";
// //     }

// //     // Simulate AI response
// //     if (
// //       trimmed.toLowerCase().includes("who hasn't paid") ||
// //       trimmed.toLowerCase().includes("defaulters") ||
// //       trimmed.toLowerCase().includes("pending")
// //     ) {
// //       setTimeout(() => handleSendDefaulters(), 800);
// //     } else if (
// //       trimmed.toLowerCase().includes("report") ||
// //       trimmed.toLowerCase().includes("summary") ||
// //       trimmed.toLowerCase().includes("june")
// //     ) {
// //       setTimeout(() => handleGenerateReport(), 800);
// //     }
// //   };

// //   const handleKeyDown = (e: React.KeyboardEvent) => {
// //     if (e.key === "Enter" && !e.shiftKey) {
// //       e.preventDefault();
// //       handleSend();
// //     }
// //   };

// //   const quickActions = [
// //     {
// //       icon: "show_chart",
// //       label: "Projected yields for Q3",
// //       query: "What are the projected yields for Q3?",
// //     },
// //     {
// //       icon: "receipt_long",
// //       label: "Tax statement 2023",
// //       query: "Generate tax statement for 2023",
// //     },
// //     {
// //       icon: "mail",
// //       label: "Draft delinquency notice",
// //       query: "Draft a delinquency notice",
// //     },
// //     {
// //       icon: "bolt",
// //       label: "Optimize cash flow",
// //       query: "How can I optimize cash flow?",
// //     },
// //   ];

// //   return (
// //     <div
// //       style={{
// //         backgroundColor: "#f8f9ff",
// //         color: "#0b1c30",
// //         fontFamily: "'Inter', sans-serif",
// //         height: "100vh",
// //         display: "flex",
// //         flexDirection: "column",
// //         position: "relative",
// //         overflow: "hidden",
// //       }}
// //     >
// //       {/* Top Bar */}
// //       <header
// //         className="glass-panel"
// //         style={{
// //           height: "64px",
// //           padding: "0 24px",
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent: "space-between",
// //           background: "rgba(255, 255, 255, 0.7)",
// //           backdropFilter: "blur(12px)",
// //           borderBottom: "1px solid rgba(189, 202, 186, 0.5)",
// //           position: "sticky",
// //           top: 0,
// //           zIndex: 40,
// //         }}
// //       >
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <div
// //             style={{
// //               padding: "8px",
// //               backgroundColor: "rgba(0, 107, 44, 0.1)",
// //               borderRadius: "8px",
// //             }}
// //           >
// //             <span
// //               className="material-symbols-outlined"
// //               style={{
// //                 color: "#006b2c",
// //                 fontVariationSettings: "'FILL' 1",
// //               }}
// //             >
// //               psychology
// //             </span>
// //           </div>
// //           <div>
// //             <h2
// //               style={{
// //                 fontSize: "14px",
// //                 lineHeight: "20px",
// //                 letterSpacing: "0.01em",
// //                 fontWeight: 700,
// //                 fontFamily: "'Geist', sans-serif",
// //                 color: "#0b1c30",
// //               }}
// //             >
// //               Treasurer AI Assistant
// //             </h2>
// //             <div
// //               style={{ display: "flex", alignItems: "center", gap: "4px" }}
// //             >
// //               <span
// //                 style={{
// //                   width: "8px",
// //                   height: "8px",
// //                   borderRadius: "50%",
// //                   backgroundColor: "#006b2c",
// //                   animation: "pulse 2s infinite",
// //                 }}
// //               />
// //               <span
// //                 style={{
// //                   fontSize: "10px",
// //                   color: "#3e4a3d",
// //                   fontWeight: 500,
// //                 }}
// //               >
// //                 SYSTEM READY
// //               </span>
// //             </div>
// //           </div>
// //         </div>
// //         <div
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "24px",
// //           }}
// //         >
// //           <div
// //             className="hidden md:flex"
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: "16px",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 500,
// //               fontFamily: "'Geist', sans-serif",
// //             }}
// //           >
// //             <span style={{ color: "#3e4a3d" }}>Global Liquidity:</span>
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>
// //               $1,248,300.00
// //             </span>
// //           </div>
// //           <button
// //             style={{
// //               padding: "8px",
// //               borderRadius: "50%",
// //               border: "none",
// //               cursor: "pointer",
// //               backgroundColor: "transparent",
// //               transition: "background-color 0.2s",
// //               color: "#3e4a3d",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">more_vert</span>
// //           </button>
// //         </div>
// //       </header>

// //       {/* Chat Messages */}
// //       <section
// //         className="chat-scroll"
// //         style={{
// //           flex: 1,
// //           overflowY: "auto",
// //           padding: "24px",
// //           background:
// //             "linear-gradient(135deg, rgba(0, 107, 44, 0.05) 0%, rgba(203, 219, 245, 0.1) 100%)",
// //         }}
// //       >
// //         <div
// //           style={{
// //             maxWidth: "896px",
// //             margin: "0 auto",
// //             display: "flex",
// //             flexDirection: "column",
// //             gap: "40px",
// //           }}
// //         >
// //           {messages.map((msg) => (
// //             <div key={msg.id}>
// //               {msg.type === "ai" ? (
// //                 <div style={{ display: "flex", gap: "24px" }}>
// //                   <div
// //                     style={{
// //                       width: "40px",
// //                       height: "40px",
// //                       borderRadius: "50%",
// //                       backgroundColor: "#006b2c",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                       flexShrink: 0,
// //                       boxShadow:
// //                         "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
// //                     }}
// //                   >
// //                     <span
// //                       className="material-symbols-outlined"
// //                       style={{
// //                         color: "#ffffff",
// //                         fontSize: "20px",
// //                         fontVariationSettings: "'FILL' 1",
// //                       }}
// //                     >
// //                       psychology
// //                     </span>
// //                   </div>
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       flexDirection: "column",
// //                       gap: "8px",
// //                       maxWidth: "90%",
// //                       width: "100%",
// //                     }}
// //                   >
// //                     <div
// //                       style={{
// //                         backgroundColor: "#ffffff",
// //                         padding: "24px",
// //                         borderRadius: "16px 16px 16px 4px",
// //                         boxShadow:
// //                           "0 1px 3px rgba(0, 0, 0, 0.05)",
// //                         border: "1px solid rgba(189, 202, 186, 0.3)",
// //                       }}
// //                     >
// //                       {msg.content}
// //                     </div>
// //                     <p
// //                       style={{
// //                         fontSize: "10px",
// //                         color: "#3e4a3d",
// //                         fontWeight: 500,
// //                         marginLeft: "8px",
// //                         textTransform: "uppercase",
// //                         letterSpacing: "0.05em",
// //                       }}
// //                     >
// //                       {msg.timestamp}
// //                     </p>
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <div
// //                   style={{
// //                     display: "flex",
// //                     gap: "24px",
// //                     flexDirection: "row-reverse",
// //                   }}
// //                 >
// //                   <div
// //                     style={{
// //                       width: "40px",
// //                       height: "40px",
// //                       borderRadius: "50%",
// //                       backgroundColor: "#cbdbf5",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                       flexShrink: 0,
// //                       overflow: "hidden",
// //                       border: "1px solid rgba(189, 202, 186, 0.5)",
// //                     }}
// //                   >
// //                     <img
// //                       style={{
// //                         width: "100%",
// //                         height: "100%",
// //                         objectFit: "cover",
// //                       }}
// //                       alt="User"
// //                       src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnUpbxsyCXjZNafL3fmGkjcZfmMKLdbGNge86laiwfUzo2PqXpFvGEyaLmcIfEgM0BqOb1v49rxFryP38Nh1NE7iXVLMtHwmRKhfV1kWBaMU23M6vVRavjjwq_paTkupFoWndJBE2TZUihnNX0joDBp56OwUW6HfqtNCE85DrAo9sbVGDx5ktEJtqRQJ_FcT6YdDDiSXhJ8lp9jx5ul0A3STy85ktl5wgGnllbVO1feF8wp2twdBAhPATbb7n7FFoJwqZWIBo1OEpx"
// //                     />
// //                   </div>
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       flexDirection: "column",
// //                       gap: "8px",
// //                       maxWidth: "80%",
// //                     }}
// //                   >
// //                     <div
// //                       style={{
// //                         backgroundColor: "#213145",
// //                         padding: "24px",
// //                         borderRadius: "16px 16px 4px 16px",
// //                         boxShadow:
// //                           "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
// //                       }}
// //                     >
// //                       {msg.content}
// //                     </div>
// //                     <p
// //                       style={{
// //                         fontSize: "10px",
// //                         color: "#3e4a3d",
// //                         fontWeight: 500,
// //                         marginRight: "8px",
// //                         textAlign: "right",
// //                         textTransform: "uppercase",
// //                         letterSpacing: "0.05em",
// //                       }}
// //                     >
// //                       {msg.timestamp}
// //                     </p>
// //                   </div>
// //                 </div>
// //               )}
// //             </div>
// //           ))}
// //           <div ref={chatEndRef} />
// //         </div>
// //       </section>

// //       {/* Input Area */}
// //       <footer
// //         style={{
// //           padding: "0 24px 24px 24px",
// //           backgroundColor: "rgba(248, 249, 255, 0.8)",
// //           backdropFilter: "blur(12px)",
// //         }}
// //       >
// //         <div
// //           style={{
// //             maxWidth: "896px",
// //             margin: "0 auto",
// //             display: "flex",
// //             flexDirection: "column",
// //             gap: "24px",
// //           }}
// //         >
// //           {/* Quick Actions */}
// //           <div
// //             style={{
// //               display: "flex",
// //               gap: "8px",
// //               overflowX: "auto",
// //               paddingBottom: "8px",
// //             }}
// //           >
// //             {quickActions.map((action) => (
// //               <button
// //                 key={action.label}
// //                 onClick={() => {
// //                   setInputValue(action.query);
// //                   textareaRef.current?.focus();
// //                 }}
// //                 style={{
// //                   whiteSpace: "nowrap",
// //                   padding: "8px 16px",
// //                   backgroundColor: "#ffffff",
// //                   border: "1px solid rgba(189, 202, 186, 0.5)",
// //                   borderRadius: "9999px",
// //                   fontSize: "14px",
// //                   lineHeight: "20px",
// //                   letterSpacing: "0.01em",
// //                   fontWeight: 500,
// //                   fontFamily: "'Geist', sans-serif",
// //                   color: "#3e4a3d",
// //                   cursor: "pointer",
// //                   display: "flex",
// //                   alignItems: "center",
// //                   gap: "8px",
// //                   transition: "background-color 0.2s",
// //                   flexShrink: 0,
// //                 }}
// //               >
// //                 <span
// //                   className="material-symbols-outlined"
// //                   style={{ fontSize: "14px" }}
// //                 >
// //                   {action.icon}
// //                 </span>
// //                 {action.label}
// //               </button>
// //             ))}
// //           </div>

// //           {/* Main Input */}
// //           <div style={{ position: "relative" }}>
// //             <div
// //               style={{
// //                 display: "flex",
// //                 alignItems: "flex-end",
// //                 gap: "8px",
// //                 backgroundColor: "#ffffff",
// //                 border: "1px solid rgba(189, 202, 186, 0.8)",
// //                 borderRadius: "24px",
// //                 padding: "8px",
// //                 boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
// //                 transition: "all 0.2s",
// //               }}
// //             >
// //               <button
// //                 style={{
// //                   padding: "12px",
// //                   backgroundColor: "transparent",
// //                   border: "none",
// //                   cursor: "pointer",
// //                   color: "#3e4a3d",
// //                   flexShrink: 0,
// //                   transition: "color 0.2s",
// //                 }}
// //               >
// //                 <span className="material-symbols-outlined">attach_file</span>
// //               </button>
// //               <textarea
// //                 ref={textareaRef}
// //                 value={inputValue}
// //                 onChange={(e) => setInputValue(e.target.value)}
// //                 onInput={handleTextareaInput}
// //                 onKeyDown={handleKeyDown}
// //                 placeholder="Ask Treasurer AI anything about your group finances..."
// //                 rows={1}
// //                 style={{
// //                   flex: 1,
// //                   backgroundColor: "transparent",
// //                   border: "none",
// //                   outline: "none",
// //                   padding: "12px 0",
// //                   fontSize: "16px",
// //                   lineHeight: "24px",
// //                   fontFamily: "'Inter', sans-serif",
// //                   resize: "none",
// //                   maxHeight: "128px",
// //                 }}
// //               />
// //               <button
// //                 onClick={handleSend}
// //                 style={{
// //                   padding: "12px",
// //                   backgroundColor: "#006b2c",
// //                   color: "#ffffff",
// //                   borderRadius: "16px",
// //                   border: "none",
// //                   cursor: "pointer",
// //                   boxShadow:
// //                     "0 4px 6px -1px rgba(0, 107, 44, 0.2)",
// //                   flexShrink: 0,
// //                   transition: "all 0.2s",
// //                 }}
// //               >
// //                 <span
// //                   className="material-symbols-outlined"
// //                   style={{ fontVariationSettings: "'FILL' 1" }}
// //                 >
// //                   send
// //                 </span>
// //               </button>
// //             </div>
// //           </div>

// //           <p
// //             style={{
// //               textAlign: "center",
// //               fontSize: "10px",
// //               color: "#3e4a3d",
// //               fontWeight: 500,
// //               textTransform: "uppercase",
// //               letterSpacing: "0.1em",
// //               paddingBottom: "8px",
// //             }}
// //           >
// //             Treasurer AI is powered by{" "}
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>
// //               SafeGuard 2.0
// //             </span>{" "}
// //             Banking Protocols
// //           </p>
// //         </div>
// //       </footer>
// //     </div>
// //   );
// // }

// // /* ===========================
// //    REPORT CARD
// //    =========================== */
// // function ReportCard() {
// //   const weeks = [
// //     { label: "WK1", actual: 85, height: 60 },
// //     { label: "WK2", actual: 90, height: 75 },
// //     { label: "WK3", actual: 95, height: 90 },
// //     { label: "WK4", actual: 70, height: 85 },
// //   ];

// //   return (
// //     <div className="space-y-lg">
// //       <div
// //         style={{
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent: "space-between",
// //         }}
// //       >
// //         <div>
// //           <h3
// //             style={{
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 700,
// //               fontFamily: "'Geist', sans-serif",
// //               color: "#0b1c30",
// //             }}
// //           >
// //             June Financial Summary
// //           </h3>
// //           <p style={{ fontSize: "10px", color: "#3e4a3d" }}>
// //             Strategic Growth Fund • Generated on Jun 28
// //           </p>
// //         </div>
// //         <div style={{ display: "flex", gap: "8px" }}>
// //           <button
// //             style={{
// //               padding: "8px",
// //               borderRadius: "8px",
// //               border: "1px solid rgba(189, 202, 186, 0.3)",
// //               backgroundColor: "transparent",
// //               cursor: "pointer",
// //             }}
// //           >
// //             <span
// //               className="material-symbols-outlined"
// //               style={{ fontSize: "14px" }}
// //             >
// //               download
// //             </span>
// //           </button>
// //           <button
// //             style={{
// //               padding: "8px",
// //               borderRadius: "8px",
// //               border: "1px solid rgba(189, 202, 186, 0.3)",
// //               backgroundColor: "transparent",
// //               cursor: "pointer",
// //             }}
// //           >
// //             <span
// //               className="material-symbols-outlined"
// //               style={{ fontSize: "14px" }}
// //             >
// //               share
// //             </span>
// //           </button>
// //         </div>
// //       </div>

// //       {/* Chart */}
// //       <div
// //         style={{
// //           position: "relative",
// //           height: "256px",
// //           width: "100%",
// //           backgroundColor: "#ffffff",
// //           borderRadius: "12px",
// //           border: "1px solid rgba(189, 202, 186, 0.1)",
// //           padding: "24px",
// //           overflow: "hidden",
// //         }}
// //       >
// //         {/* SVG Background */}
// //         <div
// //           style={{
// //             position: "absolute",
// //             inset: 0,
// //             opacity: 0.1,
// //             pointerEvents: "none",
// //           }}
// //         >
// //           <svg
// //             width="100%"
// //             height="100%"
// //             preserveAspectRatio="none"
// //             viewBox="0 0 100 100"
// //           >
// //             <path d="M0 100 L0 80 Q 25 70 50 85 T 100 60 L 100 100 Z" fill="url(#gradient)" />
// //             <defs>
// //               <linearGradient
// //                 id="gradient"
// //                 x1="0%"
// //                 y1="0%"
// //                 x2="0%"
// //                 y2="100%"
// //               >
// //                 <stop
// //                   offset="0%"
// //                   style={{ stopColor: "rgb(0,107,44)", stopOpacity: 1 }}
// //                 />
// //                 <stop
// //                   offset="100%"
// //                   style={{ stopColor: "rgb(0,107,44)", stopOpacity: 0 }}
// //                 />
// //               </linearGradient>
// //             </defs>
// //           </svg>
// //         </div>

// //         <div
// //           style={{
// //             position: "relative",
// //             zIndex: 10,
// //             height: "100%",
// //             display: "flex",
// //             flexDirection: "column",
// //             justifyContent: "space-between",
// //           }}
// //         >
// //           <div
// //             style={{
// //               display: "flex",
// //               justifyContent: "space-between",
// //               alignItems: "flex-start",
// //             }}
// //           >
// //             <div>
// //               <span
// //                 style={{
// //                   fontSize: "10px",
// //                   color: "#3e4a3d",
// //                   fontWeight: 700,
// //                   textTransform: "uppercase",
// //                 }}
// //               >
// //                 Total Equity
// //               </span>
// //               <div
// //                 style={{
// //                   fontSize: "24px",
// //                   lineHeight: "32px",
// //                   letterSpacing: "-0.01em",
// //                   fontWeight: 700,
// //                   color: "#006b2c",
// //                 }}
// //               >
// //                 $412,850.12
// //               </div>
// //               <div
// //                 style={{
// //                   display: "flex",
// //                   alignItems: "center",
// //                   gap: "4px",
// //                   color: "#006b2c",
// //                 }}
// //               >
// //                 <span
// //                   className="material-symbols-outlined"
// //                   style={{ fontSize: "12px" }}
// //                 >
// //                   trending_up
// //                 </span>
// //                 <span style={{ fontSize: "10px", fontWeight: 700 }}>
// //                   +12.4% vs May
// //                 </span>
// //               </div>
// //             </div>
// //             <div style={{ display: "flex", gap: "8px" }}>
// //               <div
// //                 style={{
// //                   display: "flex",
// //                   alignItems: "center",
// //                   gap: "4px",
// //                 }}
// //               >
// //                 <div
// //                   style={{
// //                     width: "8px",
// //                     height: "8px",
// //                     borderRadius: "50%",
// //                     backgroundColor: "#006b2c",
// //                   }}
// //                 />
// //                 <span style={{ fontSize: "10px", fontWeight: 500 }}>
// //                   Actual
// //                 </span>
// //               </div>
// //               <div
// //                 style={{
// //                   display: "flex",
// //                   alignItems: "center",
// //                   gap: "4px",
// //                 }}
// //               >
// //                 <div
// //                   style={{
// //                     width: "8px",
// //                     height: "8px",
// //                     borderRadius: "50%",
// //                     backgroundColor: "#cbdbf5",
// //                   }}
// //                 />
// //                 <span style={{ fontSize: "10px", fontWeight: 500 }}>
// //                   Projected
// //                 </span>
// //               </div>
// //             </div>
// //           </div>

// //           {/* Bars */}
// //           <div
// //             style={{
// //               width: "100%",
// //               display: "flex",
// //               alignItems: "flex-end",
// //               justifyContent: "space-between",
// //               gap: "16px",
// //               padding: "0 8px",
// //               height: "128px",
// //             }}
// //           >
// //             {weeks.map((week) => (
// //               <div
// //                 key={week.label}
// //                 style={{
// //                   flex: 1,
// //                   backgroundColor: "rgba(203, 219, 245, 0.4)",
// //                   borderRadius: "8px 8px 0 0",
// //                   height: `${week.height}%`,
// //                   position: "relative",
// //                 }}
// //               >
// //                 <div
// //                   style={{
// //                     position: "absolute",
// //                     bottom: 0,
// //                     left: 0,
// //                     right: 0,
// //                     borderRadius: "8px 8px 0 0",
// //                     height: `${week.actual}%`,
// //                     backgroundColor:
// //                       week.label === "WK4"
// //                         ? "#006b2c"
// //                         : week.label === "WK3"
// //                         ? "rgba(0, 107, 44, 0.4)"
// //                         : "rgba(0, 107, 44, 0.2)",
// //                     transition: "all 1s",
// //                   }}
// //                 />
// //                 <span
// //                   style={{
// //                     position: "absolute",
// //                     bottom: "-24px",
// //                     left: "50%",
// //                     transform: "translateX(-50%)",
// //                     fontSize: "10px",
// //                     fontWeight: 700,
// //                     color: "#3e4a3d",
// //                   }}
// //                 >
// //                   {week.label}
// //                 </span>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       </div>

// //       {/* Summary Cards */}
// //       <div
// //         style={{
// //           display: "grid",
// //           gridTemplateColumns: "repeat(3, 1fr)",
// //           gap: "24px",
// //           paddingTop: "8px",
// //         }}
// //       >
// //         {[
// //           { label: "Contributions", value: "$82,000" },
// //           { label: "Investments", value: "$320,500" },
// //           { label: "Reserved", value: "$10,350" },
// //         ].map((item) => (
// //           <div
// //             key={item.label}
// //             style={{
// //               padding: "12px",
// //               backgroundColor: "#eff4ff",
// //               borderRadius: "12px",
// //             }}
// //           >
// //             <p
// //               style={{
// //                 fontSize: "10px",
// //                 color: "#3e4a3d",
// //                 fontWeight: 700,
// //                 textTransform: "uppercase",
// //               }}
// //             >
// //               {item.label}
// //             </p>
// //             <p
// //               style={{
// //                 fontSize: "14px",
// //                 lineHeight: "20px",
// //                 letterSpacing: "0.01em",
// //                 fontWeight: 700,
// //                 fontFamily: "'Geist', sans-serif",
// //                 color: "#0b1c30",
// //               }}
// //             >
// //               {item.value}
// //             </p>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // }