"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const groupId = searchParams.get("groupId") || "";
  const urlAmount = Number(searchParams.get("amount")) || 0;
  const hasTrigger = !!groupId; // True if coming from a group

  // Payment states
  const [paymentStep, setPaymentStep] = useState<"select" | "details" | "processing" | "success">("select");
  const [selectedMethod, setSelectedMethod] = useState<"virtual" | "link" | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [group, setGroup] = useState<any>(null);
  const [amount, setAmount] = useState(urlAmount || 50000);

  // History states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [totalSaved, setTotalSaved] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  const formatNaira = (a: number) => `₦${a.toLocaleString("en-NG")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

  // Fetch group if triggered
  useEffect(() => {
    if (groupId) {
      supabase.from("groups").select("*").eq("id", groupId).single().then(({ data }) => {
        if (data) { setGroup(data); setAmount(data.contribution_amount || urlAmount || 50000); }
      });
    }
  }, [groupId]);

  // Always fetch history
  useEffect(() => {
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: txData } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      const { data: contribData } = await supabase.from("contributions").select("*, groups(name)").eq("user_id", user.id).order("created_at", { ascending: false });

      setTransactions(txData || []);
      setContributions(contribData || []);
      setTotalSaved((contribData || []).filter((c: any) => c.status === "completed").reduce((s: number, c: any) => s + c.amount, 0));
      setPendingAmount((contribData || []).filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount, 0));
      setHistoryLoading(false);
    }
    fetchHistory();
  }, [supabase]);

  const createVirtualAccount = async () => {
    setPaymentLoading(true);
    const res = await fetch("/api/monnify/virtual-account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, amount }),
    });
    const data = await res.json();
    if (data.success) { setVirtualAccount(data.account); setTransactionRef(data.reference); setPaymentStep("details"); }
    setPaymentLoading(false);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* ================================================================ */}
      {/* PAYMENT FLOW — Only shown when triggered from a group */}
      {/* ================================================================ */}
      {hasTrigger && paymentStep !== "success" && (
        <div style={{ marginBottom: "32px" }}>
          <Link href={`/groups/${groupId}`} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", marginBottom: "24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span> Back to {group?.name || "Group"}
          </Link>

          {paymentStep === "select" && (
            <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "32px", maxWidth: "500px" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ width: "56px", height: "56px", backgroundColor: "rgba(0,107,44,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "28px" }}>account_balance_wallet</span>
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 600 }}>Make Contribution</h2>
                <p style={{ color: "#565e74", fontSize: "14px" }}>{group?.name || "Savings Group"}</p>
              </div>

              <div style={{ padding: "20px", borderRadius: "8px", background: "linear-gradient(135deg, #006b2c, #00873a)", color: "#fff", textAlign: "center", marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "4px" }}>Amount</p>
                <p style={{ fontSize: "28px", fontWeight: 700 }}>{formatNaira(amount)}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <button onClick={() => setSelectedMethod("virtual")}
                  style={{ padding: "16px", borderRadius: "8px", border: selectedMethod === "virtual" ? "2px solid #006b2c" : "1px solid rgba(189,202,186,0.3)", background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>account_balance</span>
                  <div><p style={{ fontWeight: 600, fontSize: "14px" }}>Bank Transfer</p><p style={{ fontSize: "12px", color: "#6e7b6c" }}>Get virtual account details</p></div>
                </button>
                <button onClick={() => setSelectedMethod("link")}
                  style={{ padding: "16px", borderRadius: "8px", border: selectedMethod === "link" ? "2px solid #006b2c" : "1px solid rgba(189,202,186,0.3)", background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>link</span>
                  <div><p style={{ fontWeight: 600, fontSize: "14px" }}>Card / USSD</p><p style={{ fontSize: "12px", color: "#6e7b6c" }}>Pay instantly online</p></div>
                </button>
              </div>

              <button onClick={createVirtualAccount} disabled={!selectedMethod || paymentLoading}
                style={{ width: "100%", padding: "16px", backgroundColor: selectedMethod ? "#006b2c" : "#d3e4fe", color: selectedMethod ? "#fff" : "#6e7b6c", borderRadius: "8px", border: "none", cursor: selectedMethod ? "pointer" : "not-allowed", fontWeight: 600, fontSize: "15px" }}>
                {paymentLoading ? "Generating..." : "Proceed to Payment"}
              </button>
            </div>
          )}

          {paymentStep === "details" && virtualAccount && (
            <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "32px", maxWidth: "500px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", marginBottom: "20px" }}>Bank Transfer Details</h2>
              <div style={{ backgroundColor: "#eff4ff", padding: "20px", borderRadius: "12px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: "#6e7b6c" }}>BANK</p><p style={{ fontWeight: 600, marginBottom: "12px" }}>{virtualAccount.bankName}</p>
                <p style={{ fontSize: "12px", color: "#6e7b6c" }}>ACCOUNT NUMBER</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: 700 }}>{virtualAccount.accountNumber}</p>
                  <button onClick={() => { navigator.clipboard.writeText(virtualAccount.accountNumber); setCopied(true); }}
                    style={{ padding: "8px 16px", backgroundColor: "#006b2c", color: "#fff", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px" }}>{copied ? "Copied!" : "Copy"}</button>
                </div>
                <p style={{ fontSize: "12px", color: "#6e7b6c", marginTop: "12px" }}>ACCOUNT NAME</p><p style={{ fontWeight: 600 }}>{virtualAccount.accountName}</p>
              </div>
              <button onClick={() => { setPaymentStep("processing"); setTimeout(() => setPaymentStep("success"), 3000); }}
                style={{ width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>I've Made This Transfer</button>
              <button onClick={() => setPaymentStep("select")} style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "#6e7b6c", cursor: "pointer", fontSize: "14px" }}>Back</button>
            </div>
          )}

          {paymentStep === "processing" && (
            <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "48px 32px", textAlign: "center", maxWidth: "500px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#00873a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", animation: "pulse-emerald 2s infinite" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#fff" }}>sync</span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Verifying Payment...</h2>
              <p style={{ color: "#565e74", fontSize: "14px" }}>Confirming your {formatNaira(amount)} contribution</p>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {hasTrigger && paymentStep === "success" && (
        <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "48px 32px", textAlign: "center", maxWidth: "500px", marginBottom: "32px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 0 30px rgba(0,107,44,0.2)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#fff" }}>check</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Payment Successful!</h2>
          <p style={{ color: "#565e74", fontSize: "14px", marginBottom: "24px" }}>{formatNaira(amount)} added to {group?.name}</p>
          <Link href={`/groups/${groupId}`}
            style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#006b2c", color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "15px", textDecoration: "none" }}>
            Back to Group →
          </Link>
        </div>
      )}

      {/* ================================================================ */}
      {/* TRANSACTION HISTORY — Always shown */}
      {/* ================================================================ */}
      <div>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>
            {hasTrigger ? "Your Payment History" : "Payments & Transactions"}
          </h2>
          <p style={{ color: "#3e4a3d", fontSize: "14px" }}>Track all your contributions and payouts across groups.</p>
        </div>

        {/* Quick Stats */}
        {!historyLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "32px" }}>
            {[
              { label: "Total Contributed", value: formatNaira(totalSaved), color: "#006b2c", icon: "savings" },
              { label: "Pending", value: formatNaira(pendingAmount), color: "#825100", icon: "schedule" },
              { label: "Transactions", value: transactions.length.toString(), color: "#565e74", icon: "receipt_long" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{stat.label}</span>
                  <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: "22px" }}>{stat.icon}</span>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: stat.color, marginTop: "8px" }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Contribution History */}
        <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(189,202,186,0.3)", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Contribution History</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            {contributions.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>payments</span>
                <p style={{ fontSize: "14px" }}>No contributions yet.</p>
              </div>
            ) : (
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead><tr style={{ backgroundColor: "#eff4ff", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", textTransform: "uppercase" }}><th style={{ padding: "14px 24px" }}>Group</th><th style={{ padding: "14px 24px" }}>Amount</th><th style={{ padding: "14px 24px" }}>Date</th><th style={{ padding: "14px 24px" }}>Status</th><th style={{ padding: "14px 24px" }}>Ref</th></tr></thead>
                <tbody>
                  {contributions.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.2)" }}>
                      <td style={{ padding: "14px 24px", fontSize: "14px" }}>{c.groups?.name || "—"}</td>
                      <td style={{ padding: "14px 24px", fontWeight: 600, color: "#006b2c" }}>{formatNaira(c.amount)}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(c.created_at)}</td>
                      <td style={{ padding: "14px 24px" }}><span style={{ padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, backgroundColor: c.status === "completed" ? "rgba(0,107,44,0.1)" : "#cbdbf5", color: c.status === "completed" ? "#006b2c" : "#3f465c", textTransform: "uppercase" }}>{c.status}</span></td>
                      <td style={{ padding: "14px 24px", fontFamily: "monospace", fontSize: "11px", color: "#6e7b6c" }}>{c.transaction_ref?.slice(0, 14) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px rgba(15,23,42,0.04)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(189,202,186,0.3)", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Transaction History</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            {transactions.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}><span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>receipt_long</span><p style={{ fontSize: "14px" }}>No transactions yet.</p></div>
            ) : (
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead><tr style={{ backgroundColor: "#eff4ff", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", textTransform: "uppercase" }}><th style={{ padding: "14px 24px" }}>Type</th><th style={{ padding: "14px 24px" }}>Ref</th><th style={{ padding: "14px 24px" }}>Amount</th><th style={{ padding: "14px 24px" }}>Date</th><th style={{ padding: "14px 24px" }}>Status</th></tr></thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.2)" }}>
                      <td style={{ padding: "14px 24px", fontSize: "14px", textTransform: "capitalize" }}>{tx.type}</td>
                      <td style={{ padding: "14px 24px", fontFamily: "monospace", fontSize: "11px", color: "#6e7b6c" }}>{tx.monnify_ref?.slice(0, 14) || "—"}</td>
                      <td style={{ padding: "14px 24px", fontWeight: 600 }}>{formatNaira(tx.amount)}</td>
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(tx.created_at)}</td>
                      <td style={{ padding: "14px 24px" }}><span style={{ padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, backgroundColor: tx.status === "completed" ? "rgba(0,107,44,0.1)" : "#cbdbf5", color: tx.status === "completed" ? "#006b2c" : "#3f465c", textTransform: "uppercase" }}>{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}