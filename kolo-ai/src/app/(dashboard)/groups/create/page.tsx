"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4;

interface GroupForm {
  name: string;
  category: string;
  description: string;
  template: string;
  contributionAmount: number;
  payoutFrequency: string;
  interestRate: number;
  maxMembers: number;
  votingThreshold: string;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<GroupForm>({
    name: "",
    category: "Investment",
    description: "",
    template: "Fixed Savings",
    contributionAmount: 50000,
    payoutFrequency: "monthly",
    interestRate: 8.5,
    maxMembers: 12,
    votingThreshold: "simple",
  });

  const updateForm = (field: keyof GroupForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const navigateWizard = (direction: number) => {
    const nextStep = currentStep + direction;
    if (nextStep < 1 || nextStep > 4) return;
    setCurrentStep(nextStep as Step);
  };

const handleLaunch = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isRotatingAjo = form.template === "Rotating Ajo";

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: form.name,
        description: form.description,
        max_members: form.maxMembers,
        contribution_amount: form.contributionAmount,
        created_by: user.id,
        status: "active",
        cycle_number: 1,
        rotation_order: isRotatingAjo ? [user.id] : [], // Start with creator
        current_rotation_index: isRotatingAjo ? 0 : 0,
        next_payout_date: isRotatingAjo ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null, // 30 days from now
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as admin with rotation position 1
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "admin",
      rotation_position: 1,
    });

    await supabase.from("groups").update({ member_count: 1 }).eq("id", group.id);
    router.push(`/groups/${group.id}`);
  } catch (err) {
    console.error("Failed to create group:", err);
  } finally {
    setLoading(false);
  }
};

  const templates = [
    { id: "SME Fund", icon: "business_center", title: "SME Fund", desc: "Collaborative business loans with fixed monthly returns." },
    { id: "Fixed Savings", icon: "savings", title: "Fixed Savings", desc: "Goal-oriented group savings with high-yield interest." },
    { id: "Rotating Ajo", icon: "cached", title: "Rotating Ajo", desc: "Traditional rotating credit with digitized payout orders." },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "16px", backgroundColor: "#ffffff",
    border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "8px", outline: "none",
    fontSize: "16px", lineHeight: "24px", fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s", boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: "pointer", appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236e7b6c' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "40px",
  };

  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
  };
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none";
  };

  const progressWidth = `${((currentStep - 1) / 3) * 100}%`;

  return (
    <div style={{ backgroundColor: "#eff4ff", minHeight: "100vh" }}>
      <div style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "48px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "8px" }}>
            Create Your Wealth Circle
          </h1>
          <p style={{ fontSize: "18px", color: "#3e4a3d" }}>
            Launch a transparent, AI-governed financial group in minutes.
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "672px", margin: "0 auto 40px", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: "2px", backgroundColor: "#e5eeff", transform: "translateY(-50%)", zIndex: 0 }} />
          <div style={{ position: "absolute", top: "50%", left: 0, height: "2px", backgroundColor: "#006b2c", transform: "translateY(-50%)", zIndex: 0, transition: "width 0.5s", width: progressWidth }} />
          {["Info", "Financials", "Governance", "Review"].map((label, i) => {
            const stepNum = i + 1;
            const isComplete = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", position: "relative", zIndex: 10 }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isComplete || isActive ? "#006b2c" : "#e5eeff", color: isComplete || isActive ? "#ffffff" : "#3e4a3d", boxShadow: isActive ? "0 0 0 4px rgba(0, 107, 44, 0.2)" : "0 0 0 4px #f8f9ff", fontWeight: 700, fontSize: "14px", transition: "all 0.3s" }}>
                  {isComplete ? <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check</span> : stepNum}
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: isActive ? "#006b2c" : "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              {templates.map((tpl) => (
                <button key={tpl.id} onClick={() => updateForm("template", tpl.id)}
                  style={{ background: form.template === tpl.id ? "rgba(0, 107, 44, 0.05)" : "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: form.template === tpl.id ? "2px solid #006b2c" : "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "24px", borderRadius: "12px", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c", marginBottom: "16px", display: "block", fontSize: "28px" }}>{tpl.icon}</span>
                  <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>{tpl.title}</h3>
                  <p style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{tpl.desc}</p>
                </button>
              ))}
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <label style={lbl}>Group Name</label>
                  <input type="text" placeholder="e.g., Tech Visionaries 2026" value={form.name} onChange={(e) => updateForm("name", e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category} onChange={(e) => updateForm("category", e.target.value)} style={selectStyle}>
                    <option>Investment</option><option>Social Savings</option><option>Real Estate</option><option>Emergency Fund</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea placeholder="Briefly describe the purpose..." rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Financials */}
        {currentStep === 2 && (
          <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
              <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>payments</span>
              <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Financial Framework</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <label style={lbl}>Monthly Contribution (₦)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#3e4a3d", fontSize: "16px" }}>₦</span>
                    <input type="number" value={form.contributionAmount} onChange={(e) => updateForm("contributionAmount", Number(e.target.value))} style={{ ...inputStyle, paddingLeft: "48px" }} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Payout Frequency</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {["monthly", "quarterly"].map((freq) => (
                      <button key={freq} onClick={() => updateForm("payoutFrequency", freq)}
                        style={{ flex: 1, padding: "8px", borderRadius: "8px", border: form.payoutFrequency === freq ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.payoutFrequency === freq ? "rgba(0, 107, 44, 0.1)" : "transparent", color: form.payoutFrequency === freq ? "#006b2c" : "#3e4a3d", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Max Members</label>
                  <input type="number" value={form.maxMembers} onChange={(e) => updateForm("maxMembers", Number(e.target.value))} min={2} max={50} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <label style={{ ...lbl, display: "flex", justifyContent: "space-between" }}>Target Interest Rate <span style={{ color: "#006b2c" }}>{form.interestRate}% p.a.</span></label>
                  <input type="range" min={1} max={20} step={0.5} value={form.interestRate} onChange={(e) => updateForm("interestRate", Number(e.target.value))} style={{ width: "100%", accentColor: "#006b2c", height: "8px" }} />
                </div>
                <div style={{ padding: "24px", backgroundColor: "#eff4ff", borderRadius: "8px", border: "1px solid rgba(189, 202, 186, 0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#006b2c", marginBottom: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif" }}>Smart Treasurer Insight</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
                    With {form.maxMembers} members contributing ₦{form.contributionAmount.toLocaleString()}, your group pool will grow to ₦{(form.contributionAmount * form.maxMembers * 12).toLocaleString()} annually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Governance */}
        {currentStep === 3 && (
          <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
              <span className="material-symbols-outlined" style={{ color: "#006b2c" }}>gavel</span>
              <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Governance & Consensus</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", padding: "24px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid rgba(189, 202, 186, 0.3)" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "#00873a", display: "flex", alignItems: "center", justifyContent: "center", color: "#f7fff2", flexShrink: 0 }}><span className="material-symbols-outlined">how_to_vote</span></div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Voting Threshold</h4>
                  <p style={{ fontSize: "14px", color: "#3e4a3d", marginBottom: "24px" }}>How many members must approve a new investment or payout change?</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    {[{ value: "simple", label: "Simple Majority (51%)" }, { value: "super", label: "Super Majority (66%)" }, { value: "unanimous", label: "Unanimous (100%)" }].map((opt) => (
                      <button key={opt.value} onClick={() => updateForm("votingThreshold", opt.value)}
                        style={{ padding: "8px 24px", borderRadius: "9999px", border: form.votingThreshold === opt.value ? "1px solid #006b2c" : "1px solid rgba(189, 202, 186, 0.3)", backgroundColor: form.votingThreshold === opt.value ? "#006b2c" : "transparent", color: form.votingThreshold === opt.value ? "#ffffff" : "#3e4a3d", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", cursor: "pointer", transition: "all 0.2s" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>Role Assignments</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}><div style={{ width: "32px", height: "32px", borderRadius: "4px", backgroundColor: "#cbdbf5", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>shield</span></div><span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>Administrator (You)</span></div>
                    <span style={{ fontSize: "12px", color: "#3e4a3d" }}>Full Control</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "2px dashed rgba(189, 202, 186, 0.3)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#3e4a3d" }}><div style={{ width: "32px", height: "32px", borderRadius: "4px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span></div><span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}>Add Auditor...</span></div>
                    <span style={{ color: "#006b2c", fontWeight: 700, fontSize: "12px" }}>Invite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {currentStep === 4 && (
          <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 1)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", padding: "40px", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, padding: "40px", opacity: 0.1 }}><span className="material-symbols-outlined" style={{ fontSize: "120px", color: "#006b2c" }}>verified</span></div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 10 }}>
              <div style={{ width: "80px", height: "80px", backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}><span className="material-symbols-outlined" style={{ fontSize: "48px" }}>auto_awesome</span></div>
              <h2 style={{ fontSize: "32px", fontWeight: 700 }}>Almost Ready to Launch</h2>
              <p style={{ color: "#3e4a3d", maxWidth: "448px" }}>Review your Wealth Circle configuration before finalizing.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", borderTop: "1px solid rgba(189, 202, 186, 0.3)", paddingTop: "40px", position: "relative", zIndex: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <span style={tag}>Identity</span>
                  <p style={{ fontSize: "24px", fontWeight: 600 }}>{form.name || "Untitled Group"}</p>
                  <p style={{ fontSize: "14px", color: "#3e4a3d" }}>{form.template} • {form.category}</p>
                </div>
                <div>
                  <span style={tag}>Financial Structure</span>
                  <div style={{ display: "flex", gap: "40px" }}>
                    <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>₦{form.contributionAmount.toLocaleString()}</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>/month</p></div>
                    <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>{form.interestRate}%</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>Yield p.a.</p></div>
                    <div><p style={{ fontWeight: 700, color: "#006b2c", fontSize: "18px" }}>{form.maxMembers}</p><p style={{ fontSize: "12px", color: "#3e4a3d" }}>Max Members</p></div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ backgroundColor: "rgba(220, 233, 255, 0.5)", padding: "24px", borderRadius: "8px" }}>
                  <span style={tag}>Smart Rules</span>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0 }}>
                    <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>AI-Automated Payout Schedules</li>
                    <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>{form.votingThreshold === "simple" ? "51%" : form.votingThreshold === "super" ? "66%" : "100%"} Consensus</li>
                    <li style={rule}><span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>check_circle</span>Encrypted Audit Logging</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px" }}>
          <button onClick={() => navigateWizard(-1)} disabled={currentStep === 1}
            style={{ padding: "16px 40px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", cursor: currentStep === 1 ? "not-allowed" : "pointer", opacity: currentStep === 1 ? 0.3 : 1 }}>
            Back
          </button>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/groups" style={{ padding: "16px 40px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", border: "1px solid rgba(189, 202, 186, 0.3)", borderRadius: "8px", backgroundColor: "transparent", textDecoration: "none" }}>Cancel</Link>
            {currentStep < 4 ? (
              <button onClick={() => navigateWizard(1)} style={{ padding: "16px 64px", backgroundColor: "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>Continue</button>
            ) : (
              <button onClick={handleLaunch} disabled={loading || !form.name.trim()}
                style={{ padding: "16px 64px", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", borderRadius: "8px", border: "none", cursor: loading || !form.name.trim() ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>
                {loading ? "Creating..." : "Launch Group"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", marginBottom: "8px", display: "block" };
const tag: React.CSSProperties = { fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#3e4a3d", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "4px" };
const rule: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" };