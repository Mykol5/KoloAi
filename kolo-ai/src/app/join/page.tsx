"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const groupId = searchParams.get("group") || "";
  const inviteEmail = searchParams.get("email") || "";
  const role = searchParams.get("role") || "member";
  const groupName = searchParams.get("groupName") || "this group";

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [step, setStep] = useState<"checking" | "register" | "joined">("checking");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteEmail);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await joinGroup(user.id);
      } else {
        setStep("register");
      }
      if (groupId) {
        const { data } = await supabase.from("groups").select("*").eq("id", groupId).single();
        setGroup(data);
      }
    }
    checkAuth();
  }, [groupId]);

  const joinGroup = async (userId: string) => {
    const { data: existing } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      setMessage("You're already a member of this group!");
      setMessageType("success");
      setStep("joined");
      return;
    }

    // Get next rotation position (for Ajo groups)
    const { data: lastMember } = await supabase
      .from("group_members")
      .select("rotation_position")
      .eq("group_id", groupId)
      .order("rotation_position", { ascending: false })
      .limit(1);

    const nextPosition = (lastMember?.[0]?.rotation_position || 0) + 1;

    // Add to group with rotation position
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: role,
      rotation_position: nextPosition,
    });

    if (error) {
      setMessage("Failed to join. Please try again.");
      setMessageType("error");
      return;
    }

    // Update member count
    if (group) {
      await supabase
        .from("groups")
        .update({ member_count: (group.member_count || 0) + 1 })
        .eq("id", groupId);
    }

    // 🔄 If Rotating Ajo, add to rotation_order array
    if (group?.rotation_order && Array.isArray(group.rotation_order)) {
      const newOrder = [...group.rotation_order, userId];
      await supabase
        .from("groups")
        .update({ rotation_order: newOrder })
        .eq("id", groupId);
    }

    setMessage(`🎉 Welcome to ${groupName}! You're now a ${role}.`);
    setMessageType("success");
    setStep("joined");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setMessage("Please enter your email address."); setMessageType("error"); return; }
    setLoading(true);
    setMessage("");

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName || email.split("@")[0] } },
      });
      if (signUpError) { setMessage(signUpError.message); setMessageType("error"); setLoading(false); return; }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setMessage(signInError.message); setMessageType("error"); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) await joinGroup(user.id);
    } catch (err) {
      setMessage("Something went wrong. Please try again."); setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInstead = () => {
    const params = new URLSearchParams();
    if (groupId) params.set("group", groupId);
    if (email) params.set("email", email);
    if (role) params.set("role", role);
    if (groupName) params.set("groupName", groupName);
    router.push(`/login?redirect=/join?${params.toString()}`);
  };

  const isAjoGroup = group?.rotation_order && Array.isArray(group.rotation_order);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f8f9ff", padding: "24px" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "#ffffff", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", backgroundColor: "rgba(0, 107, 44, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>group_add</span>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>
          {step === "joined" ? "You're in! 🎉" : `Join ${groupName}`}
        </h1>
        <p style={{ color: "#3e4a3d", marginBottom: "32px", fontSize: "15px" }}>
          {step === "register" && (inviteEmail ? `You've been invited as a ${role}. Create your account to join.` : `Create your account to join ${groupName} as a ${role}.`)}
          {step === "joined" && "You now have access to the group dashboard."}
          {step === "checking" && "Checking your invitation..."}
        </p>

        {/* Ajo Info */}
        {isAjoGroup && step === "register" && (
          <div style={{ padding: "12px", backgroundColor: "rgba(130, 81, 0, 0.06)", borderRadius: "12px", marginBottom: "24px", fontSize: "13px", color: "#825100", display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px", flexShrink: 0 }}>cached</span>
            <span>This is a <strong>Rotating Ajo</strong> group. You'll be added to position <strong>#{(group?.rotation_order?.length || 0) + 1}</strong> in the payout rotation.</span>
          </div>
        )}

        {message && (
          <div style={{ padding: "12px", borderRadius: "12px", marginBottom: "24px", backgroundColor: messageType === "success" ? "rgba(0, 107, 44, 0.1)" : "#ffdad6", color: messageType === "success" ? "#006b2c" : "#93000a", fontSize: "14px" }}>{message}</div>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={lbl}>Email Address</label>
              {inviteEmail ? (
                <>
                  <input type="email" value={inviteEmail} disabled style={{ ...inp, backgroundColor: "#eff4ff", color: "#6e7b6c" }} />
                  <p style={{ fontSize: "12px", color: "#6e7b6c", marginTop: "4px" }}>This is the email you were invited with</p>
                </>
              ) : (
                <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inp} />
              )}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={lbl}>Full Name</label>
              <input type="text" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inp} />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={lbl}>Create Password</label>
              <input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "16px", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#ffffff", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "16px", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)", fontFamily: "'Inter', sans-serif" }}>
              {loading ? "Creating account..." : `Join as ${role}`}
            </button>
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#5c647a" }}>
              Already have an account?{" "}
              <button onClick={handleLoginInstead} style={{ color: "#006b2c", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: 0 }}>Sign in instead</button>
            </p>
          </form>
        )}

        {step === "joined" && (
          <Link href={`/groups/${groupId}`} style={{ display: "block", width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", textDecoration: "none", fontWeight: 600, fontSize: "16px", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)" }}>
            Go to Group →
          </Link>
        )}

        {step === "checking" && <p style={{ color: "#6e7b6c", fontSize: "14px" }}>Please wait...</p>}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginBottom: "6px", display: "block", fontFamily: "'Geist', sans-serif" };
const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "12px", outline: "none", fontSize: "16px", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" };


// "use client";

// import { useSearchParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";

// export default function JoinPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const supabase = createClient();

//   const groupId = searchParams.get("group") || "";
//   const inviteEmail = searchParams.get("email") || "";
//   const role = searchParams.get("role") || "member";
//   const groupName = searchParams.get("groupName") || "this group";

//   const [group, setGroup] = useState<any>(null);
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//   const [messageType, setMessageType] = useState<"success" | "error">("success");
//   const [step, setStep] = useState<"checking" | "login" | "register" | "joined">("checking");
//   const [password, setPassword] = useState("");
//   const [fullName, setFullName] = useState("");

//   // Check auth state on load
//   useEffect(() => {
//     async function checkAuth() {
//       const { data: { user } } = await supabase.auth.getUser();
      
//       if (user) {
//         setIsLoggedIn(true);
//         // Auto-join if already logged in
//         await joinGroup(user.id);
//       } else {
//         setStep("register"); // Show registration form with pre-filled email
//       }

//       // Fetch group info
//       if (groupId) {
//         const { data } = await supabase.from("groups").select("*").eq("id", groupId).single();
//         setGroup(data);
//       }
//     }
//     checkAuth();
//   }, [groupId]);

//   const joinGroup = async (userId: string) => {
//     // Check if already a member
//     const { data: existing } = await supabase
//       .from("group_members")
//       .select("*")
//       .eq("group_id", groupId)
//       .eq("user_id", userId)
//       .single();

//     if (existing) {
//       setMessage("You're already a member of this group!");
//       setMessageType("success");
//       setStep("joined");
//       return;
//     }

//     // Add to group
//     const { error } = await supabase.from("group_members").insert({
//       group_id: groupId,
//       user_id: userId,
//       role: role,
//     });

//     if (error) {
//       setMessage("Failed to join. Please try again.");
//       setMessageType("error");
//     } else {
//       // Update member count
//       if (group) {
//         await supabase
//           .from("groups")
//           .update({ member_count: (group.member_count || 0) + 1 })
//           .eq("id", groupId);
//       }
      
//       setMessage(`🎉 Welcome to ${groupName}! You're now a ${role}.`);
//       setMessageType("success");
//       setStep("joined");
//     }
//   };

//   const handleRegister = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       // 1. Create account with Supabase
//       const { data: authData, error: signUpError } = await supabase.auth.signUp({
//         email: inviteEmail,
//         password: password,
//         options: {
//           data: { full_name: fullName || inviteEmail.split("@")[0] },
//         },
//       });

//       if (signUpError) {
//         setMessage(signUpError.message);
//         setMessageType("error");
//         setLoading(false);
//         return;
//       }

//       // 2. Sign in immediately
//       const { error: signInError } = await supabase.auth.signInWithPassword({
//         email: inviteEmail,
//         password: password,
//       });

//       if (signInError) {
//         setMessage(signInError.message);
//         setMessageType("error");
//         setLoading(false);
//         return;
//       }

//       // 3. Get the new user
//       const { data: { user } } = await supabase.auth.getUser();
      
//       if (user) {
//         await joinGroup(user.id);
//       }
//     } catch (err) {
//       setMessage("Something went wrong. Please try again.");
//       setMessageType("error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLoginInstead = () => {
//     router.push(`/login?redirect=/join?group=${groupId}&email=${encodeURIComponent(inviteEmail)}&role=${role}&groupName=${encodeURIComponent(groupName)}`);
//   };

//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f8f9ff", padding: "24px" }}>
//       <div style={{ maxWidth: "480px", width: "100%", background: "#ffffff", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)", textAlign: "center" }}>
        
//         {/* Group Icon */}
//         <div style={{ width: "64px", height: "64px", backgroundColor: "rgba(0, 107, 44, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
//           <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>group_add</span>
//         </div>

//         <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>
//           {step === "joined" ? "You're in! 🎉" : `Join ${groupName}`}
//         </h1>
//         <p style={{ color: "#3e4a3d", marginBottom: "32px", fontSize: "15px" }}>
//           {step === "register" && `You've been invited as a <strong style="text-transform: capitalize;">${role}</strong>. Create your account to join.`}
//           {step === "joined" && "You now have access to the group dashboard."}
//           {step === "checking" && "Checking your invitation..."}
//         </p>

//         {/* Message */}
//         {message && (
//           <div style={{ padding: "12px", borderRadius: "12px", marginBottom: "24px", backgroundColor: messageType === "success" ? "rgba(0, 107, 44, 0.1)" : "#ffdad6", color: messageType === "success" ? "#006b2c" : "#93000a", fontSize: "14px" }}>
//             {message}
//           </div>
//         )}

//         {/* REGISTRATION FORM */}
//         {step === "register" && (
//           <form onSubmit={handleRegister} style={{ textAlign: "left" }}>
//             <div style={{ marginBottom: "20px" }}>
//               <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginBottom: "6px", display: "block", fontFamily: "'Geist', sans-serif" }}>
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 value={inviteEmail}
//                 disabled
//                 style={{
//                   width: "100%", padding: "14px 16px", border: "1px solid rgba(189, 202, 186, 0.5)",
//                   borderRadius: "12px", backgroundColor: "#eff4ff", color: "#6e7b6c",
//                   fontSize: "16px", fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
//                 }}
//               />
//               <p style={{ fontSize: "12px", color: "#6e7b6c", marginTop: "4px" }}>
//                 This is the email you were invited with
//               </p>
//             </div>

//             <div style={{ marginBottom: "20px" }}>
//               <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginBottom: "6px", display: "block", fontFamily: "'Geist', sans-serif" }}>
//                 Full Name
//               </label>
//               <input
//                 type="text"
//                 placeholder="Your full name"
//                 value={fullName}
//                 onChange={(e) => setFullName(e.target.value)}
//                 required
//                 style={{
//                   width: "100%", padding: "14px 16px", border: "1px solid rgba(189, 202, 186, 0.5)",
//                   borderRadius: "12px", outline: "none", fontSize: "16px", fontFamily: "'Inter', sans-serif",
//                   boxSizing: "border-box",
//                 }}
//                 onFocus={(e) => { e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)"; }}
//                 onBlur={(e) => { e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none"; }}
//               />
//             </div>

//             <div style={{ marginBottom: "24px" }}>
//               <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginBottom: "6px", display: "block", fontFamily: "'Geist', sans-serif" }}>
//                 Create Password
//               </label>
//               <input
//                 type="password"
//                 placeholder="Min. 6 characters"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 minLength={6}
//                 style={{
//                   width: "100%", padding: "14px 16px", border: "1px solid rgba(189, 202, 186, 0.5)",
//                   borderRadius: "12px", outline: "none", fontSize: "16px", fontFamily: "'Inter', sans-serif",
//                   boxSizing: "border-box",
//                 }}
//                 onFocus={(e) => { e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)"; }}
//                 onBlur={(e) => { e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none"; }}
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               style={{
//                 width: "100%", padding: "16px", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#ffffff",
//                 borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "16px",
//                 boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)", fontFamily: "'Inter', sans-serif",
//               }}
//             >
//               {loading ? "Creating account..." : `Join as ${role}`}
//             </button>

//             <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#5c647a" }}>
//               Already have an account?{" "}
//               <button
//                 onClick={handleLoginInstead}
//                 style={{ color: "#006b2c", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: 0 }}
//               >
//                 Sign in instead
//               </button>
//             </p>
//           </form>
//         )}

//         {/* JOINED STATE */}
//         {step === "joined" && (
//           <Link
//             href={`/groups/${groupId}`}
//             style={{
//               display: "block", width: "100%", padding: "16px", backgroundColor: "#006b2c", color: "#ffffff",
//               borderRadius: "12px", textDecoration: "none", fontWeight: 600, fontSize: "16px",
//               boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
//             }}
//           >
//             Go to Group →
//           </Link>
//         )}

//         {/* CHECKING STATE */}
//         {step === "checking" && (
//           <p style={{ color: "#6e7b6c", fontSize: "14px" }}>Please wait...</p>
//         )}
//       </div>
//     </div>
//   );
// }
