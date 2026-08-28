"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Group = {
  id: string;
  name: string;
  pool_amount?: number | string | null;
  member_count?: number | null;
  next_payout_date?: string | null;
  rotation_order?: string[] | null;
  current_rotation_index?: number | null;
};

type Contribution = {
  id: string;
  amount: number | string;
  status: string;
  group_id: string;
  user_id: string;
  transaction_ref?: string | null;
  proof_url?: string | null;
  transfer_date?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at: string;
};

type Payout = {
  id: string;
  group_id: string;
  recipient_user_id?: string | null;
  amount: number | string;
  cycle_number?: number | null;
  status: string;
  payout_date?: string | null;
  reference?: string | null;
  note?: string | null;
  created_at: string;
};

const supabase = createClient();

const GREEN = "#006b2c";
const NAVY = "#0b1c30";
const TEXT = "#565e74";
const MUTED = "#718096";
const BORDER = "#e2e8f0";

export default function PaymentReviewPage() {
  const [userId, setUserId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [processingId, setProcessingId] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const [proofUrl, setProofUrl] = useState("");
  const [proofLoading, setProofLoading] = useState(false);

  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);

  const selectedGroup = useMemo(
    () =>
      groups.find(
        (group) => group.id === selectedGroupId
      ) || null,
    [groups, selectedGroupId]
  );

  const pendingPayments = contributions.filter(
    (item) => item.status === "pending"
  );

  const reviewedPayments = contributions.filter(
    (item) => item.status !== "pending"
  );

  const completedPayments = contributions.filter(
    (item) => item.status === "completed"
  );

  const pendingTotal = pendingPayments.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

  const completedTotal = completedPayments.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

  function money(value: number | string | null | undefined) {
    return `₦${Number(value || 0).toLocaleString("en-NG")}`;
  }

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const loadGroupData = useCallback(
    async (groupId: string) => {
      if (!groupId) return;

      const {
        data: contributionData,
        error: contributionError,
      } = await supabase
        .from("contributions")
        .select(`
          id,
          amount,
          status,
          group_id,
          user_id,
          transaction_ref,
          proof_url,
          transfer_date,
          submitted_at,
          reviewed_at,
          reviewed_by,
          review_note,
          created_at
        `)
        .eq("group_id", groupId)
        .order("created_at", {
          ascending: false,
        });

      if (contributionError) {
        throw contributionError;
      }

      setContributions(
        (contributionData || []) as Contribution[]
      );

      const {
        data: payoutData,
        error: payoutError,
      } = await supabase
        .from("payouts")
        .select(`
          id,
          group_id,
          recipient_user_id,
          amount,
          cycle_number,
          status,
          payout_date,
          reference,
          note,
          created_at
        `)
        .eq("group_id", groupId)
        .order("created_at", {
          ascending: false,
        });

      if (payoutError) {
        console.warn(
          "Payout loading error:",
          payoutError
        );

        setPayouts([]);
      } else {
        setPayouts(
          (payoutData || []) as Payout[]
        );
      }
    },
    []
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("group_members")
        .select(`
          group_id,
          role,
          groups(
            id,
            name,
            pool_amount,
            member_count,
            next_payout_date,
            rotation_order,
            current_rotation_index
          )
        `)
        .eq("user_id", user.id)
        .in("role", [
          "admin",
          "administrator",
          "owner",
          "treasurer",
        ]);

      if (membershipError) {
        throw membershipError;
      }

      const adminGroups = (memberships || [])
        .map((item: any) => item.groups)
        .filter(Boolean) as Group[];

      setGroups(adminGroups);

      if (!adminGroups.length) {
        setSelectedGroupId("");
        setContributions([]);
        setPayouts([]);
        return;
      }

      const groupStillValid =
        selectedGroupId &&
        adminGroups.some(
          (group) =>
            group.id === selectedGroupId
        );

      const groupId = groupStillValid
        ? selectedGroupId
        : adminGroups[0].id;

      setSelectedGroupId(groupId);

      await loadGroupData(groupId);
    } catch (err: any) {
      console.error(
        "Payment review loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load payment review."
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedGroupId,
    loadGroupData,
  ]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function reviewPayment(
    contribution: Contribution,
    status: "completed" | "rejected"
  ) {
    setError("");
    setSuccess("");

    if (!userId) {
      setError(
        "Your session has expired."
      );
      return;
    }

    if (
      status === "rejected" &&
      !reviewNote.trim()
    ) {
      setError(
        "Please provide a reason before rejecting the payment."
      );
      return;
    }

    setProcessingId(
      contribution.id
    );

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("contributions")
        .update({
          status,
          reviewed_at:
            new Date().toISOString(),
          reviewed_by: userId,
          review_note:
            reviewNote.trim() || null,
        })
        .eq("id", contribution.id)
        .eq("group_id", selectedGroupId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error(
          "This payment has already been reviewed or you do not have permission to review it."
        );
      }

      setReviewNote("");

      setSuccess(
        status === "completed"
          ? "Payment confirmed successfully."
          : "Payment rejected successfully."
      );

      await loadGroupData(
        selectedGroupId
      );
    } catch (err: any) {
      console.error(
        "Payment review error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update this payment."
      );
    } finally {
      setProcessingId("");
    }
  }

  async function openProof(
    proofPath?: string | null
  ) {
    setError("");

    if (!proofPath) {
      setError(
        "No payment proof was submitted."
      );
      return;
    }

    setProofLoading(true);

    try {
      const {
        data,
        error: signedUrlError,
      } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(
          proofPath,
          60 * 10
        );

      if (signedUrlError) {
        throw signedUrlError;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Unable to create secure payment proof link."
        );
      }

      setProofUrl(
        data.signedUrl
      );
    } catch (err: any) {
      console.error(
        "Proof error:",
        err
      );

      setError(
        err?.message ||
          "Unable to open payment proof."
      );
    } finally {
      setProofLoading(false);
    }
  }

  async function recordPayout() {
    setError("");
    setSuccess("");

    if (!selectedGroup) {
      setError(
        "Please select a group."
      );
      return;
    }

    const amount = Number(
      payoutAmount
    );

    if (!amount || amount <= 0) {
      setError(
        "Enter a valid payout amount."
      );
      return;
    }

    const rotationIndex =
      selectedGroup.current_rotation_index ||
      0;

    const recipient =
      selectedGroup.rotation_order?.[
        rotationIndex
      ];

    if (!recipient) {
      setError(
        "This group does not currently have a valid payout recipient in its rotation."
      );
      return;
    }

    setPayoutLoading(true);

    try {
      const {
        error: payoutError,
      } = await supabase
        .from("payouts")
        .insert({
          group_id:
            selectedGroup.id,

          recipient_user_id:
            recipient,

          amount,

          cycle_number:
            rotationIndex + 1,

          status: "completed",

          payout_date:
            new Date()
              .toISOString()
              .slice(0, 10),

          reference:
            payoutReference.trim() ||
            null,

          note:
            payoutNote.trim() ||
            null,
        });

      if (payoutError) {
        throw payoutError;
      }

      setPayoutAmount("");
      setPayoutReference("");
      setPayoutNote("");

      setSuccess(
        "Payout recorded successfully."
      );

      await loadGroupData(
        selectedGroup.id
      );
    } catch (err: any) {
      console.error(
        "Payout error:",
        err
      );

      setError(
        err?.message ||
          "Unable to record payout."
      );
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="state">
        <div className="spinner" />

        <strong>
          Loading payment review...
        </strong>

        <span>
          Checking administrator access.
        </span>

        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="state">
        <div className="stateIcon">
          !
        </div>

        <h2>
          Administrator access required
        </h2>

        <p>
          Only an administrator, owner or
          treasurer can access payment review
          and payout controls.
        </p>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <main className="page">
      <header className="top">
        <div>
          <span className="eyebrow">
            TREASURER • FINANCIAL CONTROL
          </span>

          <h1>
            Payment Review
          </h1>

          <p>
            Verify member payments, inspect
            evidence and manage cooperative
            payouts.
          </p>
        </div>

        <select
          value={selectedGroupId}
          onChange={async (event) => {
            const id =
              event.target.value;

            setSelectedGroupId(id);
            setProofUrl("");
            setError("");
            setSuccess("");

            try {
              await loadGroupData(id);
            } catch (err: any) {
              setError(
                err?.message ||
                  "Unable to load group."
              );
            }
          }}
        >
          {groups.map((group) => (
            <option
              key={group.id}
              value={group.id}
            >
              {group.name}
            </option>
          ))}
        </select>
      </header>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
        </div>
      )}

      <section className="stats">
        <Stat
          label="PENDING"
          value={pendingPayments.length}
          sub={`${money(
            pendingTotal
          )} awaiting review`}
        />

        <Stat
          label="CONFIRMED"
          value={completedPayments.length}
          sub={`${money(
            completedTotal
          )} completed`}
        />

        <Stat
          label="GROUP POOL"
          value={money(
            selectedGroup?.pool_amount
          )}
          sub={`${selectedGroup?.member_count || 0} members`}
        />

        <Stat
          label="NEXT PAYOUT"
          value={formatDate(
            selectedGroup?.next_payout_date
          )}
          sub="Scheduled group payout"
        />
      </section>

      {/* PAYMENT REVIEW */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <span>
              PAYMENT REVIEW
            </span>

            <h2>
              Pending contributions
            </h2>
          </div>

          <b>
            {pendingPayments.length} pending
          </b>
        </div>

        {pendingPayments.length === 0 ? (
          <div className="empty">
            <div className="check">
              ✓
            </div>

            <strong>
              All payments are reviewed
            </strong>

            <p>
              New member submissions will
              appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th>AMOUNT</th>
                    <th>REFERENCE</th>
                    <th>TRANSFER DATE</th>
                    <th>PROOF</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingPayments.map(
                    (payment) => (
                      <tr
                        key={payment.id}
                      >
                        <td>
                          <strong>
                            Member{" "}
                            {payment.user_id.slice(
                              0,
                              8
                            )}
                            …
                          </strong>

                          <small>
                            Submitted{" "}
                            {formatDate(
                              payment.submitted_at ||
                                payment.created_at
                            )}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {money(
                              payment.amount
                            )}
                          </strong>
                        </td>

                        <td>
                          <code>
                            {payment.transaction_ref ||
                              "—"}
                          </code>
                        </td>

                        <td>
                          {formatDate(
                            payment.transfer_date
                          )}
                        </td>

                        <td>
                          <button
                            className="proofButton"
                            disabled={
                              proofLoading
                            }
                            onClick={() =>
                              openProof(
                                payment.proof_url
                              )
                            }
                          >
                            {proofLoading
                              ? "Opening..."
                              : "View proof"}
                          </button>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              className="reject"
                              disabled={
                                processingId ===
                                payment.id
                              }
                              onClick={() =>
                                reviewPayment(
                                  payment,
                                  "rejected"
                                )
                              }
                            >
                              Reject
                            </button>

                            <button
                              className="confirm"
                              disabled={
                                processingId ===
                                payment.id
                              }
                              onClick={() =>
                                reviewPayment(
                                  payment,
                                  "completed"
                                )
                              }
                            >
                              {processingId ===
                              payment.id
                                ? "Saving..."
                                : "Confirm"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="reviewNote">
              <label>
                Review note

                <textarea
                  value={reviewNote}
                  onChange={(event) =>
                    setReviewNote(
                      event.target.value
                    )
                  }
                  placeholder="Required when rejecting. Optional when confirming."
                />
              </label>
            </div>
          </>
        )}
      </section>

      {/* PAYOUT */}
      <div className="columns">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <span>
                PAYOUT CONTROL
              </span>

              <h2>
                Record group payout
              </h2>
            </div>

            <i>
              ADMIN
            </i>
          </div>

          <div className="payoutInfo">
            <div className="payoutIcon">
              ↑
            </div>

            <div>
              <strong>
                Manual cooperative payout
              </strong>

              <p>
                The cooperative administrator
                makes the actual bank transfer.
                Kolo records the payout for
                accountability.
              </p>
            </div>
          </div>

          <div className="fields">
            <label>
              Amount

              <input
                type="number"
                min="1"
                value={payoutAmount}
                onChange={(event) =>
                  setPayoutAmount(
                    event.target.value
                  )
                }
                placeholder="200000"
              />
            </label>

            <label>
              Transfer reference

              <input
                value={payoutReference}
                onChange={(event) =>
                  setPayoutReference(
                    event.target.value
                  )
                }
                placeholder="Bank transfer reference"
              />
            </label>
          </div>

          <label className="full">
            Payout note

            <textarea
              value={payoutNote}
              onChange={(event) =>
                setPayoutNote(
                  event.target.value
                )
              }
              placeholder="Optional note about this payout."
            />
          </label>

          <button
            className="primary"
            disabled={payoutLoading}
            onClick={recordPayout}
          >
            {payoutLoading
              ? "Recording..."
              : "Record payout"}
          </button>
        </section>

        {/* ROTATION */}
        <section className="panel">
          <div className="panelHeader">
            <div>
              <span>
                ROTATION
              </span>

              <h2>
                Next payout
              </h2>
            </div>
          </div>

          <div className="rotation">
            <div className="rotationIndex">
              {(selectedGroup?.current_rotation_index ||
                0) + 1}
            </div>

            <div>
              <small>
                NEXT RECIPIENT
              </small>

              <strong>
                {selectedGroup
                  ?.rotation_order?.[
                  selectedGroup
                    ?.current_rotation_index ||
                    0
                ]
                  ? `Member ${selectedGroup.rotation_order[
                      selectedGroup
                        .current_rotation_index ||
                        0
                    ].slice(0, 8)}…`
                  : "Recipient not assigned"}
              </strong>

              <p>
                Scheduled for{" "}
                <b>
                  {formatDate(
                    selectedGroup?.next_payout_date
                  )}
                </b>
              </p>
            </div>
          </div>

          <div className="history">
            <strong>
              Recent payouts
            </strong>

            {!payouts.length ? (
              <p>
                No payout records yet.
              </p>
            ) : (
              payouts
                .slice(0, 6)
                .map((payout) => (
                  <div
                    className="payoutRow"
                    key={payout.id}
                  >
                    <div>
                      <strong>
                        {money(
                          payout.amount
                        )}
                      </strong>

                      <small>
                        {formatDate(
                          payout.payout_date
                        )}
                      </small>
                    </div>

                    <span>
                      {payout.status}
                    </span>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* HISTORY */}
      <section className="panel">
        <div className="panelHeader">
          <div>
            <span>
              REVIEW HISTORY
            </span>

            <h2>
              Completed and rejected
            </h2>
          </div>

          <b>
            {reviewedPayments.length} reviewed
          </b>
        </div>

        {reviewedPayments.length === 0 ? (
          <div className="empty">
            <p>
              No reviewed payments yet.
            </p>
          </div>
        ) : (
          <div className="reviewHistory">
            {reviewedPayments
              .slice(0, 30)
              .map((payment) => (
                <div
                  className="historyItem"
                  key={payment.id}
                >
                  <div>
                    <strong>
                      Member{" "}
                      {payment.user_id.slice(
                        0,
                        8
                      )}
                      …
                    </strong>

                    <small>
                      {formatDate(
                        payment.reviewed_at ||
                          payment.created_at
                      )}
                    </small>
                  </div>

                  <strong>
                    {money(
                      payment.amount
                    )}
                  </strong>

                  <span
                    className={
                      payment.status ===
                      "completed"
                        ? "status completed"
                        : "status rejected"
                    }
                  >
                    {payment.status ===
                    "completed"
                      ? "✓ Completed"
                      : "Rejected"}
                  </span>

                  <span className="noteText">
                    {payment.review_note ||
                      "No note"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* PROOF MODAL */}
      {proofUrl && (
        <div
          className="modalBackdrop"
          onClick={() =>
            setProofUrl("")
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modalHeader">
              <div>
                <span>
                  PAYMENT EVIDENCE
                </span>

                <h2>
                  Transfer receipt
                </h2>
              </div>

              <button
                onClick={() =>
                  setProofUrl("")
                }
              >
                ×
              </button>
            </div>

            <iframe
              src={proofUrl}
              title="Payment proof"
            />

            <a
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open receipt in new tab
            </a>
          </div>
        </div>
      )}

      <style jsx>{styles}</style>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: any;
  sub: string;
}) {
  return (
    <div className="stat">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {sub}
      </small>
    </div>
  );
}

const styles = `
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 55px;
  color: ${NAVY};
  font-family: Inter, Geist, system-ui, sans-serif;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  margin-bottom: 18px;
}

.eyebrow,
.panelHeader span {
  color: ${GREEN};
  font-size: 7px;
  font-weight: 850;
  letter-spacing: .13em;
}

h1 {
  margin: 7px 0 5px;
  font-size: 31px;
  line-height: 1;
  letter-spacing: -.045em;
}

.top p {
  margin: 0;
  color: ${TEXT};
  font-size: 10px;
}

select {
  min-width: 205px;
  padding: 10px 12px;
  border: 1px solid ${BORDER};
  border-radius: 8px;
  background: white;
  color: ${NAVY};
  font: inherit;
  font-size: 8px;
  font-weight: 750;
  outline: none;
}

.alert {
  margin-bottom: 11px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 8px;
}

.alert.error {
  border: 1px solid #efd1d1;
  background: #fff5f5;
  color: #9d3030;
}

.alert.success {
  border: 1px solid #cce5d5;
  background: #eff8f2;
  color: ${GREEN};
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
  margin-bottom: 12px;
}

.stat {
  padding: 14px;
  border: 1px solid ${BORDER};
  border-radius: 10px;
  background: white;
}

.stat span {
  display: block;
  color: ${MUTED};
  font-size: 6px;
  font-weight: 850;
  letter-spacing: .1em;
}

.stat strong {
  display: block;
  margin-top: 6px;
  color: ${NAVY};
  font-size: 18px;
  letter-spacing: -.03em;
}

.stat small {
  display: block;
  margin-top: 4px;
  color: ${MUTED};
  font-size: 6px;
}

.panel {
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid ${BORDER};
  border-radius: 12px;
  background: white;
}

.panelHeader {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 15px;
  padding: 16px 17px;
  border-bottom: 1px solid ${BORDER};
}

.panelHeader h2 {
  margin: 4px 0 0;
  color: ${NAVY};
  font-size: 14px;
  letter-spacing: -.025em;
}

.panelHeader > b {
  color: ${TEXT};
  font-size: 7px;
}

.panelHeader i {
  padding: 4px 7px;
  border-radius: 99px;
  background: #eff8f2;
  color: ${GREEN};
  font-size: 6px;
  font-style: normal;
  font-weight: 850;
}

.tableScroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

th {
  padding: 10px 13px;
  border-bottom: 1px solid ${BORDER};
  color: ${MUTED};
  text-align: left;
  font-size: 6px;
  letter-spacing: .08em;
}

td {
  padding: 13px;
  border-bottom: 1px solid #eef2ef;
  color: ${TEXT};
  font-size: 7px;
  vertical-align: middle;
}

td strong {
  display: block;
  color: ${NAVY};
  font-size: 8px;
}

td small {
  display: block;
  margin-top: 3px;
  color: ${MUTED};
  font-size: 6px;
}

code {
  font-size: 6px;
}

.actions {
  display: flex;
  gap: 5px;
}

.actions button,
.proofButton {
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 6px;
  font-weight: 800;
}

.proofButton {
  border: 1px solid ${BORDER};
  background: #f8faf9;
  color: ${TEXT};
}

.confirm {
  border: 1px solid ${GREEN};
  background: ${GREEN};
  color: white;
}

.reject {
  border: 1px solid #efd1d1;
  background: #fff6f6;
  color: #a12b2b;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.reviewNote {
  padding: 13px 17px;
}

.reviewNote label,
.fields label,
.full {
  color: ${NAVY};
  font-size: 7px;
  font-weight: 750;
}

textarea,
input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 5px;
  padding: 8px 9px;
  border: 1px solid ${BORDER};
  border-radius: 7px;
  background: white;
  color: ${NAVY};
  outline: none;
  font: inherit;
  font-size: 8px;
  resize: vertical;
}

.reviewNote textarea {
  min-height: 52px;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.payoutInfo {
  display: flex;
  gap: 10px;
  padding: 14px 17px;
  border-bottom: 1px solid ${BORDER};
  background: #fbfdfb;
}

.payoutIcon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  background: #eff8f2;
  color: ${GREEN};
  font-size: 14px;
  font-weight: 850;
}

.payoutInfo strong {
  display: block;
  color: ${NAVY};
  font-size: 8px;
}

.payoutInfo p {
  margin: 4px 0 0;
  color: ${TEXT};
  font-size: 7px;
  line-height: 1.5;
}

.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 14px 17px 0;
}

.full {
  display: block;
  padding: 10px 17px;
}

.full textarea {
  min-height: 50px;
}

.primary {
  margin: 2px 17px 17px;
  padding: 9px 13px;
  border: 0;
  border-radius: 7px;
  background: ${GREEN};
  color: white;
  cursor: pointer;
  font-size: 7px;
  font-weight: 800;
}

.rotation {
  display: flex;
  gap: 10px;
  padding: 17px;
}

.rotationIndex {
  width: 37px;
  height: 37px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #eff8f2;
  color: ${GREEN};
  font-size: 12px;
  font-weight: 850;
}

.rotation small {
  display: block;
  color: ${MUTED};
  font-size: 6px;
  font-weight: 850;
}

.rotation strong {
  display: block;
  margin-top: 4px;
  color: ${NAVY};
  font-size: 8px;
}

.rotation p {
  margin: 4px 0 0;
  color: ${TEXT};
  font-size: 7px;
}

.history {
  padding: 0 17px 17px;
}

.history > strong {
  display: block;
  margin-bottom: 7px;
  color: ${NAVY};
  font-size: 8px;
}

.history > p {
  color: ${MUTED};
  font-size: 7px;
}

.payoutRow {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid #eef2ef;
}

.payoutRow strong,
.payoutRow small {
  display: block;
}

.payoutRow strong {
  font-size: 8px;
}

.payoutRow small {
  margin-top: 2px;
  color: ${MUTED};
  font-size: 6px;
}

.payoutRow span {
  align-self: center;
  color: ${GREEN};
  font-size: 7px;
  font-weight: 750;
}

.reviewHistory {
  width: 100%;
}

.historyItem {
  display: grid;
  grid-template-columns: 1.2fr .8fr .8fr 1.5fr;
  gap: 12px;
  align-items: center;
  padding: 11px 17px;
  border-bottom: 1px solid #eef2ef;
}

.historyItem strong,
.historyItem small {
  display: block;
}

.historyItem strong {
  font-size: 8px;
}

.historyItem small {
  margin-top: 3px;
  color: ${MUTED};
  font-size: 6px;
}

.historyItem > strong {
  color: ${GREEN};
}

.noteText {
  color: ${TEXT};
  font-size: 7px;
}

.status {
  width: fit-content;
  padding: 4px 7px;
  border-radius: 99px;
  background: #fff5f5;
  color: #a12b2b;
  font-size: 6px !important;
  font-weight: 800;
}

.status.completed {
  background: #eff8f2;
  color: ${GREEN};
}

.empty {
  padding: 36px;
  text-align: center;
  color: ${MUTED};
}

.empty .check {
  margin-bottom: 6px;
  color: ${GREEN};
  font-size: 20px;
  font-weight: 850;
}

.empty strong {
  display: block;
  color: ${NAVY};
  font-size: 9px;
}

.empty p {
  margin: 5px 0 0;
  font-size: 7px;
}

.modalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(11, 28, 48, .52);
}

.modal {
  width: min(820px, 100%);
  height: min(780px, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: white;
  box-shadow: 0 25px 80px rgba(0,0,0,.2);
}

.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  border-bottom: 1px solid ${BORDER};
}

.modalHeader span {
  color: ${GREEN};
  font-size: 6px;
  font-weight: 850;
  letter-spacing: .1em;
}

.modalHeader h2 {
  margin: 4px 0 0;
  font-size: 14px;
}

.modalHeader button {
  border: 0;
  background: transparent;
  color: ${TEXT};
  cursor: pointer;
  font-size: 22px;
}

.modal iframe {
  flex: 1;
  width: 100%;
  border: 0;
  background: #f4f6f5;
}

.modal > a {
  padding: 10px;
  color: ${GREEN};
  text-align: center;
  text-decoration: none;
  font-size: 8px;
  font-weight: 800;
}

.state {
  min-height: 55vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: ${MUTED};
  text-align: center;
  font-family: Inter, Geist, system-ui, sans-serif;
}

.state h2 {
  margin: 0;
  color: ${NAVY};
  font-size: 19px;
}

.state p {
  max-width: 430px;
  margin: 0;
  font-size: 8px;
  line-height: 1.6;
}

.stateIcon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #f3f6f4;
  color: ${GREEN};
  font-size: 15px;
  font-weight: 850;
}

.spinner {
  width: 31px;
  height: 31px;
  border: 3px solid #e8eee9;
  border-top-color: ${GREEN};
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 850px) {
  .stats,
  .columns {
    grid-template-columns: 1fr 1fr;
  }

  .top {
    align-items: flex-start;
    flex-direction: column;
  }

  select {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .page {
    padding: 10px 12px 40px;
  }

  .stats,
  .columns,
  .fields {
    grid-template-columns: 1fr;
  }

  .historyItem {
    grid-template-columns: 1fr 1fr;
  }

  .noteText {
    grid-column: 1 / -1;
  }
}
`;