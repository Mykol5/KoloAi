"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PaymentStep =
  | "amount"
  | "transfer"
  | "proof"
  | "submitted";

type Group = {
  id: string;
  name: string;
  description?: string | null;
  contribution_amount?: number | null;
  verification_status?: string | null;
  verified_at?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
};

type Contribution = {
  id: string;
  amount: number;
  status: string;
  transaction_ref?: string | null;
  proof_url?: string | null;
  created_at: string;
  groups?: {
    name?: string;
  } | null;
};

const GREEN = "#006b2c";
const NAVY = "#0b1c30";
const TEXT = "#565e74";
const MUTED = "#6e7b6c";
const BORDER = "#e2e8f0";

function PaymentsContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const groupId = searchParams.get("groupId") || "";

  const [userId, setUserId] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const [step, setStep] = useState<PaymentStep>("amount");
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [contributionId, setContributionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const formatNaira = (value: number) =>
    `₦${Number(value || 0).toLocaleString("en-NG")}`;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const loadGroup = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError || !data) {
        setError("This savings group could not be found.");
        return;
      }

      const loadedGroup = data as Group;

      const { data: verification, error: verificationError } = await supabase
        .from("verification_submissions")
        .select(`
          id,
          bank_name,
          account_name,
          account_number,
          status,
          reviewed_at,
          submitted_at
        `)
        .eq("group_id", groupId)
        .eq("status", "verified")
        .order("reviewed_at", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationError) {
        console.error("Verified account lookup error:", verificationError);
      }

      const resolvedGroup: Group = {
        ...loadedGroup,
        bank_name: verification?.bank_name || null,
        account_name: verification?.account_name || null,
        account_number: verification?.account_number || null,
        verification_status: verification?.status || null,
        verified_at: verification?.reviewed_at || null,
      };

      setGroup(resolvedGroup);
      setAmount(Number(loadedGroup.contribution_amount || 0));
    } catch (err) {
      console.error("Group loading error:", err);
      setError("Unable to load this contribution.");
    } finally {
      setLoading(false);
    }
  }, [groupId, supabase]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;

    setHistoryLoading(true);

    const { data } = await supabase
      .from("contributions")
      .select(`
        id,
        amount,
        status,
        transaction_ref,
        proof_url,
        created_at,
        groups(name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    setContributions((data || []) as Contribution[]);
    setHistoryLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const isVerified = group?.verification_status === "verified";

  const hasApprovedAccount = Boolean(
    group?.bank_name?.trim() &&
    group?.account_name?.trim() &&
    group?.account_number?.trim()
  );

  const canAcceptContribution = isVerified && hasApprovedAccount;

  async function copyAccountNumber() {
    if (!group?.account_number) return;

    try {
      await navigator.clipboard.writeText(group.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy account number.");
    }
  }

  function continueToTransfer() {
    setError("");

    if (!amount || amount <= 0) {
      setError("Enter a valid contribution amount.");
      return;
    }

    if (!canAcceptContribution) {
      setError("This group has not completed Kolo verification.");
      return;
    }

    setStep("transfer");
  }

  function continueToProof() {
    setError("");

    if (!canAcceptContribution) {
      setError("This group's contribution account is not currently approved.");
      return;
    }

    setStep("proof");
  }

  function handleProofFile(file: File | null) {
    setError("");

    if (!file) {
      setProofFile(null);
      setProofPreview("");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setError("Please upload a JPG, PNG, WEBP or PDF receipt.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Payment proof must be 5MB or smaller.");
      return;
    }

    setProofFile(file);

    if (file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview("");
    }
  }

  async function submitContribution() {
    setError("");

    if (!userId) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    if (!group) {
      setError("Savings group information is unavailable.");
      return;
    }

    if (!canAcceptContribution) {
      setError("This group must be Kolo Verified before contributions can be submitted.");
      return;
    }

    if (!proofFile) {
      setError("Please upload your payment proof.");
      return;
    }

    if (!reference.trim()) {
      setError("Enter the transaction reference from your bank receipt.");
      return;
    }

    if (!transferDate) {
      setError("Enter the date you made the transfer.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: contribution, error: contributionError } = await supabase
        .from("contributions")
        .insert({
          group_id: group.id,
          user_id: userId,
          amount,
          status: "pending",
          transaction_ref: reference.trim(),
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (contributionError || !contribution) {
        throw new Error(contributionError?.message || "Unable to create contribution.");
      }

      setContributionId(contribution.id);

      const extension = proofFile.name.split(".").pop() || "file";
      const filePath = `${group.id}/${userId}/${contribution.id}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, proofFile, {
          upsert: true,
          contentType: proofFile.type,
        });

      if (uploadError) {
        await supabase.from("contributions").delete().eq("id", contribution.id);
        throw new Error(uploadError.message);
      }

      const { error: updateError } = await supabase
        .from("contributions")
        .update({
          proof_url: filePath,
          transfer_date: transferDate,
          status: "pending",
        })
        .eq("id", contribution.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setStep("submitted");
      await loadHistory();
    } catch (err: any) {
      console.error("Contribution submission error:", err);
      setError(err?.message || "Unable to submit your contribution.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading contribution details...</p>

        <style jsx>{`
          .loadingPage {
            min-height: 60vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 16px;
            color: ${MUTED};
            font-family: Inter, Geist, system-ui, sans-serif;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e8eee9;
            border-top-color: ${GREEN};
            border-radius: 50%;
            animation: spin .8s linear infinite;
          }

          p {
            margin: 0;
            font-size: 16px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!groupId || !group) {
    return (
      <div className="empty">
        <div className="emptyIcon">!</div>
        <h2>Select a savings group</h2>
        <p>Contributions must always be made through a specific savings group.</p>
        <Link href="/groups">View my groups</Link>

        <style jsx>{`
          .empty {
            max-width: 560px;
            margin: 80px auto;
            text-align: center;
            color: ${NAVY};
            font-family: Inter, Geist, system-ui, sans-serif;
          }

          .emptyIcon {
            width: 64px;
            height: 64px;
            display: grid;
            place-items: center;
            margin: auto;
            border-radius: 18px;
            background: #f4f6f5;
            color: ${GREEN};
            font-weight: 800;
            font-size: 24px;
          }

          h2 {
            margin: 20px 0 10px;
            font-size: 26px;
          }

          p {
            color: ${TEXT};
            font-size: 16px;
            line-height: 1.6;
          }

          a {
            display: inline-block;
            margin-top: 16px;
            padding: 14px 22px;
            border-radius: 12px;
            background: ${GREEN};
            color: white;
            text-decoration: none;
            font-size: 15px;
            font-weight: 700;
          }
        `}</style>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="submitted">
        <div className="pendingIcon">✓</div>
        <div className="eyebrow">CONTRIBUTION SUBMITTED</div>
        <h1>Your contribution is awaiting confirmation</h1>
        <p className="lead">
          Your transfer of <strong>{formatNaira(amount)}</strong> to{" "}
          <strong>{group.name}</strong> has been submitted for administrator confirmation.
        </p>

        <div className="pendingCard">
          <div>
            <span>AMOUNT</span>
            <strong>{formatNaira(amount)}</strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong className="pending">Pending confirmation</strong>
          </div>
          <div>
            <span>REFERENCE</span>
            <strong>{reference}</strong>
          </div>
        </div>

        <div className="important">
          <strong>What happens next?</strong>
          <p>
            The cooperative administrator will compare your payment proof with the
            cooperative's bank records. Your contribution will only count toward
            your savings after it has been confirmed.
          </p>
        </div>

        <div className="actions">
          <Link href={`/groups/${group.id}`}>Back to group</Link>
          <Link href="/payments" className="secondary">Payment history</Link>
        </div>

        <style jsx>{`
          .submitted {
            max-width: 680px;
            margin: 60px auto;
            padding: 0 20px 50px;
            text-align: center;
            color: ${NAVY};
            font-family: Inter, Geist, system-ui, sans-serif;
          }

          .pendingIcon {
            width: 80px;
            height: 80px;
            display: grid;
            place-items: center;
            margin: auto;
            border-radius: 24px;
            background: ${GREEN};
            color: white;
            font-size: 32px;
            font-weight: 800;
            box-shadow: 0 12px 28px rgba(0, 107, 44, 0.2);
          }

          .eyebrow {
            margin-top: 24px;
            color: ${GREEN};
            font-size: 12px;
            font-weight: 850;
            letter-spacing: .12em;
          }

          h1 {
            margin: 12px 0;
            font-size: 34px;
            letter-spacing: -.04em;
            line-height: 1.15;
          }

          .lead {
            color: ${TEXT};
            font-size: 16px;
            line-height: 1.7;
          }

          .pendingCard {
            margin: 28px 0;
            border: 1px solid ${BORDER};
            border-radius: 16px;
            overflow: hidden;
            text-align: left;
          }

          .pendingCard > div {
            padding: 20px;
          }

          .pendingCard > div + div {
            border-top: 1px solid ${BORDER};
          }

          .pendingCard span {
            display: block;
            margin-bottom: 6px;
            color: ${MUTED};
            font-size: 11px;
            font-weight: 800;
          }

          .pendingCard strong {
            font-size: 16px;
          }

          .pendingCard .pending {
            color: #825100;
          }

          .important {
            padding: 20px;
            border-radius: 14px;
            background: #eff8f2;
            text-align: left;
          }

          .important strong {
            color: ${GREEN};
            font-size: 14px;
          }

          .important p {
            margin: 8px 0 0;
            color: ${TEXT};
            font-size: 14px;
            line-height: 1.7;
          }

          .actions {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 28px;
          }

          .actions a {
            padding: 14px 20px;
            border-radius: 12px;
            background: ${GREEN};
            color: white;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
          }

          .actions .secondary {
            background: #f4f6f5;
            color: ${TEXT};
            border: 1.5px solid ${BORDER};
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <Link href={`/groups/${group.id}`} className="back">
        ← Back to {group.name}
      </Link>

      <header>
        <div className="eyebrow">
          {step === "amount" ? "CONTRIBUTION" : step === "transfer" ? "BANK TRANSFER" : "PAYMENT PROOF"}
        </div>
        <h1>Make a contribution</h1>
        <p>
          Contribute directly to <strong>{group.name}</strong>.
        </p>
      </header>

      {canAcceptContribution ? (
        <div className="verifiedBanner">
          <div className="verifiedIcon">✓</div>
          <div>
            <strong>Kolo Verified cooperative</strong>
            <p>The contribution account below is the account submitted and approved for this group.</p>
          </div>
        </div>
      ) : (
        <div className="blockedBanner">
          <div>!</div>
          <div>
            <strong>Contributions unavailable</strong>
            <p>This group has not completed Kolo verification with an approved contribution account.</p>
          </div>
        </div>
      )}

      {step === "amount" && (
        <section className="card">
          <label>
            <span>Contribution amount</span>
            <div className="amountInput">
              <b>₦</b>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1"
                placeholder="50,000"
              />
            </div>
          </label>

          {group.contribution_amount ? (
            <div className="suggestion">
              Group contribution:{" "}
              <strong>{formatNaira(Number(group.contribution_amount))}</strong>
            </div>
          ) : null}

          {error && <ErrorMessage message={error} />}

          <button className="primary" onClick={continueToTransfer} disabled={!canAcceptContribution}>
            Continue →
          </button>
        </section>
      )}

      {step === "transfer" && (
        <section className="card">
          <div className="transferHeader">
            <div className="bankIcon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
              </svg>
            </div>
            <div>
              <h2>Transfer directly to the group</h2>
              <p>Kolo does not receive or hold this contribution.</p>
            </div>
          </div>

          <div className="amountCard">
            <span>TRANSFER EXACTLY</span>
            <strong>{formatNaira(amount)}</strong>
          </div>

          <div className="accountCard">
            <div className="accountRow">
              <span>BANK</span>
              <strong>{group.bank_name}</strong>
            </div>

            <div className="accountRow">
              <span>ACCOUNT NAME</span>
              <strong>{group.account_name}</strong>
            </div>

            <div className="accountRow">
              <span>ACCOUNT NUMBER</span>
              <div className="accountNumber">
                <strong>{group.account_number}</strong>
                <button onClick={copyAccountNumber}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="securityNotice">
            <span>✓</span>
            <p>This account belongs to the cooperative represented by this group and has been submitted for Kolo verification.</p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="buttonRow">
            <button className="secondaryButton" onClick={() => setStep("amount")}>
              ← Back
            </button>
            <button className="primary" onClick={continueToProof}>
              I've made the transfer →
            </button>
          </div>

          <p className="disclaimer">
            Make the transfer from your own bank account. Do not send cash to another member.
          </p>
        </section>
      )}

      {step === "proof" && (
        <section className="card">
          <div className="transferHeader">
            <div className="proofIcon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                <path d="M14 8H8M16 12H8M10 16H8" />
              </svg>
            </div>
            <div>
              <h2>Submit payment proof</h2>
              <p>Your contribution will remain pending until the group admin confirms receipt.</p>
            </div>
          </div>

          <label className="field">
            <span>Bank transaction reference</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 1234567890"
            />
          </label>

          <label className="field">
            <span>Transfer date</span>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </label>

          <label className="upload">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => handleProofFile(e.target.files?.[0] || null)}
            />
            <div className="uploadIcon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <strong>{proofFile ? proofFile.name : "Upload payment receipt"}</strong>
            <span>JPG, PNG, WEBP or PDF · Max 5MB</span>
          </label>

          {proofPreview && (
            <div className="preview">
              <img src={proofPreview} alt="Payment proof preview" />
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          <div className="buttonRow">
            <button className="secondaryButton" onClick={() => setStep("transfer")} disabled={submitting}>
              ← Back
            </button>
            <button className="primary" onClick={submitContribution} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit contribution"}
            </button>
          </div>

          <div className="pendingExplanation">
            <strong>Your money is not marked as saved yet.</strong>
            <p>
              Kolo records the contribution as <b>Pending</b>. It becomes part of your official savings record only after the cooperative administrator confirms the transfer.
            </p>
          </div>
        </section>
      )}

      {step === "amount" && (
        <section className="history">
          <div className="historyHeader">
            <div>
              <h2>Recent contributions</h2>
              <p>Your contribution activity across Kolo groups.</p>
            </div>
            <Link href="/groups">My groups</Link>
          </div>

          {historyLoading ? (
            <div className="historyEmpty">Loading...</div>
          ) : contributions.length === 0 ? (
            <div className="historyEmpty">No contributions yet.</div>
          ) : (
            <div className="historyList">
              {contributions.map((item) => (
                <div key={item.id} className="historyItem">
                  <div>
                    <strong>{item.groups?.name || "Savings group"}</strong>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className="historyAmount">
                    <strong>{formatNaira(Number(item.amount))}</strong>
                    <Status status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer>
        Kolo provides contribution records and trust information. Funds are transferred directly between members and their cooperative. Kolo does not hold member savings.
      </footer>

      <style jsx>{`
        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 10px 0 50px;
          color: ${NAVY};
          font-family: Inter, Geist, system-ui, sans-serif;
        }

        .back {
          display: inline-block;
          margin-bottom: 24px;
          color: ${GREEN};
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
        }

        header {
          margin-bottom: 28px;
        }

        .eyebrow {
          color: ${GREEN};
          font-size: 12px;
          font-weight: 850;
          letter-spacing: .14em;
        }

        header h1 {
          margin: 10px 0 8px;
          font-size: 38px;
          line-height: 1;
          letter-spacing: -.045em;
        }

        header p {
          margin: 0;
          color: ${TEXT};
          font-size: 16px;
        }

        .verifiedBanner,
        .blockedBanner {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 18px 20px;
          margin-bottom: 20px;
          border-radius: 14px;
        }

        .verifiedBanner {
          border: 1px solid #cfe6d7;
          background: #eff8f2;
        }

        .blockedBanner {
          border: 1px solid #eadfbd;
          background: #fffaf0;
        }

        .verifiedIcon,
        .blockedBanner > div:first-child {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 10px;
          background: ${GREEN};
          color: #fff;
          font-size: 16px;
          font-weight: 800;
        }

        .blockedBanner > div:first-child {
          background: #825100;
        }

        .verifiedBanner strong,
        .blockedBanner strong {
          display: block;
          font-size: 14px;
        }

        .verifiedBanner strong {
          color: ${GREEN};
        }

        .blockedBanner strong {
          color: #825100;
        }

        .verifiedBanner p,
        .blockedBanner p {
          margin: 6px 0 0;
          color: ${TEXT};
          font-size: 13px;
          line-height: 1.5;
        }

        .card {
          max-width: 620px;
          padding: 32px;
          border: 1px solid ${BORDER};
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 30px rgba(11, 28, 48, .05);
        }

        label > span,
        .field > span {
          display: block;
          margin-bottom: 10px;
          color: ${NAVY};
          font-size: 13px;
          font-weight: 750;
        }

        .amountInput {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border: 1.5px solid ${BORDER};
          border-radius: 14px;
        }

        .amountInput b {
          color: ${GREEN};
          font-size: 24px;
        }

        .amountInput input {
          width: 100%;
          border: 0;
          outline: 0;
          color: ${NAVY};
          font-size: 28px;
          font-weight: 800;
        }

        .suggestion {
          margin-top: 12px;
          color: ${MUTED};
          font-size: 13px;
        }

        .suggestion strong {
          color: ${GREEN};
        }

        .primary {
          width: 100%;
          margin-top: 24px;
          padding: 16px 20px;
          border: 0;
          border-radius: 12px;
          background: ${GREEN};
          color: #fff;
          cursor: pointer;
          font-size: 15px;
          font-weight: 800;
          transition: all 0.2s;
        }

        .primary:hover:not(:disabled) {
          background: #005522;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 107, 44, 0.2);
        }

        .primary:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .transferHeader {
          display: flex;
          gap: 14px;
          margin-bottom: 24px;
        }

        .bankIcon,
        .proofIcon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 14px;
          background: #eff8f2;
          color: ${GREEN};
        }

        .transferHeader h2 {
          margin: 0 0 6px;
          font-size: 22px;
          letter-spacing: -.02em;
        }

        .transferHeader p {
          margin: 0;
          color: ${TEXT};
          font-size: 14px;
          line-height: 1.5;
        }

        .amountCard {
          padding: 24px;
          margin-bottom: 20px;
          border-radius: 14px;
          background: ${GREEN};
          color: white;
          text-align: center;
        }

        .amountCard span {
          display: block;
          margin-bottom: 8px;
          opacity: .7;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .amountCard strong {
          font-size: 32px;
        }

        .accountCard {
          padding: 4px 20px;
          border: 1.5px solid ${BORDER};
          border-radius: 14px;
        }

        .accountRow {
          padding: 18px 0;
        }

        .accountRow + .accountRow {
          border-top: 1px solid ${BORDER};
        }

        .accountRow > span {
          display: block;
          margin-bottom: 8px;
          color: ${MUTED};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .05em;
        }

        .accountRow > strong {
          color: ${NAVY};
          font-size: 16px;
        }

        .accountNumber {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .accountNumber strong {
          font-family: "Geist Mono", monospace;
          font-size: 22px;
          letter-spacing: .04em;
        }

        .accountNumber button {
          padding: 10px 14px;
          border: 1.5px solid ${GREEN};
          border-radius: 10px;
          background: white;
          color: ${GREEN};
          cursor: pointer;
          font-size: 12px;
          font-weight: 750;
          transition: all 0.2s;
        }

        .accountNumber button:hover {
          background: ${GREEN};
          color: white;
        }

        .securityNotice,
        .pendingExplanation {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding: 16px;
          border-radius: 12px;
          background: #eff8f2;
        }

        .securityNotice span {
          color: ${GREEN};
          font-weight: 900;
          font-size: 16px;
        }

        .securityNotice p,
        .pendingExplanation p {
          margin: 0;
          color: ${TEXT};
          font-size: 13px;
          line-height: 1.7;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .buttonRow .primary {
          margin-top: 0;
          flex: 1;
        }

        .secondaryButton {
          min-width: 120px;
          padding: 14px 16px;
          border: 1.5px solid ${BORDER};
          border-radius: 12px;
          background: #f7f9f8;
          color: ${TEXT};
          cursor: pointer;
          font-size: 13px;
          font-weight: 750;
        }

        .disclaimer {
          margin: 16px 0 0;
          color: ${MUTED};
          text-align: center;
          font-size: 12px;
        }

        .field {
          display: block;
          margin-bottom: 20px;
        }

        .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px;
          border: 1.5px solid ${BORDER};
          border-radius: 12px;
          outline: none;
          color: ${NAVY};
          font-size: 14px;
        }

        .field input:focus {
          border-color: #87b998;
          box-shadow: 0 0 0 3px #eff8f2;
        }

        .upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          margin-top: 12px;
          border: 2px dashed #aac7b4;
          border-radius: 14px;
          background: #fbfdfb;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .upload:hover {
          border-color: ${GREEN};
          background: #f7faf8;
        }

        .upload input {
          display: none;
        }

        .uploadIcon {
          margin-bottom: 12px;
          color: ${GREEN};
        }

        .upload strong {
          color: ${NAVY};
          font-size: 14px;
        }

        .upload > span {
          margin-top: 6px;
          color: ${MUTED};
          font-size: 11px;
        }

        .preview {
          margin-top: 16px;
          border: 1px solid ${BORDER};
          border-radius: 12px;
          overflow: hidden;
        }

        .preview img {
          display: block;
          width: 100%;
          max-height: 300px;
          object-fit: contain;
        }

        .pendingExplanation {
          margin-top: 20px;
          display: block;
        }

        .pendingExplanation strong {
          color: ${GREEN};
          font-size: 13px;
          display: block;
          margin-bottom: 6px;
        }

        .pendingExplanation p {
          margin-top: 4px;
        }

        .history {
          margin-top: 40px;
        }

        .historyHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .historyHeader h2 {
          margin: 0 0 6px;
          font-size: 22px;
        }

        .historyHeader p {
          margin: 0;
          color: ${TEXT};
          font-size: 14px;
        }

        .historyHeader a {
          color: ${GREEN};
          text-decoration: none;
          font-size: 14px;
          font-weight: 750;
        }

        .historyList {
          border: 1px solid ${BORDER};
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }

        .historyItem {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
        }

        .historyItem + .historyItem {
          border-top: 1px solid ${BORDER};
        }

        .historyItem > div:first-child strong,
        .historyItem > div:first-child span {
          display: block;
        }

        .historyItem > div:first-child strong {
          font-size: 14px;
        }

        .historyItem > div:first-child span {
          margin-top: 6px;
          color: ${MUTED};
          font-size: 12px;
        }

        .historyAmount {
          text-align: right;
        }

        .historyAmount > strong {
          display: block;
          margin-bottom: 8px;
          color: ${GREEN};
          font-size: 16px;
        }

        .historyEmpty {
          padding: 40px;
          border: 1px solid ${BORDER};
          border-radius: 14px;
          background: #fff;
          color: ${MUTED};
          text-align: center;
          font-size: 14px;
        }

        footer {
          max-width: 620px;
          margin-top: 24px;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.6;
        }

        @media (max-width: 650px) {
          .page {
            padding: 10px 14px 40px;
          }

          .card {
            padding: 20px;
          }

          header h1 {
            font-size: 30px;
          }

          .buttonRow {
            flex-direction: column;
          }

          .secondaryButton {
            width: 100%;
          }

          .accountNumber {
            align-items: flex-start;
            flex-direction: column;
          }

          .historyItem {
            align-items: flex-start;
            flex-direction: column;
          }

          .historyAmount {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="errorMessage">
      <span>!</span>
      {message}

      <style jsx>{`
        .errorMessage {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          padding: 14px;
          border-radius: 12px;
          background: #fff8eb;
          border: 1px solid #eadfbd;
          color: #825100;
          font-size: 13px;
          line-height: 1.5;
        }

        .errorMessage span {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f1e4bf;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const completed = status === "completed";
  const rejected = status === "rejected";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "20px",
        background: completed ? "#eff8f2" : rejected ? "#fff1f1" : "#fff8eb",
        color: completed ? "#006b2c" : rejected ? "#a12b2b" : "#825100",
        fontSize: "11px",
        fontWeight: 750,
      }}
    >
      {completed ? "✓ Completed" : rejected ? "Rejected" : "Pending"}
    </span>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", fontSize: 16 }}>
          Loading...
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}


// "use client";

// import {
//   Suspense,
//   useCallback,
//   useEffect,
//   useState,
// } from "react";
// import { useSearchParams } from "next/navigation";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";

// type PaymentStep =
//   | "amount"
//   | "transfer"
//   | "proof"
//   | "submitted";

// type Group = {
//   id: string;
//   name: string;
//   description?: string | null;
//   contribution_amount?: number | null;

//   // These should come from the APPROVED
//   // verification information.
//   verification_status?: string | null;
//   verified_at?: string | null;

//   bank_name?: string | null;
//   account_name?: string | null;
//   account_number?: string | null;
// };

// type Contribution = {
//   id: string;
//   amount: number;
//   status: string;
//   payment_reference?: string | null;
//   proof_url?: string | null;
//   created_at: string;
//   groups?: {
//     name?: string;
//   } | null;
// };

// const GREEN = "#006b2c";
// const NAVY = "#0b1c30";
// const TEXT = "#565e74";
// const MUTED = "#6e7b6c";
// const BORDER = "#e2e8f0";

// function PaymentsContent() {
//   const searchParams = useSearchParams();
//   const supabase = createClient();

//   const groupId = searchParams.get("groupId") || "";

//   const [userId, setUserId] = useState("");

//   const [group, setGroup] = useState<Group | null>(null);

//   const [step, setStep] =
//     useState<PaymentStep>("amount");

//   const [amount, setAmount] = useState(0);

//   const [reference, setReference] =
//     useState("");

//   const [transferDate, setTransferDate] =
//     useState("");

//   const [proofFile, setProofFile] =
//     useState<File | null>(null);

//   const [proofPreview, setProofPreview] =
//     useState("");

//   const [contributionId, setContributionId] =
//     useState("");

//   const [loading, setLoading] =
//     useState(true);

//   const [submitting, setSubmitting] =
//     useState(false);

//   const [copied, setCopied] =
//     useState(false);

//   const [error, setError] =
//     useState("");

//   const [contributions, setContributions] =
//     useState<Contribution[]>([]);

//   const [historyLoading, setHistoryLoading] =
//     useState(true);

//   /* ========================================================
//      FORMATTERS
//   ======================================================== */

//   const formatNaira = (value: number) =>
//     `₦${Number(value || 0).toLocaleString("en-NG")}`;

//   const formatDate = (value: string) =>
//     new Date(value).toLocaleDateString(
//       "en-NG",
//       {
//         day: "numeric",
//         month: "short",
//         year: "numeric",
//       }
//     );

//   /* ========================================================
//      LOAD GROUP
//   ======================================================== */

//   const loadGroup = useCallback(async () => {
//     if (!groupId) {
//       setLoading(false);
//       return;
//     }

//     try {
//       setLoading(true);
//       setError("");

//       const {
//         data: {
//           user,
//         },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         window.location.href = "/login";
//         return;
//       }

//       setUserId(user.id);

//       /*
//        * IMPORTANT:
//        *
//        * We load ONLY the group represented by groupId.
//        *
//        * The member cannot select a random cooperative
//        * account.
//        */
//       const {
//         data,
//         error: groupError,
//       } = await supabase
//         .from("groups")
//         .select("*")
//         .eq("id", groupId)
//         .single();

//       if (groupError || !data) {
//         setError(
//           "This savings group could not be found."
//         );
//         return;
//       }

//       const loadedGroup =
//         data as Group;

//       /*
//        * IMPORTANT: verification_submissions is the
//        * authoritative source for the payment account.
//        *
//        * We ALWAYS query the group's latest verified
//        * submission. We do not trust stale bank/account
//        * fields on groups.
//        */
//       const {
//         data: verification,
//         error: verificationError,
//       } = await supabase
//         .from("verification_submissions")
//         .select(
//           `
//             id,
//             bank_name,
//             account_name,
//             account_number,
//             status,
//             verified_at,
//             reviewed_at,
//             submitted_at
//           `
//         )
//         .eq("group_id", groupId)
//         .eq("status", "verified")
//         .order("verified_at", { ascending: false })
//         .order("reviewed_at", { ascending: false })
//         .order("submitted_at", { ascending: false })
//         .limit(1)
//         .maybeSingle();

//       if (verificationError) {
//         console.error(
//           "Verified account lookup error:",
//           verificationError
//         );
//       }

//       const resolvedGroup: Group = {
//         ...loadedGroup,
//         bank_name:
//           verification?.bank_name || null,
//         account_name:
//           verification?.account_name || null,
//         account_number:
//           verification?.account_number || null,
//         verification_status:
//           verification?.status || null,
//         verified_at:
//           verification?.verified_at || null,
//       };

//       setGroup(resolvedGroup);

//       setAmount(
//         Number(
//           loadedGroup.contribution_amount || 0
//         )
//       );
//     } catch (err) {
//       console.error(
//         "Group loading error:",
//         err
//       );

//       setError(
//         "Unable to load this contribution."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, [groupId, supabase]);

//   /* ========================================================
//      LOAD CONTRIBUTION HISTORY
//   ======================================================== */

//   const loadHistory = useCallback(
//     async () => {
//       if (!userId) return;

//       setHistoryLoading(true);

//       const {
//         data,
//       } = await supabase
//         .from("contributions")
//         .select(
//           `
//             id,
//             amount,
//             status,
//             payment_reference,
//             proof_url,
//             created_at,
//             groups(name)
//           `
//         )
//         .eq(
//           "user_id",
//           userId
//         )
//         .order(
//           "created_at",
//           {
//             ascending: false,
//           }
//         )
//         .limit(30);

//       setContributions(
//         (data || []) as Contribution[]
//       );

//       setHistoryLoading(false);
//     },
//     [userId, supabase]
//   );

//   useEffect(() => {
//     loadGroup();
//   }, [loadGroup]);

//   useEffect(() => {
//     loadHistory();
//   }, [loadHistory]);

//   /* ========================================================
//      GROUP VERIFICATION
//   ======================================================== */

//   /*
//    * A group is payable ONLY when the account came from
//    * a verified verification submission.
//    */
//   const isVerified =
//     group?.verification_status ===
//     "verified";

//   const hasApprovedAccount =
//     Boolean(
//       group?.bank_name?.trim() &&
//       group?.account_name?.trim() &&
//       group?.account_number?.trim()
//     );

//   const canAcceptContribution =
//     isVerified &&
//     hasApprovedAccount;

//   /* ========================================================
//      COPY ACCOUNT
//   ======================================================== */

//   async function copyAccountNumber() {
//     if (!group?.account_number)
//       return;

//     try {
//       await navigator.clipboard.writeText(
//         group.account_number
//       );

//       setCopied(true);

//       setTimeout(
//         () => setCopied(false),
//         2000
//       );
//     } catch {
//       setError(
//         "Unable to copy account number."
//       );
//     }
//   }

//   /* ========================================================
//      SELECT AMOUNT
//   ======================================================== */

//   function continueToTransfer() {
//     setError("");

//     if (!amount || amount <= 0) {
//       setError(
//         "Enter a valid contribution amount."
//       );
//       return;
//     }

//     if (!canAcceptContribution) {
//       setError(
//         "This group has not completed Kolo verification."
//       );
//       return;
//     }

//     setStep("transfer");
//   }

//   /* ========================================================
//      TRANSFER COMPLETE
//   ======================================================== */

//   function continueToProof() {
//     setError("");

//     if (!canAcceptContribution) {
//       setError(
//         "This group's contribution account is not currently approved."
//       );
//       return;
//     }

//     setStep("proof");
//   }

//   /* ========================================================
//      FILE SELECT
//   ======================================================== */

//   function handleProofFile(
//     file: File | null
//   ) {
//     setError("");

//     if (!file) {
//       setProofFile(null);
//       setProofPreview("");
//       return;
//     }

//     if (
//       ![
//         "image/jpeg",
//         "image/png",
//         "image/webp",
//         "application/pdf",
//       ].includes(file.type)
//     ) {
//       setError(
//         "Please upload a JPG, PNG, WEBP or PDF receipt."
//       );
//       return;
//     }

//     if (
//       file.size >
//       5 * 1024 * 1024
//     ) {
//       setError(
//         "Payment proof must be 5MB or smaller."
//       );
//       return;
//     }

//     setProofFile(file);

//     if (
//       file.type.startsWith("image/")
//     ) {
//       setProofPreview(
//         URL.createObjectURL(file)
//       );
//     } else {
//       setProofPreview("");
//     }
//   }

//   /* ========================================================
//      SUBMIT CONTRIBUTION
//   ======================================================== */

//   async function submitContribution() {
//     setError("");

//     if (!userId) {
//       setError(
//         "Your session has expired. Please log in again."
//       );
//       return;
//     }

//     if (!group) {
//       setError(
//         "Savings group information is unavailable."
//       );
//       return;
//     }

//     if (!canAcceptContribution) {
//       setError(
//         "This group must be Kolo Verified before contributions can be submitted."
//       );
//       return;
//     }

//     if (!proofFile) {
//       setError(
//         "Please upload your payment proof."
//       );
//       return;
//     }

//     if (!reference.trim()) {
//       setError(
//         "Enter the transaction reference from your bank receipt."
//       );
//       return;
//     }

//     if (!transferDate) {
//       setError(
//         "Enter the date you made the transfer."
//       );
//       return;
//     }

//     setSubmitting(true);

//     try {
//       /*
//        * 1. Create the contribution FIRST
//        *    as pending.
//        */

//       const {
//         data: contribution,
//         error: contributionError,
//       } = await supabase
//         .from("contributions")
//         .insert({
//           group_id: group.id,
//           user_id: userId,
//           amount,
//           status: "pending",
//           payment_method:
//             "direct_bank_transfer",
//           payment_reference:
//             reference.trim(),
//           submitted_at:
//             new Date().toISOString(),
//         })
//         .select("id")
//         .single();

//       if (
//         contributionError ||
//         !contribution
//       ) {
//         throw new Error(
//           contributionError?.message ||
//             "Unable to create contribution."
//         );
//       }

//       setContributionId(
//         contribution.id
//       );

//       /*
//        * 2. Upload proof to Supabase Storage.
//        *
//        * Never store the actual file inside
//        * the database.
//        */

//       const extension =
//         proofFile.name
//           .split(".")
//           .pop() ||
//         "file";

//       const filePath =
//         `${group.id}/${userId}/${contribution.id}.${extension}`;

//       const {
//         error: uploadError,
//       } = await supabase.storage
//         .from("payment-proofs")
//         .upload(
//           filePath,
//           proofFile,
//           {
//             upsert: true,
//             contentType:
//               proofFile.type,
//           }
//         );

//       if (uploadError) {
//         /*
//          * Roll back the pending contribution
//          * if proof upload fails.
//          */

//         await supabase
//           .from("contributions")
//           .delete()
//           .eq(
//             "id",
//             contribution.id
//           );

//         throw new Error(
//           uploadError.message
//         );
//       }

//       /*
//        * 3. Store proof metadata/path.
//        */

//       const {
//         error: updateError,
//       } = await supabase
//         .from("contributions")
//         .update({
//           proof_url:
//             filePath,

//           proof_uploaded_at:
//             new Date().toISOString(),

//           transfer_date:
//             transferDate,

//           status: "pending",
//         })
//         .eq(
//           "id",
//           contribution.id
//         );

//       if (updateError) {
//         throw new Error(
//           updateError.message
//         );
//       }

//       /*
//        * 4. Finished.
//        *
//        * IMPORTANT:
//        *
//        * We do NOT mark this completed.
//        *
//        * The administrator must confirm it.
//        */

//       setStep("submitted");

//       await loadHistory();
//     } catch (err: any) {
//       console.error(
//         "Contribution submission error:",
//         err
//       );

//       setError(
//         err?.message ||
//           "Unable to submit your contribution."
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   /* ========================================================
//      LOADING
//   ======================================================== */

//   if (loading) {
//     return (
//       <div className="loadingPage">
//         <div className="spinner" />
//         <p>
//           Loading contribution details...
//         </p>

//         <style jsx>{`
//           .loadingPage {
//             min-height: 60vh;
//             display: grid;
//             place-items: center;
//             align-content: center;
//             gap: 12px;
//             color: ${MUTED};
//           }

//           .spinner {
//             width: 34px;
//             height: 34px;
//             border: 3px solid #e8eee9;
//             border-top-color: ${GREEN};
//             border-radius: 50%;
//             animation: spin .8s linear infinite;
//           }

//           p {
//             margin: 0;
//             font-size: 13px;
//           }

//           @keyframes spin {
//             to {
//               transform: rotate(360deg);
//             }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   /* ========================================================
//      NO GROUP
//   ======================================================== */

//   if (!groupId || !group) {
//     return (
//       <div className="empty">
//         <div className="emptyIcon">
//           !
//         </div>

//         <h2>
//           Select a savings group
//         </h2>

//         <p>
//           Contributions must always be made
//           through a specific savings group.
//         </p>

//         <Link href="/groups">
//           View my groups
//         </Link>

//         <style jsx>{`
//           .empty {
//             max-width: 500px;
//             margin: 80px auto;
//             text-align: center;
//             color: ${NAVY};
//           }

//           .emptyIcon {
//             width: 56px;
//             height: 56px;
//             display: grid;
//             place-items: center;
//             margin: auto;
//             border-radius: 16px;
//             background: #f4f6f5;
//             color: ${GREEN};
//             font-weight: 800;
//           }

//           h2 {
//             margin: 15px 0 6px;
//             font-size: 22px;
//           }

//           p {
//             color: ${TEXT};
//             font-size: 13px;
//             line-height: 1.6;
//           }

//           a {
//             display: inline-block;
//             margin-top: 12px;
//             padding: 10px 16px;
//             border-radius: 8px;
//             background: ${GREEN};
//             color: white;
//             text-decoration: none;
//             font-size: 12px;
//             font-weight: 700;
//           }
//         `}</style>
//       </div>
//     );
//   }

//   /* ========================================================
//      SUCCESS / PENDING
//   ======================================================== */

//   if (step === "submitted") {
//     return (
//       <div className="submitted">
//         <div className="pendingIcon">
//           ✓
//         </div>

//         <div className="eyebrow">
//           CONTRIBUTION SUBMITTED
//         </div>

//         <h1>
//           Your contribution is awaiting confirmation
//         </h1>

//         <p className="lead">
//           Your transfer of{" "}
//           <strong>
//             {formatNaira(amount)}
//           </strong>{" "}
//           to{" "}
//           <strong>
//             {group.name}
//           </strong>{" "}
//           has been submitted for administrator
//           confirmation.
//         </p>

//         <div className="pendingCard">
//           <div>
//             <span>AMOUNT</span>
//             <strong>
//               {formatNaira(amount)}
//             </strong>
//           </div>

//           <div>
//             <span>STATUS</span>
//             <strong className="pending">
//               Pending confirmation
//             </strong>
//           </div>

//           <div>
//             <span>REFERENCE</span>
//             <strong>
//               {reference}
//             </strong>
//           </div>
//         </div>

//         <div className="important">
//           <strong>
//             What happens next?
//           </strong>

//           <p>
//             The cooperative administrator will
//             compare your payment proof with the
//             cooperative's bank records. Your
//             contribution will only count toward
//             your savings after it has been confirmed.
//           </p>
//         </div>

//         <div className="actions">
//           <Link href={`/groups/${group.id}`}>
//             Back to group
//           </Link>

//           <Link
//             href="/payments"
//             className="secondary"
//           >
//             Payment history
//           </Link>
//         </div>

//         <style jsx>{`
//           .submitted {
//             max-width: 620px;
//             margin: 60px auto;
//             padding: 0 20px 50px;
//             text-align: center;
//             color: ${NAVY};
//           }

//           .pendingIcon {
//             width: 72px;
//             height: 72px;
//             display: grid;
//             place-items: center;
//             margin: auto;
//             border-radius: 22px;
//             background: ${GREEN};
//             color: white;
//             font-size: 28px;
//             font-weight: 800;
//           }

//           .eyebrow {
//             margin-top: 18px;
//             color: ${GREEN};
//             font-size: 8px;
//             font-weight: 850;
//             letter-spacing: .12em;
//           }

//           h1 {
//             margin: 8px 0;
//             font-size: 30px;
//             letter-spacing: -.04em;
//             line-height: 1.1;
//           }

//           .lead {
//             color: ${TEXT};
//             font-size: 13px;
//             line-height: 1.7;
//           }

//           .pendingCard {
//             margin: 25px 0;
//             border: 1px solid ${BORDER};
//             border-radius: 12px;
//             overflow: hidden;
//             text-align: left;
//           }

//           .pendingCard > div {
//             padding: 15px;
//           }

//           .pendingCard > div + div {
//             border-top: 1px solid ${BORDER};
//           }

//           .pendingCard span {
//             display: block;
//             margin-bottom: 4px;
//             color: ${MUTED};
//             font-size: 7px;
//             font-weight: 800;
//           }

//           .pendingCard strong {
//             font-size: 11px;
//           }

//           .pendingCard .pending {
//             color: #825100;
//           }

//           .important {
//             padding: 15px;
//             border-radius: 10px;
//             background: #eff8f2;
//             text-align: left;
//           }

//           .important strong {
//             color: ${GREEN};
//             font-size: 9px;
//           }

//           .important p {
//             margin: 5px 0 0;
//             color: ${TEXT};
//             font-size: 9px;
//             line-height: 1.6;
//           }

//           .actions {
//             display: flex;
//             justify-content: center;
//             gap: 8px;
//             margin-top: 22px;
//           }

//           .actions a {
//             padding: 10px 15px;
//             border-radius: 8px;
//             background: ${GREEN};
//             color: white;
//             text-decoration: none;
//             font-size: 9px;
//             font-weight: 700;
//           }

//           .actions .secondary {
//             background: #f4f6f5;
//             color: ${TEXT};
//             border: 1px solid ${BORDER};
//           }
//         `}</style>
//       </div>
//     );
//   }

//   /* ========================================================
//      MAIN PAYMENT UI
//   ======================================================== */

//   return (
//     <div className="page">

//       <Link
//         href={`/groups/${group.id}`}
//         className="back"
//       >
//         ← Back to {group.name}
//       </Link>

//       <header>
//         <div className="eyebrow">
//           {step === "amount"
//             ? "CONTRIBUTION"
//             : step === "transfer"
//             ? "BANK TRANSFER"
//             : "PAYMENT PROOF"}
//         </div>

//         <h1>
//           Make a contribution
//         </h1>

//         <p>
//           Contribute directly to{" "}
//           <strong>
//             {group.name}
//           </strong>
//           .
//         </p>
//       </header>

//       {/* ====================================================
//           VERIFIED ACCOUNT NOTICE
//       ==================================================== */}

//       {canAcceptContribution ? (
//         <div className="verifiedBanner">
//           <div className="verifiedIcon">
//             ✓
//           </div>

//           <div>
//             <strong>
//               Kolo Verified cooperative
//             </strong>

//             <p>
//               The contribution account below is
//               the account submitted and approved
//               for this group.
//             </p>
//           </div>
//         </div>
//       ) : (
//         <div className="blockedBanner">
//           <div>!</div>

//           <div>
//             <strong>
//               Contributions unavailable
//             </strong>

//             <p>
//               This group has not completed Kolo
//               verification with an approved
//               contribution account.
//             </p>
//           </div>
//         </div>
//       )}

//       {/* ====================================================
//           STEP 1
//       ==================================================== */}

//       {step === "amount" && (
//         <section className="card">

//           <label>
//             <span>
//               Contribution amount
//             </span>

//             <div className="amountInput">
//               <b>₦</b>

//               <input
//                 type="number"
//                 value={amount || ""}
//                 onChange={(e) =>
//                   setAmount(
//                     Number(
//                       e.target.value
//                     )
//                   )
//                 }
//                 min="1"
//                 placeholder="50,000"
//               />
//             </div>
//           </label>

//           {group.contribution_amount ? (
//             <div className="suggestion">
//               Group contribution:
//               {" "}
//               <strong>
//                 {formatNaira(
//                   Number(
//                     group.contribution_amount
//                   )
//                 )}
//               </strong>
//             </div>
//           ) : null}

//           {error && (
//             <ErrorMessage
//               message={error}
//             />
//           )}

//           <button
//             className="primary"
//             onClick={
//               continueToTransfer
//             }
//             disabled={
//               !canAcceptContribution
//             }
//           >
//             Continue →
//           </button>
//         </section>
//       )}

//       {/* ====================================================
//           STEP 2
//       ==================================================== */}

//       {step === "transfer" && (
//         <section className="card">

//           <div className="transferHeader">
//             <div className="bankIcon">
//               account_balance
//             </div>

//             <div>
//               <h2>
//                 Transfer directly to the group
//               </h2>

//               <p>
//                 Kolo does not receive or hold
//                 this contribution.
//               </p>
//             </div>
//           </div>

//           <div className="amountCard">
//             <span>
//               TRANSFER EXACTLY
//             </span>

//             <strong>
//               {formatNaira(amount)}
//             </strong>
//           </div>

//           <div className="accountCard">

//             <div className="accountRow">
//               <span>
//                 BANK
//               </span>

//               <strong>
//                 {group.bank_name}
//               </strong>
//             </div>

//             <div className="accountRow">
//               <span>
//                 ACCOUNT NAME
//               </span>

//               <strong>
//                 {group.account_name}
//               </strong>
//             </div>

//             <div className="accountRow">
//               <span>
//                 ACCOUNT NUMBER
//               </span>

//               <div className="accountNumber">
//                 <strong>
//                   {group.account_number}
//                 </strong>

//                 <button
//                   onClick={
//                     copyAccountNumber
//                   }
//                 >
//                   {copied
//                     ? "✓ Copied"
//                     : "Copy"}
//                 </button>
//               </div>
//             </div>

//           </div>

//           <div className="securityNotice">
//             <span>
//               ✓
//             </span>

//             <p>
//               This account belongs to the
//               cooperative represented by this
//               group and has been submitted for
//               Kolo verification.
//             </p>
//           </div>

//           {error && (
//             <ErrorMessage
//               message={error}
//             />
//           )}

//           <div className="buttonRow">
//             <button
//               className="secondaryButton"
//               onClick={() =>
//                 setStep("amount")
//               }
//             >
//               ← Back
//             </button>

//             <button
//               className="primary"
//               onClick={
//                 continueToProof
//               }
//             >
//               I've made the transfer →
//             </button>
//           </div>

//           <p className="disclaimer">
//             Make the transfer from your own bank
//             account. Do not send cash to another
//             member.
//           </p>
//         </section>
//       )}

//       {/* ====================================================
//           STEP 3
//       ==================================================== */}

//       {step === "proof" && (
//         <section className="card">

//           <div className="transferHeader">
//             <div className="proofIcon">
//               receipt_long
//             </div>

//             <div>
//               <h2>
//                 Submit payment proof
//               </h2>

//               <p>
//                 Your contribution will remain
//                 pending until the group admin
//                 confirms receipt.
//               </p>
//             </div>
//           </div>

//           <label className="field">
//             <span>
//               Bank transaction reference
//             </span>

//             <input
//               value={reference}
//               onChange={(e) =>
//                 setReference(
//                   e.target.value
//                 )
//               }
//               placeholder="e.g. 1234567890"
//             />
//           </label>

//           <label className="field">
//             <span>
//               Transfer date
//             </span>

//             <input
//               type="date"
//               value={transferDate}
//               onChange={(e) =>
//                 setTransferDate(
//                   e.target.value
//                 )
//               }
//             />
//           </label>

//           <label className="upload">

//             <input
//               type="file"
//               accept=".jpg,.jpeg,.png,.webp,.pdf"
//               onChange={(e) =>
//                 handleProofFile(
//                   e.target.files?.[0] ||
//                     null
//                 )
//               }
//             />

//             <div className="uploadIcon">
//               upload_file
//             </div>

//             <strong>
//               {proofFile
//                 ? proofFile.name
//                 : "Upload payment receipt"}
//             </strong>

//             <span>
//               JPG, PNG, WEBP or PDF · Max 5MB
//             </span>

//           </label>

//           {proofPreview && (
//             <div className="preview">
//               <img
//                 src={proofPreview}
//                 alt="Payment proof preview"
//               />
//             </div>
//           )}

//           {error && (
//             <ErrorMessage
//               message={error}
//             />
//           )}

//           <div className="buttonRow">
//             <button
//               className="secondaryButton"
//               onClick={() =>
//                 setStep("transfer")
//               }
//               disabled={submitting}
//             >
//               ← Back
//             </button>

//             <button
//               className="primary"
//               onClick={
//                 submitContribution
//               }
//               disabled={submitting}
//             >
//               {submitting
//                 ? "Submitting..."
//                 : "Submit contribution"}
//             </button>
//           </div>

//           <div className="pendingExplanation">
//             <strong>
//               Your money is not marked as saved yet.
//             </strong>

//             <p>
//               Kolo records the contribution as
//               <b> Pending</b>. It becomes part of
//               your official savings record only after
//               the cooperative administrator confirms
//               the transfer.
//             </p>
//           </div>
//         </section>
//       )}

//       {/* ====================================================
//           HISTORY
//       ==================================================== */}

//       {step === "amount" && (
//         <section className="history">

//           <div className="historyHeader">
//             <div>
//               <h2>
//                 Recent contributions
//               </h2>

//               <p>
//                 Your contribution activity across
//                 Kolo groups.
//               </p>
//             </div>

//             <Link href="/groups">
//               My groups
//             </Link>
//           </div>

//           {historyLoading ? (
//             <div className="historyEmpty">
//               Loading...
//             </div>
//           ) : contributions.length ===
//             0 ? (
//             <div className="historyEmpty">
//               No contributions yet.
//             </div>
//           ) : (
//             <div className="historyList">
//               {contributions.map(
//                 (item) => (
//                   <div
//                     key={item.id}
//                     className="historyItem"
//                   >
//                     <div>
//                       <strong>
//                         {item.groups?.name ||
//                           "Savings group"}
//                       </strong>

//                       <span>
//                         {formatDate(
//                           item.created_at
//                         )}
//                       </span>
//                     </div>

//                     <div className="historyAmount">
//                       <strong>
//                         {formatNaira(
//                           Number(
//                             item.amount
//                           )
//                         )}
//                       </strong>

//                       <Status
//                         status={
//                           item.status
//                         }
//                       />
//                     </div>
//                   </div>
//                 )
//               )}
//             </div>
//           )}
//         </section>
//       )}

//       <footer>
//         Kolo provides contribution records and
//         trust information. Funds are transferred
//         directly between members and their
//         cooperative. Kolo does not hold member
//         savings.
//       </footer>

//       <style jsx>{`
//         .page {
//           max-width: 900px;
//           margin: 0 auto;
//           padding: 10px 0 50px;
//           color: ${NAVY};
//           font-family:
//             Inter,
//             Geist,
//             system-ui,
//             sans-serif;
//         }

//         .back {
//           display: inline-block;
//           margin-bottom: 20px;
//           color: ${GREEN};
//           text-decoration: none;
//           font-size: 12px;
//           font-weight: 700;
//         }

//         header {
//           margin-bottom: 20px;
//         }

//         .eyebrow {
//           color: ${GREEN};
//           font-size: 8px;
//           font-weight: 850;
//           letter-spacing: .14em;
//         }

//         header h1 {
//           margin: 7px 0 5px;
//           font-size: 32px;
//           line-height: 1;
//           letter-spacing: -.045em;
//         }

//         header p {
//           margin: 0;
//           color: ${TEXT};
//           font-size: 13px;
//         }

//         .verifiedBanner,
//         .blockedBanner {
//           display: flex;
//           gap: 12px;
//           align-items: center;
//           padding: 13px 15px;
//           margin-bottom: 14px;
//           border-radius: 10px;
//         }

//         .verifiedBanner {
//           border: 1px solid #cfe6d7;
//           background: #eff8f2;
//         }

//         .blockedBanner {
//           border: 1px solid #eadfbd;
//           background: #fffaf0;
//         }

//         .verifiedIcon,
//         .blockedBanner > div:first-child {
//           width: 28px;
//           height: 28px;
//           display: grid;
//           place-items: center;
//           flex: 0 0 auto;
//           border-radius: 8px;
//           background: ${GREEN};
//           color: #fff;
//           font-size: 11px;
//           font-weight: 800;
//         }

//         .blockedBanner > div:first-child {
//           background: #825100;
//         }

//         .verifiedBanner strong,
//         .blockedBanner strong {
//           display: block;
//           font-size: 9px;
//         }

//         .verifiedBanner strong {
//           color: ${GREEN};
//         }

//         .blockedBanner strong {
//           color: #825100;
//         }

//         .verifiedBanner p,
//         .blockedBanner p {
//           margin: 3px 0 0;
//           color: ${TEXT};
//           font-size: 8px;
//           line-height: 1.5;
//         }

//         .card {
//           max-width: 620px;
//           padding: 26px;
//           border: 1px solid ${BORDER};
//           border-radius: 14px;
//           background: #fff;
//           box-shadow:
//             0 8px 30px
//             rgba(11, 28, 48, .045);
//         }

//         label > span,
//         .field > span {
//           display: block;
//           margin-bottom: 7px;
//           color: ${NAVY};
//           font-size: 9px;
//           font-weight: 750;
//         }

//         .amountInput {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           padding: 13px 14px;
//           border: 1px solid ${BORDER};
//           border-radius: 10px;
//         }

//         .amountInput b {
//           color: ${GREEN};
//           font-size: 20px;
//         }

//         .amountInput input {
//           width: 100%;
//           border: 0;
//           outline: 0;
//           color: ${NAVY};
//           font-size: 25px;
//           font-weight: 800;
//         }

//         .suggestion {
//           margin-top: 9px;
//           color: ${MUTED};
//           font-size: 9px;
//         }

//         .suggestion strong {
//           color: ${GREEN};
//         }

//         .primary {
//           width: 100%;
//           margin-top: 18px;
//           padding: 13px 16px;
//           border: 0;
//           border-radius: 9px;
//           background: ${GREEN};
//           color: #fff;
//           cursor: pointer;
//           font-size: 10px;
//           font-weight: 800;
//         }

//         .primary:disabled {
//           opacity: .45;
//           cursor: not-allowed;
//         }

//         .transferHeader {
//           display: flex;
//           gap: 12px;
//           margin-bottom: 20px;
//         }

//         .bankIcon,
//         .proofIcon {
//           width: 43px;
//           height: 43px;
//           display: grid;
//           place-items: center;
//           flex: 0 0 auto;
//           border-radius: 12px;
//           background: #eff8f2;
//           color: ${GREEN};
//           font-size: 10px;
//           font-weight: 800;
//         }

//         .transferHeader h2 {
//           margin: 0 0 4px;
//           font-size: 17px;
//           letter-spacing: -.02em;
//         }

//         .transferHeader p {
//           margin: 0;
//           color: ${TEXT};
//           font-size: 9px;
//           line-height: 1.5;
//         }

//         .amountCard {
//           padding: 18px;
//           margin-bottom: 13px;
//           border-radius: 10px;
//           background: ${GREEN};
//           color: white;
//           text-align: center;
//         }

//         .amountCard span {
//           display: block;
//           margin-bottom: 5px;
//           opacity: .7;
//           font-size: 7px;
//           font-weight: 800;
//           letter-spacing: .12em;
//         }

//         .amountCard strong {
//           font-size: 26px;
//         }

//         .accountCard {
//           padding: 4px 15px;
//           border: 1px solid ${BORDER};
//           border-radius: 11px;
//         }

//         .accountRow {
//           padding: 13px 0;
//         }

//         .accountRow + .accountRow {
//           border-top: 1px solid ${BORDER};
//         }

//         .accountRow > span {
//           display: block;
//           margin-bottom: 5px;
//           color: ${MUTED};
//           font-size: 7px;
//           font-weight: 800;
//           letter-spacing: .05em;
//         }

//         .accountRow > strong {
//           color: ${NAVY};
//           font-size: 11px;
//         }

//         .accountNumber {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           gap: 10px;
//         }

//         .accountNumber strong {
//           font-family:
//             "Geist Mono",
//             monospace;
//           font-size: 18px;
//           letter-spacing: .04em;
//         }

//         .accountNumber button {
//           padding: 7px 10px;
//           border: 1px solid ${GREEN};
//           border-radius: 7px;
//           background: white;
//           color: ${GREEN};
//           cursor: pointer;
//           font-size: 8px;
//           font-weight: 750;
//         }

//         .securityNotice,
//         .pendingExplanation {
//           display: flex;
//           gap: 8px;
//           margin-top: 13px;
//           padding: 11px;
//           border-radius: 8px;
//           background: #eff8f2;
//         }

//         .securityNotice span {
//           color: ${GREEN};
//           font-weight: 900;
//         }

//         .securityNotice p,
//         .pendingExplanation p {
//           margin: 0;
//           color: ${TEXT};
//           font-size: 8px;
//           line-height: 1.6;
//         }

//         .buttonRow {
//           display: flex;
//           gap: 8px;
//           margin-top: 18px;
//         }

//         .buttonRow .primary {
//           margin-top: 0;
//         }

//         .secondaryButton {
//           min-width: 90px;
//           padding: 11px 13px;
//           border: 1px solid ${BORDER};
//           border-radius: 8px;
//           background: #f7f9f8;
//           color: ${TEXT};
//           cursor: pointer;
//           font-size: 9px;
//           font-weight: 750;
//         }

//         .disclaimer {
//           margin: 12px 0 0;
//           color: ${MUTED};
//           text-align: center;
//           font-size: 7px;
//         }

//         .field {
//           display: block;
//           margin-bottom: 15px;
//         }

//         .field input {
//           width: 100%;
//           box-sizing: border-box;
//           padding: 11px;
//           border: 1px solid ${BORDER};
//           border-radius: 8px;
//           outline: none;
//           color: ${NAVY};
//           font-size: 10px;
//         }

//         .field input:focus {
//           border-color: #87b998;
//           box-shadow:
//             0 0 0 3px #eff8f2;
//         }

//         .upload {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           min-height: 145px;
//           margin-top: 10px;
//           border: 1px dashed #aac7b4;
//           border-radius: 10px;
//           background: #fbfdfb;
//           cursor: pointer;
//           text-align: center;
//         }

//         .upload input {
//           display: none;
//         }

//         .uploadIcon {
//           margin-bottom: 8px;
//           color: ${GREEN};
//           font-size: 25px;
//         }

//         .upload strong {
//           color: ${NAVY};
//           font-size: 10px;
//         }

//         .upload > span {
//           margin-top: 4px;
//           color: ${MUTED};
//           font-size: 7px;
//         }

//         .preview {
//           margin-top: 12px;
//           border: 1px solid ${BORDER};
//           border-radius: 9px;
//           overflow: hidden;
//         }

//         .preview img {
//           display: block;
//           width: 100%;
//           max-height: 280px;
//           object-fit: contain;
//         }

//         .pendingExplanation {
//           margin-top: 15px;
//           display: block;
//         }

//         .pendingExplanation strong {
//           color: ${GREEN};
//           font-size: 8px;
//         }

//         .pendingExplanation p {
//           margin-top: 4px;
//         }

//         .history {
//           margin-top: 35px;
//         }

//         .historyHeader {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           margin-bottom: 12px;
//         }

//         .historyHeader h2 {
//           margin: 0 0 4px;
//           font-size: 17px;
//         }

//         .historyHeader p {
//           margin: 0;
//           color: ${TEXT};
//           font-size: 9px;
//         }

//         .historyHeader a {
//           color: ${GREEN};
//           text-decoration: none;
//           font-size: 9px;
//           font-weight: 750;
//         }

//         .historyList {
//           border: 1px solid ${BORDER};
//           border-radius: 11px;
//           overflow: hidden;
//           background: #fff;
//         }

//         .historyItem {
//           display: flex;
//           justify-content: space-between;
//           gap: 15px;
//           padding: 14px;
//         }

//         .historyItem + .historyItem {
//           border-top: 1px solid ${BORDER};
//         }

//         .historyItem > div:first-child strong,
//         .historyItem > div:first-child span {
//           display: block;
//         }

//         .historyItem > div:first-child strong {
//           font-size: 9px;
//         }

//         .historyItem > div:first-child span {
//           margin-top: 4px;
//           color: ${MUTED};
//           font-size: 7px;
//         }

//         .historyAmount {
//           text-align: right;
//         }

//         .historyAmount > strong {
//           display: block;
//           margin-bottom: 5px;
//           color: ${GREEN};
//           font-size: 10px;
//         }

//         .historyEmpty {
//           padding: 35px;
//           border: 1px solid ${BORDER};
//           border-radius: 11px;
//           background: #fff;
//           color: ${MUTED};
//           text-align: center;
//           font-size: 9px;
//         }

//         footer {
//           max-width: 620px;
//           margin-top: 18px;
//           color: ${MUTED};
//           font-size: 7px;
//           line-height: 1.6;
//         }

//         @media (max-width: 650px) {
//           .page {
//             padding:
//               10px
//               14px
//               40px;
//           }

//           .card {
//             padding: 18px;
//           }

//           header h1 {
//             font-size: 27px;
//           }

//           .buttonRow {
//             flex-direction: column;
//           }

//           .secondaryButton {
//             width: 100%;
//           }

//           .accountNumber {
//             align-items: flex-start;
//             flex-direction: column;
//           }

//           .historyItem {
//             align-items: flex-start;
//             flex-direction: column;
//           }

//           .historyAmount {
//             text-align: left;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ============================================================
//    ERROR
// ============================================================ */

// function ErrorMessage({
//   message,
// }: {
//   message: string;
// }) {
//   return (
//     <div className="errorMessage">
//       <span>!</span>
//       {message}

//       <style jsx>{`
//         .errorMessage {
//           display: flex;
//           align-items: center;
//           gap: 7px;
//           margin-top: 12px;
//           padding: 10px;
//           border-radius: 8px;
//           background: #fff8eb;
//           border: 1px solid #eadfbd;
//           color: #825100;
//           font-size: 8px;
//           line-height: 1.5;
//         }

//         .errorMessage span {
//           width: 18px;
//           height: 18px;
//           display: grid;
//           place-items: center;
//           flex: 0 0 auto;
//           border-radius: 50%;
//           background: #f1e4bf;
//           font-weight: 800;
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ============================================================
//    STATUS
// ============================================================ */

// function Status({
//   status,
// }: {
//   status: string;
// }) {
//   const completed =
//     status === "completed";

//   const rejected =
//     status === "rejected";

//   return (
//     <span
//       style={{
//         display: "inline-block",
//         padding: "3px 7px",
//         borderRadius: "20px",
//         background: completed
//           ? "#eff8f2"
//           : rejected
//           ? "#fff1f1"
//           : "#fff8eb",
//         color: completed
//           ? "#006b2c"
//           : rejected
//           ? "#a12b2b"
//           : "#825100",
//         fontSize: "7px",
//         fontWeight: 750,
//       }}
//     >
//       {completed
//         ? "✓ Completed"
//         : rejected
//         ? "Rejected"
//         : "Pending"}
//     </span>
//   );
// }

// /* ============================================================
//    PAGE
// ============================================================ */

// export default function PaymentsPage() {
//   return (
//     <Suspense
//       fallback={
//         <div
//           style={{
//             padding: 40,
//             textAlign: "center",
//           }}
//         >
//           Loading...
//         </div>
//       }
//     >
//       <PaymentsContent />
//     </Suspense>
//   );
// }


// // "use client";

// // import { Suspense, useState, useEffect, useCallback } from "react";
// // import { useSearchParams } from "next/navigation";
// // import { createClient } from "@/lib/supabase/client";
// // import Link from "next/link";

// // function PaymentsContent() {
// //   const searchParams = useSearchParams();
// //   const supabase = createClient();

// //   const groupId = searchParams.get("groupId") || "";
// //   const urlAmount = Number(searchParams.get("amount")) || 0;
// //   const hasTrigger = !!groupId;

// //   // Payment states
// //   const [paymentStep, setPaymentStep] = useState<"select" | "details" | "processing" | "success">("select");
// //   const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
// //   const [virtualAccount, setVirtualAccount] = useState<any>(null);
// //   const [paymentLoading, setPaymentLoading] = useState(false);
// //   const [copied, setCopied] = useState(false);
// //   const [transactionRef, setTransactionRef] = useState("");
// //   const [group, setGroup] = useState<any>(null);
// //   const [amount, setAmount] = useState(urlAmount || 50000);

// //   // History states
// //   const [transactions, setTransactions] = useState<any[]>([]);
// //   const [contributions, setContributions] = useState<any[]>([]);
// //   const [historyLoading, setHistoryLoading] = useState(true);
// //   const [totalSaved, setTotalSaved] = useState(0);
// //   const [pendingAmount, setPendingAmount] = useState(0);

// //   const formatNaira = (a: number) => `₦${a.toLocaleString("en-NG")}`;
// //   const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

// //   const fetchHistory = useCallback(async () => {
// //     const { data: { user } } = await supabase.auth.getUser();
// //     if (!user) return;
// //     const { data: txData } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
// //     const { data: contribData } = await supabase.from("contributions").select("*, groups(name)").eq("user_id", user.id).order("created_at", { ascending: false });
// //     setTransactions(txData || []);
// //     setContributions(contribData || []);
// //     setTotalSaved((contribData || []).filter((c: any) => c.status === "completed").reduce((s: number, c: any) => s + c.amount, 0));
// //     setPendingAmount((contribData || []).filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount, 0));
// //     setHistoryLoading(false);
// //   }, [supabase]);

// //   useEffect(() => {
// //     if (groupId) {
// //       supabase.from("groups").select("*").eq("id", groupId).single().then(({ data }) => {
// //         if (data) { setGroup(data); setAmount(data.contribution_amount || urlAmount || 50000); }
// //       });
// //     }
// //   }, [groupId, supabase, urlAmount]);

// //   useEffect(() => {
// //     fetchHistory();
// //   }, [fetchHistory, paymentStep]);

// //   const createVirtualAccount = async () => {
// //     setPaymentLoading(true);
// //     const res = await fetch("/api/monnify/virtual-account", {
// //       method: "POST", headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ groupId, amount }),
// //     });
// //     const data = await res.json();
// //     if (data.success) { setVirtualAccount(data.account); setTransactionRef(data.reference); setPaymentStep("details"); }
// //     setPaymentLoading(false);
// //   };

// //   // 🔥 TEST WEBHOOK — Simulates Monnify confirming the payment
// //   const triggerTestWebhook = async () => {
// //     setPaymentStep("processing");
    
// //     setTimeout(async () => {
// //       try {
// //         await fetch("/api/monnify/webhook", {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           body: JSON.stringify({
// //             testMode: true,
// //             paymentReference: transactionRef,
// //             groupId: groupId,
// //             amount: amount,
// //           }),
// //         });
        
// //         setTimeout(() => {
// //           setPaymentStep("success");
// //           fetchHistory();
// //         }, 1000);
// //       } catch (err) {
// //         console.error("Webhook error:", err);
// //         setTimeout(() => setPaymentStep("success"), 2000);
// //       }
// //     }, 2000);
// //   };

// //   const paymentMethods = [
// //     { id: "transfer", icon: "account_balance", title: "Bank Transfer", desc: "Get virtual account details to transfer from your bank app", tag: "Recommended", color: "#006b2c" },
// //     { id: "card", icon: "credit_card", title: "Debit/Credit Card", desc: "Pay instantly with your Mastercard, Visa, or Verve card", tag: "Instant", color: "#825100" },
// //     { id: "ussd", icon: "smartphone", title: "USSD Transfer", desc: "Dial a code from your phone to complete payment", tag: "No Internet", color: "#565e74" },
// //     { id: "qr", icon: "qr_code", title: "QR Code Payment", desc: "Scan QR code with your banking app", tag: "Quick", color: "#653e00" },
// //   ];

// //   const isMakingPayment = hasTrigger && paymentStep !== "success";

// //   return (
// //     <div style={{ maxWidth: "900px", margin: "0 auto" }}>
// //       {/* ================================================================ */}
// //       {/* PAYMENT FLOW — Only when triggered from a group */}
// //       {/* ================================================================ */}
// //       {hasTrigger && (
// //         <div style={{ marginBottom: "32px" }}>
// //           <Link href={`/groups/${groupId}`} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#006b2c", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", marginBottom: "24px" }}>
// //             <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span> Back to {group?.name || "Group"}
// //           </Link>

// //           {/* STEP 1: SELECT METHOD */}
// //           {paymentStep === "select" && (
// //             <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "40px", maxWidth: "560px" }}>
// //               <div style={{ textAlign: "center", marginBottom: "24px" }}>
// //                 <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #006b2c, #00873a)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(0,107,44,0.2)" }}>
// //                   <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "36px" }}>account_balance_wallet</span>
// //                 </div>
// //                 <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#0b1c30", marginBottom: "4px" }}>Make Contribution</h2>
// //                 <p style={{ color: "#565e74", fontSize: "15px" }}>{group?.name || "Savings Group"}</p>
// //               </div>

// //               {/* Monnify Branding */}
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
// //                 <span style={{ fontSize: "11px", color: "#6e7b6c", fontWeight: 500 }}>Payments powered by</span>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8f9ff", padding: "4px 10px", borderRadius: "6px" }}>
// //                   <img src="/monnifylogo.svg" alt="Monnify" style={{ height: "16px", opacity: 0.8 }} />
// //                 </div>
// //               </div>

// //               {/* Amount Card */}
// //               <div style={{ background: "linear-gradient(135deg, #006b2c 0%, #0b5c2a 50%, #00873a 100%)", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "28px", position: "relative", overflow: "hidden" }}>
// //                 <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
// //                 <div style={{ position: "absolute", bottom: "-20px", left: "-20px", width: "80px", height: "80px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
// //                 <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", position: "relative" }}>Contribution Amount</p>
// //                 <p style={{ fontSize: "40px", fontWeight: 800, color: "#fff", position: "relative", letterSpacing: "-0.02em" }}>{formatNaira(amount)}</p>
// //               </div>

// //               {/* Payment Methods */}
// //               <p style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Select Payment Method</p>
// //               <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
// //                 {paymentMethods.map((method) => (
// //                   <button key={method.id} onClick={() => setSelectedMethod(method.id)}
// //                     style={{
// //                       padding: "18px 20px", borderRadius: "12px",
// //                       border: selectedMethod === method.id ? `2px solid ${method.color}` : "1px solid rgba(189,202,186,0.3)",
// //                       background: selectedMethod === method.id ? `${method.color}08` : "#fafbfc",
// //                       cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "16px",
// //                       transition: "all 0.2s ease", position: "relative",
// //                     }}>
// //                     <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: selectedMethod === method.id ? `${method.color}15` : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //                       <span className="material-symbols-outlined" style={{ color: method.color, fontSize: "24px" }}>{method.icon}</span>
// //                     </div>
// //                     <div style={{ flex: 1 }}>
// //                       <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
// //                         <span style={{ fontWeight: 600, fontSize: "15px", color: "#0b1c30" }}>{method.title}</span>
// //                         <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: `${method.color}12`, color: method.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{method.tag}</span>
// //                       </div>
// //                       <p style={{ fontSize: "12px", color: "#6e7b6c", margin: 0 }}>{method.desc}</p>
// //                     </div>
// //                     {selectedMethod === method.id && (
// //                       <span className="material-symbols-outlined" style={{ color: method.color, fontSize: "22px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
// //                     )}
// //                   </button>
// //                 ))}
// //               </div>

// //               <button onClick={createVirtualAccount} disabled={!selectedMethod || paymentLoading}
// //                 style={{ width: "100%", padding: "18px", background: selectedMethod ? "linear-gradient(135deg, #006b2c, #00873a)" : "#e5eeff", color: selectedMethod ? "#fff" : "#6e7b6c", borderRadius: "12px", border: "none", cursor: selectedMethod ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "16px", boxShadow: selectedMethod ? "0 8px 24px rgba(0,107,44,0.25)" : "none", transition: "all 0.3s ease" }}>
// //                 {paymentLoading ? (
// //                   <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
// //                     <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite", fontSize: "20px" }}>sync</span> Generating Account...
// //                   </span>
// //                 ) : "Proceed to Payment"}
// //               </button>
// //             </div>
// //           )}

// //           {/* STEP 2: PAYMENT DETAILS */}
// //           {paymentStep === "details" && virtualAccount && (
// //             <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "40px", maxWidth: "560px" }}>
// //               {/* Monnify Logo */}
// //               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "24px", padding: "8px 16px", background: "#f8f9ff", borderRadius: "20px", width: "fit-content", margin: "0 auto 24px" }}>
// //                 <span style={{ fontSize: "11px", color: "#6e7b6c", fontWeight: 500 }}>Secured by</span>
// //                 <img src="/monnifylogo.svg" alt="Monnify" style={{ height: "16px", opacity: 0.8 }} />
// //               </div>

// //               <div style={{ textAlign: "center", marginBottom: "28px" }}>
// //                 <div style={{ width: "64px", height: "64px", background: "rgba(0,107,44,0.1)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
// //                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>account_balance</span>
// //                 </div>
// //                 <h2 style={{ fontSize: "22px", fontWeight: 700 }}>Bank Transfer Details</h2>
// //                 <p style={{ color: "#565e74", fontSize: "14px" }}>Transfer exactly {formatNaira(amount)} to the account below</p>
// //               </div>

// //               <div style={{ textAlign: "center", marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "12px", border: "1px solid rgba(0,107,44,0.15)" }}>
// //                 <p style={{ fontSize: "11px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Amount to Transfer</p>
// //                 <p style={{ fontSize: "28px", fontWeight: 800, color: "#006b2c" }}>{formatNaira(amount)}</p>
// //               </div>

// //               <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "24px", border: "1px solid rgba(189,202,186,0.2)" }}>
// //                 {[
// //                   { label: "Bank", value: virtualAccount.bankName },
// //                   { label: "Account Number", value: virtualAccount.accountNumber, copy: true },
// //                   { label: "Account Name", value: virtualAccount.accountName },
// //                 ].map((row, i) => (
// //                   <div key={row.label} style={{ padding: i === 0 ? "0 0 16px 0" : i === 1 ? "16px 0" : "16px 0 0 0", borderBottom: i < 2 ? "1px solid rgba(189,202,186,0.15)" : "none" }}>
// //                     <p style={{ fontSize: "11px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{row.label}</p>
// //                     {row.copy ? (
// //                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// //                         <p style={{ fontSize: "26px", fontWeight: 700, color: "#0b1c30", letterSpacing: "0.06em", fontFamily: "'Geist Mono', monospace" }}>{row.value}</p>
// //                         <button onClick={() => { navigator.clipboard.writeText(row.value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
// //                           style={{ padding: "10px 18px", background: copied ? "#006b2c" : "#fff", color: copied ? "#fff" : "#006b2c", borderRadius: "8px", border: copied ? "none" : "1px solid #006b2c", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "all 0.2s" }}>
// //                           {copied ? "✓ Copied" : "Copy"}
// //                         </button>
// //                       </div>
// //                     ) : (
// //                       <p style={{ fontSize: "16px", fontWeight: 600, color: "#0b1c30" }}>{row.value}</p>
// //                     )}
// //                   </div>
// //                 ))}
// //               </div>

// //               <div style={{ marginTop: "20px", padding: "14px 18px", background: "rgba(130,81,0,0.06)", borderRadius: "10px", display: "flex", alignItems: "flex-start", gap: "10px", border: "1px solid rgba(130,81,0,0.1)" }}>
// //                 <span className="material-symbols-outlined" style={{ color: "#825100", fontSize: "18px", flexShrink: 0 }}>info</span>
// //                 <p style={{ fontSize: "12px", color: "#653e00", lineHeight: 1.5, margin: 0 }}>Transfer the exact amount above. Your contribution will be verified automatically.</p>
// //               </div>

// //               <button onClick={triggerTestWebhook}
// //                 style={{ width: "100%", marginTop: "24px", padding: "16px", background: "#006b2c", color: "#fff", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 16px rgba(0,107,44,0.2)" }}>
// //                 I've Made This Transfer
// //               </button>
// //             </div>
// //           )}

// //           {/* STEP 3: PROCESSING */}
// //           {paymentStep === "processing" && (
// //             <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "60px 40px", textAlign: "center", maxWidth: "500px" }}>
// //               <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #00873a, #006b2c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 40px rgba(0,107,44,0.3)", animation: "pulse-emerald 2s ease-in-out infinite" }}>
// //                 <span className="material-symbols-outlined" style={{ fontSize: "44px", color: "#fff", animation: "spin 2s linear infinite" }}>sync</span>
// //               </div>
// //               <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px", color: "#0b1c30" }}>Verifying Payment</h2>
// //               <p style={{ color: "#565e74", fontSize: "15px", marginBottom: "28px" }}>Confirming your {formatNaira(amount)} contribution to {group?.name}...</p>
// //               <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
// //                 {[0, 1, 2].map((i) => (
// //                   <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#006b2c", animation: `pulse ${1 + i * 0.2}s ease-in-out infinite` }} />
// //                 ))}
// //               </div>
// //               <div style={{ marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: 0.6 }}>
// //                 <span style={{ fontSize: "11px", color: "#6e7b6c" }}>Verified by</span>
// //                 <img src="/monnifylogo.svg" alt="Monnify" style={{ height: "16px", opacity: 0.8 }} />
// //               </div>
// //             </div>
// //           )}

// //           {/* STEP 4: SUCCESS */}
// //           {paymentStep === "success" && (
// //             <div style={{ background: "#ffffff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 8px 32px rgba(15,23,42,0.08)", borderRadius: "20px", padding: "60px 40px", textAlign: "center", maxWidth: "500px", marginBottom: "32px" }}>
// //               <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #006b2c, #00873a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 0 40px rgba(0,107,44,0.3)", animation: "check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
// //                 <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#fff" }}>check</span>
// //               </div>
// //               <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#0b1c30", marginBottom: "8px" }}>Payment Successful! 🎉</h2>
// //               <p style={{ color: "#565e74", fontSize: "15px", marginBottom: "8px" }}>
// //                 <strong style={{ color: "#006b2c" }}>{formatNaira(amount)}</strong> has been added to <strong>{group?.name}</strong>
// //               </p>
// //               <p style={{ color: "#6e7b6c", fontSize: "13px", marginBottom: "28px" }}>Transaction Ref: {transactionRef?.slice(0, 18)}</p>
// //               <Link href={`/groups/${groupId}`}
// //                 style={{ display: "inline-block", padding: "16px 40px", background: "linear-gradient(135deg, #006b2c, #00873a)", color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,107,44,0.25)" }}>
// //                 Back to Group →
// //               </Link>
// //               <p style={{ fontSize: "11px", color: "#bdcaba", marginTop: "20px" }}>💡 Demo mode: Webhook auto-confirmed this payment</p>
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {/* ================================================================ */}
// //       {/* HISTORY — Shown when NOT in active payment */}
// //       {/* ================================================================ */}
// //       {!isMakingPayment && (
// //         <div>
// //           <div style={{ marginBottom: "28px" }}>
// //             <h2 style={{ fontSize: "28px", fontWeight: 800, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>
// //               {hasTrigger && paymentStep === "success" ? "Your Payment History" : "Payments & Transactions"}
// //             </h2>
// //             <p style={{ color: "#3e4a3d", fontSize: "15px" }}>Track all your contributions and payouts across groups.</p>
// //           </div>

// //           {/* Quick Stats */}
// //           {!historyLoading && (
// //             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "28px" }}>
// //               {[
// //                 { label: "Total Contributed", value: formatNaira(totalSaved), color: "#006b2c", icon: "savings", bg: "rgba(0,107,44,0.06)" },
// //                 { label: "Pending", value: formatNaira(pendingAmount), color: "#825100", icon: "schedule", bg: "rgba(130,81,0,0.06)" },
// //                 { label: "Transactions", value: transactions.length.toString(), color: "#565e74", icon: "receipt_long", bg: "rgba(86,94,116,0.06)" },
// //               ].map((stat) => (
// //                 <div key={stat.label} style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "16px", padding: "24px", transition: "transform 0.2s", cursor: "default" }}
// //                   onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
// //                   onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
// //                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
// //                     <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{stat.label}</span>
// //                     <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
// //                       <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: "22px" }}>{stat.icon}</span>
// //                     </div>
// //                   </div>
// //                   <p style={{ fontSize: "30px", fontWeight: 800, color: stat.color }}>{stat.value}</p>
// //                 </div>
// //               ))}
// //             </div>
// //           )}

// //           {/* Contribution History */}
// //           <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
// //             <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(189,202,186,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// //               <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Contribution History</h3>
// //               <span style={{ fontSize: "12px", color: "#6e7b6c", fontWeight: 500 }}>{contributions.length} records</span>
// //             </div>
// //             <div style={{ overflowX: "auto" }}>
// //               {contributions.length === 0 ? (
// //                 <div style={{ padding: "60px 24px", textAlign: "center" }}>
// //                   <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "12px", color: "#bdcaba" }}>payments</span>
// //                   <p style={{ color: "#6e7b6c", fontSize: "14px" }}>No contributions yet. Join a group to start saving!</p>
// //                 </div>
// //               ) : (
// //                 <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
// //                   <thead><tr style={{ backgroundColor: "#f8fafc", fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}><th style={{ padding: "14px 24px" }}>Group</th><th style={{ padding: "14px 24px" }}>Amount</th><th style={{ padding: "14px 24px" }}>Date</th><th style={{ padding: "14px 24px" }}>Status</th><th style={{ padding: "14px 24px" }}>Ref</th></tr></thead>
// //                   <tbody>
// //                     {contributions.map((c: any) => (
// //                       <tr key={c.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.1)", transition: "background 0.15s" }}
// //                         onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
// //                         onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
// //                         <td style={{ padding: "14px 24px", fontSize: "14px", fontWeight: 500 }}>{c.groups?.name || "—"}</td>
// //                         <td style={{ padding: "14px 24px", fontWeight: 600, color: "#006b2c", fontSize: "14px" }}>{formatNaira(c.amount)}</td>
// //                         <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(c.created_at)}</td>
// //                         <td style={{ padding: "14px 24px" }}>
// //                           <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.status === "completed" ? "#f0fdf4" : "#fefce8", color: c.status === "completed" ? "#006b2c" : "#825100" }}>
// //                             {c.status === "completed" ? "✓ Completed" : "⏳ Pending"}
// //                           </span>
// //                         </td>
// //                         <td style={{ padding: "14px 24px", fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "#6e7b6c" }}>{c.transaction_ref?.slice(0, 14) || "—"}</td>
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default function PaymentsPage() {
// //   return (
// //     <Suspense fallback={<div>Loading...</div>}>
// //       <PaymentsContent />
// //     </Suspense>
// //   );
// // }
