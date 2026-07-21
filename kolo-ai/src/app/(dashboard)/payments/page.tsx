
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type PaymentStep = "select" | "details" | "processing" | "success";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PaymentsPageFallback />}>
      <PaymentsPageContent />
    </Suspense>
  );
}

function PaymentsPageFallback() {
  return <div style={{ minHeight: "100vh", backgroundColor: "#f8f9ff" }} />;
}

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const groupId = searchParams.get("groupId") || "";
  const amount = Number(searchParams.get("amount")) || 50000;

  const [step, setStep] = useState<PaymentStep>("select");
  const [selectedMethod, setSelectedMethod] = useState<"virtual" | "link" | null>(null);
  const [copied, setCopied] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  // Fetch group and user data
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");

      if (groupId) {
        const { data: groupData } = await supabase.from("groups").select("*").eq("id", groupId).single();
        if (groupData) setGroup(groupData);
      }
    }
    fetchData();
  }, [groupId, supabase, router]);

  // Create virtual account via Monnify API
  const createVirtualAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/monnify/virtual-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, amount }),
      });
      const data = await response.json();
      if (data.success) {
        setVirtualAccount(data.account);
        setTransactionRef(data.reference);
        setStep("details");
      }
    } catch (err) {
      console.error("Failed to create virtual account:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create payment link via Monnify API
  const createPaymentLink = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/monnify/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, amount }),
      });
      const data = await response.json();
      if (data.success) {
        setPaymentLink(data.checkoutUrl);
        setTransactionRef(data.reference);
        // Open Monnify checkout in new tab
        window.open(data.checkoutUrl, "_blank");
        setStep("processing");
        // Poll for payment status
        startPolling(data.reference);
      }
    } catch (err) {
      console.error("Failed to create payment link:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for payment confirmation
  const startPolling = (ref: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/monnify/verify?reference=${ref}`);
      const data = await response.json();
      if (data.status === "SUCCESS" || data.status === "completed") {
        clearInterval(interval);
        setStep("success");
      }
    }, 5000);

    // Stop after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const handleProceed = () => {
    if (selectedMethod === "virtual") {
      createVirtualAccount();
    } else if (selectedMethod === "link") {
      createPaymentLink();
    }
  };

  const handleConfirmTransfer = () => {
    setStep("processing");
    // Start polling
    startPolling(transactionRef);
  };

  const formatNaira = (amt: number) => `₦${amt.toLocaleString("en-NG")}`;

  const handleCopyAccount = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9ff", fontFamily: "'Inter', sans-serif" }}>
      {step === "select" && (
        <PaymentSelect
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          onProceed={handleProceed}
          groupName={group?.name || "Savings Group"}
          amount={amount}
          formatNaira={formatNaira}
          loading={loading}
        />
      )}
      {step === "details" && (
        <PaymentDetails
          copied={copied}
          onCopy={handleCopyAccount}
          onConfirm={handleConfirmTransfer}
          onBack={() => setStep("select")}
          amount={amount}
          groupName={group?.name || "Savings Group"}
          virtualAccount={virtualAccount}
          formatNaira={formatNaira}
        />
      )}
      {step === "processing" && (
        <PaymentProcessing amount={amount} groupName={group?.name || "the group"} formatNaira={formatNaira} />
      )}
      {step === "success" && (
        <PaymentSuccess amount={amount} groupName={group?.name || "the group"} groupId={groupId} transactionRef={transactionRef} formatNaira={formatNaira} userName={userName} />
      )}
    </div>
  );
}

/* ===================================================================
   SCREEN 1: PAYMENT SELECT
   =================================================================== */
function PaymentSelect({
  selectedMethod, onSelect, onProceed, groupName, amount, formatNaira, loading,
}: {
  selectedMethod: "virtual" | "link" | null;
  onSelect: (m: "virtual" | "link") => void;
  onProceed: () => void;
  groupName: string;
  amount: number;
  formatNaira: (a: number) => string;
  loading: boolean;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "24px 24px 0", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", backgroundColor: "#00873a", borderRadius: "50%", marginBottom: "16px" }}>
              <span className="material-symbols-outlined" style={{ color: "#f7fff2" }}>account_balance_wallet</span>
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#0b1c30", marginBottom: "8px" }}>Make Contribution</h1>
            <p style={{ fontSize: "16px", color: "#565e74" }}>{groupName}</p>
          </div>

          <div style={{ margin: "24px", padding: "24px", borderRadius: "8px", background: "linear-gradient(135deg, #006b2c 0%, #00873a 100%)", color: "#ffffff", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: "-16px", top: "-16px", width: "96px", height: "96px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "50%", filter: "blur(24px)" }} />
            <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", opacity: 0.9, marginBottom: "4px", position: "relative" }}>Contribution Amount</p>
            <h2 style={{ fontSize: "32px", fontWeight: 700, position: "relative" }}>{formatNaira(amount)}</h2>
          </div>

          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#565e74", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: "4px" }}>Select Method</p>

            <button onClick={() => onSelect("virtual")} style={{ width: "100%", textAlign: "left", padding: "24px", borderRadius: "8px", border: selectedMethod === "virtual" ? "2px solid #006b2c" : "2px solid rgba(189, 202, 186, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.5)", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px", color: "#006b2c" }}>
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#0b1c30" }}>Reserved Virtual Account</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, backgroundColor: "#00873a", color: "#f7fff2", padding: "2px 8px", borderRadius: "9999px", fontFamily: "'Geist', sans-serif" }}>Recommended</span>
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#565e74" }}>Generate a permanent account for automated recurring contributions.</p>
                </div>
              </div>
              {selectedMethod === "virtual" && (
                <div style={{ position: "absolute", top: "24px", right: "24px", color: "#006b2c" }}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              )}
            </button>

            <button onClick={() => onSelect("link")} style={{ width: "100%", textAlign: "left", padding: "24px", borderRadius: "8px", border: selectedMethod === "link" ? "2px solid #006b2c" : "2px solid rgba(189, 202, 186, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.5)", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px", color: "#006b2c" }}>
                  <span className="material-symbols-outlined">link</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "#0b1c30", display: "block", marginBottom: "4px" }}>Instant Payment Link</span>
                  <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#565e74" }}>Pay via Card, USSD, or Bank Transfer with Monnify checkout.</p>
                </div>
              </div>
            </button>
          </div>

          <div style={{ padding: "24px", backgroundColor: "#eff4ff", borderTop: "1px solid rgba(189, 202, 186, 0.3)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={onProceed} disabled={!selectedMethod || loading}
              style={{ width: "100%", backgroundColor: selectedMethod && !loading ? "#006b2c" : "#d3e4fe", color: selectedMethod && !loading ? "#ffffff" : "#6e7b6c", fontSize: "18px", fontWeight: 600, padding: "20px", borderRadius: "8px", border: "none", cursor: selectedMethod && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", transition: "all 0.2s" }}>
              {loading ? "Creating Account..." : "Proceed to Payment"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#565e74" }}>lock</span>
              <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#565e74" }}>Secured by Monnify</p>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link href="/dashboard" style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#565e74", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
            Cancel and return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   SCREEN 2: PAYMENT DETAILS
   =================================================================== */
function PaymentDetails({
  copied, onCopy, onConfirm, onBack, amount, groupName, virtualAccount, formatNaira,
}: {
  copied: boolean; onCopy: () => void; onConfirm: () => void; onBack: () => void;
  amount: number; groupName: string; virtualAccount: any; formatNaira: (a: number) => string;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", maxWidth: "1280px", margin: "0 auto", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#565e74", padding: "8px", borderRadius: "50%" }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#006b2c" }}>SaveCircle AI</span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: "96px 16px 128px", maxWidth: "512px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Payment Details</h1>
            <p style={{ color: "#565e74", fontSize: "16px" }}>Transfer the exact amount to the virtual account below.</p>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.8)", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#565e74", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>AMOUNT TO PAY</p>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(amount)}</span>
          </div>

          <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ backgroundColor: "rgba(0, 107, 44, 0.05)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#006b2c", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>Waiting for payment...</span>
              </div>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#565e74" }}>BANK NAME</p>
                  <p style={{ fontSize: "18px", fontWeight: 600 }}>{virtualAccount?.bankName || "Wema Bank"}</p>
                </div>
              </div>

              <div style={{ padding: "16px", backgroundColor: "#eff4ff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(189, 202, 186, 0.2)" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#565e74" }}>ACCOUNT NUMBER</p>
                  <p style={{ fontSize: "28px", fontWeight: 700, color: "#0b1c30", letterSpacing: "0.05em" }}>{virtualAccount?.accountNumber || "8034567890"}</p>
                </div>
                <button onClick={onCopy} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                    <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>{copied ? "COPIED" : "COPY"}</span>
                </button>
              </div>

              <div>
                <p style={{ fontSize: "12px", color: "#565e74" }}>ACCOUNT NAME</p>
                <p style={{ fontSize: "18px", fontWeight: 600 }}>{virtualAccount?.accountName || `SaveCircle / ${groupName}`}</p>
              </div>

              <div style={{ display: "flex", gap: "12px", padding: "16px", backgroundColor: "rgba(130, 81, 0, 0.05)", borderRadius: "8px", border: "1px solid rgba(130, 81, 0, 0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#825100" }}>info</span>
                <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#653e00" }}>Transfer exactly {formatNaira(amount)} to avoid reconciliation delays.</p>
              </div>
            </div>

            <div style={{ padding: "24px", borderTop: "1px solid rgba(189, 202, 186, 0.2)", display: "flex", gap: "12px" }}>
              <button style={{ flex: 1, padding: "12px 16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "8px", fontWeight: 700, fontSize: "14px", fontFamily: "'Geist', sans-serif", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>share</span> SHARE DETAILS
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={onConfirm} style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c", background: "none", border: "none", cursor: "pointer" }}>
              I&apos;ve made this transfer
            </button>
          </div>
        </div>
      </main>

      {copied && (
        <div style={{ position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#213145", color: "#ffffff", padding: "12px 24px", borderRadius: "9999px", zIndex: 100, fontSize: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="material-symbols-outlined" style={{ color: "#62df7d" }}>check_circle</span>
          Account number copied!
        </div>
      )}
    </div>
  );
}

/* ===================================================================
   SCREEN 3: PROCESSING
   =================================================================== */
function PaymentProcessing({ amount, groupName, formatNaira }: { amount: number; groupName: string; formatNaira: (a: number) => string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "40px" }}>
      <div style={{ width: "128px", height: "128px", borderRadius: "50%", backgroundColor: "#00873a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(0, 107, 44, 0.3)", animation: "pulse-emerald 2s ease-in-out infinite" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "64px", color: "#f7fff2", fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Verifying Contribution</h1>
        <p style={{ color: "#565e74" }}>Confirming your {formatNaira(amount)} contribution to {groupName}...</p>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#006b2c", animation: `pulse ${1 + i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   SCREEN 4: SUCCESS
   =================================================================== */
function PaymentSuccess({ amount, groupName, groupId, transactionRef, formatNaira, userName }: {
  amount: number; groupName: string; groupId: string; transactionRef: string; formatNaira: (a: number) => string; userName: string;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", backgroundColor: "#f8f9ff" }}>
      <div style={{ maxWidth: "512px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "40px" }}>
        <div style={{ width: "128px", height: "128px", backgroundColor: "#006b2c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", boxShadow: "0 0 30px rgba(0, 107, 44, 0.2)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "64px" }}>check</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Payment Successful!</h2>
          <p style={{ fontSize: "16px", color: "#565e74" }}>
            Your contribution of <strong>{formatNaira(amount)}</strong> to <strong>{groupName}</strong> has been confirmed.
          </p>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "24px", width: "100%", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)" }}>
          {[
            ["Transaction Ref", transactionRef || "SC-AI-994208311"],
            ["Amount", formatNaira(amount)],
            ["Destination", groupName],
            ["Contributor", userName],
            ["Date", new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
              <span style={{ color: "#565e74", fontSize: "14px" }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>{value}</span>
            </div>
          ))}
        </div>

        <Link href={groupId ? `/groups/${groupId}` : "/dashboard"}
          style={{ width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", fontWeight: 600, fontSize: "16px", textDecoration: "none", textAlign: "center" }}>
          Back to Group →
        </Link>
      </div>
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import Link from "next/link";

// type PaymentStep = "select" | "details" | "processing" | "success";

// export default function PaymentsPage() {
//   const [step, setStep] = useState<PaymentStep>("select");
//   const [selectedMethod, setSelectedMethod] = useState<"virtual" | "link" | null>(null);
//   const [copied, setCopied] = useState(false);

//   const handleCopyAccount = () => {
//     navigator.clipboard.writeText("8034567890");
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2500);
//   };

//   const handleProceed = () => {
//     if (selectedMethod === "virtual") {
//       setStep("details");
//     }
//   };

//   const handleConfirmTransfer = () => {
//     setStep("processing");
//     // Simulate processing → success
//     setTimeout(() => setStep("success"), 3000);
//   };

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         backgroundColor: "#f8f9ff",
//         fontFamily: "'Inter', sans-serif",
//       }}
//     >
//       {step === "select" && (
//         <PaymentSelect
//           selectedMethod={selectedMethod}
//           onSelect={setSelectedMethod}
//           onProceed={handleProceed}
//         />
//       )}
//       {step === "details" && (
//         <PaymentDetails
//           copied={copied}
//           onCopy={handleCopyAccount}
//           onConfirm={handleConfirmTransfer}
//           onBack={() => setStep("select")}
//         />
//       )}
//       {step === "processing" && <PaymentProcessing />}
//       {step === "success" && <PaymentSuccess />}
//     </div>
//   );
// }

// /* ===================================================================
//    SCREEN 1: PAYMENT SELECT (Choose Method)
//    =================================================================== */
// function PaymentSelect({
//   selectedMethod,
//   onSelect,
//   onProceed,
// }: {
//   selectedMethod: "virtual" | "link" | null;
//   onSelect: (m: "virtual" | "link") => void;
//   onProceed: () => void;
// }) {
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "24px",
//       }}
//     >
//       <div style={{ width: "100%", maxWidth: "480px" }}>
//         {/* Modal Card */}
//         <div
//           style={{
//             background: "rgba(255, 255, 255, 0.8)",
//             backdropFilter: "blur(12px)",
//             border: "1px solid #E2E8F0",
//             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//             borderRadius: "12px",
//             overflow: "hidden",
//           }}
//         >
//           {/* Header */}
//           <div
//             style={{
//               padding: "24px 24px 0",
//               textAlign: "center",
//             }}
//           >
//             <div
//               style={{
//                 display: "inline-flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 width: "48px",
//                 height: "48px",
//                 backgroundColor: "#00873a",
//                 borderRadius: "50%",
//                 marginBottom: "16px",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ color: "#f7fff2" }}
//               >
//                 account_balance_wallet
//               </span>
//             </div>
//             <h1
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 color: "#0b1c30",
//                 marginBottom: "8px",
//               }}
//             >
//               Make Contribution
//             </h1>
//             <p
//               style={{
//                 fontSize: "16px",
//                 lineHeight: "24px",
//                 color: "#565e74",
//               }}
//             >
//               Tech Founders Hub
//             </p>
//           </div>

//           {/* Amount Banner */}
//           <div
//             style={{
//               margin: "24px",
//               padding: "24px",
//               borderRadius: "8px",
//               background: "linear-gradient(135deg, #006b2c 0%, #00873a 100%)",
//               color: "#ffffff",
//               textAlign: "center",
//               position: "relative",
//               overflow: "hidden",
//             }}
//           >
//             <div
//               style={{
//                 position: "absolute",
//                 right: "-16px",
//                 top: "-16px",
//                 width: "96px",
//                 height: "96px",
//                 backgroundColor: "rgba(255,255,255,0.1)",
//                 borderRadius: "50%",
//                 filter: "blur(24px)",
//               }}
//             />
//             <p
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 opacity: 0.9,
//                 marginBottom: "4px",
//               }}
//             >
//               Contribution Amount
//             </p>
//             <h2
//               style={{
//                 fontSize: "32px",
//                 lineHeight: "40px",
//                 letterSpacing: "-0.02em",
//                 fontWeight: 700,
//                 fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               ₦50,000.00
//             </h2>
//           </div>

//           {/* Methods */}
//           <div
//             style={{
//               padding: "0 24px 24px",
//               display: "flex",
//               flexDirection: "column",
//               gap: "16px",
//             }}
//           >
//             <p
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#565e74",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//                 paddingLeft: "4px",
//               }}
//             >
//               Select Method
//             </p>

//             {/* Virtual Account */}
//             <button
//               onClick={() => onSelect("virtual")}
//               style={{
//                 width: "100%",
//                 textAlign: "left",
//                 padding: "24px",
//                 borderRadius: "8px",
//                 border:
//                   selectedMethod === "virtual"
//                     ? "2px solid #006b2c"
//                     : "2px solid rgba(189, 202, 186, 0.3)",
//                 backgroundColor: "rgba(255, 255, 255, 0.5)",
//                 cursor: "pointer",
//                 position: "relative",
//                 transition: "all 0.2s",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "flex-start",
//                   gap: "24px",
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "40px",
//                     height: "40px",
//                     borderRadius: "8px",
//                     backgroundColor: "#e5eeff",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     flexShrink: 0,
//                     marginTop: "4px",
//                     color: "#006b2c",
//                   }}
//                 >
//                   <span className="material-symbols-outlined">account_balance</span>
//                 </div>
//                 <div style={{ flex: 1 }}>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: "16px",
//                         fontWeight: 600,
//                         color: "#0b1c30",
//                       }}
//                     >
//                       Reserved Virtual Account
//                     </span>
//                     <span
//                       style={{
//                         fontSize: "12px",
//                         lineHeight: "16px",
//                         letterSpacing: "0.03em",
//                         fontWeight: 600,
//                         fontFamily: "'Geist', sans-serif",
//                         backgroundColor: "#00873a",
//                         color: "#f7fff2",
//                         padding: "2px 8px",
//                         borderRadius: "9999px",
//                       }}
//                     >
//                       Recommended
//                     </span>
//                   </div>
//                   <p
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#565e74",
//                     }}
//                   >
//                     Generate a permanent account for automated recurring
//                     contributions. Fastest settlement.
//                   </p>
//                 </div>
//               </div>
//               {selectedMethod === "virtual" && (
//                 <div
//                   style={{
//                     position: "absolute",
//                     top: "24px",
//                     right: "24px",
//                     color: "#006b2c",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ fontVariationSettings: "'FILL' 1" }}
//                   >
//                     check_circle
//                   </span>
//                 </div>
//               )}
//             </button>

//             {/* Payment Link */}
//             <button
//               onClick={() => onSelect("link")}
//               style={{
//                 width: "100%",
//                 textAlign: "left",
//                 padding: "24px",
//                 borderRadius: "8px",
//                 border:
//                   selectedMethod === "link"
//                     ? "2px solid #006b2c"
//                     : "2px solid rgba(189, 202, 186, 0.3)",
//                 backgroundColor: "rgba(255, 255, 255, 0.5)",
//                 cursor: "pointer",
//                 position: "relative",
//                 transition: "all 0.2s",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "flex-start",
//                   gap: "24px",
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "40px",
//                     height: "40px",
//                     borderRadius: "8px",
//                     backgroundColor: "#e5eeff",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     flexShrink: 0,
//                     marginTop: "4px",
//                     color: "#006b2c",
//                   }}
//                 >
//                   <span className="material-symbols-outlined">link</span>
//                 </div>
//                 <div style={{ flex: 1 }}>
//                   <span
//                     style={{
//                       fontSize: "16px",
//                       fontWeight: 600,
//                       color: "#0b1c30",
//                       display: "block",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     Instant Payment Link
//                   </span>
//                   <p
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#565e74",
//                     }}
//                   >
//                     Pay via Card, USSD, or Bank Transfer. Standard Monnify
//                     checkout experience.
//                   </p>
//                 </div>
//               </div>
//               {selectedMethod === "link" && (
//                 <div
//                   style={{
//                     position: "absolute",
//                     top: "24px",
//                     right: "24px",
//                     color: "#006b2c",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ fontVariationSettings: "'FILL' 1" }}
//                   >
//                     check_circle
//                   </span>
//                 </div>
//               )}
//             </button>
//           </div>

//           {/* Footer */}
//           <div
//             style={{
//               padding: "24px",
//               backgroundColor: "#eff4ff",
//               borderTop: "1px solid rgba(189, 202, 186, 0.3)",
//               display: "flex",
//               flexDirection: "column",
//               gap: "16px",
//             }}
//           >
//             <button
//               onClick={onProceed}
//               disabled={!selectedMethod}
//               style={{
//                 width: "100%",
//                 backgroundColor: selectedMethod ? "#006b2c" : "#d3e4fe",
//                 color: selectedMethod ? "#ffffff" : "#6e7b6c",
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 padding: "24px",
//                 borderRadius: "8px",
//                 border: "none",
//                 cursor: selectedMethod ? "pointer" : "not-allowed",
//                 boxShadow: selectedMethod
//                   ? "0 10px 15px -3px rgba(0, 107, 44, 0.2)"
//                   : "none",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "16px",
//                 transition: "all 0.2s",
//               }}
//             >
//               Proceed to Payment
//               <span className="material-symbols-outlined">arrow_forward</span>
//             </button>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "8px",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{ fontSize: "14px", color: "#565e74" }}
//               >
//                 lock
//               </span>
//               <p
//                 style={{
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   fontFamily: "'Geist', sans-serif",
//                   color: "#565e74",
//                 }}
//               >
//                 Secured by Monnify
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Cancel */}
//         <div style={{ marginTop: "24px", textAlign: "center" }}>
//           <Link
//             href="/dashboard"
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#565e74",
//               textDecoration: "none",
//               display: "inline-flex",
//               alignItems: "center",
//               gap: "8px",
//               transition: "color 0.2s",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "18px" }}
//             >
//               close
//             </span>
//             Cancel and return to Dashboard
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ===================================================================
//    SCREEN 2: PAYMENT DETAILS (Virtual Account)
//    =================================================================== */
// function PaymentDetails({
//   copied,
//   onCopy,
//   onConfirm,
//   onBack,
// }: {
//   copied: boolean;
//   onCopy: () => void;
//   onConfirm: () => void;
//   onBack: () => void;
// }) {
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         display: "flex",
//         flexDirection: "column",
//       }}
//     >
//       {/* Top Bar */}
//       <header
//         style={{
//           backgroundColor: "rgba(248, 249, 255, 0.7)",
//           backdropFilter: "blur(24px)",
//           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//           position: "sticky",
//           top: 0,
//           zIndex: 50,
//           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "16px 24px",
//             maxWidth: "1280px",
//             margin: "0 auto",
//             height: "64px",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//             <button
//               onClick={onBack}
//               style={{
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//                 color: "#565e74",
//                 padding: "8px",
//                 borderRadius: "50%",
//                 transition: "background-color 0.2s",
//               }}
//             >
//               <span className="material-symbols-outlined">arrow_back</span>
//             </button>
//             <span
//               style={{
//                 fontSize: "24px",
//                 fontWeight: 700,
//                 color: "#006b2c",
//               }}
//             >
//               SaveCircle AI
//             </span>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//             <span
//               className="material-symbols-outlined"
//               style={{ color: "#565e74", cursor: "pointer", padding: "8px", borderRadius: "50%" }}
//             >
//               notifications
//             </span>
//             <span
//               className="material-symbols-outlined"
//               style={{ color: "#565e74", cursor: "pointer", padding: "8px", borderRadius: "50%" }}
//             >
//               help_outline
//             </span>
//             <img
//               style={{
//                 width: "32px",
//                 height: "32px",
//                 borderRadius: "50%",
//                 objectFit: "cover",
//                 border: "1px solid rgba(189, 202, 186, 0.3)",
//               }}
//               alt="Profile"
//               src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbVWGlzp2K9PuxIUYY9_8O51VVpHJ8WPVLH6mHwfn1Xw6yqIM8Yc4vw5UCmrp_4PhgwC8Jhn0srqT3CM4rY7Cf3srIMIAfKWg9iHdDGN4YpRQQDq6Rt8S1XL-cqNaa7ge1bWuFrCu3W8-Qd1a0Okg9CUQuud9x4HS4z5OO_hByPCJrkdNA91DWBCqlcEPmrp5pyTD67FCy0-fUdsNthporSbrTShw4vb9GxpcfmCXmabTwEOaoXf5W31NYMtBZwW9PR-SI0-A8RXq9"
//             />
//           </div>
//         </div>
//       </header>

//       {/* Main */}
//       <main
//         style={{
//           flex: 1,
//           padding: "96px 16px 128px",
//           maxWidth: "512px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
//           {/* Header */}
//           <div style={{ textAlign: "center" }}>
//             <h1
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 marginBottom: "8px",
//               }}
//             >
//               Payment Details
//             </h1>
//             <p style={{ color: "#565e74", fontSize: "16px", lineHeight: "24px" }}>
//               Transfer the exact amount to the virtual account below to complete
//               your contribution.
//             </p>
//           </div>

//           {/* Amount */}
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.8)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.8)",
//               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//               borderRadius: "12px",
//               padding: "24px",
//               textAlign: "center",
//             }}
//           >
//             <p
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#565e74",
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//                 marginBottom: "4px",
//               }}
//             >
//               AMOUNT TO PAY
//             </p>
//             <span
//               style={{
//                 fontSize: "32px",
//                 lineHeight: "40px",
//                 letterSpacing: "-0.02em",
//                 fontWeight: 700,
//                 fontFamily: "'Inter', sans-serif",
//                 color: "#006b2c",
//               }}
//             >
//               ₦50,000
//             </span>
//           </div>

//           {/* Bank Details Card */}
//           <div
//             style={{
//               backgroundColor: "#ffffff",
//               border: "1px solid rgba(189, 202, 186, 0.5)",
//               borderRadius: "12px",
//               overflow: "hidden",
//               boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//             }}
//           >
//             {/* Status Bar */}
//             <div
//               style={{
//                 backgroundColor: "rgba(0, 107, 44, 0.05)",
//                 padding: "12px 24px",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//               }}
//             >
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <span
//                   style={{
//                     width: "8px",
//                     height: "8px",
//                     borderRadius: "50%",
//                     backgroundColor: "#006b2c",
//                     animation: "pulse 2s infinite",
//                   }}
//                 />
//                 <span
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 700,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#006b2c",
//                   }}
//                 >
//                   Waiting for payment...
//                 </span>
//               </div>
//               <span
//                 style={{
//                   fontSize: "12px",
//                   color: "#565e74",
//                 }}
//               >
//                 Expires in 29:58
//               </span>
//             </div>

//             <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
//               {/* Bank */}
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                 }}
//               >
//                 <div>
//                   <p style={{ fontSize: "12px", color: "#565e74" }}>BANK NAME</p>
//                   <p style={{ fontSize: "18px", fontWeight: 600, color: "#0b1c30" }}>
//                     Wema Bank / Monnify
//                   </p>
//                 </div>
//                 <div
//                   style={{
//                     width: "48px",
//                     height: "48px",
//                     borderRadius: "8px",
//                     backgroundColor: "#e5eeff",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     overflow: "hidden",
//                   }}
//                 >
//                   <img
//                     style={{ width: "32px", height: "32px", objectFit: "contain" }}
//                     alt="Bank"
//                     src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfHFqU9TF-k9JOb8LqdCjdUXjrGS3W8uos6D_Fbdc6T3KxSVsMupHxT8X3R4pELpMnssQmTrmuQ3ZUEKXuA4no94MFNQv93Xky9r44R94ddK42w2TTinEKfmJtVmZMgct3YXh9Pd2rCysxqOI9KmYtOf8wkZ29JtvsT3cnjVLIhky0Mx82RH9CdtyNOretfWX_OobOXKoGHaEaC7J5gLJo_cvrFN9VFPuCWG2436Pb-lS7YuixEB7pVJ6WW8RXaarXgmDByHAmXZel"
//                   />
//                 </div>
//               </div>

//               {/* Account Number */}
//               <div
//                 style={{
//                   padding: "16px",
//                   backgroundColor: "#eff4ff",
//                   borderRadius: "8px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   border: "1px solid rgba(189, 202, 186, 0.2)",
//                 }}
//               >
//                 <div>
//                   <p style={{ fontSize: "12px", color: "#565e74" }}>
//                     ACCOUNT NUMBER
//                   </p>
//                   <p
//                     style={{
//                       fontSize: "28px",
//                       fontWeight: 700,
//                       color: "#0b1c30",
//                       letterSpacing: "0.05em",
//                     }}
//                   >
//                     8034567890
//                   </p>
//                 </div>
//                 <button
//                   onClick={onCopy}
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     alignItems: "center",
//                     gap: "4px",
//                     background: "none",
//                     border: "none",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: "40px",
//                       height: "40px",
//                       borderRadius: "50%",
//                       backgroundColor: "#006b2c",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       color: "#ffffff",
//                       boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
//                       transition: "transform 0.1s",
//                     }}
//                   >
//                     <span className="material-symbols-outlined">
//                       {copied ? "check" : "content_copy"}
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "12px",
//                       lineHeight: "16px",
//                       letterSpacing: "0.03em",
//                       fontWeight: 700,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#006b2c",
//                     }}
//                   >
//                     {copied ? "COPIED" : "COPY"}
//                   </span>
//                 </button>
//               </div>

//               {/* Account Name */}
//               <div>
//                 <p style={{ fontSize: "12px", color: "#565e74" }}>ACCOUNT NAME</p>
//                 <p
//                   style={{
//                     fontSize: "18px",
//                     lineHeight: "28px",
//                     fontWeight: 600,
//                     color: "#0b1c30",
//                   }}
//                 >
//                   SaveCircle / Tech Founders - Sterling
//                 </p>
//               </div>

//               {/* Info */}
//               <div
//                 style={{
//                   display: "flex",
//                   gap: "12px",
//                   padding: "16px",
//                   backgroundColor: "rgba(130, 81, 0, 0.05)",
//                   borderRadius: "8px",
//                   border: "1px solid rgba(130, 81, 0, 0.1)",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ color: "#825100", flexShrink: 0 }}
//                 >
//                   info
//                 </span>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#653e00",
//                   }}
//                 >
//                   Ensure you transfer exactly ₦50,000 to avoid reconciliation
//                   delays. Your contribution will be verified instantly.
//                 </p>
//               </div>
//             </div>

//             {/* Footer Actions */}
//             <div
//               style={{
//                 padding: "24px",
//                 backgroundColor: "#ffffff",
//                 borderTop: "1px solid rgba(189, 202, 186, 0.2)",
//                 display: "flex",
//                 gap: "12px",
//               }}
//             >
//               <button
//                 style={{
//                   flex: 1,
//                   padding: "12px 16px",
//                   backgroundColor: "#006b2c",
//                   color: "#ffffff",
//                   borderRadius: "8px",
//                   fontWeight: 700,
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontFamily: "'Geist', sans-serif",
//                   border: "none",
//                   cursor: "pointer",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                 }}
//               >
//                 <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
//                   share
//                 </span>
//                 SHARE DETAILS
//               </button>
//               <button
//                 style={{
//                   padding: "12px",
//                   border: "1px solid #6e7b6c",
//                   borderRadius: "8px",
//                   backgroundColor: "transparent",
//                   color: "#565e74",
//                   cursor: "pointer",
//                 }}
//               >
//                 <span className="material-symbols-outlined">more_horiz</span>
//               </button>
//             </div>
//           </div>

//           {/* I've made this transfer */}
//           <div style={{ textAlign: "center" }}>
//             <button
//               onClick={onConfirm}
//               style={{
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 700,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#006b2c",
//                 background: "none",
//                 border: "none",
//                 cursor: "pointer",
//               }}
//             >
//               I&apos;ve made this transfer
//             </button>
//             <p
//               style={{
//                 fontSize: "12px",
//                 color: "#565e74",
//                 marginTop: "16px",
//               }}
//             >
//               Having issues?{" "}
//               <a href="#" style={{ color: "#006b2c", textDecoration: "underline" }}>
//                 Contact Support
//               </a>
//             </p>
//           </div>
//         </div>
//       </main>

//       {/* Toast */}
//       {copied && (
//         <div
//           style={{
//             position: "fixed",
//             top: "80px",
//             left: "50%",
//             transform: "translateX(-50%)",
//             backgroundColor: "#213145",
//             color: "#ffffff",
//             padding: "12px 24px",
//             borderRadius: "9999px",
//             boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//             display: "flex",
//             alignItems: "center",
//             gap: "12px",
//             zIndex: 100,
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ color: "#62df7d" }}
//           >
//             check_circle
//           </span>
//           Account number copied to clipboard
//         </div>
//       )}
//     </div>
//   );
// }

// /* ===================================================================
//    SCREEN 3: PROCESSING (Verification)
//    =================================================================== */
// function PaymentProcessing() {
//   const steps = [
//     { label: "Payment Initiated", detail: "Transaction ID: TXN_99283471", done: true },
//     { label: "Bank Confirmation", detail: "Funds released by Bank of Africa", done: true },
//     { label: "SaveCircle Verification", detail: "Synchronizing with AI compliance ledger...", active: true },
//     { label: "Group Balance Update", detail: "Updating 'Lagos Wealth Circle' balance", done: false },
//   ];

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         display: "flex",
//         flexDirection: "column",
//       }}
//     >
//       {/* Top Bar */}
//       <header
//         style={{
//           backgroundColor: "rgba(248, 249, 255, 0.7)",
//           backdropFilter: "blur(24px)",
//           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//           position: "sticky",
//           top: 0,
//           zIndex: 50,
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "16px 24px",
//             maxWidth: "1280px",
//             margin: "0 auto",
//           }}
//         >
//           <span style={{ fontSize: "24px", fontWeight: 700, color: "#006b2c" }}>
//             SaveCircle AI
//           </span>
//           <div style={{ display: "flex", gap: "16px" }}>
//             <span
//               className="material-symbols-outlined"
//               style={{ color: "#565e74", cursor: "pointer", padding: "8px", borderRadius: "50%" }}
//             >
//               help_outline
//             </span>
//             <span
//               className="material-symbols-outlined"
//               style={{ color: "#565e74", cursor: "pointer", padding: "8px", borderRadius: "50%" }}
//             >
//               close
//             </span>
//           </div>
//         </div>
//       </header>

//       {/* Main */}
//       <main
//         style={{
//           flex: 1,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "24px",
//           position: "relative",
//           overflow: "hidden",
//         }}
//       >
//         {/* Glow */}
//         <div
//           style={{
//             position: "absolute",
//             top: "50%",
//             left: "50%",
//             transform: "translate(-50%, -50%)",
//             width: "600px",
//             height: "600px",
//             backgroundColor: "rgba(0, 107, 44, 0.05)",
//             borderRadius: "50%",
//             filter: "blur(120px)",
//             pointerEvents: "none",
//           }}
//         />

//         <div style={{ width: "100%", maxWidth: "448px", position: "relative", zIndex: 10 }}>
//           {/* Ring */}
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               textAlign: "center",
//               marginBottom: "64px",
//             }}
//           >
//             <div
//               style={{
//                 position: "relative",
//                 width: "192px",
//                 height: "192px",
//                 marginBottom: "40px",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <svg
//                 style={{ position: "absolute", width: "100%", height: "100%" }}
//               >
//                 <circle
//                   cx="96"
//                   cy="96"
//                   r="90"
//                   fill="transparent"
//                   stroke="#dce9ff"
//                   strokeWidth="4"
//                 />
//               </svg>
//               <svg
//                 style={{
//                   position: "absolute",
//                   width: "100%",
//                   height: "100%",
//                   transform: "rotate(-90deg)",
//                 }}
//               >
//                 <circle
//                   cx="96"
//                   cy="96"
//                   r="90"
//                   fill="transparent"
//                   stroke="#00873a"
//                   strokeWidth="6"
//                   strokeDasharray="283"
//                   strokeDashoffset="200"
//                   strokeLinecap="round"
//                   style={{
//                     animation: "ring-rotate 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
//                   }}
//                 />
//               </svg>
//               <div
//                 style={{
//                   backgroundColor: "#ffffff",
//                   borderRadius: "50%",
//                   width: "128px",
//                   height: "128px",
//                   boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   border: "1px solid rgba(189, 202, 186, 0.2)",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{
//                     fontSize: "48px",
//                     color: "#006b2c",
//                     fontVariationSettings: "'FILL' 1",
//                   }}
//                 >
//                   account_balance_wallet
//                 </span>
//               </div>
//             </div>

//             <h1
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 marginBottom: "8px",
//               }}
//             >
//               Verifying Contribution
//             </h1>
//             <p
//               style={{
//                 fontSize: "16px",
//                 lineHeight: "24px",
//                 color: "#565e74",
//                 maxWidth: "320px",
//               }}
//             >
//               We&apos;re securely confirming your{" "}
//               <span style={{ fontWeight: 700, color: "#0b1c30" }}>₦50,000</span>{" "}
//               contribution with the bank and Monnify.
//             </p>
//           </div>

//           {/* Timeline */}
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.8)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.5)",
//               borderRadius: "12px",
//               padding: "24px",
//               boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//             }}
//           >
//             <div
//               style={{
//                 position: "relative",
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: "40px",
//               }}
//             >
//               {/* Vertical line */}
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "11px",
//                   top: "16px",
//                   bottom: "16px",
//                   width: "2px",
//                   backgroundColor: "rgba(189, 202, 186, 0.3)",
//                 }}
//               />

//               {steps.map((step) => (
//                 <div
//                   key={step.label}
//                   style={{
//                     display: "flex",
//                     gap: "24px",
//                     alignItems: "flex-start",
//                     position: "relative",
//                     zIndex: 10,
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: "24px",
//                       height: "24px",
//                       borderRadius: "50%",
//                       flexShrink: 0,
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       backgroundColor: step.done
//                         ? "#006b2c"
//                         : step.active
//                         ? "#00873a"
//                         : "#dce9ff",
//                       border: step.active
//                         ? "none"
//                         : step.done
//                         ? "none"
//                         : "1px solid rgba(189, 202, 186, 0.5)",
//                       boxShadow: step.active
//                         ? "0 0 12px rgba(0, 107, 44, 0.3)"
//                         : "none",
//                       animation: step.active ? "pulse-emerald 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
//                     }}
//                   >
//                     {step.done ? (
//                       <span
//                         className="material-symbols-outlined"
//                         style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700 }}
//                       >
//                         check
//                       </span>
//                     ) : step.active ? (
//                       <div
//                         style={{
//                           width: "8px",
//                           height: "8px",
//                           borderRadius: "50%",
//                           backgroundColor: "#f7fff2",
//                         }}
//                       />
//                     ) : (
//                       <div
//                         style={{
//                           width: "8px",
//                           height: "8px",
//                           borderRadius: "50%",
//                           backgroundColor: "#6e7b6c",
//                         }}
//                       />
//                     )}
//                   </div>
//                   <div style={{ flex: 1 }}>
//                     <div
//                       style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                       }}
//                     >
//                       <span
//                         style={{
//                           fontSize: "14px",
//                           lineHeight: "20px",
//                           letterSpacing: "0.01em",
//                           fontWeight: 700,
//                           fontFamily: "'Geist', sans-serif",
//                           color: step.active
//                             ? "#006b2c"
//                             : step.done
//                             ? "#0b1c30"
//                             : "#565e74",
//                         }}
//                       >
//                         {step.label}
//                       </span>
//                       {step.active && (
//                         <span
//                           style={{
//                             backgroundColor: "rgba(0, 107, 44, 0.1)",
//                             color: "#006b2c",
//                             padding: "2px 8px",
//                             borderRadius: "9999px",
//                             fontSize: "10px",
//                             fontWeight: 700,
//                             textTransform: "uppercase",
//                             letterSpacing: "0.05em",
//                           }}
//                         >
//                           Processing
//                         </span>
//                       )}
//                     </div>
//                     <span
//                       style={{
//                         fontSize: "12px",
//                         lineHeight: "16px",
//                         letterSpacing: "0.03em",
//                         fontWeight: 600,
//                         fontFamily: "'Geist', sans-serif",
//                         color: step.active ? "#565e74" : "#bec6e0",
//                       }}
//                     >
//                       {step.detail}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Footer */}
//           <div
//             style={{
//               marginTop: "64px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "16px",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 opacity: 0.6,
//               }}
//             >
//               <span style={{ fontSize: "12px", color: "#565e74" }}>Secured by</span>
//               <div
//                 style={{
//                   height: "20px",
//                   width: "80px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                 }}
//               >
//                 <img
//                   style={{ height: "100%", objectFit: "contain", filter: "grayscale(1)" }}
//                   alt="Monnify"
//                   src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYA1DE3vgwMVdUhcbKg075zdvK_IbSbjCgMCv-uG3Hlqw_Dgo_PLRc9M_Oy--aG5nojFTrTIzwPxmJO5NPK3ybmaCE572NC6mRoq7FlJBduT0mBOgCzFsPU1gktz_uqzhQE02n9KqAsKclVOrUqYLrEaJ1mcU2vlPeANvP0Gg6yjV8qXgTbbh_gaI1yIVB8LnznnOrTieU5L-8n6gHfhuz5rk5iIMy4H125n5BkUzpa6gBw4_k9-i5JdmZs0zo9AWaxXWEVn1eXq06"
//                 />
//               </div>
//             </div>
//             <p
//               style={{
//                 fontSize: "12px",
//                 color: "#bec6e0",
//                 textAlign: "center",
//                 padding: "0 40px",
//               }}
//             >
//               Please do not close this window or navigate away while the
//               verification is in progress.
//             </p>
//           </div>
//         </div>
//       </main>

//       {/* Support */}
//       <footer style={{ padding: "24px", maxWidth: "448px", margin: "0 auto", width: "100%" }}>
//         <button
//           style={{
//             width: "100%",
//             padding: "16px",
//             borderRadius: "12px",
//             border: "1px solid #6e7b6c",
//             backgroundColor: "transparent",
//             color: "#565e74",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             cursor: "pointer",
//           }}
//         >
//           Need help? Contact Support
//         </button>
//       </footer>
//     </div>
//   );
// }

// /* ===================================================================
//    SCREEN 4: SUCCESS (Confirmation)
//    =================================================================== */
// function PaymentSuccess() {
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         position: "relative",
//         overflow: "hidden",
//         backgroundColor: "#f8f9ff",
//       }}
//     >
//       {/* Confetti Canvas Placeholder */}
//       <div
//         style={{
//           position: "fixed",
//           inset: 0,
//           pointerEvents: "none",
//           zIndex: 0,
//         }}
//       />

//       <main
//         style={{
//           position: "relative",
//           zIndex: 10,
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "100vh",
//           padding: "24px",
//         }}
//       >
//         {/* Logo */}
//         <div
//           style={{
//             position: "absolute",
//             top: "24px",
//             left: "24px",
//           }}
//         >
//           <h1
//             style={{
//               fontSize: "32px",
//               lineHeight: "40px",
//               letterSpacing: "-0.02em",
//               fontWeight: 700,
//               fontFamily: "'Inter', sans-serif",
//               color: "#006b2c",
//             }}
//           >
//             SaveCircle AI
//           </h1>
//         </div>

//         <div
//           style={{
//             width: "100%",
//             maxWidth: "512px",
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             gap: "40px",
//           }}
//         >
//           {/* Success Icon */}
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: "24px",
//             }}
//           >
//             <div
//               style={{
//                 width: "128px",
//                 height: "128px",
//                 backgroundColor: "#006b2c",
//                 borderRadius: "50%",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 color: "#ffffff",
//                 boxShadow: "0 0 30px rgba(0, 107, 44, 0.2)",
//                 animation: "check-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
//               }}
//             >
//               <span
//                 className="material-symbols-outlined"
//                 style={{
//                   fontSize: "64px",
//                   fontVariationSettings: "'FILL' 0, 'wght' 600",
//                 }}
//               >
//                 check
//               </span>
//             </div>
//             <div style={{ textAlign: "center" }}>
//               <h2
//                 style={{
//                   fontSize: "24px",
//                   lineHeight: "32px",
//                   letterSpacing: "-0.01em",
//                   fontWeight: 600,
//                   fontFamily: "'Inter', sans-serif",
//                   marginBottom: "8px",
//                 }}
//               >
//                 Payment Successful!
//               </h2>
//               <p
//                 style={{
//                   fontSize: "16px",
//                   lineHeight: "24px",
//                   color: "#565e74",
//                   maxWidth: "320px",
//                 }}
//               >
//                 Your contribution of{" "}
//                 <span style={{ fontWeight: 700, color: "#0b1c30" }}>
//                   ₦50,000
//                 </span>{" "}
//                 to{" "}
//                 <span style={{ fontWeight: 700, color: "#0b1c30" }}>
//                   Tech Founders Hub
//                 </span>{" "}
//                 has been confirmed.
//               </p>
//             </div>
//           </div>

//           {/* Receipt Card */}
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.7)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.8)",
//               boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//               borderRadius: "12px",
//               padding: "24px",
//               width: "100%",
//               position: "relative",
//               overflow: "hidden",
//             }}
//           >
//             {/* Decorative dots */}
//             <div
//               style={{
//                 position: "absolute",
//                 top: "-12px",
//                 left: 0,
//                 right: 0,
//                 display: "flex",
//                 justifyContent: "space-around",
//                 padding: "0 24px",
//               }}
//             >
//               {[1, 2, 3, 4].map((i) => (
//                 <div
//                   key={i}
//                   style={{
//                     width: "24px",
//                     height: "24px",
//                     borderRadius: "50%",
//                     backgroundColor: "#f8f9ff",
//                   }}
//                 />
//               ))}
//             </div>

//             <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//                   paddingBottom: "16px",
//                 }}
//               >
//                 <span
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#565e74",
//                   }}
//                 >
//                   Transaction Details
//                 </span>
//                 <span
//                   style={{
//                     backgroundColor: "rgba(0, 107, 44, 0.1)",
//                     color: "#006b2c",
//                     padding: "4px 16px",
//                     borderRadius: "9999px",
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     fontFamily: "'Geist', sans-serif",
//                   }}
//                 >
//                   CONFIRMED
//                 </span>
//               </div>

//               {[
//                 { label: "Transaction ID", value: "SC-AI-994208311" },
//                 { label: "Date & Time", value: "Oct 24, 2023 • 14:45 WAT" },
//                 { label: "Payment Method", value: "Monnify Transfer", icon: "account_balance" },
//                 { label: "Destination", value: "Tech Founders Savings Pot" },
//               ].map((row) => (
//                 <div
//                   key={row.label}
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#565e74",
//                     }}
//                   >
//                     {row.label}
//                   </span>
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "8px",
//                     }}
//                   >
//                     {row.icon && (
//                       <span
//                         className="material-symbols-outlined"
//                         style={{ fontSize: "14px", color: "#565e74" }}
//                       >
//                         {row.icon}
//                       </span>
//                     )}
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 600,
//                         fontFamily: "'Geist', sans-serif",
//                         color: "#0b1c30",
//                       }}
//                     >
//                       {row.value}
//                     </span>
//                   </div>
//                 </div>
//               ))}

//               <div
//                 style={{
//                   marginTop: "24px",
//                   paddingTop: "24px",
//                   borderTop: "2px dashed rgba(189, 202, 186, 0.5)",
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "baseline",
//                 }}
//               >
//                 <span
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#565e74",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.1em",
//                   }}
//                 >
//                   Total Amount
//                 </span>
//                 <span
//                   style={{
//                     fontSize: "32px",
//                     lineHeight: "40px",
//                     letterSpacing: "-0.02em",
//                     fontWeight: 700,
//                     fontFamily: "'Inter', sans-serif",
//                     color: "#006b2c",
//                   }}
//                 >
//                   ₦50,000.00
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Actions */}
//           <div
//             style={{
//               display: "flex",
//               gap: "16px",
//               width: "100%",
//               flexWrap: "wrap",
//             }}
//           >
//             <button
//               style={{
//                 flex: 1,
//                 minWidth: "160px",
//                 backgroundColor: "#006b2c",
//                 color: "#ffffff",
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 padding: "16px",
//                 borderRadius: "8px",
//                 border: "none",
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "8px",
//                 boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.1)",
//               }}
//             >
//               <span className="material-symbols-outlined">download</span>
//               Download PDF
//             </button>
//             <button
//               style={{
//                 flex: 1,
//                 minWidth: "160px",
//                 backgroundColor: "#ffffff",
//                 border: "1px solid #6e7b6c",
//                 color: "#0b1c30",
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 padding: "16px",
//                 borderRadius: "8px",
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "8px",
//               }}
//             >
//               <span className="material-symbols-outlined">share</span>
//               Share Receipt
//             </button>
//           </div>

//           {/* Back */}
//           <Link
//             href="/dashboard"
//             style={{
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#565e74",
//               textDecoration: "none",
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               transition: "color 0.2s",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "20px" }}
//             >
//               arrow_back
//             </span>
//             Back to Dashboard
//           </Link>

//           {/* AI Insight */}
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.7)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(0, 107, 44, 0.2)",
//               borderRadius: "12px",
//               padding: "16px",
//               maxWidth: "384px",
//               width: "100%",
//             }}
//           >
//             <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
//               <div
//                 style={{
//                   backgroundColor: "#00873a",
//                   borderRadius: "8px",
//                   padding: "8px",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{
//                     color: "#f7fff2",
//                     fontVariationSettings: "'FILL' 1",
//                   }}
//                 >
//                   psychology
//                 </span>
//               </div>
//               <div>
//                 <p
//                   style={{
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 700,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#006b2c",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.1em",
//                     marginBottom: "4px",
//                   }}
//                 >
//                   AI Insight
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#3e4a3d",
//                   }}
//                 >
//                   This contribution puts you in the top 5% of your group this
//                   month! You&apos;re ₦12,000 away from your next streak reward.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
