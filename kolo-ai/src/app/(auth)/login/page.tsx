"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value;
    const password = (form.querySelector('input[type="password"]') as HTMLInputElement).value;

    try {
      if (mode === "register") {
        const fullName = (form.querySelector('input[type="text"]') as HTMLInputElement).value;

        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) { setError(signInError.message); }
          else { router.push("/dashboard"); router.refresh(); }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message); }
        else { router.push("/dashboard"); router.refresh(); }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px 14px 48px", backgroundColor: "#ffffff",
    border: "1px solid rgba(189, 202, 186, 0.5)", borderRadius: "12px", outline: "none",
    fontSize: "16px", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", boxSizing: "border-box",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#006b2c"; e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.target.style.boxShadow = "none";
  };

  const socialBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    padding: "12px 16px", border: "1px solid #bdcaba", borderRadius: "12px",
    backgroundColor: "transparent", cursor: "pointer", transition: "all 0.2s",
    fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "#0b1c30",
  };

  return (
    <div style={{ backgroundColor: "#f8f9ff", color: "#0b1c30", fontFamily: "'Inter', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "row", position: "relative" }}>
      
      {/* Notification Toast */}
      {notification && (
        <div style={{ position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 200, backgroundColor: "#213145", color: "#ffffff", padding: "14px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "10px", maxWidth: "90%" }}>
          <span className="material-symbols-outlined" style={{ color: "#62df7d", fontSize: "20px" }}>info</span>
          {notification}
        </div>
      )}

      {/* LEFT HALF — BRANDING */}
      <div style={{ width: "50%", minHeight: "100vh", backgroundColor: "#0b1c30", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 64px", color: "#ffffff" }} className="hide-on-mobile">
        <div style={{ position: "absolute", top: "-20%", right: "-20%", width: "600px", height: "600px", backgroundColor: "rgba(0, 107, 44, 0.15)", filter: "blur(120px)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "400px", height: "400px", backgroundColor: "rgba(98, 223, 125, 0.1)", filter: "blur(100px)", borderRadius: "50%" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", position: "absolute", top: "40px", left: "64px" }}>
          <div style={{ width: "40px", height: "40px", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}>
            <span className="material-symbols-outlined" style={{ color: "#ffffff", fontVariationSettings: "'FILL' 1" }}>savings</span>
          </div>
          <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#ffffff" }}>Kolo AI</span>
        </Link>

        <div style={{ position: "relative", zIndex: 10, maxWidth: "480px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "9999px", backgroundColor: "rgba(0, 107, 44, 0.2)", border: "1px solid rgba(0, 107, 44, 0.3)", marginBottom: "32px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#62df7d" }}>auto_awesome</span>
            <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#62df7d" }}>AI-Powered Community Wealth</span>
          </div>
          <h1 style={{ fontSize: "48px", lineHeight: "56px", fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: "24px" }}>The Future of <span style={{ color: "#62df7d" }}>Community Finance</span></h1>
          <p style={{ fontSize: "18px", lineHeight: "28px", color: "rgba(234, 241, 255, 0.7)", marginBottom: "48px" }}>Automate your cooperative, contribution circle, or savings group with AI-driven treasury tools trusted by 50,000+ Nigerians.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { icon: "psychology", label: "AI Treasurer — instant ledger balancing" },
              { icon: "account_balance_wallet", label: "Monnify-powered secure payments" },
              { icon: "groups", label: "Dynamic group savings & rotations" },
              { icon: "trending_up", label: "Predictive analytics for smarter growth" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "rgba(0, 107, 44, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: "#62df7d", fontSize: "22px" }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: "15px", lineHeight: "22px", color: "rgba(234, 241, 255, 0.85)" }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "40px", marginTop: "56px", paddingTop: "32px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {[
              { value: "₦2.4B", label: "Managed" }, { value: "5,000+", label: "Communities" }, { value: "99.9%", label: "Accuracy" },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#62df7d", marginBottom: "4px" }}>{stat.value}</div>
                <div style={{ fontSize: "13px", color: "rgba(234, 241, 255, 0.5)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ position: "absolute", bottom: "40px", left: "64px", fontSize: "13px", color: "rgba(234, 241, 255, 0.4)" }}>&copy; 2026 Kolo AI. Built for API Conference Lagos.</p>
      </div>

      {/* RIGHT HALF — FORM */}
      <div style={{ width: "50%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative" }} className="full-width-on-mobile">
        <div style={{ position: "absolute", top: "20%", right: "-10%", width: "300px", height: "300px", backgroundColor: "rgba(0, 107, 44, 0.04)", filter: "blur(80px)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 10 }}>
          {error && (
            <div style={{ backgroundColor: "#ffdad6", color: "#93000a", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textAlign: "center" }}>{error}</div>
          )}

          {/* Mobile Logo */}
          <div style={{ display: "none", textAlign: "center", marginBottom: "24px" }} className="show-on-mobile">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <div style={{ width: "36px", height: "36px", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
                <span className="material-symbols-outlined" style={{ color: "#ffffff", fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>savings</span>
              </div>
              <span style={{ fontSize: "20px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Kolo AI</span>
            </Link>
          </div>

          {/* Toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <div style={{ padding: "4px", backgroundColor: "#e5eeff", borderRadius: "9999px", display: "flex", alignItems: "center", gap: "4px" }}>
              <button onClick={() => { setMode("login"); setError(""); }}
                style={{ padding: "8px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", transition: "all 0.2s", border: "none", cursor: "pointer", backgroundColor: mode === "login" ? "#ffffff" : "transparent", color: mode === "login" ? "#006b2c" : "#3e4a3d", boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Sign In</button>
              <button onClick={() => { setMode("register"); setError(""); }}
                style={{ padding: "8px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", transition: "all 0.2s", border: "none", cursor: "pointer", backgroundColor: mode === "register" ? "#ffffff" : "transparent", color: mode === "register" ? "#006b2c" : "#3e4a3d", boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Create Account</button>
            </div>
          </div>

          {/* Auth Card */}
          <div style={{ background: "#ffffff", border: "1px solid rgba(226, 232, 240, 0.8)", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.06)" }} className="auth-card-mobile">
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#0b1c30", marginBottom: "6px" }}>{mode === "login" ? "Welcome back" : "Join the circle"}</h1>
              <p style={{ fontSize: "15px", lineHeight: "22px", color: "#5c647a" }}>{mode === "login" ? "Continue your wealth creation journey." : "Start growing your collective wealth with AI."}</p>
            </div>

            {/* FORM FIELDS FIRST */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {mode === "register" && (
                <div>
                  <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginLeft: "4px", marginBottom: "4px", display: "block", fontFamily: "'Geist', sans-serif" }}>Full Name</label>
                  <div style={{ position: "relative" }}>
                    <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>person</span>
                    <input type="text" name="fullName" placeholder="John Doe" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginLeft: "4px", marginBottom: "4px", display: "block", fontFamily: "'Geist', sans-serif" }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>mail</span>
                  <input type="email" name="email" placeholder="name@company.com" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "4px", paddingRight: "4px", marginBottom: "4px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", fontFamily: "'Geist', sans-serif" }}>Password</label>
                  {mode === "login" && (
                    <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: "#006b2c", textDecoration: "none", fontFamily: "'Geist', sans-serif" }}>Forgot?</a>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>lock</span>
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" required style={{ ...inputStyle, paddingRight: "48px" }} onFocus={handleFocus} onBlur={handleBlur} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(62, 74, 61, 0.5)", padding: "4px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button type="submit" disabled={loading}
                style={{ width: "100%", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#ffffff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", padding: "16px", borderRadius: "12px", border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)", transition: "all 0.2s" }}>
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* DIVIDER */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0" }}>
              <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", fontFamily: "'Geist', sans-serif" }}>or continue with</span>
              <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
            </div>

            {/* SOCIAL LOGINS — Below form, above terms */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Google */}
              <button
                onClick={() => showNotification("Google Sign-In is coming very soon! Please use email to sign up.")}
                style={socialBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9ff"; e.currentTarget.style.borderColor = "#006b2c"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#bdcaba"; }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              {/* Apple */}
              <button
                onClick={() => showNotification("Apple Sign-In is coming very soon! Please use email to sign up.")}
                style={socialBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9ff"; e.currentTarget.style.borderColor = "#0b1c30"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#bdcaba"; }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0b1c30">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>

            {/* Terms */}
            <p style={{ marginTop: "28px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#3e4a3d", fontFamily: "'Geist', sans-serif" }}>
              By continuing, you agree to our{" "}
              <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>Terms of Service</a>{" "}and{" "}
              <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</a>.
            </p>

            {/* Switch mode */}
            <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "#5c647a" }}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={() => setMode(mode === "login" ? "register" : "login")}
                style={{ color: "#006b2c", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "'Geist', sans-serif", padding: 0 }}>
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Responsive */}
      <style jsx>{`
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
          .full-width-on-mobile { width: 100% !important; padding: 24px !important; }
          .auth-card-mobile { padding: 28px 24px !important; border-radius: 20px !important; }
          .show-on-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}




// "use client";

// import Link from "next/link";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";

// export default function LoginPage() {
//   const router = useRouter();
//   const supabase = createClient();

//   const [mode, setMode] = useState<"login" | "register">("login");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [notification, setNotification] = useState("");

//   const showNotification = (msg: string) => {
//     setNotification(msg);
//     setTimeout(() => setNotification(""), 3000);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     const form = e.target as HTMLFormElement;
//     const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value;
//     const password = (form.querySelector('input[type="password"]') as HTMLInputElement).value;

//     try {
//       if (mode === "register") {
//         const fullName = (form.querySelector('input[type="text"]') as HTMLInputElement).value;

//         const { error: signUpError } = await supabase.auth.signUp({
//           email,
//           password,
//           options: { data: { full_name: fullName } },
//         });

//         if (signUpError) {
//           setError(signUpError.message);
//         } else {
//           const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
//           if (signInError) {
//             setError(signInError.message);
//           } else {
//             router.push("/dashboard");
//             router.refresh();
//           }
//         }
//       } else {
//         const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
//         if (signInError) {
//           setError(signInError.message);
//         } else {
//           router.push("/dashboard");
//           router.refresh();
//         }
//       }
//     } catch (err) {
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: { redirectTo: `${window.location.origin}/dashboard` },
//     });
//     if (error) setError(error.message);
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%",
//     padding: "14px 16px 14px 48px",
//     backgroundColor: "#ffffff",
//     border: "1px solid rgba(189, 202, 186, 0.5)",
//     borderRadius: "12px",
//     outline: "none",
//     fontSize: "16px",
//     fontFamily: "'Inter', sans-serif",
//     transition: "all 0.2s",
//     boxSizing: "border-box",
//   };

//   const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "#006b2c";
//     e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
//   };

//   const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "rgba(189, 202, 186, 0.5)";
//     e.target.style.boxShadow = "none";
//   };

//   return (
//     <div style={{ backgroundColor: "#f8f9ff", color: "#0b1c30", fontFamily: "'Inter', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "row", position: "relative" }}>
      
//       {/* Notification Toast */}
//       {notification && (
//         <div style={{ position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 200, backgroundColor: "#213145", color: "#ffffff", padding: "14px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", display: "flex", alignItems: "center", gap: "10px", maxWidth: "90%" }}>
//           <span className="material-symbols-outlined" style={{ color: "#62df7d", fontSize: "20px" }}>info</span>
//           {notification}
//         </div>
//       )}

//       {/* ==================== LEFT HALF — BRANDING ==================== */}
//       <div style={{ width: "50%", minHeight: "100vh", backgroundColor: "#0b1c30", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 64px", color: "#ffffff" }} className="hide-on-mobile">
//         <div style={{ position: "absolute", top: "-20%", right: "-20%", width: "600px", height: "600px", backgroundColor: "rgba(0, 107, 44, 0.15)", filter: "blur(120px)", borderRadius: "50%" }} />
//         <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "400px", height: "400px", backgroundColor: "rgba(98, 223, 125, 0.1)", filter: "blur(100px)", borderRadius: "50%" }} />

//         <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", position: "absolute", top: "40px", left: "64px" }}>
//           <div style={{ width: "40px", height: "40px", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}>
//             <span className="material-symbols-outlined" style={{ color: "#ffffff", fontVariationSettings: "'FILL' 1" }}>savings</span>
//           </div>
//           <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#ffffff" }}>Kolo AI</span>
//         </Link>

//         <div style={{ position: "relative", zIndex: 10, maxWidth: "480px" }}>
//           <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "9999px", backgroundColor: "rgba(0, 107, 44, 0.2)", border: "1px solid rgba(0, 107, 44, 0.3)", marginBottom: "32px" }}>
//             <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#62df7d" }}>auto_awesome</span>
//             <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#62df7d" }}>AI-Powered Community Wealth</span>
//           </div>
//           <h1 style={{ fontSize: "48px", lineHeight: "56px", fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: "24px" }}>The Future of <span style={{ color: "#62df7d" }}>Community Finance</span></h1>
//           <p style={{ fontSize: "18px", lineHeight: "28px", color: "rgba(234, 241, 255, 0.7)", marginBottom: "48px" }}>Automate your cooperative, contribution circle, or savings group with AI-driven treasury tools trusted by 50,000+ Nigerians.</p>
//           <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//             {[
//               { icon: "psychology", label: "AI Treasurer — instant ledger balancing" },
//               { icon: "account_balance_wallet", label: "Monnify-powered secure payments" },
//               { icon: "groups", label: "Dynamic group savings & rotations" },
//               { icon: "trending_up", label: "Predictive analytics for smarter growth" },
//             ].map((item) => (
//               <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                 <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "rgba(0, 107, 44, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//                   <span className="material-symbols-outlined" style={{ color: "#62df7d", fontSize: "22px" }}>{item.icon}</span>
//                 </div>
//                 <span style={{ fontSize: "15px", lineHeight: "22px", color: "rgba(234, 241, 255, 0.85)" }}>{item.label}</span>
//               </div>
//             ))}
//           </div>
//           <div style={{ display: "flex", gap: "40px", marginTop: "56px", paddingTop: "32px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
//             {[
//               { value: "₦2.4B", label: "Managed" },
//               { value: "5,000+", label: "Communities" },
//               { value: "99.9%", label: "Accuracy" },
//             ].map((stat) => (
//               <div key={stat.label}>
//                 <div style={{ fontSize: "24px", fontWeight: 700, color: "#62df7d", marginBottom: "4px" }}>{stat.value}</div>
//                 <div style={{ fontSize: "13px", color: "rgba(234, 241, 255, 0.5)" }}>{stat.label}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//         <p style={{ position: "absolute", bottom: "40px", left: "64px", fontSize: "13px", color: "rgba(234, 241, 255, 0.4)" }}>&copy; 2026 Kolo AI. Built for API Conference Lagos.</p>
//       </div>

//       {/* ==================== RIGHT HALF — FORM ==================== */}
//       <div style={{ width: "50%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative" }} className="full-width-on-mobile">
//         <div style={{ position: "absolute", top: "20%", right: "-10%", width: "300px", height: "300px", backgroundColor: "rgba(0, 107, 44, 0.04)", filter: "blur(80px)", borderRadius: "50%", pointerEvents: "none" }} />

//         <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 10 }}>
//           {error && (
//             <div style={{ backgroundColor: "#ffdad6", color: "#93000a", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textAlign: "center" }}>
//               {error}
//             </div>
//           )}

//           {/* Mobile Logo */}
//           <div style={{ display: "none", textAlign: "center", marginBottom: "24px" }} className="show-on-mobile">
//             <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
//               <div style={{ width: "36px", height: "36px", backgroundColor: "#006b2c", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
//                 <span className="material-symbols-outlined" style={{ color: "#ffffff", fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>savings</span>
//               </div>
//               <span style={{ fontSize: "20px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Kolo AI</span>
//             </Link>
//           </div>

//           {/* Toggle */}
//           <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
//             <div style={{ padding: "4px", backgroundColor: "#e5eeff", borderRadius: "9999px", display: "flex", alignItems: "center", gap: "4px" }}>
//               <button onClick={() => { setMode("login"); setError(""); }}
//                 style={{ padding: "8px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", transition: "all 0.2s", border: "none", cursor: "pointer", backgroundColor: mode === "login" ? "#ffffff" : "transparent", color: mode === "login" ? "#006b2c" : "#3e4a3d", boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
//                 Sign In
//               </button>
//               <button onClick={() => { setMode("register"); setError(""); }}
//                 style={{ padding: "8px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", transition: "all 0.2s", border: "none", cursor: "pointer", backgroundColor: mode === "register" ? "#ffffff" : "transparent", color: mode === "register" ? "#006b2c" : "#3e4a3d", boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
//                 Create Account
//               </button>
//             </div>
//           </div>

//           {/* Auth Card */}
//           <div style={{ background: "#ffffff", border: "1px solid rgba(226, 232, 240, 0.8)", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.06)" }} className="auth-card-mobile">
//             <div style={{ marginBottom: "32px" }}>
//               <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#0b1c30", marginBottom: "6px" }}>{mode === "login" ? "Welcome back" : "Join the circle"}</h1>
//               <p style={{ fontSize: "15px", lineHeight: "22px", color: "#5c647a" }}>{mode === "login" ? "Continue your wealth creation journey." : "Start growing your collective wealth with AI."}</p>
//             </div>

//             {/* Social Logins */}
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
//               <button onClick={handleGoogleSignIn}
//                 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px 16px", border: "1px solid #bdcaba", borderRadius: "12px", backgroundColor: "transparent", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "#0b1c30" }}
//                 onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9ff"; e.currentTarget.style.borderColor = "#006b2c"; }}
//                 onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#bdcaba"; }}>
//                 <svg width="20" height="20" viewBox="0 0 24 24">
//                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
//                   <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
//                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
//                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
//                 </svg>
//                 Google
//               </button>
//               <button onClick={() => showNotification("Apple Sign-In is coming very soon! Please use email or Google for now.")}
//                 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px 16px", border: "1px solid #bdcaba", borderRadius: "12px", backgroundColor: "transparent", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "#0b1c30" }}
//                 onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9ff"; e.currentTarget.style.borderColor = "#0b1c30"; }}
//                 onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#bdcaba"; }}>
//                 <svg width="20" height="20" viewBox="0 0 24 24" fill="#0b1c30">
//                   <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
//                 </svg>
//                 Apple
//               </button>
//             </div>

//             {/* Divider */}
//             <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
//               <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
//               <span style={{ fontSize: "12px", fontWeight: 600, color: "#6e7b6c", textTransform: "uppercase", fontFamily: "'Geist', sans-serif" }}>or email</span>
//               <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
//             </div>

//             {/* Form */}
//             <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//               {mode === "register" && (
//                 <div>
//                   <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginLeft: "4px", marginBottom: "4px", display: "block", fontFamily: "'Geist', sans-serif" }}>Full Name</label>
//                   <div style={{ position: "relative" }}>
//                     <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>person</span>
//                     <input type="text" name="fullName" placeholder="John Doe" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", marginLeft: "4px", marginBottom: "4px", display: "block", fontFamily: "'Geist', sans-serif" }}>Email Address</label>
//                 <div style={{ position: "relative" }}>
//                   <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>mail</span>
//                   <input type="email" name="email" placeholder="name@company.com" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
//                 </div>
//               </div>

//               <div>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "4px", paddingRight: "4px", marginBottom: "4px" }}>
//                   <label style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d", fontFamily: "'Geist', sans-serif" }}>Password</label>
//                   {mode === "login" && (
//                     <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: "#006b2c", textDecoration: "none", fontFamily: "'Geist', sans-serif" }}>Forgot?</a>
//                   )}
//                 </div>
//                 <div style={{ position: "relative" }}>
//                   <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.5)" }}>lock</span>
//                   <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" required style={{ ...inputStyle, paddingRight: "48px" }} onFocus={handleFocus} onBlur={handleBlur} />
//                   <button type="button" onClick={() => setShowPassword(!showPassword)}
//                     style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(62, 74, 61, 0.5)", padding: "4px" }}>
//                     <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>{showPassword ? "visibility_off" : "visibility"}</span>
//                   </button>
//                 </div>
//               </div>

//               <button type="submit" disabled={loading}
//                 style={{ width: "100%", backgroundColor: loading ? "#6e7b6c" : "#006b2c", color: "#ffffff", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", padding: "16px", borderRadius: "12px", border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)", marginTop: "8px", transition: "all 0.2s" }}>
//                 {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
//               </button>
//             </form>

//             <p style={{ marginTop: "28px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#3e4a3d", fontFamily: "'Geist', sans-serif" }}>
//               By continuing, you agree to our{" "}
//               <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>Terms of Service</a>{" "}and{" "}
//               <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</a>.
//             </p>

//             <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "#5c647a" }}>
//               {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
//               <button onClick={() => setMode(mode === "login" ? "register" : "login")}
//                 style={{ color: "#006b2c", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "'Geist', sans-serif", padding: 0 }}>
//                 {mode === "login" ? "Create one" : "Sign in"}
//               </button>
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Responsive Styles */}
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .hide-on-mobile { display: none !important; }
//           .full-width-on-mobile { width: 100% !important; padding: 24px !important; }
//           .auth-card-mobile { padding: 28px 24px !important; border-radius: 20px !important; }
//           .show-on-mobile { display: block !important; }
//         }
//       `}</style>
//     </div>
//   );
// }







// "use client";

// import Link from "next/link";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";

// export default function LoginPage() {
//   const router = useRouter();
//   const supabase = createClient();

//   const [mode, setMode] = useState<"login" | "register">("login");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     const form = e.target as HTMLFormElement;
//     const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value;
//     const password = (form.querySelector('input[type="password"]') as HTMLInputElement).value;

//     try {
//       if (mode === "register") {
//         const fullName = (form.querySelector('input[type="text"]') as HTMLInputElement).value;

//         const { error: signUpError } = await supabase.auth.signUp({
//           email,
//           password,
//           options: {
//             data: { full_name: fullName },
//           },
//         });

//         if (signUpError) {
//           setError(signUpError.message);
//         } else {
//           // Auto sign in right after registration
//           const { error: signInError } = await supabase.auth.signInWithPassword({
//             email,
//             password,
//           });

//           if (signInError) {
//             setError(signInError.message);
//           } else {
//             router.push("/dashboard");
//             router.refresh();
//           }
//         }
//       } else {
//         const { error: signInError } = await supabase.auth.signInWithPassword({
//           email,
//           password,
//         });

//         if (signInError) {
//           setError(signInError.message);
//         } else {
//           router.push("/dashboard");
//           router.refresh();
//         }
//       }
//     } catch (err) {
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: `${window.location.origin}/dashboard`,
//       },
//     });
//     if (error) setError(error.message);
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%",
//     padding: "14px 16px 14px 48px",
//     backgroundColor: "#ffffff",
//     border: "1px solid rgba(189, 202, 186, 0.5)",
//     borderRadius: "12px",
//     outline: "none",
//     fontSize: "16px",
//     lineHeight: "24px",
//     fontFamily: "'Inter', sans-serif",
//     transition: "all 0.2s",
//     boxSizing: "border-box",
//   };

//   const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "#006b2c";
//     e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
//   };

//   const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "rgba(189, 202, 186, 0.5)";
//     e.target.style.boxShadow = "none";
//   };

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
//       {/* ==================== LEFT HALF — BRANDING ==================== */}
//       <div
//         style={{
//           width: "50%",
//           minHeight: "100vh",
//           backgroundColor: "#0b1c30",
//           position: "relative",
//           overflow: "hidden",
//           display: "flex",
//           flexDirection: "column",
//           justifyContent: "center",
//           padding: "80px 64px",
//           color: "#ffffff",
//         }}
//       >
//         <div
//           style={{
//             position: "absolute",
//             top: "-20%",
//             right: "-20%",
//             width: "600px",
//             height: "600px",
//             backgroundColor: "rgba(0, 107, 44, 0.15)",
//             filter: "blur(120px)",
//             borderRadius: "50%",
//           }}
//         />
//         <div
//           style={{
//             position: "absolute",
//             bottom: "-10%",
//             left: "-10%",
//             width: "400px",
//             height: "400px",
//             backgroundColor: "rgba(98, 223, 125, 0.1)",
//             filter: "blur(100px)",
//             borderRadius: "50%",
//           }}
//         />

//         <Link
//           href="/"
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             textDecoration: "none",
//             position: "absolute",
//             top: "40px",
//             left: "64px",
//           }}
//         >
//           <div
//             style={{
//               width: "40px",
//               height: "40px",
//               backgroundColor: "#006b2c",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "12px",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 color: "#ffffff",
//                 fontVariationSettings: "'FILL' 1",
//               }}
//             >
//               savings
//             </span>
//           </div>
//           <span
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#ffffff",
//             }}
//           >
//             Kolo AI
//           </span>
//         </Link>

//         <div style={{ position: "relative", zIndex: 10, maxWidth: "480px" }}>
//           <div
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: "8px",
//               padding: "6px 16px",
//               borderRadius: "9999px",
//               backgroundColor: "rgba(0, 107, 44, 0.2)",
//               border: "1px solid rgba(0, 107, 44, 0.3)",
//               marginBottom: "32px",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px", color: "#62df7d" }}
//             >
//               auto_awesome
//             </span>
//             <span
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#62df7d",
//               }}
//             >
//               AI-Powered Community Wealth
//             </span>
//           </div>

//           <h1
//             style={{
//               fontSize: "48px",
//               lineHeight: "56px",
//               letterSpacing: "-0.02em",
//               fontWeight: 700,
//               fontFamily: "'Inter', sans-serif",
//               marginBottom: "24px",
//             }}
//           >
//             The Future of{" "}
//             <span style={{ color: "#62df7d" }}>Community Finance</span>
//           </h1>

//           <p
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               color: "rgba(234, 241, 255, 0.7)",
//               marginBottom: "48px",
//             }}
//           >
//             Automate your cooperative, contribution circle, or savings group
//             with AI-driven treasury tools trusted by 50,000+ Nigerians.
//           </p>

//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "20px",
//             }}
//           >
//             {[
//               { icon: "psychology", label: "AI Treasurer — instant ledger balancing" },
//               { icon: "account_balance_wallet", label: "Monnify-powered secure payments" },
//               { icon: "groups", label: "Dynamic group savings & rotations" },
//               { icon: "trending_up", label: "Predictive analytics for smarter growth" },
//             ].map((item) => (
//               <div
//                 key={item.label}
//                 style={{ display: "flex", alignItems: "center", gap: "16px" }}
//               >
//                 <div
//                   style={{
//                     width: "44px",
//                     height: "44px",
//                     borderRadius: "12px",
//                     backgroundColor: "rgba(0, 107, 44, 0.2)",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     flexShrink: 0,
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ color: "#62df7d", fontSize: "22px" }}
//                   >
//                     {item.icon}
//                   </span>
//                 </div>
//                 <span
//                   style={{
//                     fontSize: "15px",
//                     lineHeight: "22px",
//                     color: "rgba(234, 241, 255, 0.85)",
//                   }}
//                 >
//                   {item.label}
//                 </span>
//               </div>
//             ))}
//           </div>

//           <div
//             style={{
//               display: "flex",
//               gap: "40px",
//               marginTop: "56px",
//               paddingTop: "32px",
//               borderTop: "1px solid rgba(255, 255, 255, 0.1)",
//             }}
//           >
//             {[
//               { value: "₦2.4B", label: "Managed" },
//               { value: "5,000+", label: "Communities" },
//               { value: "99.9%", label: "Accuracy" },
//             ].map((stat) => (
//               <div key={stat.label}>
//                 <div
//                   style={{
//                     fontSize: "24px",
//                     fontWeight: 700,
//                     color: "#62df7d",
//                     marginBottom: "4px",
//                   }}
//                 >
//                   {stat.value}
//                 </div>
//                 <div
//                   style={{ fontSize: "13px", color: "rgba(234, 241, 255, 0.5)" }}
//                 >
//                   {stat.label}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <p
//           style={{
//             position: "absolute",
//             bottom: "40px",
//             left: "64px",
//             fontSize: "13px",
//             color: "rgba(234, 241, 255, 0.4)",
//           }}
//         >
//           &copy; 2026 Kolo AI. Built for API Conference Lagos.
//         </p>
//       </div>

//       {/* ==================== RIGHT HALF — FORM ==================== */}
//       <div
//         style={{
//           width: "50%",
//           minHeight: "100vh",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "40px",
//           position: "relative",
//         }}
//       >
//         <div
//           style={{
//             position: "absolute",
//             top: "20%",
//             right: "-10%",
//             width: "300px",
//             height: "300px",
//             backgroundColor: "rgba(0, 107, 44, 0.04)",
//             filter: "blur(80px)",
//             borderRadius: "50%",
//             pointerEvents: "none",
//           }}
//         />

//         <div
//           style={{
//             width: "100%",
//             maxWidth: "440px",
//             position: "relative",
//             zIndex: 10,
//           }}
//         >
//           {/* Error Message */}
//           {error && (
//             <div
//               style={{
//                 backgroundColor: "#ffdad6",
//                 color: "#93000a",
//                 padding: "12px 16px",
//                 borderRadius: "12px",
//                 marginBottom: "16px",
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontWeight: 500,
//                 fontFamily: "'Geist', sans-serif",
//                 textAlign: "center",
//               }}
//             >
//               {error}
//             </div>
//           )}

//           {/* Toggle */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "center",
//               marginBottom: "32px",
//             }}
//           >
//             <div
//               style={{
//                 padding: "4px",
//                 backgroundColor: "#e5eeff",
//                 borderRadius: "9999px",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "4px",
//               }}
//             >
//               <button
//                 onClick={() => { setMode("login"); setError(""); }}
//                 style={{
//                   padding: "8px 24px",
//                   borderRadius: "9999px",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   transition: "all 0.2s",
//                   border: "none",
//                   cursor: "pointer",
//                   backgroundColor: mode === "login" ? "#ffffff" : "transparent",
//                   color: mode === "login" ? "#006b2c" : "#3e4a3d",
//                   boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
//                 }}
//               >
//                 Sign In
//               </button>
//               <button
//                 onClick={() => { setMode("register"); setError(""); }}
//                 style={{
//                   padding: "8px 24px",
//                   borderRadius: "9999px",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   transition: "all 0.2s",
//                   border: "none",
//                   cursor: "pointer",
//                   backgroundColor: mode === "register" ? "#ffffff" : "transparent",
//                   color: mode === "register" ? "#006b2c" : "#3e4a3d",
//                   boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
//                 }}
//               >
//                 Create Account
//               </button>
//             </div>
//           </div>

//           {/* Auth Card */}
//           <div
//             style={{
//               background: "#ffffff",
//               border: "1px solid rgba(226, 232, 240, 0.8)",
//               borderRadius: "24px",
//               padding: "40px",
//               boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.06)",
//             }}
//           >
//             <div style={{ marginBottom: "32px" }}>
//               <h1
//                 style={{
//                   fontSize: "24px",
//                   lineHeight: "32px",
//                   letterSpacing: "-0.01em",
//                   fontWeight: 600,
//                   color: "#0b1c30",
//                   marginBottom: "6px",
//                 }}
//               >
//                 {mode === "login" ? "Welcome back" : "Join the circle"}
//               </h1>
//               <p style={{ fontSize: "15px", lineHeight: "22px", color: "#5c647a" }}>
//                 {mode === "login"
//                   ? "Continue your wealth creation journey."
//                   : "Start growing your collective wealth with AI."}
//               </p>
//             </div>

//             {/* Social Logins */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "16px",
//                 marginBottom: "32px",
//               }}
//             >
//               <button
//                 onClick={handleGoogleSignIn}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                   padding: "12px 16px",
//                   border: "1px solid #bdcaba",
//                   borderRadius: "12px",
//                   backgroundColor: "transparent",
//                   cursor: "pointer",
//                   transition: "background-color 0.2s",
//                   fontFamily: "'Geist', sans-serif",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   color: "#0b1c30",
//                 }}
//               >
//                 <img
//                   alt="Google"
//                   style={{ width: "20px", height: "20px" }}
//                   src="https://lh3.googleusercontent.com/aida-public/AB6AXuBS6b--ZmJixarWZo3RqdeTgN7gLLIvhyDIWLwE1EQXC0dcat1JPeBUJP6lxkC4LtIgZ-STEUujWPCcs6tESnDS08EX5p5N3aFUcTjwe92hQKHujwm05-bmbVRRDkcbGez0ijnFILo18RTKFlWn6q8bE9E0UDbTShm7Llu_THBI0GOlmMe6ZrQmCwD_nNLxAR02KzIFHbHu6i8VOu7rJv-24lCVuKzBpoWPftWqitWVRCDm2I4v0ENorWI3uTyJ6Hr5BWZkGTa8kZW2"
//                 />
//                 Google
//               </button>
//               <button
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                   padding: "12px 16px",
//                   border: "1px solid #bdcaba",
//                   borderRadius: "12px",
//                   backgroundColor: "transparent",
//                   cursor: "pointer",
//                   transition: "background-color 0.2s",
//                   fontFamily: "'Geist', sans-serif",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   color: "#0b1c30",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{
//                     fontSize: "20px",
//                     color: "#0b1c30",
//                     fontVariationSettings: "'FILL' 1",
//                   }}
//                 >
//                   apps
//                 </span>
//                 Apple
//               </button>
//             </div>

//             {/* Divider */}
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "16px",
//                 marginBottom: "32px",
//               }}
//             >
//               <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
//               <span
//                 style={{
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   color: "#6e7b6c",
//                   textTransform: "uppercase",
//                   fontFamily: "'Geist', sans-serif",
//                 }}
//               >
//                 or email
//               </span>
//               <div style={{ flexGrow: 1, borderTop: "1px solid rgba(189, 202, 186, 0.3)" }} />
//             </div>

//             {/* Form */}
//             <form
//               onSubmit={handleSubmit}
//               style={{ display: "flex", flexDirection: "column", gap: "20px" }}
//             >
//               {mode === "register" && (
//                 <div>
//                   <label
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       color: "#3e4a3d",
//                       marginLeft: "4px",
//                       marginBottom: "4px",
//                       display: "block",
//                       fontFamily: "'Geist', sans-serif",
//                     }}
//                   >
//                     Full Name
//                   </label>
//                   <div style={{ position: "relative" }}>
//                     <span
//                       className="material-symbols-outlined"
//                       style={{
//                         position: "absolute",
//                         left: "16px",
//                         top: "50%",
//                         transform: "translateY(-50%)",
//                         color: "rgba(62, 74, 61, 0.5)",
//                       }}
//                     >
//                       person
//                     </span>
//                     <input
//                       type="text"
//                       name="fullName"
//                       placeholder="John Doe"
//                       required
//                       style={inputStyle}
//                       onFocus={handleFocus}
//                       onBlur={handleBlur}
//                     />
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     color: "#3e4a3d",
//                     marginLeft: "4px",
//                     marginBottom: "4px",
//                     display: "block",
//                     fontFamily: "'Geist', sans-serif",
//                   }}
//                 >
//                   Email Address
//                 </label>
//                 <div style={{ position: "relative" }}>
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       position: "absolute",
//                       left: "16px",
//                       top: "50%",
//                       transform: "translateY(-50%)",
//                       color: "rgba(62, 74, 61, 0.5)",
//                     }}
//                   >
//                     mail
//                   </span>
//                   <input
//                     type="email"
//                     name="email"
//                     placeholder="name@company.com"
//                     required
//                     style={inputStyle}
//                     onFocus={handleFocus}
//                     onBlur={handleBlur}
//                   />
//                 </div>
//               </div>

//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     paddingLeft: "4px",
//                     paddingRight: "4px",
//                     marginBottom: "4px",
//                   }}
//                 >
//                   <label
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       color: "#3e4a3d",
//                       fontFamily: "'Geist', sans-serif",
//                     }}
//                   >
//                     Password
//                   </label>
//                   {mode === "login" && (
//                     <a
//                       href="#"
//                       style={{
//                         fontSize: "12px",
//                         lineHeight: "16px",
//                         letterSpacing: "0.03em",
//                         fontWeight: 600,
//                         color: "#006b2c",
//                         textDecoration: "none",
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       Forgot?
//                     </a>
//                   )}
//                 </div>
//                 <div style={{ position: "relative" }}>
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       position: "absolute",
//                       left: "16px",
//                       top: "50%",
//                       transform: "translateY(-50%)",
//                       color: "rgba(62, 74, 61, 0.5)",
//                     }}
//                   >
//                     lock
//                   </span>
//                   <input
//                     type="password"
//                     name="password"
//                     placeholder="••••••••"
//                     required
//                     style={inputStyle}
//                     onFocus={handleFocus}
//                     onBlur={handleBlur}
//                   />
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 style={{
//                   width: "100%",
//                   backgroundColor: loading ? "#6e7b6c" : "#006b2c",
//                   color: "#ffffff",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   padding: "16px",
//                   borderRadius: "12px",
//                   border: "none",
//                   cursor: loading ? "not-allowed" : "pointer",
//                   boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
//                   marginTop: "8px",
//                   transition: "all 0.2s",
//                 }}
//               >
//                 {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
//               </button>
//             </form>

//             <p
//               style={{
//                 marginTop: "28px",
//                 textAlign: "center",
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 color: "#3e4a3d",
//                 fontFamily: "'Geist', sans-serif",
//               }}
//             >
//               By continuing, you agree to our{" "}
//               <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>
//                 Terms of Service
//               </a>{" "}
//               and{" "}
//               <a href="#" style={{ color: "#0b1c30", fontWeight: 600, textDecoration: "none" }}>
//                 Privacy Policy
//               </a>
//               .
//             </p>

//             <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "#5c647a" }}>
//               {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
//               <button
//                 onClick={() => setMode(mode === "login" ? "register" : "login")}
//                 style={{
//                   color: "#006b2c",
//                   fontWeight: 600,
//                   background: "none",
//                   border: "none",
//                   cursor: "pointer",
//                   fontSize: "13px",
//                   fontFamily: "'Geist', sans-serif",
//                   padding: 0,
//                 }}
//               >
//                 {mode === "login" ? "Create one" : "Sign in"}
//               </button>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }






// "use client";

// import Link from "next/link";
// import { useState, useRef } from "react";

// export default function LoginPage() {
//   const [mode, setMode] = useState<"login" | "register">("login");
//   const [showOTP, setShowOTP] = useState(false);
//   const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
//   const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setShowOTP(true);
//   };

//   const handleOTPChange = (index: number, value: string) => {
//     if (value.length > 1) return;
//     const newOtp = [...otpValues];
//     newOtp[index] = value;
//     setOtpValues(newOtp);

//     if (value && index < 5) {
//       otpRefs.current[index + 1]?.focus();
//     }
//   };

//   const handleOTPKeyDown = (
//     index: number,
//     e: React.KeyboardEvent<HTMLInputElement>
//   ) => {
//     if (e.key === "Backspace" && !otpValues[index] && index > 0) {
//       otpRefs.current[index - 1]?.focus();
//     }
//   };

//   const resetOTP = () => {
//     setOtpValues(["", "", "", "", "", ""]);
//     otpRefs.current[0]?.focus();
//   };

//   const backToAuth = () => {
//     setShowOTP(false);
//     setOtpValues(["", "", "", "", "", ""]);
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%",
//     padding: "14px 16px 14px 48px",
//     backgroundColor: "#ffffff",
//     border: "1px solid rgba(189, 202, 186, 0.5)",
//     borderRadius: "12px",
//     outline: "none",
//     fontSize: "16px",
//     lineHeight: "24px",
//     fontFamily: "'Inter', sans-serif",
//     transition: "all 0.2s",
//     boxSizing: "border-box",
//   };

//   const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "#006b2c";
//     e.target.style.boxShadow = "0 0 0 4px rgba(0, 107, 44, 0.1)";
//   };

//   const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
//     e.target.style.borderColor = "rgba(189, 202, 186, 0.5)";
//     e.target.style.boxShadow = "none";
//   };

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
//       {/* ==================== LEFT HALF — BRANDING ==================== */}
//       <div
//         style={{
//           width: "50%",
//           minHeight: "100vh",
//           backgroundColor: "#0b1c30",
//           position: "relative",
//           overflow: "hidden",
//           display: "flex",
//           flexDirection: "column",
//           justifyContent: "center",
//           padding: "80px 64px",
//           color: "#ffffff",
//         }}
//       >
//         {/* Background glow effects */}
//         <div
//           style={{
//             position: "absolute",
//             top: "-20%",
//             right: "-20%",
//             width: "600px",
//             height: "600px",
//             backgroundColor: "rgba(0, 107, 44, 0.15)",
//             filter: "blur(120px)",
//             borderRadius: "50%",
//           }}
//         />
//         <div
//           style={{
//             position: "absolute",
//             bottom: "-10%",
//             left: "-10%",
//             width: "400px",
//             height: "400px",
//             backgroundColor: "rgba(98, 223, 125, 0.1)",
//             filter: "blur(100px)",
//             borderRadius: "50%",
//           }}
//         />

//         {/* Logo */}
//         <Link
//           href="/"
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             textDecoration: "none",
//             position: "absolute",
//             top: "40px",
//             left: "64px",
//           }}
//         >
//           <div
//             style={{
//               width: "40px",
//               height: "40px",
//               backgroundColor: "#006b2c",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "12px",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 color: "#ffffff",
//                 fontVariationSettings: "'FILL' 1",
//               }}
//             >
//               savings
//             </span>
//           </div>
//           <span
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#ffffff",
//             }}
//           >
//             Kolo AI
//           </span>
//         </Link>

//         {/* Main content */}
//         <div style={{ position: "relative", zIndex: 10, maxWidth: "480px" }}>
//           <div
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: "8px",
//               padding: "6px 16px",
//               borderRadius: "9999px",
//               backgroundColor: "rgba(0, 107, 44, 0.2)",
//               border: "1px solid rgba(0, 107, 44, 0.3)",
//               marginBottom: "32px",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px", color: "#62df7d" }}
//             >
//               auto_awesome
//             </span>
//             <span
//               style={{
//                 fontSize: "12px",
//                 lineHeight: "16px",
//                 letterSpacing: "0.03em",
//                 fontWeight: 600,
//                 fontFamily: "'Geist', sans-serif",
//                 color: "#62df7d",
//               }}
//             >
//               AI-Powered Community Wealth
//             </span>
//           </div>

//           <h1
//             style={{
//               fontSize: "48px",
//               lineHeight: "56px",
//               letterSpacing: "-0.02em",
//               fontWeight: 700,
//               fontFamily: "'Inter', sans-serif",
//               marginBottom: "24px",
//             }}
//           >
//             The Future of{" "}
//             <span style={{ color: "#62df7d" }}>Community Finance</span>
//           </h1>

//           <p
//             style={{
//               fontSize: "18px",
//               lineHeight: "28px",
//               color: "rgba(234, 241, 255, 0.7)",
//               marginBottom: "48px",
//             }}
//           >
//             Automate your cooperative, contribution circle, or savings group
//             with AI-driven treasury tools trusted by 50,000+ Nigerians.
//           </p>

//           {/* Feature bullets */}
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "20px",
//             }}
//           >
//             {[
//               {
//                 icon: "psychology",
//                 label: "AI Treasurer — instant ledger balancing",
//               },
//               {
//                 icon: "account_balance_wallet",
//                 label: "Monnify-powered secure payments",
//               },
//               {
//                 icon: "groups",
//                 label: "Dynamic group savings & rotations",
//               },
//               {
//                 icon: "trending_up",
//                 label: "Predictive analytics for smarter growth",
//               },
//             ].map((item) => (
//               <div
//                 key={item.label}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "16px",
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "44px",
//                     height: "44px",
//                     borderRadius: "12px",
//                     backgroundColor: "rgba(0, 107, 44, 0.2)",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     flexShrink: 0,
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ color: "#62df7d", fontSize: "22px" }}
//                   >
//                     {item.icon}
//                   </span>
//                 </div>
//                 <span
//                   style={{
//                     fontSize: "15px",
//                     lineHeight: "22px",
//                     color: "rgba(234, 241, 255, 0.85)",
//                   }}
//                 >
//                   {item.label}
//                 </span>
//               </div>
//             ))}
//           </div>

//           {/* Stats strip */}
//           <div
//             style={{
//               display: "flex",
//               gap: "40px",
//               marginTop: "56px",
//               paddingTop: "32px",
//               borderTop: "1px solid rgba(255, 255, 255, 0.1)",
//             }}
//           >
//             {[
//               { value: "₦2.4B", label: "Managed" },
//               { value: "5,000+", label: "Communities" },
//               { value: "99.9%", label: "Accuracy" },
//             ].map((stat) => (
//               <div key={stat.label}>
//                 <div
//                   style={{
//                     fontSize: "24px",
//                     fontWeight: 700,
//                     color: "#62df7d",
//                     marginBottom: "4px",
//                   }}
//                 >
//                   {stat.value}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: "13px",
//                     color: "rgba(234, 241, 255, 0.5)",
//                   }}
//                 >
//                   {stat.label}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Bottom text */}
//         <p
//           style={{
//             position: "absolute",
//             bottom: "40px",
//             left: "64px",
//             fontSize: "13px",
//             color: "rgba(234, 241, 255, 0.4)",
//           }}
//         >
//           &copy; 2026 Kolo AI. Built for API Conference Lagos.
//         </p>
//       </div>

//       {/* ==================== RIGHT HALF — FORM ==================== */}
//       <div
//         style={{
//           width: "50%",
//           minHeight: "100vh",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "40px",
//           position: "relative",
//         }}
//       >
//         {/* Subtle right-side glow */}
//         <div
//           style={{
//             position: "absolute",
//             top: "20%",
//             right: "-10%",
//             width: "300px",
//             height: "300px",
//             backgroundColor: "rgba(0, 107, 44, 0.04)",
//             filter: "blur(80px)",
//             borderRadius: "50%",
//             pointerEvents: "none",
//           }}
//         />

//         <div
//           style={{
//             width: "100%",
//             maxWidth: "440px",
//             position: "relative",
//             zIndex: 10,
//           }}
//         >
//           {/* Toggle */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "center",
//               marginBottom: "32px",
//             }}
//           >
//             <div
//               style={{
//                 padding: "4px",
//                 backgroundColor: "#e5eeff",
//                 borderRadius: "9999px",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "4px",
//               }}
//             >
//               <button
//                 onClick={() => setMode("login")}
//                 style={{
//                   padding: "8px 24px",
//                   borderRadius: "9999px",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   transition: "all 0.2s",
//                   border: "none",
//                   cursor: "pointer",
//                   backgroundColor:
//                     mode === "login" ? "#ffffff" : "transparent",
//                   color: mode === "login" ? "#006b2c" : "#3e4a3d",
//                   boxShadow:
//                     mode === "login"
//                       ? "0 1px 3px rgba(0,0,0,0.1)"
//                       : "none",
//                 }}
//               >
//                 Sign In
//               </button>
//               <button
//                 onClick={() => setMode("register")}
//                 style={{
//                   padding: "8px 24px",
//                   borderRadius: "9999px",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   transition: "all 0.2s",
//                   border: "none",
//                   cursor: "pointer",
//                   backgroundColor:
//                     mode === "register" ? "#ffffff" : "transparent",
//                   color: mode === "register" ? "#006b2c" : "#3e4a3d",
//                   boxShadow:
//                     mode === "register"
//                       ? "0 1px 3px rgba(0,0,0,0.1)"
//                       : "none",
//                 }}
//               >
//                 Create Account
//               </button>
//             </div>
//           </div>

//           {/* Main Auth Card */}
//           {!showOTP && (
//             <div
//               style={{
//                 background: "#ffffff",
//                 border: "1px solid rgba(226, 232, 240, 0.8)",
//                 borderRadius: "24px",
//                 padding: "40px",
//                 boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.06)",
//               }}
//             >
//               <div style={{ marginBottom: "32px" }}>
//                 <h1
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 600,
//                     color: "#0b1c30",
//                     marginBottom: "6px",
//                   }}
//                 >
//                   {mode === "login" ? "Welcome back" : "Join the circle"}
//                 </h1>
//                 <p
//                   style={{
//                     fontSize: "15px",
//                     lineHeight: "22px",
//                     color: "#5c647a",
//                   }}
//                 >
//                   {mode === "login"
//                     ? "Continue your wealth creation journey."
//                     : "Start growing your collective wealth with AI."}
//                 </p>
//               </div>

//               {/* Social Logins */}
//               <div
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "1fr 1fr",
//                   gap: "16px",
//                   marginBottom: "32px",
//                 }}
//               >
//                 <button
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     gap: "8px",
//                     padding: "12px 16px",
//                     border: "1px solid #bdcaba",
//                     borderRadius: "12px",
//                     backgroundColor: "transparent",
//                     cursor: "pointer",
//                     transition: "background-color 0.2s",
//                     fontFamily: "'Geist', sans-serif",
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     color: "#0b1c30",
//                   }}
//                 >
//                   <img
//                     alt="Google"
//                     style={{ width: "20px", height: "20px" }}
//                     src="https://lh3.googleusercontent.com/aida-public/AB6AXuBS6b--ZmJixarWZo3RqdeTgN7gLLIvhyDIWLwE1EQXC0dcat1JPeBUJP6lxkC4LtIgZ-STEUujWPCcs6tESnDS08EX5p5N3aFUcTjwe92hQKHujwm05-bmbVRRDkcbGez0ijnFILo18RTKFlWn6q8bE9E0UDbTShm7Llu_THBI0GOlmMe6ZrQmCwD_nNLxAR02KzIFHbHu6i8VOu7rJv-24lCVuKzBpoWPftWqitWVRCDm2I4v0ENorWI3uTyJ6Hr5BWZkGTa8kZW2"
//                   />
//                   Google
//                 </button>
//                 <button
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     gap: "8px",
//                     padding: "12px 16px",
//                     border: "1px solid #bdcaba",
//                     borderRadius: "12px",
//                     backgroundColor: "transparent",
//                     cursor: "pointer",
//                     transition: "background-color 0.2s",
//                     fontFamily: "'Geist', sans-serif",
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     color: "#0b1c30",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       fontSize: "20px",
//                       color: "#0b1c30",
//                       fontVariationSettings: "'FILL' 1",
//                     }}
//                   >
//                     apps
//                   </span>
//                   Apple
//                 </button>
//               </div>

//               {/* Divider */}
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "16px",
//                   marginBottom: "32px",
//                 }}
//               >
//                 <div
//                   style={{
//                     flexGrow: 1,
//                     borderTop: "1px solid rgba(189, 202, 186, 0.3)",
//                   }}
//                 />
//                 <span
//                   style={{
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     color: "#6e7b6c",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.1em",
//                     fontFamily: "'Geist', sans-serif",
//                   }}
//                 >
//                   or email
//                 </span>
//                 <div
//                   style={{
//                     flexGrow: 1,
//                     borderTop: "1px solid rgba(189, 202, 186, 0.3)",
//                   }}
//                 />
//               </div>

//               {/* Form */}
//               <form
//                 onSubmit={handleSubmit}
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: "20px",
//                 }}
//               >
//                 {mode === "register" && (
//                   <div>
//                     <label
//                       style={{
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 500,
//                         color: "#3e4a3d",
//                         marginLeft: "4px",
//                         marginBottom: "4px",
//                         display: "block",
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       Full Name
//                     </label>
//                     <div style={{ position: "relative" }}>
//                       <span
//                         className="material-symbols-outlined"
//                         style={{
//                           position: "absolute",
//                           left: "16px",
//                           top: "50%",
//                           transform: "translateY(-50%)",
//                           color: "rgba(62, 74, 61, 0.5)",
//                         }}
//                       >
//                         person
//                       </span>
//                       <input
//                         type="text"
//                         placeholder="John Doe"
//                         required
//                         style={inputStyle}
//                         onFocus={handleFocus}
//                         onBlur={handleBlur}
//                       />
//                     </div>
//                   </div>
//                 )}

//                 <div>
//                   <label
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       color: "#3e4a3d",
//                       marginLeft: "4px",
//                       marginBottom: "4px",
//                       display: "block",
//                       fontFamily: "'Geist', sans-serif",
//                     }}
//                   >
//                     Email Address
//                   </label>
//                   <div style={{ position: "relative" }}>
//                     <span
//                       className="material-symbols-outlined"
//                       style={{
//                         position: "absolute",
//                         left: "16px",
//                         top: "50%",
//                         transform: "translateY(-50%)",
//                         color: "rgba(62, 74, 61, 0.5)",
//                       }}
//                     >
//                       mail
//                     </span>
//                     <input
//                       type="email"
//                       placeholder="name@company.com"
//                       required
//                       style={inputStyle}
//                       onFocus={handleFocus}
//                       onBlur={handleBlur}
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       paddingLeft: "4px",
//                       paddingRight: "4px",
//                       marginBottom: "4px",
//                     }}
//                   >
//                     <label
//                       style={{
//                         fontSize: "14px",
//                         lineHeight: "20px",
//                         letterSpacing: "0.01em",
//                         fontWeight: 500,
//                         color: "#3e4a3d",
//                         fontFamily: "'Geist', sans-serif",
//                       }}
//                     >
//                       Password
//                     </label>
//                     {mode === "login" && (
//                       <a
//                         href="#"
//                         style={{
//                           fontSize: "12px",
//                           lineHeight: "16px",
//                           letterSpacing: "0.03em",
//                           fontWeight: 600,
//                           color: "#006b2c",
//                           textDecoration: "none",
//                           fontFamily: "'Geist', sans-serif",
//                         }}
//                       >
//                         Forgot?
//                       </a>
//                     )}
//                   </div>
//                   <div style={{ position: "relative" }}>
//                     <span
//                       className="material-symbols-outlined"
//                       style={{
//                         position: "absolute",
//                         left: "16px",
//                         top: "50%",
//                         transform: "translateY(-50%)",
//                         color: "rgba(62, 74, 61, 0.5)",
//                       }}
//                     >
//                       lock
//                     </span>
//                     <input
//                       type="password"
//                       placeholder="••••••••"
//                       required
//                       style={inputStyle}
//                       onFocus={handleFocus}
//                       onBlur={handleBlur}
//                     />
//                   </div>
//                 </div>

//                 <button
//                   type="submit"
//                   style={{
//                     width: "100%",
//                     backgroundColor: "#006b2c",
//                     color: "#ffffff",
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     padding: "16px",
//                     borderRadius: "12px",
//                     border: "none",
//                     cursor: "pointer",
//                     boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
//                     marginTop: "8px",
//                     transition: "all 0.2s",
//                   }}
//                 >
//                   {mode === "login" ? "Sign In" : "Create Account"}
//                 </button>
//               </form>

//               <p
//                 style={{
//                   marginTop: "28px",
//                   textAlign: "center",
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   color: "#3e4a3d",
//                   lineHeight: 1.6,
//                   fontFamily: "'Geist', sans-serif",
//                 }}
//               >
//                 By continuing, you agree to our{" "}
//                 <a
//                   href="#"
//                   style={{
//                     color: "#0b1c30",
//                     fontWeight: 600,
//                     textDecoration: "none",
//                   }}
//                 >
//                   Terms of Service
//                 </a>{" "}
//                 and{" "}
//                 <a
//                   href="#"
//                   style={{
//                     color: "#0b1c30",
//                     fontWeight: 600,
//                     textDecoration: "none",
//                   }}
//                 >
//                   Privacy Policy
//                 </a>
//                 .
//               </p>

//               {/* Switch mode link */}
//               <p
//                 style={{
//                   marginTop: "16px",
//                   textAlign: "center",
//                   fontSize: "13px",
//                   color: "#5c647a",
//                 }}
//               >
//                 {mode === "login"
//                   ? "Don't have an account?"
//                   : "Already have an account?"}{" "}
//                 <button
//                   onClick={() =>
//                     setMode(mode === "login" ? "register" : "login")
//                   }
//                   style={{
//                     color: "#006b2c",
//                     fontWeight: 600,
//                     background: "none",
//                     border: "none",
//                     cursor: "pointer",
//                     fontSize: "13px",
//                     fontFamily: "'Geist', sans-serif",
//                     padding: 0,
//                   }}
//                 >
//                   {mode === "login" ? "Create one" : "Sign in"}
//                 </button>
//               </p>
//             </div>
//           )}

//           {/* OTP Card */}
//           {showOTP && (
//             <div
//               style={{
//                 background: "#ffffff",
//                 border: "1px solid rgba(226, 232, 240, 0.8)",
//                 borderRadius: "24px",
//                 padding: "40px",
//                 boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.06)",
//               }}
//             >
//               <div
//                 style={{
//                   marginBottom: "32px",
//                   textAlign: "center",
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "64px",
//                     height: "64px",
//                     backgroundColor: "rgba(127, 252, 151, 0.3)",
//                     color: "#006b2c",
//                     margin: "0 auto 20px",
//                     borderRadius: "50%",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       fontSize: "30px",
//                       fontVariationSettings: "'FILL' 1",
//                     }}
//                   >
//                     verified_user
//                   </span>
//                 </div>
//                 <h2
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 600,
//                     color: "#0b1c30",
//                     marginBottom: "6px",
//                   }}
//                 >
//                   Check your inbox
//                 </h2>
//                 <p
//                   style={{
//                     fontSize: "15px",
//                     lineHeight: "22px",
//                     color: "#5c647a",
//                   }}
//                 >
//                   We&apos;ve sent a 6-digit code to your email. Enter it below
//                   to verify.
//                 </p>
//               </div>

//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   gap: "8px",
//                   marginBottom: "32px",
//                 }}
//               >
//                 {otpValues.map((val, i) => (
//                   <input
//                     key={i}
//                     ref={(el) => {
//                       otpRefs.current[i] = el;
//                     }}
//                     type="text"
//                     maxLength={1}
//                     value={val}
//                     onChange={(e) => handleOTPChange(i, e.target.value)}
//                     onKeyDown={(e) => handleOTPKeyDown(i, e)}
//                     style={{
//                       width: "48px",
//                       height: "64px",
//                       textAlign: "center",
//                       fontSize: "24px",
//                       lineHeight: "32px",
//                       letterSpacing: "-0.01em",
//                       fontWeight: 600,
//                       backgroundColor: "#ffffff",
//                       border: "1px solid rgba(189, 202, 186, 0.5)",
//                       borderRadius: "12px",
//                       outline: "none",
//                       transition: "all 0.2s",
//                       fontFamily: "'Inter', sans-serif",
//                     }}
//                     onFocus={handleFocus}
//                     onBlur={handleBlur}
//                   />
//                 ))}
//               </div>

//               <button
//                 style={{
//                   width: "100%",
//                   backgroundColor: "#006b2c",
//                   color: "#ffffff",
//                   fontSize: "14px",
//                   lineHeight: "20px",
//                   letterSpacing: "0.01em",
//                   fontWeight: 500,
//                   fontFamily: "'Geist', sans-serif",
//                   padding: "16px",
//                   borderRadius: "12px",
//                   border: "none",
//                   cursor: "pointer",
//                   boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
//                   transition: "all 0.2s",
//                 }}
//               >
//                 Verify &amp; Login
//               </button>

//               <div style={{ marginTop: "20px", textAlign: "center" }}>
//                 <p
//                   style={{
//                     fontSize: "12px",
//                     lineHeight: "16px",
//                     letterSpacing: "0.03em",
//                     fontWeight: 600,
//                     color: "#3e4a3d",
//                     fontFamily: "'Geist', sans-serif",
//                   }}
//                 >
//                   Didn&apos;t receive the code?{" "}
//                   <button
//                     onClick={resetOTP}
//                     style={{
//                       color: "#006b2c",
//                       fontWeight: 600,
//                       background: "none",
//                       border: "none",
//                       cursor: "pointer",
//                       fontSize: "12px",
//                       lineHeight: "16px",
//                       letterSpacing: "0.03em",
//                       fontFamily: "'Geist', sans-serif",
//                       padding: 0,
//                     }}
//                   >
//                     Resend code
//                   </button>
//                 </p>
//               </div>

//               <button
//                 onClick={backToAuth}
//                 style={{
//                   marginTop: "24px",
//                   width: "100%",
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 600,
//                   color: "#5c647a",
//                   background: "none",
//                   border: "none",
//                   cursor: "pointer",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "4px",
//                   transition: "color 0.2s",
//                   fontFamily: "'Geist', sans-serif",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ fontSize: "14px" }}
//                 >
//                   arrow_back
//                 </span>
//                 Back to login
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
