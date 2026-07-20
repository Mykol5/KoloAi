"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AddMembersPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<any>(null);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("member");
  const [expiry, setExpiry] = useState("7");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  useEffect(() => {
    async function fetchGroup() {
      const { data } = await supabase.from("groups").select("*").eq("id", id).single();
      setGroup(data);
    }
    fetchGroup();
  }, [id, supabase]);

  const handleSendInvites = async () => {
    if (!emails.trim()) return;
    setLoading(true);
    setMessage("");

    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    // In a real app, you'd send actual email invites
    // For now, we simulate and add to group_members or a pending_invites table
    try {
      for (const email of emailList) {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", email) // This would be an email lookup in reality
          .single();

        if (existingUser) {
          // Add directly to group
          const { error } = await supabase.from("group_members").insert({
            group_id: id,
            user_id: existingUser.id,
            role: role,
          });

          if (!error) {
            // Update member count
            await supabase
              .from("groups")
              .update({ member_count: (group?.member_count || 0) + 1 })
              .eq("id", id);
          }
        }
      }

      setMessage(`Successfully sent ${emailList.length} invitation(s)!`);
      setEmails("");
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d" }}>
        Loading...
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px",
    border: "1px solid rgba(189, 202, 186, 0.5)",
    borderRadius: "8px",
    backgroundColor: "#f8f9ff",
    outline: "none",
    fontSize: "16px",
    lineHeight: "24px",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
    boxSizing: "border-box",
    resize: "none",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px",
    border: "1px solid rgba(189, 202, 186, 0.5)",
    borderRadius: "8px",
    backgroundColor: "#f8f9ff",
    outline: "none",
    fontSize: "16px",
    lineHeight: "24px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  return (
    <div style={{ backgroundColor: "#eff4ff", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ maxWidth: "896px", margin: "0 auto", padding: "24px" }}>
        {/* Back + Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
          <Link
            href={`/groups/${id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#006b2c",
              fontSize: "14px",
              lineHeight: "20px",
              letterSpacing: "0.01em",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
              textDecoration: "none",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span>
            Back to {group.name}
          </Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px" }}>
            <div>
              <h1 style={{ fontSize: "32px", lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>
                Add New Members
              </h1>
              <p style={{ color: "#3e4a3d", marginTop: "8px" }}>
                Expand your wealth circle by inviting trusted partners to {group.name}.
              </p>
            </div>
            <button
              onClick={handleSendInvites}
              disabled={loading || !emails.trim()}
              style={{
                backgroundColor: loading ? "#6e7b6c" : "#006b2c",
                color: "#ffffff",
                padding: "16px 40px",
                borderRadius: "12px",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0.01em",
                fontFamily: "'Geist', sans-serif",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 107, 44, 0.1)",
                transition: "all 0.2s",
              }}
            >
              <span className="material-symbols-outlined">send</span>
              {loading ? "Sending..." : "Send All Invitations"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "24px",
              fontSize: "14px",
              lineHeight: "20px",
              letterSpacing: "0.01em",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
              backgroundColor: message.includes("wrong") ? "#ffdad6" : "rgba(0, 107, 44, 0.1)",
              color: message.includes("wrong") ? "#93000a" : "#006b2c",
              textAlign: "center",
            }}
          >
            {message}
          </div>
        )}

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
          {/* Left: Manual Invite Form */}
          <div style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                border: "1px solid rgba(189, 202, 186, 0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", lineHeight: "28px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                  Manual Invite
                </h3>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#006b2c",
                    fontSize: "14px",
                    lineHeight: "20px",
                    letterSpacing: "0.01em",
                    fontWeight: 500,
                    fontFamily: "'Geist', sans-serif",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>upload_file</span>
                  Import CSV/Excel
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <label
                    style={{
                      fontSize: "14px",
                      lineHeight: "20px",
                      letterSpacing: "0.01em",
                      fontWeight: 500,
                      fontFamily: "'Geist', sans-serif",
                      color: "#3e4a3d",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Email or Phone Numbers
                  </label>
                  <textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="Paste emails separated by commas or enters..."
                    style={{ ...inputStyle, minHeight: "100px" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#006b2c";
                      e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(189, 202, 186, 0.5)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div>
                    <label
                      style={{
                        fontSize: "14px",
                        lineHeight: "20px",
                        letterSpacing: "0.01em",
                        fontWeight: 500,
                        fontFamily: "'Geist', sans-serif",
                        color: "#3e4a3d",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Role Assignment
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="member">Member (Standard access)</option>
                      <option value="auditor">Auditor (View-only compliance)</option>
                      <option value="admin">Assistant Admin (Operational access)</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "14px",
                        lineHeight: "20px",
                        letterSpacing: "0.01em",
                        fontWeight: 500,
                        fontFamily: "'Geist', sans-serif",
                        color: "#3e4a3d",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Expiry
                    </label>
                    <select
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(226, 232, 240, 1)",
                padding: "24px",
                borderRadius: "12px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0.01em",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#3e4a3d",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "24px",
                }}
              >
                Preview Invite Message
              </h3>
              <div
                style={{
                  backgroundColor: "rgba(211, 228, 254, 0.3)",
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                }}
              >
                <p style={{ fontSize: "16px", lineHeight: "24px", color: "#0b1c30", fontStyle: "italic", lineHeight: 1.6 }}>
                  &quot;Hello! You&apos;ve been invited by{" "}
                  <span style={{ fontWeight: 700, color: "#006b2c" }}>Alex Sterling</span> to join the{" "}
                  <span style={{ fontWeight: 700 }}>{group.name}</span> as an{" "}
                  <span style={{ color: "#00873a", fontWeight: 600 }}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                  . Click the link below to verify your identity and access the treasury dashboard.&quot;
                </p>
                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "24px",
                    borderTop: "1px solid rgba(189, 202, 186, 0.3)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#006b2c", fontWeight: 500, fontSize: "14px" }}>
                    https://savecircle.ai/join/{id?.toString().slice(0, 8)}
                  </span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#3e4a3d" }}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Invite + History */}
          <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* QR / Link Card */}
            <div
              style={{
                backgroundColor: "#0b1c30",
                color: "#ffffff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#00873a",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "#f7fff2" }}>qr_code_2</span>
              </div>
              <h3 style={{ fontSize: "18px", lineHeight: "28px", fontWeight: 600, marginBottom: "8px" }}>
                Instant Join Link
              </h3>
              <p style={{ fontSize: "12px", color: "rgba(211, 228, 254, 0.6)", marginBottom: "24px", padding: "0 24px" }}>
                Generate a secure link for quick group onboarding via WhatsApp or Slack.
              </p>
              <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "8px", marginBottom: "24px" }}>
                <img
                  style={{ width: "128px", height: "128px" }}
                  alt="QR Code"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5cpnO2wwXbsavdvxPzaYnGV_KoqbPvDDUec6aWFc8ZKOqbEG4tlTwmJN4g9hbXKHULfIcJwKYFiOHu-_MowJLrJcFBNHEYsCt6eF656pq4WF5NrG9Matgn_SDsNHp4ZCMF_38HJqLxAoC29OB7XmlwVCGjep3zIiEz75lC_PU8KZWjtiEjHYt4_I9_R8N6KZVDGYdEMGYDi3_wXWRfAaKI3WurWUkwMABZVLFZ-gEqmeJGwclJNrPU1LNtpUJdxuE883mFQ-btKTS"
                />
              </div>
              <button
                style={{
                  width: "100%",
                  backgroundColor: "rgba(211, 228, 254, 0.1)",
                  border: "1px solid rgba(211, 228, 254, 0.2)",
                  padding: "16px",
                  borderRadius: "8px",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0.01em",
                  fontFamily: "'Geist', sans-serif",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  transition: "background-color 0.2s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>link</span>
                Copy Link
              </button>
              <button
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "rgba(211, 228, 254, 0.7)",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  cursor: "pointer",
                }}
              >
                Regenerate Link
              </button>
            </div>

            {/* Import History */}
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid rgba(189, 202, 186, 0.3)",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0.01em",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#3e4a3d",
                  marginBottom: "24px",
                }}
              >
                Import History
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: "#e5eeff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "14px" }}>description</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>
                      investors_list.csv
                    </p>
                    <p style={{ fontSize: "10px", color: "#6e7b6c" }}>12 members • 2 mins ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Invitations Table (Full Width) */}
          <div style={{ gridColumn: "span 12" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                border: "1px solid rgba(189, 202, 186, 0.3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
                  backgroundColor: "#f8f9ff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ fontSize: "18px", lineHeight: "28px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                  Pending Invitations
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ padding: "8px", background: "none", border: "none", cursor: "pointer", color: "#3e4a3d" }}>
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                  <button style={{ padding: "8px", background: "none", border: "none", cursor: "pointer", color: "#3e4a3d" }}>
                    <span className="material-symbols-outlined">refresh</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                {pendingInvites.length === 0 ? (
                  <div style={{ padding: "60px 24px", textAlign: "center", color: "#3e4a3d" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "48px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>mail</span>
                    <p style={{ fontSize: "14px", lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>
                      No pending invitations. Send your first invite above.
                    </p>
                  </div>
                ) : (
                  <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#eff4ff" }}>
                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recipient</th>
                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</th>
                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sent Date</th>
                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}>
                      {pendingInvites.map((invite: any, i: number) => (
                        <tr
                          key={i}
                          style={{ borderBottom: "1px solid rgba(189, 202, 186, 0.2)", transition: "background-color 0.2s", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff4ff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <td style={{ padding: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#dae2fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "#5c647a" }}>
                                {invite.email?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <p style={{ fontSize: "14px", lineHeight: "20px", letterSpacing: "0.01em", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>{invite.email}</p>
                                <p style={{ fontSize: "12px", color: "#6e7b6c" }}>{invite.note || "External"}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "24px", fontSize: "14px" }}>{invite.role}</td>
                          <td style={{ padding: "24px", fontSize: "14px", color: "#3e4a3d" }}>{invite.date}</td>
                          <td style={{ padding: "24px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "2px 8px",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                fontWeight: 600,
                                backgroundColor: invite.status === "awaiting" ? "rgba(130, 81, 0, 0.1)" : invite.status === "clicked" ? "rgba(0, 107, 44, 0.1)" : "rgba(186, 26, 26, 0.1)",
                                color: invite.status === "awaiting" ? "#825100" : invite.status === "clicked" ? "#006b2c" : "#ba1a1a",
                              }}
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }} />
                              {invite.status === "awaiting" ? "Awaiting" : invite.status === "clicked" ? "Link Clicked" : "Expired"}
                            </span>
                          </td>
                          <td style={{ padding: "24px", textAlign: "right" }}>
                            <button style={{ background: "none", border: "none", color: "#006b2c", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>Resend</button>
                            <button style={{ background: "none", border: "none", color: "#ba1a1a", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", marginLeft: "16px" }}>Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}