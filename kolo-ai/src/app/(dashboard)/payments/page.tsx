"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function PaymentsContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const groupId = searchParams.get("groupId") || "";
  const urlAmount = Number(searchParams.get("amount")) || 0;
  const hasTrigger = !!groupId;

  // Payment states
  const [paymentStep, setPaymentStep] = useState<"select" | "details" | "processing" | "success">("select");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
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

  const fetchHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: txData } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    const { data: contribData } = await supabase.from("contributions").select("*, groups(name)").eq("user_id", user.id).order("created_at", { ascending: false });
    setTransactions(txData || []);
    setContributions(contribData || []);
    setTotalSaved((contribData || []).filter((c: any) => c.status === "completed").reduce((s: number, c: any) => s + c.amount, 0));
    setPendingAmount((contribData || []).filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount, 0));
    setHistoryLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (groupId) {
      supabase.from("groups").select("*").eq("id", groupId).single().then(({ data }) => {
        if (data) { setGroup(data); setAmount(data.contribution_amount || urlAmount || 50000); }
      });
    }
  }, [groupId, supabase, urlAmount]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, paymentStep]);

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

  // 🔥 TEST WEBHOOK — Simulates Monnify confirming the payment
  const triggerTestWebhook = async () => {
    setPaymentStep("processing");
    
    setTimeout(async () => {
      try {
        await fetch("/api/monnify/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testMode: true,
            paymentReference: transactionRef,
            groupId: groupId,
            amount: amount,
          }),
        });
        
        setTimeout(() => {
          setPaymentStep("success");
          fetchHistory();
        }, 1000);
      } catch (err) {
        console.error("Webhook error:", err);
        setTimeout(() => setPaymentStep("success"), 2000);
      }
    }, 2000);
  };

  const paymentMethods = [
    { id: "transfer", icon: "account_balance", title: "Bank Transfer", desc: "Get virtual account details to transfer from your bank app", tag: "Recommended", color: "#006b2c" },
    { id: "card", icon: "credit_card", title: "Debit/Credit Card", desc: "Pay instantly with your Mastercard, Visa, or Verve card", tag: "Instant", color: "#825100" },
    { id: "ussd", icon: "smartphone", title: "USSD Transfer", desc: "Dial a code from your phone to complete payment", tag: "No Internet", color: "#565e74" },
    { id: "qr", icon: "qr_code", title: "QR Code Payment", desc: "Scan QR code with your banking app", tag: "Quick", color: "#653e00" },
  ];

  const isMakingPayment = hasTrigger && paymentStep !== "success";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* ================================================================ */}
      {/* PAYMENT FLOW — Only when triggered from a group */}
      {/* ================================================================ */}
      {hasTrigger && (
        <div style={{ marginBottom: "32px" }}>
          <Link href={`/groups/${groupId}`} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", marginBottom: "24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span> Back to {group?.name || "Group"}
          </Link>

          {/* STEP 1: SELECT METHOD */}
          {paymentStep === "select" && (
            <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "40px", maxWidth: "560px" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #006b2c, #00873a)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(0,107,44,0.2)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "36px" }}>account_balance_wallet</span>
                </div>
                <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#0b1c30", marginBottom: "4px" }}>Make Contribution</h2>
                <p style={{ color: "#565e74", fontSize: "15px" }}>{group?.name || "Savings Group"}</p>
              </div>

              {/* Monnify Branding */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
                <span style={{ fontSize: "11px", color: "#6e7b6c", fontWeight: 500 }}>Payments powered by</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8f9ff", padding: "4px 10px", borderRadius: "6px" }}>
                  <img src="https://monnify.com/wp-content/uploads/2023/05/Monnify-Logo-1.svg" alt="Monnify" style={{ height: "16px", opacity: 0.8 }} />
                </div>
              </div>

              {/* Amount Card */}
              <div style={{ background: "linear-gradient(135deg, #006b2c 0%, #0b5c2a 50%, #00873a 100%)", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", bottom: "-20px", left: "-20px", width: "80px", height: "80px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
                <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", position: "relative" }}>Contribution Amount</p>
                <p style={{ fontSize: "40px", fontWeight: 800, color: "#fff", position: "relative", letterSpacing: "-0.02em" }}>{formatNaira(amount)}</p>
              </div>

              {/* Payment Methods */}
              <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Select Payment Method</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {paymentMethods.map((method) => (
                  <button key={method.id} onClick={() => setSelectedMethod(method.id)}
                    style={{
                      padding: "18px 20px", borderRadius: "12px",
                      border: selectedMethod === method.id ? `2px solid ${method.color}` : "1px solid rgba(189,202,186,0.3)",
                      background: selectedMethod === method.id ? `${method.color}08` : "#fafbfc",
                      cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "16px",
                      transition: "all 0.2s ease", position: "relative",
                    }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: selectedMethod === method.id ? `${method.color}15` : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: method.color, fontSize: "24px" }}>{method.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontWeight: 600, fontSize: "15px", color: "#0b1c30" }}>{method.title}</span>
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: `${method.color}12`, color: method.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{method.tag}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6e7b6c", margin: 0 }}>{method.desc}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <span className="material-symbols-outlined" style={{ color: method.color, fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              <button onClick={createVirtualAccount} disabled={!selectedMethod || paymentLoading}
                style={{ width: "100%", padding: "18px", background: selectedMethod ? "linear-gradient(135deg, #006b2c, #00873a)" : "#e5eeff", color: selectedMethod ? "#fff" : "#6e7b6c", borderRadius: "12px", border: "none", cursor: selectedMethod ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "16px", boxShadow: selectedMethod ? "0 8px 24px rgba(0,107,44,0.25)" : "none", transition: "all 0.3s ease" }}>
                {paymentLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite", fontSize: "20px" }}>sync</span> Generating Account...
                  </span>
                ) : "Proceed to Payment"}
              </button>
            </div>
          )}

          {/* STEP 2: PAYMENT DETAILS */}
          {paymentStep === "details" && virtualAccount && (
            <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "40px", maxWidth: "560px" }}>
              {/* Monnify Logo */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "24px", padding: "8px 16px", background: "#f8f9ff", borderRadius: "20px", width: "fit-content", margin: "0 auto 24px" }}>
                <span style={{ fontSize: "11px", color: "#6e7b6c", fontWeight: 500 }}>Secured by</span>
                <img src="https://monnify.com/wp-content/uploads/2023/05/Monnify-Logo-1.svg" alt="Monnify" style={{ height: "14px" }} />
              </div>

              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div style={{ width: "64px", height: "64px", background: "rgba(0,107,44,0.1)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>account_balance</span>
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 700 }}>Bank Transfer Details</h2>
                <p style={{ color: "#565e74", fontSize: "14px" }}>Transfer exactly {formatNaira(amount)} to the account below</p>
              </div>

              <div style={{ textAlign: "center", marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "12px", border: "1px solid rgba(0,107,44,0.15)" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Amount to Transfer</p>
                <p style={{ fontSize: "28px", fontWeight: 800, color: "#006b2c" }}>{formatNaira(amount)}</p>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "24px", border: "1px solid rgba(189,202,186,0.2)" }}>
                {[
                  { label: "Bank", value: virtualAccount.bankName },
                  { label: "Account Number", value: virtualAccount.accountNumber, copy: true },
                  { label: "Account Name", value: virtualAccount.accountName },
                ].map((row, i) => (
                  <div key={row.label} style={{ padding: i === 0 ? "0 0 16px 0" : i === 1 ? "16px 0" : "16px 0 0 0", borderBottom: i < 2 ? "1px solid rgba(189,202,186,0.15)" : "none" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{row.label}</p>
                    {row.copy ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: "26px", fontWeight: 700, color: "#0b1c30", letterSpacing: "0.06em", fontFamily: "'Geist Mono', monospace" }}>{row.value}</p>
                        <button onClick={() => { navigator.clipboard.writeText(row.value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          style={{ padding: "10px 18px", background: copied ? "#006b2c" : "#fff", color: copied ? "#fff" : "#006b2c", borderRadius: "8px", border: copied ? "none" : "1px solid #006b2c", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "all 0.2s" }}>
                          {copied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: "16px", fontWeight: 600, color: "#0b1c30" }}>{row.value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px", padding: "14px 18px", background: "rgba(130,81,0,0.06)", borderRadius: "10px", display: "flex", alignItems: "flex-start", gap: "10px", border: "1px solid rgba(130,81,0,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#825100", fontSize: "18px", flexShrink: 0 }}>info</span>
                <p style={{ fontSize: "12px", color: "#653e00", lineHeight: 1.5, margin: 0 }}>Transfer the exact amount above. Your contribution will be verified automatically.</p>
              </div>

              <button onClick={triggerTestWebhook}
                style={{ width: "100%", marginTop: "24px", padding: "16px", background: "#006b2c", color: "#fff", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 16px rgba(0,107,44,0.2)" }}>
                I've Made This Transfer
              </button>
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {paymentStep === "processing" && (
            <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "60px 40px", textAlign: "center", maxWidth: "500px" }}>
              <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #00873a, #006b2c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 40px rgba(0,107,44,0.3)", animation: "pulse-emerald 2s ease-in-out infinite" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "44px", color: "#fff", animation: "spin 2s linear infinite" }}>sync</span>
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px", color: "#0b1c30" }}>Verifying Payment</h2>
              <p style={{ color: "#565e74", fontSize: "15px", marginBottom: "28px" }}>Confirming your {formatNaira(amount)} contribution to {group?.name}...</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#006b2c", animation: `pulse ${1 + i * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
              <div style={{ marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: 0.6 }}>
                <span style={{ fontSize: "11px", color: "#6e7b6c" }}>Verified by</span>
                <img src="https://monnify.com/wp-content/uploads/2023/05/Monnify-Logo-1.svg" alt="Monnify" style={{ height: "12px", filter: "grayscale(1)" }} />
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {paymentStep === "success" && (
            <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "60px 40px", textAlign: "center", maxWidth: "500px", marginBottom: "32px" }}>
              <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #006b2c, #00873a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 0 40px rgba(0,107,44,0.3)", animation: "check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#fff" }}>check</span>
              </div>
              <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#0b1c30", marginBottom: "8px" }}>Payment Successful! 🎉</h2>
              <p style={{ color: "#565e74", fontSize: "15px", marginBottom: "8px" }}>
                <strong style={{ color: "#006b2c" }}>{formatNaira(amount)}</strong> has been added to <strong>{group?.name}</strong>
              </p>
              <p style={{ color: "#6e7b6c", fontSize: "13px", marginBottom: "28px" }}>Transaction Ref: {transactionRef?.slice(0, 18)}</p>
              <Link href={`/groups/${groupId}`}
                style={{ display: "inline-block", padding: "16px 40px", background: "linear-gradient(135deg, #006b2c, #00873a)", color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,107,44,0.25)" }}>
                Back to Group →
              </Link>
              <p style={{ fontSize: "11px", color: "#bdcaba", marginTop: "20px" }}>💡 Demo mode: Webhook auto-confirmed this payment</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* HISTORY — Shown when NOT in active payment */}
      {/* ================================================================ */}
      {!isMakingPayment && (
        <div>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 800, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>
              {hasTrigger && paymentStep === "success" ? "Your Payment History" : "Payments & Transactions"}
            </h2>
            <p style={{ color: "#3e4a3d", fontSize: "15px" }}>Track all your contributions and payouts across groups.</p>
          </div>

          {/* Quick Stats */}
          {!historyLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "28px" }}>
              {[
                { label: "Total Contributed", value: formatNaira(totalSaved), color: "#006b2c", icon: "savings", bg: "rgba(0,107,44,0.06)" },
                { label: "Pending", value: formatNaira(pendingAmount), color: "#825100", icon: "schedule", bg: "rgba(130,81,0,0.06)" },
                { label: "Transactions", value: transactions.length.toString(), color: "#565e74", icon: "receipt_long", bg: "rgba(86,94,116,0.06)" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "24px", transition: "transform 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{stat.label}</span>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: "22px" }}>{stat.icon}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: "30px", fontWeight: 800, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Contribution History */}
          <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(189,202,186,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Contribution History</h3>
              <span style={{ fontSize: "12px", color: "#6e7b6c", fontWeight: 500 }}>{contributions.length} records</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {contributions.length === 0 ? (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "12px", color: "#bdcaba" }}>payments</span>
                  <p style={{ color: "#6e7b6c", fontSize: "14px" }}>No contributions yet. Join a group to start saving!</p>
                </div>
              ) : (
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead><tr style={{ backgroundColor: "#f8fafc", fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}><th style={{ padding: "14px 24px" }}>Group</th><th style={{ padding: "14px 24px" }}>Amount</th><th style={{ padding: "14px 24px" }}>Date</th><th style={{ padding: "14px 24px" }}>Status</th><th style={{ padding: "14px 24px" }}>Ref</th></tr></thead>
                  <tbody>
                    {contributions.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.1)", transition: "background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ padding: "14px 24px", fontSize: "14px", fontWeight: 500 }}>{c.groups?.name || "—"}</td>
                        <td style={{ padding: "14px 24px", fontWeight: 600, color: "#006b2c", fontSize: "14px" }}>{formatNaira(c.amount)}</td>
                        <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(c.created_at)}</td>
                        <td style={{ padding: "14px 24px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.status === "completed" ? "#f0fdf4" : "#fefce8", color: c.status === "completed" ? "#006b2c" : "#825100" }}>
                            {c.status === "completed" ? "✓ Completed" : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 24px", fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "#6e7b6c" }}>{c.transaction_ref?.slice(0, 14) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentsContent />
    </Suspense>
  );
}
