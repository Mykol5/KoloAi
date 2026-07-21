"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, groups(*)")
      .eq("user_id", user.id);

    const userGroups = memberships?.map((m: any) => m.groups) || [];
    setGroups(userGroups);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    const handleFocus = () => fetchGroups();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchGroups();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchGroups]);

  const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
        Loading groups...
      </div>
    );
  }

  return (
    <>
      <TopHeader />
      <PageHeading />
      <GroupsGrid groups={groups} formatNaira={formatNaira} />
    </>
  );
}

/* ===========================
   TOP HEADER
   =========================== */
function TopHeader() {
  return (
    <header className="groups-topbar" style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
      <div className="topbar-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", maxWidth: "1280px", margin: "0 auto", width: "100%", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
            <span>Directory</span>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
            <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
          </nav>
        </div>
        <div className="search-wrapper" style={{ flex: 1, maxWidth: "448px", margin: "0 64px", position: "relative" }}>
          <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.6)" }}>search</span>
          <input type="text" placeholder="Search groups, circles, or funds..." style={{ width: "100%", padding: "8px 16px 8px 48px", backgroundColor: "#eff4ff", border: "none", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <button style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#006b2c" }}>
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </div>
      {/* Mobile responsive for top bar */}
      <style jsx>{`
        @media (max-width: 768px) {
          .search-wrapper { display: none !important; }
          .topbar-inner { padding: 10px 0 !important; }
        }
      `}</style>
    </header>
  );
}

/* ===========================
   PAGE HEADING
   =========================== */
function PageHeading() {
  return (
    <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", flexWrap: "wrap", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Savings Groups</h2>
        <p style={{ color: "#3e4a3d", marginTop: "8px" }}>Manage your active circles and explore new investment opportunities.</p>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <Link href="/groups/create" className="create-btn" style={{ padding: "10px 24px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          Create Group
        </Link>
      </div>
      {/* Mobile responsive */}
      <style jsx>{`
        @media (max-width: 500px) {
          .page-heading { flex-direction: column !important; align-items: flex-start !important; }
          .create-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

/* ===========================
   GROUPS GRID
   =========================== */
function GroupsGrid({ groups, formatNaira }: { groups: any[]; formatNaira: (amount: number) => string }) {
  if (groups.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: "center", padding: "80px 24px", color: "#3e4a3d" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "64px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
        <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>No groups yet</h3>
        <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "24px" }}>Create or join a savings group to get started on your wealth journey.</p>
        <Link href="/groups/create" style={{ padding: "12px 32px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", fontWeight: 600, fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "'Geist', sans-serif" }}>
          <span className="material-symbols-outlined">add</span>
          Create Your First Group
        </Link>
      </div>
    );
  }

  return (
    <div className="groups-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
      {groups.map((group) => (
        <Link key={group.id} href={`/groups/${group.id}`} className="group-card-link" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="group-card" style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.5)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15, 23, 42, 0.04)"; }}>
            
            <div className="card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "28px" }}>account_balance</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="group-name" style={{ fontSize: "18px", fontWeight: 600, color: "#0b1c30", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</h3>
                  <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(62, 74, 61, 0.7)", textTransform: "uppercase" }}>{group.description || "Savings Group"}</span>
                </div>
              </div>
              <span className="status-badge" style={{ backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", flexShrink: 0 }}>{group.status || "ACTIVE"}</span>
            </div>

            <div className="card-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px 0", borderTop: "1px solid rgba(189, 202, 186, 0.2)", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
              <div>
                <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
                <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>groups</span> {group.member_count || 0} / {group.max_members || 20}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Pool Value</p>
                <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>{formatNaira(group.pool_amount || 0)}</p>
              </div>
            </div>

            <div className="card-bottom" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>Cycle Progress</p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ position: "relative", width: "48px", height: "48px" }}>
                    <svg width="48" height="48">
                      <circle cx="24" cy="24" r="20" fill="transparent" stroke="#dce9ff" strokeWidth="4" />
                      <circle cx="24" cy="24" r="20" fill="transparent" stroke="#006b2c" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * ((group.member_count || 0) / (group.max_members || 20))) / 100 * 100} strokeLinecap="round" transform="rotate(-90 24 24)" />
                    </svg>
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#0b1c30" }}>
                      {Math.round(((group.member_count || 0) / (group.max_members || 20)) * 100)}%
                    </span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Cycle {group.cycle_number || 1}</span>
                </div>
              </div>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0b1c30", color: "#f8f9ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* Create New Group */}
      <Link href="/groups/create" className="create-card" style={{ border: "2px dashed rgba(189, 202, 186, 0.5)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "250px", cursor: "pointer", textDecoration: "none", color: "inherit", transition: "all 0.2s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)"; e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.currentTarget.style.backgroundColor = "transparent"; }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
          <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>Start a private or public savings circle with custom rules.</p>
        </div>
      </Link>

      {/* Mobile responsive styles for Grid */}
      <style jsx>{`
        @media (max-width: 1100px) {
          .groups-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .groups-grid { grid-template-columns: 1fr !important; }
          .group-card { padding: 20px !important; }
          .group-name { font-size: 16px !important; }
          .card-stats { gap: 12px !important; }
          .create-card { min-height: 200px !important; }
        }
        @media (max-width: 400px) {
          .card-top { flex-direction: column !important; gap: 8px !important; }
          .status-badge { align-self: flex-start !important; }
          .card-bottom { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
}




// "use client";

// import Link from "next/link";
// import { useEffect, useState, useCallback } from "react";
// import { createClient } from "@/lib/supabase/client";

// export default function GroupsPage() {
//   const [groups, setGroups] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const supabase = createClient();

//   const fetchGroups = useCallback(async () => {
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();
//     if (!user) return;

//     const { data: memberships } = await supabase
//       .from("group_members")
//       .select("group_id, groups(*)")
//       .eq("user_id", user.id);

//     const userGroups = memberships?.map((m: any) => m.groups) || [];
//     setGroups(userGroups);
//     setLoading(false);
//   }, [supabase]);

//   // Initial fetch
//   useEffect(() => {
//     fetchGroups();
//   }, [fetchGroups]);

//   // 🔥 Refresh on tab focus and back navigation
//   useEffect(() => {
//     const handleFocus = () => fetchGroups();
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === "visible") fetchGroups();
//     };

//     window.addEventListener("focus", handleFocus);
//     document.addEventListener("visibilitychange", handleVisibilityChange);

//     return () => {
//       window.removeEventListener("focus", handleFocus);
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//     };
//   }, [fetchGroups]);

//   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

//   if (loading) {
//     return (
//       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
//         Loading groups...
//       </div>
//     );
//   }

//   return (
//     <>
//       <TopHeader />
//       <PageHeading />
//       <GroupsGrid groups={groups} formatNaira={formatNaira} />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader() {
//   return (
//     <header style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
//             <span>Directory</span>
//             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
//             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
//           </nav>
//         </div>
//         <div style={{ flex: 1, maxWidth: "448px", margin: "0 64px", position: "relative" }}>
//           <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.6)" }}>search</span>
//           <input type="text" placeholder="Search groups, circles, or funds..." style={{ width: "100%", padding: "8px 16px 8px 48px", backgroundColor: "#eff4ff", border: "none", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", outline: "none", boxSizing: "border-box" }} />
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <button style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#006b2c" }}>
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    PAGE HEADING
//    =========================== */
// function PageHeading() {
//   return (
//     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", flexWrap: "wrap", gap: "24px" }}>
//       <div>
//         <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Savings Groups</h2>
//         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>Manage your active circles and explore new investment opportunities.</p>
//       </div>
//       <div style={{ display: "flex", gap: "8px" }}>
//         <Link href="/groups/create" style={{ padding: "10px 24px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
//           <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
//           Create Group
//         </Link>
//       </div>
//     </div>
//   );
// }

// /* ===========================
//    GROUPS GRID
//    =========================== */
// function GroupsGrid({ groups, formatNaira }: { groups: any[]; formatNaira: (amount: number) => string }) {
//   if (groups.length === 0) {
//     return (
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//         <div style={{ gridColumn: "span 3", textAlign: "center", padding: "80px 24px", color: "#3e4a3d" }}>
//           <span className="material-symbols-outlined" style={{ fontSize: "64px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
//           <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>No groups yet</h3>
//           <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "24px" }}>Create or join a savings group to get started on your wealth journey.</p>
//           <Link href="/groups/create" style={{ padding: "12px 32px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", fontWeight: 600, fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "'Geist', sans-serif" }}>
//             <span className="material-symbols-outlined">add</span>
//             Create Your First Group
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
//       {groups.map((group) => (
//         <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none", color: "inherit" }}>
//           <div style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.5)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
//             onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"; }}
//             onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15, 23, 42, 0.04)"; }}>
            
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                 <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "28px" }}>account_balance</span>
//                 </div>
//                 <div>
//                   <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0b1c30" }}>{group.name}</h3>
//                   <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(62, 74, 61, 0.7)", textTransform: "uppercase" }}>{group.description || "Savings Group"}</span>
//                 </div>
//               </div>
//               <span style={{ backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase" }}>{group.status || "ACTIVE"}</span>
//             </div>

//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px 0", borderTop: "1px solid rgba(189, 202, 186, 0.2)", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
//                 <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", display: "flex", alignItems: "center", gap: "8px" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>groups</span> {group.member_count || 0} / {group.max_members || 20}
//                 </p>
//               </div>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Pool Value</p>
//                 <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>{formatNaira(group.pool_amount || 0)}</p>
//               </div>
//             </div>

//             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//               <div style={{ flex: 1 }}>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>Cycle Progress</p>
//                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                   <div style={{ position: "relative", width: "48px", height: "48px" }}>
//                     <svg width="48" height="48">
//                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#dce9ff" strokeWidth="4" />
//                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#006b2c" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * ((group.member_count || 0) / (group.max_members || 20))) / 100 * 100} strokeLinecap="round" transform="rotate(-90 24 24)" />
//                     </svg>
//                     <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#0b1c30" }}>
//                       {Math.round(((group.member_count || 0) / (group.max_members || 20)) * 100)}%
//                     </span>
//                   </div>
//                   <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Cycle {group.cycle_number || 1}</span>
//                 </div>
//               </div>
//               <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0b1c30", color: "#f8f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
//                 <span className="material-symbols-outlined">arrow_forward</span>
//               </div>
//             </div>
//           </div>
//         </Link>
//       ))}

//       {/* Create New Group */}
//       <Link href="/groups/create" style={{ border: "2px dashed rgba(189, 202, 186, 0.5)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "250px", cursor: "pointer", textDecoration: "none", color: "inherit", transition: "all 0.2s" }}
//         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)"; e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)"; }}
//         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.currentTarget.style.backgroundColor = "transparent"; }}>
//         <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
//           <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
//         </div>
//         <div style={{ textAlign: "center" }}>
//           <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
//           <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>Start a private or public savings circle with custom rules.</p>
//         </div>
//       </Link>
//     </div>
//   );
// }


// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";

// export default function GroupsPage() {
//   const [groups, setGroups] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const supabase = createClient();

//   useEffect(() => {
//     async function fetchGroups() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) return;

//       // Get user's group memberships with group details
//       const { data: memberships } = await supabase
//         .from("group_members")
//         .select("group_id, groups(*)")
//         .eq("user_id", user.id);

//       const userGroups = memberships?.map((m: any) => m.groups) || [];
//       setGroups(userGroups);
//       setLoading(false);
//     }

//     fetchGroups();
//   }, [supabase]);

//   const formatNaira = (amount: number) => {
//     return `₦${amount.toLocaleString("en-NG")}`;
//   };

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//           fontFamily: "'Inter', sans-serif",
//           color: "#3e4a3d",
//           fontSize: "16px",
//         }}
//       >
//         Loading groups...
//       </div>
//     );
//   }

//   return (
//     <>
//       <TopHeader />
//       <PageHeading />
//       <GroupsGrid groups={groups} formatNaira={formatNaira} />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader() {
//   return (
//     <header
//       style={{
//         width: "100%",
//         position: "sticky",
//         top: 0,
//         zIndex: 40,
//         backgroundColor: "rgba(248, 249, 255, 0.7)",
//         backdropFilter: "blur(12px)",
//         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         marginBottom: "24px",
//         marginLeft: "-24px",
//         marginRight: "-24px",
//         paddingLeft: "24px",
//         paddingRight: "24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "16px 0",
//           maxWidth: "1280px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <nav
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//             }}
//           >
//             <span>Directory</span>
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px" }}
//             >
//               chevron_right
//             </span>
//             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
//           </nav>
//         </div>

//         <div
//           style={{
//             flex: 1,
//             maxWidth: "448px",
//             margin: "0 64px",
//             position: "relative",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{
//               position: "absolute",
//               left: "16px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               color: "rgba(62, 74, 61, 0.6)",
//             }}
//           >
//             search
//           </span>
//           <input
//             type="text"
//             placeholder="Search groups, circles, or funds..."
//             style={{
//               width: "100%",
//               padding: "8px 16px 8px 48px",
//               backgroundColor: "#eff4ff",
//               border: "none",
//               borderRadius: "9999px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               outline: "none",
//               boxSizing: "border-box",
//             }}
//           />
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <button
//             style={{
//               width: "40px",
//               height: "40px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#006b2c",
//               transition: "background-color 0.2s",
//             }}
//           >
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//           <button
//             style={{
//               width: "40px",
//               height: "40px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#006b2c",
//               transition: "background-color 0.2s",
//             }}
//           >
//             <span className="material-symbols-outlined">help</span>
//           </button>
//           <div
//             style={{
//               height: "32px",
//               width: "1px",
//               backgroundColor: "rgba(189, 202, 186, 0.3)",
//               margin: "0 8px",
//             }}
//           />
//           <img
//             style={{
//               width: "32px",
//               height: "32px",
//               borderRadius: "50%",
//               border: "1px solid rgba(0, 107, 44, 0.2)",
//               objectFit: "cover",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcm2nWD1H3lZMlb7DyDTGVhIKgnqner9pz_b8bSqtx89-9K-OTQo6X92ULuQ7y2DN6fPEXmMk6HSfZU1eMFFBH__DmmB_20oz8frPnblDA8G5aavSOa3C8sE6c5s3szjyQOn4TnYxasotUQ3flmHTq2BKkSKjB6P6uowIbhMk7B63w60UcNozn3u94OYagFaC9DXaB-HxtSf1qGzlAyW7SNIVQpqMKEm6Za1UfUUunsu50z0fvsItjo6Y7hrkzGKwv7hP1q-YlFV0Q"
//           />
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    PAGE HEADING
//    =========================== */
// function PageHeading() {
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "flex-end",
//         marginBottom: "40px",
//         flexWrap: "wrap",
//         gap: "24px",
//       }}
//     >
//       <div>
//         <h2
//           style={{
//             fontSize: "24px",
//             lineHeight: "32px",
//             letterSpacing: "-0.01em",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//             color: "#0b1c30",
//           }}
//         >
//           Savings Groups
//         </h2>
//         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>
//           Manage your active circles and explore new investment opportunities.
//         </p>
//       </div>
//       <div style={{ display: "flex", gap: "8px" }}>
//         <button
//           style={{
//             padding: "8px 24px",
//             borderRadius: "9999px",
//             border: "1px solid rgba(189, 202, 186, 0.5)",
//             backgroundColor: "transparent",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             color: "#3e4a3d",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ fontSize: "18px" }}
//           >
//             filter_list
//           </span>
//           All Groups
//         </button>
//         <button
//           style={{
//             padding: "8px 24px",
//             borderRadius: "9999px",
//             border: "1px solid rgba(189, 202, 186, 0.5)",
//             backgroundColor: "transparent",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             color: "#3e4a3d",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ fontSize: "18px" }}
//           >
//             sort
//           </span>
//           Latest First
//         </button>
//       </div>
//     </div>
//   );
// }

// /* ===========================
//    GROUPS GRID
//    =========================== */
// function GroupsGrid({
//   groups,
//   formatNaira,
// }: {
//   groups: any[];
//   formatNaira: (amount: number) => string;
// }) {
//   // If no groups, show empty state
//   if (groups.length === 0) {
//     return (
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3, 1fr)",
//           gap: "24px",
//         }}
//       >
//         <div
//           style={{
//             gridColumn: "span 3",
//             textAlign: "center",
//             padding: "80px 24px",
//             color: "#3e4a3d",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{
//               fontSize: "64px",
//               display: "block",
//               marginBottom: "16px",
//               color: "#bdcaba",
//             }}
//           >
//             groups
//           </span>
//           <h3
//             style={{
//               fontSize: "20px",
//               fontWeight: 600,
//               marginBottom: "8px",
//               color: "#0b1c30",
//             }}
//           >
//             No groups yet
//           </h3>
//           <p
//             style={{
//               fontSize: "14px",
//               color: "#6e7b6c",
//               marginBottom: "24px",
//             }}
//           >
//             Create or join a savings group to get started on your wealth journey.
//           </p>
//           <Link
//             href="/groups/create"
//             style={{
//               padding: "12px 32px",
//               backgroundColor: "#006b2c",
//               color: "#ffffff",
//               borderRadius: "12px",
//               border: "none",
//               cursor: "pointer",
//               fontWeight: 600,
//               fontSize: "14px",
//               textDecoration: "none",
//               display: "inline-flex",
//               alignItems: "center",
//               gap: "8px",
//               fontFamily: "'Geist', sans-serif",
//             }}
//           >
//             <span className="material-symbols-outlined">add</span>
//             Create Your First Group
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(3, 1fr)",
//         gap: "24px",
//       }}
//     >
//       {/* Group Cards - Real data from Supabase */}
//       {groups.map((group) => (
//         <Link
//           key={group.id}
//           href={`/groups/${group.id}`}
//           style={{
//             textDecoration: "none",
//             color: "inherit",
//           }}
//         >
//           <div
//             style={{
//               background: "rgba(255, 255, 255, 0.7)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.5)",
//               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//               borderRadius: "12px",
//               padding: "24px",
//               display: "flex",
//               flexDirection: "column",
//               gap: "24px",
//               cursor: "pointer",
//               transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
//               height: "100%",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "translateY(-4px)";
//               e.currentTarget.style.boxShadow =
//                 "0 20px 25px -5px rgba(0, 0, 0, 0.1)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "translateY(0)";
//               e.currentTarget.style.boxShadow =
//                 "0 4px 20px rgba(15, 23, 42, 0.04)";
//             }}
//           >
//             {/* Top Row */}
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//               }}
//             >
//               <div
//                 style={{ display: "flex", alignItems: "center", gap: "16px" }}
//               >
//                 <div
//                   style={{
//                     width: "48px",
//                     height: "48px",
//                     borderRadius: "8px",
//                     backgroundColor: "rgba(0, 107, 44, 0.1)",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       color: "#006b2c",
//                       fontSize: "28px",
//                     }}
//                   >
//                     account_balance
//                   </span>
//                 </div>
//                 <div>
//                   <h3
//                     style={{
//                       fontSize: "18px",
//                       fontWeight: 600,
//                       color: "#0b1c30",
//                     }}
//                   >
//                     {group.name}
//                   </h3>
//                   <span
//                     style={{
//                       fontSize: "12px",
//                       lineHeight: "16px",
//                       letterSpacing: "0.03em",
//                       fontWeight: 600,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "rgba(62, 74, 61, 0.7)",
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     {group.description || "Savings Group"}
//                   </span>
//                 </div>
//               </div>
//               <span
//                 style={{
//                   backgroundColor: "rgba(0, 107, 44, 0.1)",
//                   color: "#006b2c",
//                   padding: "2px 8px",
//                   borderRadius: "4px",
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 700,
//                   fontFamily: "'Geist', sans-serif",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 {group.status || "ACTIVE"}
//               </span>
//             </div>

//             {/* Stats */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "16px",
//                 padding: "16px 0",
//                 borderTop: "1px solid rgba(189, 202, 186, 0.2)",
//                 borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//               }}
//             >
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#0b1c30",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ fontSize: "16px" }}
//                   >
//                     groups
//                   </span>{" "}
//                   {group.member_count || 0} / {group.max_members || 20}
//                 </p>
//               </div>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                   Pool Value
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 700,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#006b2c",
//                   }}
//                 >
//                   {formatNaira(group.pool_amount || 0)}
//                 </p>
//               </div>
//             </div>

//             {/* Progress / Cycle */}
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//               }}
//             >
//               <div style={{ flex: 1 }}>
//                 <p
//                   style={{
//                     fontSize: "12px",
//                     color: "#3e4a3d",
//                     marginBottom: "8px",
//                   }}
//                 >
//                   Cycle Progress
//                 </p>
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "16px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       position: "relative",
//                       width: "48px",
//                       height: "48px",
//                     }}
//                   >
//                     <svg width="48" height="48">
//                       <circle
//                         cx="24"
//                         cy="24"
//                         r="20"
//                         fill="transparent"
//                         stroke="#dce9ff"
//                         strokeWidth="4"
//                       />
//                       <circle
//                         cx="24"
//                         cy="24"
//                         r="20"
//                         fill="transparent"
//                         stroke="#006b2c"
//                         strokeWidth="4"
//                         strokeDasharray="125.6"
//                         strokeDashoffset={
//                           125.6 -
//                           (125.6 *
//                             ((group.member_count || 0) /
//                               (group.max_members || 20))) /
//                             100 *
//                             100
//                         }
//                         strokeLinecap="round"
//                         transform="rotate(-90 24 24)"
//                         style={{
//                           transition: "stroke-dashoffset 1s ease-in-out",
//                         }}
//                       />
//                     </svg>
//                     <span
//                       style={{
//                         position: "absolute",
//                         inset: 0,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         fontSize: "10px",
//                         fontWeight: 700,
//                         color: "#0b1c30",
//                       }}
//                     >
//                       {Math.round(
//                         ((group.member_count || 0) /
//                           (group.max_members || 20)) *
//                           100
//                       )}
//                       %
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#0b1c30",
//                     }}
//                   >
//                     Cycle {group.cycle_number || 1}
//                   </span>
//                 </div>
//               </div>
//               <div
//                 style={{
//                   width: "40px",
//                   height: "40px",
//                   borderRadius: "50%",
//                   backgroundColor: "#0b1c30",
//                   color: "#f8f9ff",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   transition: "background-color 0.2s",
//                 }}
//               >
//                 <span className="material-symbols-outlined">arrow_forward</span>
//               </div>
//             </div>
//           </div>
//         </Link>
//       ))}

//       {/* Create New Group Placeholder */}
//       <Link
//         href="/groups/create"
//         style={{
//           border: "2px dashed rgba(189, 202, 186, 0.5)",
//           borderRadius: "12px",
//           padding: "24px",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           gap: "16px",
//           minHeight: "250px",
//           cursor: "pointer",
//           textDecoration: "none",
//           color: "inherit",
//           transition: "all 0.2s",
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
//           e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
//           e.currentTarget.style.backgroundColor = "transparent";
//         }}
//       >
//         <div
//           style={{
//             width: "64px",
//             height: "64px",
//             borderRadius: "50%",
//             backgroundColor: "#dce9ff",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ color: "#006b2c", fontSize: "32px" }}
//           >
//             add
//           </span>
//         </div>
//         <div style={{ textAlign: "center" }}>
//           <h3
//             style={{
//               fontSize: "24px",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#0b1c30",
//             }}
//           >
//             Create New Group
//           </h3>
//           <p
//             style={{
//               fontSize: "12px",
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//               maxWidth: "200px",
//               margin: "0 auto",
//             }}
//           >
//             Start a private or public savings circle with custom rules.
//           </p>
//         </div>
//       </Link>
//     </div>
//   );
// }


// "use client";

// import Link from "next/link";

// export default function GroupsPage() {
//   return (
//     <>
//       <TopHeader />
//       <PageHeading />
//       <GroupsGrid />
//     </>
//   );
// }

// /* ===========================
//    TOP HEADER
//    =========================== */
// function TopHeader() {
//   return (
//     <header
//       style={{
//         width: "100%",
//         position: "sticky",
//         top: 0,
//         zIndex: 40,
//         backgroundColor: "rgba(248, 249, 255, 0.7)",
//         backdropFilter: "blur(12px)",
//         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//         marginBottom: "24px",
//         marginLeft: "-24px",
//         marginRight: "-24px",
//         paddingLeft: "24px",
//         paddingRight: "24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           padding: "16px 0",
//           maxWidth: "1280px",
//           margin: "0 auto",
//           width: "100%",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <nav
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//             }}
//           >
//             <span>Directory</span>
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: "16px" }}
//             >
//               chevron_right
//             </span>
//             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
//           </nav>
//         </div>

//         <div
//           style={{
//             flex: 1,
//             maxWidth: "448px",
//             margin: "0 64px",
//             position: "relative",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{
//               position: "absolute",
//               left: "16px",
//               top: "50%",
//               transform: "translateY(-50%)",
//               color: "rgba(62, 74, 61, 0.6)",
//             }}
//           >
//             search
//           </span>
//           <input
//             type="text"
//             placeholder="Search groups, circles, or funds..."
//             style={{
//               width: "100%",
//               padding: "8px 16px 8px 48px",
//               backgroundColor: "#eff4ff",
//               border: "none",
//               borderRadius: "9999px",
//               fontSize: "14px",
//               lineHeight: "20px",
//               letterSpacing: "0.01em",
//               fontWeight: 500,
//               fontFamily: "'Geist', sans-serif",
//               outline: "none",
//               boxSizing: "border-box",
//             }}
//           />
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//           <button
//             style={{
//               width: "40px",
//               height: "40px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#006b2c",
//               transition: "background-color 0.2s",
//             }}
//           >
//             <span className="material-symbols-outlined">notifications</span>
//           </button>
//           <button
//             style={{
//               width: "40px",
//               height: "40px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "50%",
//               border: "none",
//               cursor: "pointer",
//               backgroundColor: "transparent",
//               color: "#006b2c",
//               transition: "background-color 0.2s",
//             }}
//           >
//             <span className="material-symbols-outlined">help</span>
//           </button>
//           <div
//             style={{
//               height: "32px",
//               width: "1px",
//               backgroundColor: "rgba(189, 202, 186, 0.3)",
//               margin: "0 8px",
//             }}
//           />
//           <img
//             style={{
//               width: "32px",
//               height: "32px",
//               borderRadius: "50%",
//               border: "1px solid rgba(0, 107, 44, 0.2)",
//               objectFit: "cover",
//             }}
//             alt="Profile"
//             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcm2nWD1H3lZMlb7DyDTGVhIKgnqner9pz_b8bSqtx89-9K-OTQo6X92ULuQ7y2DN6fPEXmMk6HSfZU1eMFFBH__DmmB_20oz8frPnblDA8G5aavSOa3C8sE6c5s3szjyQOn4TnYxasotUQ3flmHTq2BKkSKjB6P6uowIbhMk7B63w60UcNozn3u94OYagFaC9DXaB-HxtSf1qGzlAyW7SNIVQpqMKEm6Za1UfUUunsu50z0fvsItjo6Y7hrkzGKwv7hP1q-YlFV0Q"
//           />
//         </div>
//       </div>
//     </header>
//   );
// }

// /* ===========================
//    PAGE HEADING
//    =========================== */
// function PageHeading() {
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "flex-end",
//         marginBottom: "40px",
//         flexWrap: "wrap",
//         gap: "24px",
//       }}
//     >
//       <div>
//         <h2
//           style={{
//             fontSize: "24px",
//             lineHeight: "32px",
//             letterSpacing: "-0.01em",
//             fontWeight: 600,
//             fontFamily: "'Inter', sans-serif",
//             color: "#0b1c30",
//           }}
//         >
//           Savings Groups
//         </h2>
//         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>
//           Manage your active circles and explore new investment opportunities.
//         </p>
//       </div>
//       <div style={{ display: "flex", gap: "8px" }}>
//         <button
//           style={{
//             padding: "8px 24px",
//             borderRadius: "9999px",
//             border: "1px solid rgba(189, 202, 186, 0.5)",
//             backgroundColor: "transparent",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             color: "#3e4a3d",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ fontSize: "18px" }}
//           >
//             filter_list
//           </span>
//           All Groups
//         </button>
//         <button
//           style={{
//             padding: "8px 24px",
//             borderRadius: "9999px",
//             border: "1px solid rgba(189, 202, 186, 0.5)",
//             backgroundColor: "transparent",
//             fontSize: "14px",
//             lineHeight: "20px",
//             letterSpacing: "0.01em",
//             fontWeight: 500,
//             fontFamily: "'Geist', sans-serif",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             color: "#3e4a3d",
//             transition: "background-color 0.2s",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ fontSize: "18px" }}
//           >
//             sort
//           </span>
//           Latest First
//         </button>
//       </div>
//     </div>
//   );
// }

// /* ===========================
//    GROUPS GRID
//    =========================== */
// function GroupsGrid() {
//   const groups = [
//     {
//       id: "lagos-investment",
//       title: "Lagos Investment Circle",
//       subtitle: "Real Estate Focus",
//       status: "CURRENT",
//       statusColor: "#006b2c",
//       icon: "apartment",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       members: 24,
//       poolValue: "₦12,500,000",
//       progress: 70,
//       raised: "₦8.75M Raised",
//       progressColor: "#006b2c",
//     },
//     {
//       id: "tech-founders",
//       title: "Tech Founders Hub",
//       subtitle: "Venture Backing",
//       status: "UPCOMING",
//       statusColor: "#825100",
//       icon: "rocket_launch",
//       iconBg: "rgba(86, 94, 116, 0.1)",
//       iconColor: "#565e74",
//       members: 12,
//       poolValue: "₦45,000,000",
//       progress: 20,
//       raised: "Waiting for peers",
//       progressColor: "#825100",
//     },
//     {
//       id: "abuja-professionals",
//       title: "Abuja Professionals",
//       subtitle: "Diversified Fund",
//       status: "CURRENT",
//       statusColor: "#006b2c",
//       icon: "account_balance",
//       iconBg: "rgba(0, 107, 44, 0.1)",
//       iconColor: "#006b2c",
//       members: 50,
//       poolValue: "₦8,200,000",
//       progress: 95,
//       raised: "Almost Complete",
//       progressColor: "#006b2c",
//     },
//   ];

//   return (
//     <div
//       style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(3, 1fr)",
//         gap: "24px",
//       }}
//     >
//       {/* Group Cards */}
//       {groups.map((group) => (
//         <Link
//           key={group.id}
//           href={`/groups/${group.id}`}
//           style={{
//             textDecoration: "none",
//             color: "inherit",
//           }}
//         >
//           <div
//             className="glass-card-hover"
//             style={{
//               background: "rgba(255, 255, 255, 0.7)",
//               backdropFilter: "blur(12px)",
//               border: "1px solid rgba(226, 232, 240, 0.5)",
//               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//               borderRadius: "12px",
//               padding: "24px",
//               display: "flex",
//               flexDirection: "column",
//               gap: "24px",
//               cursor: "pointer",
//               transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
//               height: "100%",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "translateY(-4px)";
//               e.currentTarget.style.boxShadow =
//                 "0 20px 25px -5px rgba(0, 0, 0, 0.1)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "translateY(0)";
//               e.currentTarget.style.boxShadow =
//                 "0 4px 20px rgba(15, 23, 42, 0.04)";
//             }}
//           >
//             {/* Top Row */}
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//               }}
//             >
//               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//                 <div
//                   style={{
//                     width: "48px",
//                     height: "48px",
//                     borderRadius: "8px",
//                     backgroundColor: group.iconBg,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{
//                       color: group.iconColor,
//                       fontSize: "28px",
//                     }}
//                   >
//                     {group.icon}
//                   </span>
//                 </div>
//                 <div>
//                   <h3
//                     style={{
//                       fontSize: "18px",
//                       fontWeight: 600,
//                       color: "#0b1c30",
//                     }}
//                   >
//                     {group.title}
//                   </h3>
//                   <span
//                     style={{
//                       fontSize: "12px",
//                       lineHeight: "16px",
//                       letterSpacing: "0.03em",
//                       fontWeight: 600,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "rgba(62, 74, 61, 0.7)",
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     {group.subtitle}
//                   </span>
//                 </div>
//               </div>
//               <span
//                 style={{
//                   backgroundColor: `${group.statusColor}10`,
//                   color: group.statusColor,
//                   padding: "2px 8px",
//                   borderRadius: "4px",
//                   fontSize: "12px",
//                   lineHeight: "16px",
//                   letterSpacing: "0.03em",
//                   fontWeight: 700,
//                   fontFamily: "'Geist', sans-serif",
//                 }}
//               >
//                 {group.status}
//               </span>
//             </div>

//             {/* Stats */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "16px",
//                 padding: "16px 0",
//                 borderTop: "1px solid rgba(189, 202, 186, 0.2)",
//                 borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
//               }}
//             >
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                   Member Count
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 500,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#0b1c30",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                   }}
//                 >
//                   <span
//                     className="material-symbols-outlined"
//                     style={{ fontSize: "16px" }}
//                   >
//                     groups
//                   </span>{" "}
//                   {group.members} Members
//                 </p>
//               </div>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                   Total Pool Value
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "14px",
//                     lineHeight: "20px",
//                     letterSpacing: "0.01em",
//                     fontWeight: 700,
//                     fontFamily: "'Geist', sans-serif",
//                     color: "#006b2c",
//                   }}
//                 >
//                   {group.poolValue}
//                 </p>
//               </div>
//             </div>

//             {/* Progress */}
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//               }}
//             >
//               <div style={{ flex: 1 }}>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>
//                   Goal Progress
//                 </p>
//                 <div
//                   style={{ display: "flex", alignItems: "center", gap: "16px" }}
//                 >
//                   <div style={{ position: "relative", width: "48px", height: "48px" }}>
//                     <svg width="48" height="48">
//                       <circle
//                         cx="24"
//                         cy="24"
//                         r="20"
//                         fill="transparent"
//                         stroke="#dce9ff"
//                         strokeWidth="4"
//                       />
//                       <circle
//                         cx="24"
//                         cy="24"
//                         r="20"
//                         fill="transparent"
//                         stroke={group.progressColor}
//                         strokeWidth="4"
//                         strokeDasharray="125.6"
//                         strokeDashoffset={125.6 - (125.6 * group.progress) / 100}
//                         strokeLinecap="round"
//                         transform="rotate(-90 24 24)"
//                         style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
//                       />
//                     </svg>
//                     <span
//                       style={{
//                         position: "absolute",
//                         inset: 0,
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         fontSize: "10px",
//                         fontWeight: 700,
//                         color: "#0b1c30",
//                       }}
//                     >
//                       {group.progress}%
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       lineHeight: "20px",
//                       letterSpacing: "0.01em",
//                       fontWeight: 500,
//                       fontFamily: "'Geist', sans-serif",
//                       color: "#0b1c30",
//                     }}
//                   >
//                     {group.raised}
//                   </span>
//                 </div>
//               </div>
//               <div
//                 style={{
//                   width: "40px",
//                   height: "40px",
//                   borderRadius: "50%",
//                   backgroundColor: "#0b1c30",
//                   color: "#f8f9ff",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   transition: "background-color 0.2s",
//                 }}
//               >
//                 <span className="material-symbols-outlined">arrow_forward</span>
//               </div>
//             </div>
//           </div>
//         </Link>
//       ))}

//       {/* Create New Group Placeholder */}

// <Link
//   href="/groups/create"
//   style={{
//     border: "2px dashed rgba(189, 202, 186, 0.5)",
//     borderRadius: "12px",
//     padding: "24px",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "16px",
//     minHeight: "250px",
//     cursor: "pointer",
//     textDecoration: "none",
//     color: "inherit",
//     transition: "all 0.2s",
//   }}
//   onMouseEnter={(e) => {
//     e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
//     e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
//   }}
//   onMouseLeave={(e) => {
//     e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
//     e.currentTarget.style.backgroundColor = "transparent";
//   }}
// >
//   <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
//     <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
//   </div>
//   <div style={{ textAlign: "center" }}>
//     <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
//     <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>
//       Start a private or public savings circle with custom rules.
//     </p>
//   </div>
// </Link>

//       {/* <div
//         style={{
//           border: "2px dashed rgba(189, 202, 186, 0.5)",
//           borderRadius: "12px",
//           padding: "24px",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           gap: "16px",
//           minHeight: "250px",
//           cursor: "pointer",
//           transition: "all 0.2s",
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
//           e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
//           e.currentTarget.style.backgroundColor = "transparent";
//         }}
//       >
//         <div
//           style={{
//             width: "64px",
//             height: "64px",
//             borderRadius: "50%",
//             backgroundColor: "#dce9ff",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             transition: "transform 0.2s",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ color: "#006b2c", fontSize: "32px" }}
//           >
//             add
//           </span>
//         </div>
//         <div style={{ textAlign: "center" }}>
//           <h3
//             style={{
//               fontSize: "24px",
//               lineHeight: "32px",
//               letterSpacing: "-0.01em",
//               fontWeight: 600,
//               fontFamily: "'Inter', sans-serif",
//               color: "#0b1c30",
//             }}
//           >
//             Create New Group
//           </h3>
//           <p
//             style={{
//               fontSize: "12px",
//               lineHeight: "16px",
//               letterSpacing: "0.03em",
//               fontWeight: 600,
//               fontFamily: "'Geist', sans-serif",
//               color: "#3e4a3d",
//               maxWidth: "200px",
//               margin: "0 auto",
//             }}
//           >
//             Start a private or public savings circle with custom rules.
//           </p>
//         </div>
//       </div> */}

//       {/* Featured Group (Large Card) */}
//       <div
//         style={{
//           gridColumn: "span 2",
//           background: "rgba(255, 255, 255, 0.7)",
//           backdropFilter: "blur(12px)",
//           border: "1px solid rgba(226, 232, 240, 0.5)",
//           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
//           borderRadius: "12px",
//           padding: "24px",
//           position: "relative",
//           overflow: "hidden",
//           cursor: "pointer",
//           transition: "all 0.2s",
//         }}
//       >
//         {/* Glow */}
//         <div
//           style={{
//             position: "absolute",
//             top: 0,
//             right: 0,
//             width: "256px",
//             height: "256px",
//             backgroundColor: "rgba(0, 107, 44, 0.05)",
//             borderRadius: "50%",
//             transform: "translate(80px, -80px)",
//             filter: "blur(48px)",
//           }}
//         />

//         <div
//           style={{
//             position: "relative",
//             zIndex: 10,
//             display: "flex",
//             gap: "64px",
//             height: "100%",
//           }}
//         >
//           <div style={{ flex: 1 }}>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 marginBottom: "16px",
//               }}
//             >
//               <span
//                 style={{
//                   padding: "4px 8px",
//                   backgroundColor: "#006b2c",
//                   color: "#ffffff",
//                   fontSize: "10px",
//                   fontWeight: 700,
//                   borderRadius: "4px",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 AI Recommended
//               </span>
//               <span
//                 style={{
//                   fontSize: "12px",
//                   color: "#3e4a3d",
//                 }}
//               >
//                 Matches your profile
//               </span>
//             </div>
//             <h3
//               style={{
//                 fontSize: "24px",
//                 lineHeight: "32px",
//                 letterSpacing: "-0.01em",
//                 fontWeight: 600,
//                 fontFamily: "'Inter', sans-serif",
//                 marginBottom: "8px",
//               }}
//             >
//               Agro-Export Yield Fund
//             </h3>
//             <p
//               style={{
//                 fontSize: "16px",
//                 lineHeight: "24px",
//                 color: "#3e4a3d",
//                 marginBottom: "24px",
//                 maxWidth: "448px",
//               }}
//             >
//               Join 150+ high-net-worth individuals investing in sustainable
//               cashew and cocoa exports from West Africa. Secured by Kolo
//               AI Insurance.
//             </p>
//             <div style={{ display: "flex", gap: "40px", marginBottom: "24px" }}>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                   Expected APY
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 600,
//                     fontFamily: "'Inter', sans-serif",
//                     color: "#006b2c",
//                   }}
//                 >
//                   24.5%
//                 </p>
//               </div>
//               <div>
//                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
//                   Min. Entry
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "24px",
//                     lineHeight: "32px",
//                     letterSpacing: "-0.01em",
//                     fontWeight: 600,
//                     fontFamily: "'Inter', sans-serif",
//                     color: "#0b1c30",
//                   }}
//                 >
//                   ₦500k
//                 </p>
//               </div>
//             </div>
//             <button
//               style={{
//                 padding: "16px 48px",
//                 backgroundColor: "#006b2c",
//                 color: "#ffffff",
//                 borderRadius: "12px",
//                 fontWeight: 500,
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.01em",
//                 fontFamily: "'Geist', sans-serif",
//                 border: "none",
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "16px",
//                 boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
//                 transition: "all 0.2s",
//               }}
//             >
//               View Opportunity
//               <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
//                 trending_up
//               </span>
//             </button>
//           </div>

//           <div
//             style={{
//               width: "192px",
//               backgroundColor: "#eff4ff",
//               borderRadius: "12px",
//               padding: "16px",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               justifyContent: "center",
//               textAlign: "center",
//               flexShrink: 0,
//             }}
//           >
//             <div
//               style={{
//                 width: "100%",
//                 height: "128px",
//                 borderRadius: "8px",
//                 backgroundColor: "#dce9ff",
//                 marginBottom: "16px",
//                 backgroundImage:
//                   "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCT0mvAjfrhMLMphXs5rccwLWBrMQUzyQ_47YuBNcziVtS21CfIrxMnU8Q6P6O0AVFvRmrV7Hbkx1Pudzd8zkTv_yR-zJfsRHQhv7CgQP9DD2DVOmy0md5f161JJz-kruWVhqD6NYhjt3NOXXx4DNQH3HCAmcOXA-vrFn7RVDCIvAAxFJcS_1ucgMOKu5aVyOS5azuAmLCuzACMuiVZvxnZ2hMlT7wJWBvHl-9bqgsaAGVf_XvzQaEWkTY9gIrEj0-LXyZ9GpRpjk1B')",
//                 backgroundSize: "cover",
//                 backgroundPosition: "center",
//               }}
//             />
//             <div style={{ display: "flex", marginLeft: "8px", marginBottom: "8px" }}>
//               {[1, 2, 3].map((i) => (
//                 <div
//                   key={i}
//                   style={{
//                     width: "32px",
//                     height: "32px",
//                     borderRadius: "50%",
//                     border: "2px solid #f8f9ff",
//                     backgroundColor: "#d3e4fe",
//                     marginLeft: "-8px",
//                   }}
//                 />
//               ))}
//               <div
//                 style={{
//                   width: "32px",
//                   height: "32px",
//                   borderRadius: "50%",
//                   border: "2px solid #f8f9ff",
//                   backgroundColor: "#00873a",
//                   color: "#f7fff2",
//                   fontSize: "10px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontWeight: 700,
//                   marginLeft: "-8px",
//                 }}
//               >
//                 +147
//               </div>
//             </div>
//             <p
//               style={{
//                 fontSize: "10px",
//                 color: "#3e4a3d",
//                 fontWeight: 700,
//                 textTransform: "uppercase",
//                 letterSpacing: "0.1em",
//               }}
//             >
//               Trusted by Industry Leaders
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
