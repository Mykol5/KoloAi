
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Group = {
  id: string;
  name?: string;
  member_count?: number;
  max_members?: number;
  pool_amount?: number;
  [key: string]: any;
};

type Contribution = {
  amount?: number;
  status?: string;
  created_at?: string;
  groups?: { name?: string } | null;
  [key: string]: any;
};

type Transaction = {
  id: string;
  type?: string;
  status?: string;
  amount?: number;
  created_at?: string;
  monnify_ref?: string;
  [key: string]: any;
};

type DashboardData = {
  userName: string;
  totalSavings: number;
  monthlyContributions: number;
  groupCount: number;
  memberCount: number;
  healthScore: number;
  groups: Group[];
  contributions: Contribution[];
  transactions: Transaction[];
  monthlyData: { month: string; amount: number; count: number }[];
};

const C = {
  ink: "#0B1C30",
  green: "#087A3E",
  greenDeep: "#065C2E",
  soft: "#EDF8F1",
  text: "#526171",
  muted: "#87929E",
  border: "#E4EBE6",
  gradient: "linear-gradient(135deg, #0B1C30 0%, #1a3a5c 100%)",
  shadow: "0 4px 24px rgba(15,35,25,.06)",
  shadowHover: "0 8px 32px rgba(15,35,25,.1)",
};

const GROUP_ACCENTS = [
  { fg: "#087A3E", bg: "#EDF8F1", ring: "rgba(8,122,62,.18)" },
  { fg: "#415B7A", bg: "#F1F5FA", ring: "rgba(65,91,122,.18)" },
  { fg: "#8A5A2B", bg: "#FBF2E8", ring: "rgba(138,90,43,.18)" },
  { fg: "#62527A", bg: "#F4F1F8", ring: "rgba(98,82,122,.18)" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

    const { data: memberships } = await supabase
      .from("group_members").select("group_id, groups(*)").eq("user_id", user.id);

    const { data: contributions } = await supabase
      .from("contributions")
      .select("amount, status, created_at, transaction_ref, group_id, groups(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: transactions } = await supabase
      .from("transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(10);

    const groups = (memberships?.map((m: any) => m.groups).filter(Boolean) || []) as Group[];
    const cs = (contributions || []) as Contribution[];
    const completed = cs.filter(c => c.status === "completed");
    const totalSavings = completed.reduce((s, c) => s + Number(c.amount || 0), 0);
    const memberCount = groups.reduce((s, g) => s + Number(g.member_count || 0), 0);

    const now = new Date();
    const monthlyData: DashboardData["monthlyData"] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const items = completed.filter(c => {
        if (!c.created_at) return false;
        const x = new Date(c.created_at);
        return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
      });
      monthlyData.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        amount: items.reduce((s, c) => s + Number(c.amount || 0), 0),
        count: items.length,
      });
    }

    const thisMonth = cs.filter(c => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthlyContributions = thisMonth.reduce((s, c) => s + Number(c.amount || 0), 0);
    const healthScore = cs.length ? Math.round((completed.length / cs.length) * 100) : 0;

    setData({
      userName: profile?.full_name || user.user_metadata?.full_name ||
        user.email?.split("@")[0] || "User",
      totalSavings,
      monthlyContributions,
      groupCount: groups.length,
      memberCount,
      healthScore,
      groups,
      contributions: cs,
      transactions: (transactions || []) as Transaction[],
      monthlyData,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    window.addEventListener("focus", fetchData);
    return () => window.removeEventListener("focus", fetchData);
  }, [fetchData]);

  if (loading) return <Loading />;
  if (!data) return <NotLoaded />;

  return (
    <div className="kolo-dashboard">
      <Header name={data.userName} groups={data.groupCount} />
      <Kpis data={data} />

      <div className="layout">
        <div className="main">
          <ContributionChart data={data} />
          <Groups groups={data.groups} />
          <Transactions transactions={data.transactions} />
        </div>

        <aside className="side">
          <InsightsCard data={data} />
          <QuickActions hasGroups={data.groupCount > 0} />
        </aside>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        .kolo-dashboard {
          width: 100%;
          color: ${C.ink};
          font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #F8FAF9;
          min-height: 100vh;
        }
        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 24px;
          margin-top: 24px;
        }
        .main, .side { min-width: 0; display: flex; flex-direction: column; gap: 24px; }
        .side { align-self: start; }
        .card {
          border: 1px solid ${C.border};
          border-radius: 20px;
          background: #fff;
          box-shadow: ${C.shadow};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card:hover {
          box-shadow: ${C.shadowHover};
        }
        @media(max-width:1100px) {
          .layout { grid-template-columns: 1fr; }
          .side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:700px) {
          .side { display:flex; }
          .layout { gap:20px; }
        }
      `}</style>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", color: C.muted, fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ margin: "0 auto 16px", width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 16, background: C.gradient, color: "#fff", fontWeight: 800, fontSize: 18, boxShadow: "0 12px 32px rgba(11,28,48,.2)" }}>
          <span className="pulse">K</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 500 }}>Preparing your Kolo dashboard...</span>
        <div style={{ marginTop: 16, width: 120, height: 3, background: "#E4EBE6", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: "40%", height: "100%", background: C.green, borderRadius: 99, animation: "loading 1.5s infinite" }} />
        </div>
        <style jsx>{`
          @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
          .pulse { animation: pulse 2s infinite; }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        `}</style>
      </div>
    </div>
  );
}

function NotLoaded() {
  return (
    <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
      <div>
        <h2 style={{ color: C.ink, marginBottom: 8, fontSize: 26 }}>We couldn't load your dashboard.</h2>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 20 }}>Please sign in again and try once more.</p>
        <Link href="/login" style={{ color: "#fff", background: C.green, padding: "14px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15, boxShadow: "0 8px 18px rgba(8,122,62,.2)" }}>Back to sign in</Link>
      </div>
    </div>
  );
}

function Header({ name, groups }: { name: string; groups: number }) {
  const first = name.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="head">
      <div className="head-left">
        <div className="kicker">
          <span className="dot" />
          KOLO INTELLIGENCE
        </div>
        <div className="greeting-row">
          <span className="greeting">{greeting},</span>
          <h1>{first} <span className="wave">👋</span></h1>
        </div>
        <p>Here's a clear view of your savings activity and communities.</p>
      </div>

      <div className="actions">
        <Link href="/groups" className="btn btn-ghost">
          <span className="btn-icon">◎</span>
          <span className="btn-copy">
            <b>{groups ? "My groups" : "Find a group"}</b>
            <small>{groups ? `${groups} active` : "Browse communities"}</small>
          </span>
        </Link>
        <Link href="/groups/create" className="btn btn-solid">
          <span className="btn-icon btn-icon--solid">+</span>
          <span className="btn-copy">
            <b>Create group</b>
            <small>Start a new cycle</small>
          </span>
        </Link>
      </div>

      <style jsx>{`
        .head { 
          display:flex; 
          align-items:center; 
          justify-content:space-between; 
          gap:24px; 
          margin-bottom:32px;
          padding: 32px;
          background: #fff;
          border-radius: 24px;
          border: 1px solid ${C.border};
          box-shadow: ${C.shadow};
        }
        .head-left { flex: 1; }
        .kicker { 
          display:flex; 
          align-items:center; 
          gap:8px; 
          color:${C.green}; 
          font-size:12px; 
          font-weight:850; 
          letter-spacing:.14em; 
          margin-bottom: 12px;
        }
        .dot { 
          width:8px; 
          height:8px; 
          border-radius:50%; 
          background:${C.green};
          box-shadow: 0 0 0 4px ${C.soft};
        }
        .greeting-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }
        .greeting {
          color: ${C.text};
          font-size: 20px;
          font-weight: 500;
        }
        h1 { 
          margin:0; 
          color:${C.ink}; 
          font-size:clamp(28px,3vw,34px); 
          line-height:1.15; 
          letter-spacing:-.04em; 
          font-weight:780; 
        }
        .wave {
          display: inline-block;
          font-size: 26px;
          animation: wave 2s infinite;
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-10deg); }
        }
        p { 
          margin:0; 
          color:${C.text}; 
          font-size:15px; 
          line-height: 1.6;
        }

        .actions {
          display: flex;
          gap: 12px;
          align-items: stretch;
          flex-shrink: 0;
        }
        .btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px 10px 10px;
          border-radius: 16px;
          text-decoration: none;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-size: 17px;
          font-weight: 700;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
          white-space: nowrap;
        }
        .btn-copy b {
          font-size: 14px;
          font-weight: 750;
          line-height: 1.2;
        }
        .btn-copy small {
          font-size: 11px;
          font-weight: 550;
          line-height: 1.2;
        }
        .btn:hover .btn-icon {
          transform: scale(1.08);
        }

        .btn-ghost {
          background: #fff;
          border: 1.5px solid ${C.border};
        }
        .btn-ghost .btn-icon {
          color: ${C.green};
          background: ${C.soft};
        }
        .btn-ghost .btn-copy b { color: ${C.ink}; }
        .btn-ghost .btn-copy small { color: ${C.muted}; }
        .btn-ghost:hover {
          border-color: ${C.green};
          box-shadow: 0 6px 16px rgba(8,122,62,.12);
          transform: translateY(-1px);
        }

        .btn-solid {
          background: linear-gradient(135deg, ${C.green}, ${C.greenDeep});
          box-shadow: 0 6px 16px rgba(8,122,62,.28);
        }
        .btn-icon--solid {
          color: ${C.green};
          background: #fff;
          font-size: 20px;
        }
        .btn-solid .btn-copy b { color: #fff; }
        .btn-solid .btn-copy small { color: rgba(255,255,255,.72); }
        .btn-solid:hover {
          box-shadow: 0 10px 24px rgba(8,122,62,.36);
          transform: translateY(-1px);
        }
        .btn-solid::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.16) 45%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .btn-solid:hover::after {
          transform: translateX(100%);
        }

        @media(max-width:700px) { 
          .head { 
            align-items:flex-start; 
            flex-direction:column; 
            padding: 20px;
            border-radius: 20px;
          } 
          .actions { width:100%; }
          .btn { flex: 1; padding: 8px 14px 8px 8px; }
          .btn-copy small { display: none; }
        }
      `}</style>
    </header>
  );
}

function Kpis({ data }: { data: DashboardData }) {
  const items = [
    {
      label: "Total saved",
      value: formatNaira(data.totalSavings),
      note: "Completed contributions",
      icon: "₦",
      tone: "green",
      trend: "+12.5%"
    },
    {
      label: "This month",
      value: formatNaira(data.monthlyContributions),
      note: data.monthlyContributions ? "Contribution activity" : "No activity yet",
      icon: "↗",
      tone: "blue",
      trend: "+8.2%"
    },
    {
      label: "My groups",
      value: String(data.groupCount),
      note: data.groupCount === 1 ? "Active community" : "Active communities",
      icon: "◎",
      tone: "purple",
      trend: `${data.memberCount} members`
    },
    {
      label: "Savings momentum",
      value: `${data.healthScore}/100`,
      note: data.healthScore >= 80 ? "Strong consistency" : data.healthScore >= 50 ? "Building consistency" : "Start your rhythm",
      icon: "✓",
      tone: "green",
      trend: `${data.healthScore}%`
    },
  ];

  return (
    <section className="kpis">
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <div className="kpi-top">
            <span className="label">{item.label}</span>
            <b className={`icon ${item.tone}`}>{item.icon}</b>
          </div>
          <strong className="value">{item.value}</strong>
          <small className="note">{item.note}</small>
          {item.label === "Savings momentum" ? (
            <div className="track">
              <i style={{ width: `${Math.min(data.healthScore, 100)}%` }} />
            </div>
          ) : (
            <div className="trend">
              <span>{item.trend}</span>
            </div>
          )}
        </div>
      ))}
      <style jsx>{`
        .kpis { 
          display:grid; 
          grid-template-columns:repeat(4,minmax(0,1fr)); 
          gap:16px; 
          margin-bottom: 24px;
        }
        .kpi { 
          padding:24px; 
          border:1px solid ${C.border}; 
          border-radius:18px; 
          background:#fff; 
          box-shadow: ${C.shadow};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .kpi::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${C.gradient};
          opacity: 0;
          transition: opacity 0.3s;
        }
        .kpi:hover {
          box-shadow: ${C.shadowHover};
          transform: translateY(-2px);
        }
        .kpi:hover::before {
          opacity: 1;
        }
        .kpi-top { 
          display:flex; 
          align-items:center; 
          justify-content:space-between; 
          gap:12px; 
          margin-bottom: 20px;
        }
        .label { 
          color:${C.text}; 
          font-size:12px; 
          font-weight:650;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .icon { 
          width:40px; 
          height:40px; 
          display:grid; 
          place-items:center; 
          border-radius:10px; 
          font-size:16px;
          font-weight: 700;
          transition: transform 0.2s;
        }
        .kpi:hover .icon {
          transform: scale(1.1);
        }
        .green { 
          color:${C.green}; 
          background:${C.soft}; 
        }
        .blue { 
          color:#415B7A; 
          background:#F1F5FA; 
        }
        .purple { 
          color:#62527A; 
          background:#F4F1F8; 
        }
        .value { 
          display:block; 
          color:${C.ink}; 
          font-size:32px; 
          line-height:1; 
          letter-spacing:-.04em; 
          font-weight: 780;
          margin-bottom: 12px;
        }
        .note { 
          display:block; 
          color:${C.muted}; 
          font-size:12px;
          margin-bottom: 16px;
        }
        .track { 
          height:6px; 
          overflow:hidden; 
          border-radius:99px; 
          background:#EDF1EE; 
        }
        .track i { 
          display:block; 
          height:100%; 
          border-radius:99px; 
          background: linear-gradient(90deg, ${C.green}, #0A9A4F);
          transition: width 1s ease;
        }
        .trend {
          display: flex;
          align-items: center;
          gap: 6px;
          color: ${C.green};
          font-size: 12px;
          font-weight: 650;
        }
        @media(max-width:900px) { 
          .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } 
        }
        @media(max-width:500px) { 
          .kpis { grid-template-columns:1fr; } 
        }
      `}</style>
    </section>
  );
}

function ContributionChart({ data }: { data: DashboardData }) {
  const max = Math.max(...data.monthlyData.map(x => x.amount), 1);
  const total = data.monthlyData.reduce((s,x) => s+x.amount, 0);

  return (
    <section className="card chart-card">
      <div className="chart-head">
        <div>
          <span className="eyebrow">SAVINGS ACTIVITY</span>
          <h2>Your contribution rhythm</h2>
          <p>Recorded contributions over the last six months.</p>
        </div>
        <div className="period">
          <small>6-month total</small>
          <strong>{formatNaira(total)}</strong>
        </div>
      </div>

      <div className="chart">
        <div className="yaxis">
          <span>{formatCompact(max)}</span>
          <span>{formatCompact(max/2)}</span>
          <span>₦0</span>
        </div>
        <div className="plot">
          <div className="gridlines"><i/><i/><i/></div>
          <div className="bars">
            {data.monthlyData.map((m,i) => {
              const h = m.amount ? Math.max(m.amount/max*100,8) : 3;
              const current = i === data.monthlyData.length-1;
              return (
                <div className="column" key={m.month}>
                  <div className="bar-space">
                    {m.amount > 0 && (
                      <span className={`value ${current ? "current":""}`}>
                        {formatCompact(m.amount)}
                      </span>
                    )}
                    <i 
                      className={`bar ${current ? "current":""}`} 
                      style={{height:`${h}%`}} 
                      title={`${m.month}: ${formatNaira(m.amount)}`} 
                    />
                  </div>
                  <small className={current ? "current":""}>{m.month}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-foot">
        <span><i/> Completed contributions</span>
        <span>Total saved to date: <b>{formatNaira(data.totalSavings)}</b></span>
      </div>

      <style jsx>{`
        .chart-card { 
          padding:28px; 
          transition: all 0.3s;
        }
        .chart-head { 
          display:flex; 
          justify-content:space-between; 
          gap:24px; 
          margin-bottom:32px; 
        }
        .eyebrow { 
          color:${C.green}; 
          font-size:11px; 
          font-weight:850; 
          letter-spacing:.12em; 
          display: block;
          margin-bottom: 8px;
        }
        h2 { 
          margin:0 0 6px; 
          color:${C.ink}; 
          font-size:24px; 
          letter-spacing:-.025em; 
          font-weight: 750;
        }
        .chart-head p { 
          color:${C.muted}; 
          font-size:14px; 
          margin: 0;
        }
        .period { 
          text-align:right; 
          min-width:140px;
          background: ${C.soft};
          padding: 16px 20px;
          border-radius: 12px;
        }
        .period small { 
          display:block; 
          color:${C.muted}; 
          font-size:12px; 
          margin-bottom: 6px;
        }
        .period strong { 
          display:block; 
          color:${C.green}; 
          font-size:24px; 
          font-weight: 750;
        }
        .chart { 
          height:280px; 
          display:flex; 
          gap:16px; 
        }
        .yaxis { 
          width:70px; 
          display:flex; 
          flex-direction:column; 
          justify-content:space-between; 
          padding-bottom:32px; 
          text-align:right; 
          color:#9AA4AE; 
          font-size:12px;
          font-weight: 600;
        }
        .plot { 
          position:relative; 
          flex:1; 
          min-width:0; 
        }
        .gridlines { 
          position:absolute; 
          inset:0 0 32px; 
          display:flex; 
          flex-direction:column; 
          justify-content:space-between; 
        }
        .gridlines i { 
          border-top:1px dashed #E7ECE9; 
        }
        .bars { 
          position:absolute; 
          inset:0; 
          display:flex; 
          gap:16px; 
          padding:0 8px; 
        }
        .column { 
          flex:1; 
          min-width:0; 
          display:flex; 
          flex-direction:column; 
          align-items:center; 
        }
        .bar-space { 
          position:relative; 
          width:100%; 
          height:calc(100% - 32px); 
          display:flex; 
          justify-content:center; 
          align-items:flex-end; 
        }
        .bar { 
          width:min(48px,72%); 
          min-height:4px; 
          border-radius:8px 8px 4px 4px; 
          background: linear-gradient(180deg, #BFD8C8, #A8CDB4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }
        .bar.current { 
          background: linear-gradient(180deg, #0A9A4F, ${C.green});
          box-shadow: 0 4px 12px rgba(8,122,62,.3);
        }
        .bar:hover { 
          transform:translateY(-4px);
          box-shadow: 0 8px 20px rgba(8,122,62,.2);
        }
        .value { 
          position:absolute; 
          bottom:calc(100% + 8px); 
          color:${C.text}; 
          font-size:11px; 
          font-weight:750; 
          white-space:nowrap;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .column:hover .value {
          opacity: 1;
        }
        .value.current { 
          color:${C.green};
          opacity: 1;
        }
        .column > small { 
          margin-top:12px; 
          color:#929CA7; 
          font-size:12px; 
          font-weight:650;
          transition: color 0.2s;
        }
        .column > small.current { 
          color:${C.green}; 
          font-weight:800; 
        }
        .chart-foot { 
          display:flex; 
          justify-content:space-between; 
          gap:16px; 
          padding-top:20px; 
          margin-top:24px; 
          border-top:1px solid #EEF2EF; 
          color:${C.muted}; 
          font-size:13px;
        }
        .chart-foot > span:first-child { 
          display:flex; 
          align-items:center; 
          gap:8px; 
        }
        .chart-foot i { 
          width:8px; 
          height:8px; 
          border-radius:50%; 
          background:${C.green};
          box-shadow: 0 0 0 3px ${C.soft};
        }
        .chart-foot b { 
          color:${C.ink}; 
          font-weight: 700;
        }
        @media(max-width:600px) { 
          .chart-card { padding:20px; } 
          .chart-head { flex-direction:column; gap:16px; } 
          .period { text-align:left; } 
          .chart { height:220px; } 
          .bars { gap:8px; } 
          .chart-foot { flex-direction:column; gap:8px; } 
        }
      `}</style>
    </section>
  );
}

function InsightsCard({ data }: { data: DashboardData }) {
  const pending = data.contributions.filter(c => c.status !== "completed").length;
  const completed = data.contributions.filter(c => c.status === "completed").length;
  const progress = Math.min(data.healthScore, 100);

  const insight = useMemo(() => {
    if (!data.contributions.length) return ["Start with a clear savings goal.", "Join or create a savings community and begin recording contributions so Kolo can track your progress."];
    if (pending) return [`${pending} contribution${pending > 1 ? "s are" : " is"} still pending.`, "Review your activity and confirm outstanding records with the relevant savings group."];
    if (data.groupCount) return ["Your savings activity is building.", `${completed} completed contribution${completed === 1 ? "" : "s"} across ${data.groupCount} active group${data.groupCount === 1 ? "" : "s"}.`];
    return ["Keep your savings rhythm consistent.", `You have recorded ${completed} completed contribution${completed === 1 ? "" : "s"}.`];
  }, [data.contributions.length, data.groupCount, pending, completed]);

  return (
    <section className="insights">
      <div className="top">
        <div className="mark">✦</div>
        <div className="top-copy">
          <small>KOLO INTELLIGENCE</small>
          <strong>What Kolo sees</strong>
        </div>
        <i className="status" aria-hidden="true">●</i>
      </div>

      <div className="signal">
        <span className="label">CURRENT SIGNAL</span>
        <h3>{insight[0]}</h3>
        <p>{insight[1]}</p>
      </div>

      <div className="totals">
        <div className="totals-copy">
          <small>Total saved</small>
          <strong>{formatNaira(data.totalSavings)}</strong>
          <span>{formatNaira(data.monthlyContributions)} recorded this month</span>
        </div>
        <div className="ring" style={{ '--progress': `${progress * 3.6}deg` } as any}>
          <div className="ring-hole">
            <b>{progress}%</b>
            <small>on track</small>
          </div>
        </div>
      </div>

      <div className="metrics">
        <div>
          <small>This month</small>
          <b>{formatNaira(data.monthlyContributions)}</b>
        </div>
        <div>
          <small>Active groups</small>
          <b>{data.groupCount}</b>
        </div>
      </div>

      <Link href="/groups" className="cta">
        Explore your activity <span>→</span>
      </Link>

      <style jsx>{`
        .insights { 
          position:relative; 
          overflow:hidden; 
          padding:28px; 
          border-radius:20px; 
          background: ${C.gradient};
          color:#fff; 
          box-shadow: 0 16px 40px rgba(11,28,48,.2);
        }
        .insights::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 50%);
          pointer-events: none;
        }
        .top { 
          display:flex; 
          align-items:center; 
          gap:12px; 
          position: relative;
          z-index: 1;
        }
        .mark { 
          width:48px; 
          height:48px; 
          display:grid; 
          place-items:center; 
          border-radius:14px; 
          background: ${C.green};
          font-size:22px;
          box-shadow: 0 8px 20px rgba(8,122,62,.4);
          flex-shrink: 0;
        }
        .top-copy { 
          display:flex; 
          flex-direction:column; 
          gap:4px; 
        }
        .top-copy small { 
          color:#8DE0A8; 
          font-size:10px; 
          font-weight:850; 
          letter-spacing:.12em; 
        }
        .top-copy strong { 
          color:#fff; 
          font-size:16px; 
        }
        .status { 
          margin-left:auto; 
          color:#8DE0A8; 
          font-size:12px;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .signal {
          position: relative;
          z-index: 1;
        }
        .label { 
          display:block; 
          margin-top:28px; 
          color:#7D8B99; 
          font-size:10px; 
          font-weight:850; 
          letter-spacing:.12em; 
        }
        h3 { 
          margin:12px 0; 
          color:#fff; 
          font-size:24px; 
          line-height:1.25; 
          letter-spacing:-.03em; 
          font-weight: 700;
        }
        .signal p { 
          margin:0; 
          color:#C5D0D9; 
          font-size:14px; 
          line-height:1.7; 
        }

        .totals {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,.12);
        }
        .totals-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .totals-copy small {
          color: #8D9AA6;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .totals-copy strong {
          color: #fff;
          font-size: 28px;
          font-weight: 780;
          letter-spacing: -.03em;
        }
        .totals-copy span {
          color: #9FB0BC;
          font-size: 12px;
        }
        .ring {
          --progress: 0deg;
          width: 80px;
          height: 80px;
          flex-shrink: 0;
          border-radius: 50%;
          background: conic-gradient(#4ADE80 var(--progress), rgba(255,255,255,.14) var(--progress));
          display: grid;
          place-items: center;
        }
        .ring-hole {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: #12263D;
          display: grid;
          place-items: center;
          text-align: center;
        }
        .ring-hole b {
          color: #fff;
          font-size: 16px;
          font-weight: 750;
          line-height: 1.2;
        }
        .ring-hole small {
          color: #8D9AA6;
          font-size: 9px;
        }

        .metrics { 
          display:grid; 
          grid-template-columns:1fr 1fr; 
          gap:12px; 
          margin-top:16px; 
          position: relative;
          z-index: 1;
        }
        .metrics div { 
          padding:16px; 
          border:1px solid rgba(255,255,255,.12); 
          border-radius:12px; 
          background:rgba(255,255,255,.06);
          backdrop-filter: blur(10px);
          transition: all 0.3s;
        }
        .metrics div:hover {
          background:rgba(255,255,255,.1);
          border-color: rgba(255,255,255,.2);
        }
        .metrics small,.metrics b { 
          display:block; 
        }
        .metrics small { 
          color:#8D9AA6; 
          font-size:10px; 
          margin-bottom: 8px;
        }
        .metrics b { 
          color:#fff; 
          font-size:16px; 
          font-weight: 650;
        }
        .cta { 
          display:flex; 
          justify-content:space-between; 
          margin-top:20px; 
          padding-top:16px; 
          border-top:1px solid rgba(255,255,255,.12); 
          color:#fff; 
          font-size:13px; 
          font-weight:750; 
          text-decoration:none;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }
        .cta:hover {
          color: #8DE0A8;
        }
        .cta span { 
          color:#8DE0A8; 
          font-size:18px;
          transition: transform 0.3s;
        }
        .cta:hover span {
          transform: translateX(4px);
        }

        @media(max-width:1100px) and (min-width:701px) {
          .totals { flex-direction: column; align-items: flex-start; }
          .ring { align-self: center; }
        }
      `}</style>
    </section>
  );
}

function QuickActions({ hasGroups }: { hasGroups: boolean }) {
  return (
    <section className="card quick">
      <h3>Quick actions</h3>
      <div className="actions-grid">
        <Link href="/groups" className="action-item">
          <i>◎</i>
          <span>
            <b>{hasGroups ? "View groups" : "Discover"}</b>
            <small>Manage communities</small>
          </span>
          <strong>→</strong>
        </Link>
        <Link href="/groups/create" className="action-item">
          <i>+</i>
          <span>
            <b>Create group</b>
            <small>Start savings cycle</small>
          </span>
          <strong>→</strong>
        </Link>
        <Link href="/payments" className="action-item">
          <i>₦</i>
          <span>
            <b>Contribute</b>
            <small>Add to savings</small>
          </span>
          <strong>→</strong>
        </Link>
      </div>
      <style jsx>{`
        .quick { 
          padding:24px; 
        }
        h3 { 
          margin:0 0 20px; 
          color:${C.ink}; 
          font-size:18px; 
          font-weight: 700;
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .action-item { 
          display:flex; 
          align-items:center; 
          gap:14px; 
          padding:16px; 
          border-radius:14px;
          text-decoration:none;
          transition: all 0.2s;
          background: #FAFCFB;
          border: 1px solid #EEF2EF;
        }
        .action-item:hover {
          background: ${C.soft};
          border-color: ${C.green};
          transform: translateX(4px);
        }
        .action-item i { 
          width:40px; 
          height:40px; 
          display:grid; 
          place-items:center; 
          border-radius:10px; 
          color:${C.green}; 
          background:#fff; 
          font-style:normal;
          font-size: 18px;
          border: 1px solid #E4EBE6;
        }
        .action-item span { 
          flex:1; 
          display:flex; 
          flex-direction:column; 
          gap:4px; 
        }
        .action-item b { 
          color:${C.ink}; 
          font-size:14px; 
          font-weight: 650;
        }
        .action-item small { 
          color:${C.muted}; 
          font-size:12px; 
        }
        .action-item > strong { 
          color:${C.green}; 
          font-size:18px;
          transition: transform 0.2s;
        }
        .action-item:hover > strong {
          transform: translateX(4px);
        }
      `}</style>
    </section>
  );
}

function Groups({ groups }: { groups: Group[] }) {
  return (
    <section className="card groups-card">
      <div className="section-head">
        <div>
          <span>COMMUNITIES</span>
          <h2>Your savings groups</h2>
          <p>The communities you currently belong to.</p>
        </div>
        <Link href="/groups" className="view-all">
          View all <em>→</em>
        </Link>
      </div>

      {!groups.length ? (
        <div className="empty">
          <i>◎</i>
          <div>
            <b>You're not in a savings group yet.</b>
            <p>Join a community or create your own savings group.</p>
          </div>
          <Link href="/groups/create">Create a group →</Link>
        </div>
      ) : (
        <div className="group-grid">
          {groups.slice(0,4).map((g, idx) => {
            const accent = GROUP_ACCENTS[idx % GROUP_ACCENTS.length];
            const capacity = Number(g.max_members || 0);
            const filled = Number(g.member_count || 0);
            const fillPct = capacity ? Math.min(100, Math.round((filled / capacity) * 100)) : 0;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="group-card"
                style={{ '--accent-fg': accent.fg, '--accent-bg': accent.bg, '--accent-ring': accent.ring } as any}
              >
                <div className="group-top">
                  <i className="avatar">{initials(g.name || "Group")}</i>
                  <span className="status">Active</span>
                </div>

                <b className="group-name">{g.name || "Savings group"}</b>

                <div className="group-pool">
                  <small>Group pool</small>
                  <strong>{formatNaira(Number(g.pool_amount || 0))}</strong>
                </div>

                <div className="group-capacity">
                  <div className="capacity-row">
                    <span>{filled}/{capacity || "—"} members</span>
                    {capacity > 0 && <span>{fillPct}%</span>}
                  </div>
                  {capacity > 0 && (
                    <div className="capacity-track">
                      <i style={{ width: `${fillPct}%` }} />
                    </div>
                  )}
                </div>

                <div className="group-footer">
                  <span>View details</span>
                  <em>→</em>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .groups-card { 
          padding:28px; 
        }
        .section-head { 
          display:flex; 
          justify-content:space-between; 
          align-items: flex-end;
          gap:16px; 
          margin-bottom:24px; 
        }
        .section-head span { 
          color:${C.green}; 
          font-size:11px; 
          font-weight:850; 
          letter-spacing:.12em; 
          display: block;
          margin-bottom: 6px;
        }
        h2 { 
          margin:0 0 6px; 
          color:${C.ink}; 
          font-size:24px; 
          font-weight: 750;
        }
        .section-head p { 
          color:${C.muted}; 
          font-size:14px; 
          margin: 0;
        }
        .view-all {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid ${C.border};
          color:${C.ink}; 
          font-size:13px; 
          font-weight:700; 
          text-decoration:none; 
          white-space:nowrap;
          transition: all 0.2s;
        }
        .view-all em {
          font-style: normal;
          color: ${C.green};
          transition: transform 0.2s;
        }
        .view-all:hover {
          border-color: ${C.green};
          background: ${C.soft};
          color: ${C.green};
        }
        .view-all:hover em {
          transform: translateX(3px);
        }
        .group-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .group-card {
          --accent-fg: ${C.green};
          --accent-bg: ${C.soft};
          --accent-ring: rgba(8,122,62,.18);
          display: flex;
          flex-direction: column;
          padding: 24px;
          border: 1px solid #EEF2EF;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #FAFCFB;
          position: relative;
          overflow: hidden;
        }
        .group-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--accent-fg);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .group-card:hover {
          border-color: var(--accent-ring);
          background: #fff;
          box-shadow: 0 10px 28px -6px var(--accent-ring);
          transform: translateY(-3px);
        }
        .group-card:hover::before {
          opacity: 1;
        }
        .group-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .avatar { 
          width:48px; 
          height:48px; 
          display:grid; 
          place-items:center; 
          border-radius:14px; 
          color: var(--accent-fg); 
          background: var(--accent-bg); 
          font-style:normal; 
          font-size:14px; 
          font-weight:850;
        }
        .status { 
          color: var(--accent-fg); 
          font-size:11px; 
          font-weight:700;
          background: var(--accent-bg);
          padding: 6px 12px;
          border-radius: 99px;
        }
        .group-name {
          display: block;
          color: ${C.ink};
          font-size:16px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .group-pool {
          padding: 16px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #EEF2EF;
          margin-bottom: 16px;
        }
        .group-pool small {
          display: block;
          color: ${C.muted};
          font-size:11px;
          margin-bottom: 6px;
        }
        .group-pool strong {
          color: ${C.ink};
          font-size:18px;
          font-weight: 700;
        }
        .group-capacity {
          margin-bottom: 4px;
        }
        .capacity-row {
          display: flex;
          justify-content: space-between;
          color: ${C.muted};
          font-size:11px;
          font-weight: 650;
          margin-bottom: 8px;
        }
        .capacity-track {
          height: 5px;
          border-radius: 99px;
          background: #EDF1EE;
          overflow: hidden;
        }
        .capacity-track i {
          display: block;
          height: 100%;
          border-radius: 99px;
          background: var(--accent-fg);
          transition: width 0.6s ease;
        }
        .group-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #EEF2EF;
          color: var(--accent-fg);
          font-size:12px;
          font-weight: 650;
        }
        .group-footer em { 
          font-style: normal;
          font-size:18px;
          transition: transform 0.2s;
        }
        .group-card:hover .group-footer em {
          transform: translateX(4px);
        }
        .empty { 
          display:flex; 
          align-items:center; 
          gap:16px; 
          padding:28px; 
          border:1.5px dashed #D9E4DC; 
          border-radius:14px; 
          background:#FAFCFB; 
        }
        .empty > i { 
          width:52px; 
          height:52px; 
          display:grid; 
          place-items:center; 
          border-radius:14px; 
          color:${C.green}; 
          background:${C.soft}; 
          font-style:normal; 
          font-size: 22px;
        }
        .empty > div { 
          flex:1; 
        }
        .empty b { 
          color:${C.ink}; 
          font-size:14px; 
        }
        .empty p { 
          margin:6px 0 0; 
          color:${C.muted}; 
          font-size:12px; 
        }
        .empty > a { 
          color:${C.green}; 
          font-size:12px; 
          font-weight:750; 
          text-decoration:none; 
          white-space:nowrap;
          transition: all 0.2s;
        }
        .empty > a:hover {
          transform: translateX(4px);
        }
        @media(max-width:700px) {
          .group-grid {
            grid-template-columns: 1fr;
          }
        }
        @media(max-width:500px) { 
          .empty { 
            flex-wrap:wrap; 
            align-items:flex-start; 
          } 
          .empty > a { 
            margin-left:68px; 
          } 
        }
      `}</style>
    </section>
  );
}

function Transactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <section className="card tx">
      <div className="tx-head">
        <div>
          <span>ACTIVITY</span>
          <h2>Recent contribution activity</h2>
        </div>
        <Link href="/payments">View all →</Link>
      </div>
      
      {!transactions.length ? (
        <div className="tx-empty">
          <i>◎</i>
          <div>
            <b>No activity recorded yet.</b>
            <p>Your contribution activity will appear here.</p>
          </div>
        </div>
      ) : (
        <div>
          {transactions.slice(0,6).map(t => (
            <div className="tx-row" key={t.id}>
              <i className="tx-icon">₦</i>
              <span className="tx-info">
                <b>{t.type ? t.type.charAt(0).toUpperCase()+t.type.slice(1) : "Contribution"}</b>
                <small>{formatDate(t.created_at)}</small>
              </span>
              <code>{t.monnify_ref?.slice(0,15) || "Recorded activity"}</code>
              <strong className="tx-amount">{formatNaira(Number(t.amount || 0))}</strong>
              <em className={`tx-status ${t.status === "completed" ? "done" : "pending"}`}>
                {t.status === "completed" ? "✓ Recorded" : "⏳ Pending"}
              </em>
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .tx { 
          overflow:hidden; 
        }
        .tx-head { 
          display:flex; 
          align-items:center; 
          justify-content:space-between; 
          padding:28px; 
          border-bottom:1px solid #EEF2EF; 
        }
        .tx-head span { 
          color:${C.green}; 
          font-size:11px; 
          font-weight:850; 
          letter-spacing:.12em; 
          display: block;
          margin-bottom: 6px;
        }
        h2 { 
          margin:0; 
          color:${C.ink}; 
          font-size:24px; 
          font-weight: 750;
        }
        .tx-head a { 
          color:${C.green}; 
          font-size:13px; 
          font-weight:750; 
          text-decoration:none;
          transition: all 0.2s;
        }
        .tx-head a:hover {
          transform: translateX(4px);
        }
        .tx-row { 
          display:grid; 
          grid-template-columns:40px minmax(0,1fr) 140px 110px 90px; 
          align-items:center; 
          gap:14px; 
          padding:18px 28px; 
          border-bottom:1px solid #F0F3F1; 
          transition: background 0.2s;
        }
        .tx-row:hover {
          background: #FAFCFB;
        }
        .tx-row:last-child { 
          border-bottom:0; 
        }
        .tx-icon { 
          width:36px; 
          height:36px; 
          display:grid; 
          place-items:center; 
          border-radius:10px; 
          background:${C.soft}; 
          color:${C.green}; 
          font-style:normal; 
          font-size:14px; 
          font-weight:850;
        }
        .tx-info { 
          display:flex; 
          flex-direction:column; 
          gap:4px; 
          min-width:0; 
        }
        .tx-info b { 
          overflow:hidden; 
          color:${C.ink}; 
          font-size:13px; 
          text-overflow:ellipsis; 
          white-space:nowrap; 
          font-weight: 650;
        }
        .tx-info small, code { 
          color:${C.muted}; 
          font-size:11px; 
        }
        code { 
          overflow:hidden; 
          text-overflow:ellipsis; 
          white-space:nowrap; 
          font-family:inherit; 
        }
        .tx-amount { 
          color:${C.ink}; 
          font-size:14px; 
          text-align:right; 
          font-weight: 650;
        }
        .tx-status { 
          justify-self:end; 
          padding:6px 12px; 
          border-radius:99px; 
          font-style:normal; 
          font-size:11px; 
          font-weight:750;
          white-space: nowrap;
        }
        .done { 
          color:${C.green}; 
          background:${C.soft}; 
        }
        .pending { 
          color:#87651A; 
          background:#FFF8E8; 
        }
        .tx-empty { 
          display:flex; 
          align-items:center; 
          gap:16px; 
          padding:44px 28px; 
        }
        .tx-empty > i { 
          width:52px; 
          height:52px; 
          display:grid; 
          place-items:center; 
          border-radius:14px; 
          background:${C.soft}; 
          color:${C.green}; 
          font-style:normal; 
          font-size: 22px;
        }
        .tx-empty b { 
          color:${C.ink}; 
          font-size:14px; 
        }
        .tx-empty p { 
          margin:6px 0 0; 
          color:${C.muted}; 
          font-size:12px; 
        }
        @media(max-width:700px) {
          .tx-row { 
            grid-template-columns:40px minmax(0,1fr) 90px; 
            padding: 16px 20px;
          }
          .tx-head {
            padding: 20px;
          }
          .tx-row code { 
            display:none; 
          }
          .tx-status { 
            grid-column:3; 
            grid-row:1; 
          }
          .tx-amount { 
            grid-column:2; 
            text-align:left; 
            grid-row:2; 
          }
          .tx-info { 
            grid-row:1 / span 2; 
          }
        }
      `}</style>
    </section>
  );
}

function formatNaira(n: number) {
  return `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function formatCompact(n: number) {
  n = Number(n || 0);
  if (n >= 1000000) return `₦${(n/1000000).toFixed(1).replace(".0","")}m`;
  if (n >= 1000) return `₦${Math.round(n/1000)}k`;
  return formatNaira(n);
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date unavailable";
  return d.toLocaleDateString("en-NG", { day:"2-digit", month:"short", year:"numeric" });
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : p[0].slice(0,2).toUpperCase();
}


// "use client";

// import Link from "next/link";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import { createClient } from "@/lib/supabase/client";

// type Group = {
//   id: string;
//   name?: string;
//   member_count?: number;
//   max_members?: number;
//   pool_amount?: number;
//   [key: string]: any;
// };

// type Contribution = {
//   amount?: number;
//   status?: string;
//   created_at?: string;
//   groups?: { name?: string } | null;
//   [key: string]: any;
// };

// type Transaction = {
//   id: string;
//   type?: string;
//   status?: string;
//   amount?: number;
//   created_at?: string;
//   monnify_ref?: string;
//   [key: string]: any;
// };

// type DashboardData = {
//   userName: string;
//   totalSavings: number;
//   monthlyContributions: number;
//   groupCount: number;
//   memberCount: number;
//   healthScore: number;
//   groups: Group[];
//   contributions: Contribution[];
//   transactions: Transaction[];
//   monthlyData: { month: string; amount: number; count: number }[];
// };

// const C = {
//   ink: "#0B1C30",
//   green: "#087A3E",
//   greenDeep: "#065C2E",
//   soft: "#EDF8F1",
//   text: "#526171",
//   muted: "#87929E",
//   border: "#E4EBE6",
//   gradient: "linear-gradient(135deg, #0B1C30 0%, #1a3a5c 100%)",
//   shadow: "0 4px 24px rgba(15,35,25,.06)",
//   shadowHover: "0 8px 32px rgba(15,35,25,.1)",
// };

// // Rotating accent set for group cards — cycles by index, not by data that isn't there.
// const GROUP_ACCENTS = [
//   { fg: "#087A3E", bg: "#EDF8F1", ring: "rgba(8,122,62,.18)" },
//   { fg: "#415B7A", bg: "#F1F5FA", ring: "rgba(65,91,122,.18)" },
//   { fg: "#8A5A2B", bg: "#FBF2E8", ring: "rgba(138,90,43,.18)" },
//   { fg: "#62527A", bg: "#F4F1F8", ring: "rgba(98,82,122,.18)" },
// ];

// export default function DashboardPage() {
//   const [data, setData] = useState<DashboardData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const supabase = createClient();

//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     const { data: { user } } = await supabase.auth.getUser();

//     if (!user) {
//       setLoading(false);
//       return;
//     }

//     const { data: profile } = await supabase
//       .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

//     const { data: memberships } = await supabase
//       .from("group_members").select("group_id, groups(*)").eq("user_id", user.id);

//     const { data: contributions } = await supabase
//       .from("contributions")
//       .select("amount, status, created_at, transaction_ref, group_id, groups(name)")
//       .eq("user_id", user.id)
//       .order("created_at", { ascending: false });

//     const { data: transactions } = await supabase
//       .from("transactions").select("*").eq("user_id", user.id)
//       .order("created_at", { ascending: false }).limit(10);

//     const groups = (memberships?.map((m: any) => m.groups).filter(Boolean) || []) as Group[];
//     const cs = (contributions || []) as Contribution[];
//     const completed = cs.filter(c => c.status === "completed");
//     const totalSavings = completed.reduce((s, c) => s + Number(c.amount || 0), 0);
//     const memberCount = groups.reduce((s, g) => s + Number(g.member_count || 0), 0);

//     const now = new Date();
//     const monthlyData: DashboardData["monthlyData"] = [];

//     for (let i = 5; i >= 0; i--) {
//       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
//       const items = completed.filter(c => {
//         if (!c.created_at) return false;
//         const x = new Date(c.created_at);
//         return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
//       });
//       monthlyData.push({
//         month: d.toLocaleDateString("en-US", { month: "short" }),
//         amount: items.reduce((s, c) => s + Number(c.amount || 0), 0),
//         count: items.length,
//       });
//     }

//     const thisMonth = cs.filter(c => {
//       if (!c.created_at) return false;
//       const d = new Date(c.created_at);
//       return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
//     });

//     const monthlyContributions = thisMonth.reduce((s, c) => s + Number(c.amount || 0), 0);
//     const healthScore = cs.length ? Math.round((completed.length / cs.length) * 100) : 0;

//     setData({
//       userName: profile?.full_name || user.user_metadata?.full_name ||
//         user.email?.split("@")[0] || "User",
//       totalSavings,
//       monthlyContributions,
//       groupCount: groups.length,
//       memberCount,
//       healthScore,
//       groups,
//       contributions: cs,
//       transactions: (transactions || []) as Transaction[],
//       monthlyData,
//     });
//     setLoading(false);
//   }, [supabase]);

//   useEffect(() => { fetchData(); }, [fetchData]);
//   useEffect(() => {
//     window.addEventListener("focus", fetchData);
//     return () => window.removeEventListener("focus", fetchData);
//   }, [fetchData]);

//   if (loading) return <Loading />;
//   if (!data) return <NotLoaded />;

//   return (
//     <div className="kolo-dashboard">
//       <Header name={data.userName} groups={data.groupCount} />
//       <Kpis data={data} />

//       <div className="layout">
//         <div className="main">
//           <ContributionChart data={data} />
//           <Groups groups={data.groups} />
//           <Transactions transactions={data.transactions} />
//         </div>

//         <aside className="side">
//           <InsightsCard data={data} />
//           <QuickActions hasGroups={data.groupCount > 0} />
//         </aside>
//       </div>

//       <style jsx global>{`
//         * { box-sizing: border-box; }
//         .kolo-dashboard {
//           width: 100%;
//           color: ${C.ink};
//           font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
//           background: #F8FAF9;
//           min-height: 100vh;
//         }
//         .layout {
//           display: grid;
//           grid-template-columns: minmax(0, 1fr) 360px;
//           gap: 24px;
//           margin-top: 24px;
//         }
//         .main, .side { min-width: 0; display: flex; flex-direction: column; gap: 24px; }
//         .side { align-self: start; }
//         .card {
//           border: 1px solid ${C.border};
//           border-radius: 20px;
//           background: #fff;
//           box-shadow: ${C.shadow};
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//         }
//         .card:hover {
//           box-shadow: ${C.shadowHover};
//         }
//         @media(max-width:1100px) {
//           .layout { grid-template-columns: 1fr; }
//           .side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
//         }
//         @media(max-width:700px) {
//           .side { display:flex; }
//           .layout { gap:20px; }
//         }
//       `}</style>
//     </div>
//   );
// }

// function Loading() {
//   return (
//     <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", color: C.muted, fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
//       <div style={{ textAlign: "center" }}>
//         <div style={{ margin: "0 auto 16px", width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 16, background: C.gradient, color: "#fff", fontWeight: 800, fontSize: 18, boxShadow: "0 12px 32px rgba(11,28,48,.2)" }}>
//           <span className="pulse">K</span>
//         </div>
//         <span style={{ fontSize: 14, fontWeight: 500 }}>Preparing your Kolo dashboard...</span>
//         <div style={{ marginTop: 16, width: 120, height: 3, background: "#E4EBE6", borderRadius: 99, overflow: "hidden" }}>
//           <div style={{ width: "40%", height: "100%", background: C.green, borderRadius: 99, animation: "loading 1.5s infinite" }} />
//         </div>
//         <style jsx>{`
//           @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
//           .pulse { animation: pulse 2s infinite; }
//           @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
//         `}</style>
//       </div>
//     </div>
//   );
// }

// function NotLoaded() {
//   return (
//     <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
//       <div>
//         <h2 style={{ color: C.ink, marginBottom: 8, fontSize: 24 }}>We couldn't load your dashboard.</h2>
//         <p style={{ color: C.text, fontSize: 14, marginBottom: 20 }}>Please sign in again and try once more.</p>
//         <Link href="/login" style={{ color: "#fff", background: C.green, padding: "12px 24px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 18px rgba(8,122,62,.2)" }}>Back to sign in</Link>
//       </div>
//     </div>
//   );
// }

// function Header({ name, groups }: { name: string; groups: number }) {
//   const first = name.split(" ")[0] || "there";
//   const hour = new Date().getHours();
//   const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

//   return (
//     <header className="head">
//       <div className="head-left">
//         <div className="kicker">
//           <span className="dot" />
//           KOLO INTELLIGENCE
//         </div>
//         <div className="greeting-row">
//           <span className="greeting">{greeting},</span>
//           <h1>{first} <span className="wave">👋</span></h1>
//         </div>
//         <p>Here's a clear view of your savings activity and communities.</p>
//       </div>

//       <div className="actions">
//         <Link href="/groups" className="btn btn-ghost">
//           <span className="btn-icon">◎</span>
//           <span className="btn-copy">
//             <b>{groups ? "My groups" : "Find a group"}</b>
//             <small>{groups ? `${groups} active` : "Browse communities"}</small>
//           </span>
//         </Link>
//         <Link href="/groups/create" className="btn btn-solid">
//           <span className="btn-icon btn-icon--solid">+</span>
//           <span className="btn-copy">
//             <b>Create group</b>
//             <small>Start a new cycle</small>
//           </span>
//         </Link>
//       </div>

//       <style jsx>{`
//         .head { 
//           display:flex; 
//           align-items:center; 
//           justify-content:space-between; 
//           gap:24px; 
//           margin-bottom:32px;
//           padding: 28px 32px;
//           background: #fff;
//           border-radius: 24px;
//           border: 1px solid ${C.border};
//           box-shadow: ${C.shadow};
//         }
//         .head-left { flex: 1; }
//         .kicker { 
//           display:flex; 
//           align-items:center; 
//           gap:8px; 
//           color:${C.green}; 
//           font-size:10px; 
//           font-weight:850; 
//           letter-spacing:.14em; 
//           margin-bottom: 12px;
//         }
//         .dot { 
//           width:8px; 
//           height:8px; 
//           border-radius:50%; 
//           background:${C.green};
//           box-shadow: 0 0 0 4px ${C.soft};
//         }
//         .greeting-row {
//           display: flex;
//           align-items: baseline;
//           gap: 8px;
//           margin-bottom: 8px;
//         }
//         .greeting {
//           color: ${C.text};
//           font-size: 18px;
//           font-weight: 500;
//         }
//         h1 { 
//           margin:0; 
//           color:${C.ink}; 
//           font-size:clamp(24px,2.5vw,30px); 
//           line-height:1.15; 
//           letter-spacing:-.04em; 
//           font-weight:780; 
//         }
//         .wave {
//           display: inline-block;
//           font-size: 22px;
//           animation: wave 2s infinite;
//         }
//         @keyframes wave {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(20deg); }
//           75% { transform: rotate(-10deg); }
//         }
//         p { 
//           margin:0; 
//           color:${C.text}; 
//           font-size:13px; 
//           line-height: 1.6;
//         }

//         .actions {
//           display: flex;
//           gap: 10px;
//           align-items: stretch;
//           flex-shrink: 0;
//         }
//         .btn {
//           position: relative;
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           padding: 8px 18px 8px 8px;
//           border-radius: 16px;
//           text-decoration: none;
//           overflow: hidden;
//           transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
//         }
//         .btn-icon {
//           width: 38px;
//           height: 38px;
//           flex-shrink: 0;
//           display: grid;
//           place-items: center;
//           border-radius: 11px;
//           font-size: 15px;
//           font-weight: 700;
//           transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
//         }
//         .btn-copy {
//           display: flex;
//           flex-direction: column;
//           gap: 2px;
//           text-align: left;
//           white-space: nowrap;
//         }
//         .btn-copy b {
//           font-size: 12px;
//           font-weight: 750;
//           line-height: 1.2;
//         }
//         .btn-copy small {
//           font-size: 9px;
//           font-weight: 550;
//           line-height: 1.2;
//         }
//         .btn:hover .btn-icon {
//           transform: scale(1.08);
//         }

//         .btn-ghost {
//           background: #fff;
//           border: 1.5px solid ${C.border};
//         }
//         .btn-ghost .btn-icon {
//           color: ${C.green};
//           background: ${C.soft};
//         }
//         .btn-ghost .btn-copy b { color: ${C.ink}; }
//         .btn-ghost .btn-copy small { color: ${C.muted}; }
//         .btn-ghost:hover {
//           border-color: ${C.green};
//           box-shadow: 0 6px 16px rgba(8,122,62,.12);
//           transform: translateY(-1px);
//         }

//         .btn-solid {
//           background: linear-gradient(135deg, ${C.green}, ${C.greenDeep});
//           box-shadow: 0 6px 16px rgba(8,122,62,.28);
//         }
//         .btn-icon--solid {
//           color: ${C.green};
//           background: #fff;
//           font-size: 18px;
//         }
//         .btn-solid .btn-copy b { color: #fff; }
//         .btn-solid .btn-copy small { color: rgba(255,255,255,.72); }
//         .btn-solid:hover {
//           box-shadow: 0 10px 24px rgba(8,122,62,.36);
//           transform: translateY(-1px);
//         }
//         .btn-solid::after {
//           content: "";
//           position: absolute;
//           inset: 0;
//           background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.16) 45%, transparent 60%);
//           transform: translateX(-100%);
//           transition: transform 0.6s ease;
//         }
//         .btn-solid:hover::after {
//           transform: translateX(100%);
//         }

//         @media(max-width:700px) { 
//           .head { 
//             align-items:flex-start; 
//             flex-direction:column; 
//             padding: 20px;
//             border-radius: 20px;
//           } 
//           .actions { width:100%; }
//           .btn { flex: 1; padding: 8px 14px 8px 8px; }
//           .btn-copy small { display: none; }
//         }
//       `}</style>
//     </header>
//   );
// }

// function Kpis({ data }: { data: DashboardData }) {
//   const items = [
//     {
//       label: "Total saved",
//       value: formatNaira(data.totalSavings),
//       note: "Completed contributions",
//       icon: "₦",
//       tone: "green",
//       trend: "+12.5%"
//     },
//     {
//       label: "This month",
//       value: formatNaira(data.monthlyContributions),
//       note: data.monthlyContributions ? "Contribution activity" : "No activity yet",
//       icon: "↗",
//       tone: "blue",
//       trend: "+8.2%"
//     },
//     {
//       label: "My groups",
//       value: String(data.groupCount),
//       note: data.groupCount === 1 ? "Active community" : "Active communities",
//       icon: "◎",
//       tone: "purple",
//       trend: `${data.memberCount} members`
//     },
//     {
//       label: "Savings momentum",
//       value: `${data.healthScore}/100`,
//       note: data.healthScore >= 80 ? "Strong consistency" : data.healthScore >= 50 ? "Building consistency" : "Start your rhythm",
//       icon: "✓",
//       tone: "green",
//       trend: `${data.healthScore}%`
//     },
//   ];

//   return (
//     <section className="kpis">
//       {items.map((item) => (
//         <div className="kpi" key={item.label}>
//           <div className="kpi-top">
//             <span className="label">{item.label}</span>
//             <b className={`icon ${item.tone}`}>{item.icon}</b>
//           </div>
//           <strong className="value">{item.value}</strong>
//           <small className="note">{item.note}</small>
//           {item.label === "Savings momentum" ? (
//             <div className="track">
//               <i style={{ width: `${Math.min(data.healthScore, 100)}%` }} />
//             </div>
//           ) : (
//             <div className="trend">
//               <span>{item.trend}</span>
//             </div>
//           )}
//         </div>
//       ))}
//       <style jsx>{`
//         .kpis { 
//           display:grid; 
//           grid-template-columns:repeat(4,minmax(0,1fr)); 
//           gap:16px; 
//           margin-bottom: 24px;
//         }
//         .kpi { 
//           padding:22px; 
//           border:1px solid ${C.border}; 
//           border-radius:18px; 
//           background:#fff; 
//           box-shadow: ${C.shadow};
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           position: relative;
//           overflow: hidden;
//         }
//         .kpi::before {
//           content: '';
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           height: 3px;
//           background: ${C.gradient};
//           opacity: 0;
//           transition: opacity 0.3s;
//         }
//         .kpi:hover {
//           box-shadow: ${C.shadowHover};
//           transform: translateY(-2px);
//         }
//         .kpi:hover::before {
//           opacity: 1;
//         }
//         .kpi-top { 
//           display:flex; 
//           align-items:center; 
//           justify-content:space-between; 
//           gap:12px; 
//           margin-bottom: 16px;
//         }
//         .label { 
//           color:${C.text}; 
//           font-size:10px; 
//           font-weight:650;
//           text-transform: uppercase;
//           letter-spacing: 0.05em;
//         }
//         .icon { 
//           width:36px; 
//           height:36px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:10px; 
//           font-size:14px;
//           font-weight: 700;
//           transition: transform 0.2s;
//         }
//         .kpi:hover .icon {
//           transform: scale(1.1);
//         }
//         .green { 
//           color:${C.green}; 
//           background:${C.soft}; 
//         }
//         .blue { 
//           color:#415B7A; 
//           background:#F1F5FA; 
//         }
//         .purple { 
//           color:#62527A; 
//           background:#F4F1F8; 
//         }
//         .value { 
//           display:block; 
//           color:${C.ink}; 
//           font-size:28px; 
//           line-height:1; 
//           letter-spacing:-.04em; 
//           font-weight: 780;
//           margin-bottom: 8px;
//         }
//         .note { 
//           display:block; 
//           color:${C.muted}; 
//           font-size:9px;
//           margin-bottom: 12px;
//         }
//         .track { 
//           height:5px; 
//           overflow:hidden; 
//           border-radius:99px; 
//           background:#EDF1EE; 
//         }
//         .track i { 
//           display:block; 
//           height:100%; 
//           border-radius:99px; 
//           background: linear-gradient(90deg, ${C.green}, #0A9A4F);
//           transition: width 1s ease;
//         }
//         .trend {
//           display: flex;
//           align-items: center;
//           gap: 6px;
//           color: ${C.green};
//           font-size: 9px;
//           font-weight: 650;
//         }
//         @media(max-width:900px) { 
//           .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } 
//         }
//         @media(max-width:500px) { 
//           .kpis { grid-template-columns:1fr; } 
//         }
//       `}</style>
//     </section>
//   );
// }

// function ContributionChart({ data }: { data: DashboardData }) {
//   const max = Math.max(...data.monthlyData.map(x => x.amount), 1);
//   const total = data.monthlyData.reduce((s,x) => s+x.amount, 0);

//   return (
//     <section className="card chart-card">
//       <div className="chart-head">
//         <div>
//           <span className="eyebrow">SAVINGS ACTIVITY</span>
//           <h2>Your contribution rhythm</h2>
//           <p>Recorded contributions over the last six months.</p>
//         </div>
//         <div className="period">
//           <small>6-month total</small>
//           <strong>{formatNaira(total)}</strong>
//         </div>
//       </div>

//       <div className="chart">
//         <div className="yaxis">
//           <span>{formatCompact(max)}</span>
//           <span>{formatCompact(max/2)}</span>
//           <span>₦0</span>
//         </div>
//         <div className="plot">
//           <div className="gridlines"><i/><i/><i/></div>
//           <div className="bars">
//             {data.monthlyData.map((m,i) => {
//               const h = m.amount ? Math.max(m.amount/max*100,8) : 3;
//               const current = i === data.monthlyData.length-1;
//               return (
//                 <div className="column" key={m.month}>
//                   <div className="bar-space">
//                     {m.amount > 0 && (
//                       <span className={`value ${current ? "current":""}`}>
//                         {formatCompact(m.amount)}
//                       </span>
//                     )}
//                     <i 
//                       className={`bar ${current ? "current":""}`} 
//                       style={{height:`${h}%`}} 
//                       title={`${m.month}: ${formatNaira(m.amount)}`} 
//                     />
//                   </div>
//                   <small className={current ? "current":""}>{m.month}</small>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>

//       <div className="chart-foot">
//         <span><i/> Completed contributions</span>
//         <span>Total saved to date: <b>{formatNaira(data.totalSavings)}</b></span>
//       </div>

//       <style jsx>{`
//         .chart-card { 
//           padding:28px; 
//           transition: all 0.3s;
//         }
//         .chart-head { 
//           display:flex; 
//           justify-content:space-between; 
//           gap:24px; 
//           margin-bottom:32px; 
//         }
//         .eyebrow { 
//           color:${C.green}; 
//           font-size:9px; 
//           font-weight:850; 
//           letter-spacing:.12em; 
//           display: block;
//           margin-bottom: 8px;
//         }
//         h2 { 
//           margin:0 0 6px; 
//           color:${C.ink}; 
//           font-size:20px; 
//           letter-spacing:-.025em; 
//           font-weight: 750;
//         }
//         .chart-head p { 
//           color:${C.muted}; 
//           font-size:11px; 
//           margin: 0;
//         }
//         .period { 
//           text-align:right; 
//           min-width:120px;
//           background: ${C.soft};
//           padding: 12px 16px;
//           border-radius: 12px;
//         }
//         .period small { 
//           display:block; 
//           color:${C.muted}; 
//           font-size:9px; 
//           margin-bottom: 6px;
//         }
//         .period strong { 
//           display:block; 
//           color:${C.green}; 
//           font-size:20px; 
//           font-weight: 750;
//         }
//         .chart { 
//           height:280px; 
//           display:flex; 
//           gap:16px; 
//         }
//         .yaxis { 
//           width:60px; 
//           display:flex; 
//           flex-direction:column; 
//           justify-content:space-between; 
//           padding-bottom:32px; 
//           text-align:right; 
//           color:#9AA4AE; 
//           font-size:9px;
//           font-weight: 600;
//         }
//         .plot { 
//           position:relative; 
//           flex:1; 
//           min-width:0; 
//         }
//         .gridlines { 
//           position:absolute; 
//           inset:0 0 32px; 
//           display:flex; 
//           flex-direction:column; 
//           justify-content:space-between; 
//         }
//         .gridlines i { 
//           border-top:1px dashed #E7ECE9; 
//         }
//         .bars { 
//           position:absolute; 
//           inset:0; 
//           display:flex; 
//           gap:16px; 
//           padding:0 8px; 
//         }
//         .column { 
//           flex:1; 
//           min-width:0; 
//           display:flex; 
//           flex-direction:column; 
//           align-items:center; 
//         }
//         .bar-space { 
//           position:relative; 
//           width:100%; 
//           height:calc(100% - 32px); 
//           display:flex; 
//           justify-content:center; 
//           align-items:flex-end; 
//         }
//         .bar { 
//           width:min(48px,72%); 
//           min-height:4px; 
//           border-radius:8px 8px 4px 4px; 
//           background: linear-gradient(180deg, #BFD8C8, #A8CDB4);
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           cursor: pointer;
//           position: relative;
//         }
//         .bar.current { 
//           background: linear-gradient(180deg, #0A9A4F, ${C.green});
//           box-shadow: 0 4px 12px rgba(8,122,62,.3);
//         }
//         .bar:hover { 
//           transform:translateY(-4px);
//           box-shadow: 0 8px 20px rgba(8,122,62,.2);
//         }
//         .value { 
//           position:absolute; 
//           bottom:calc(100% + 8px); 
//           color:${C.text}; 
//           font-size:8px; 
//           font-weight:750; 
//           white-space:nowrap;
//           opacity: 0;
//           transition: opacity 0.2s;
//           pointer-events: none;
//         }
//         .column:hover .value {
//           opacity: 1;
//         }
//         .value.current { 
//           color:${C.green};
//           opacity: 1;
//         }
//         .column > small { 
//           margin-top:12px; 
//           color:#929CA7; 
//           font-size:9px; 
//           font-weight:650;
//           transition: color 0.2s;
//         }
//         .column > small.current { 
//           color:${C.green}; 
//           font-weight:800; 
//         }
//         .chart-foot { 
//           display:flex; 
//           justify-content:space-between; 
//           gap:16px; 
//           padding-top:20px; 
//           margin-top:24px; 
//           border-top:1px solid #EEF2EF; 
//           color:${C.muted}; 
//           font-size:10px;
//         }
//         .chart-foot > span:first-child { 
//           display:flex; 
//           align-items:center; 
//           gap:8px; 
//         }
//         .chart-foot i { 
//           width:8px; 
//           height:8px; 
//           border-radius:50%; 
//           background:${C.green};
//           box-shadow: 0 0 0 3px ${C.soft};
//         }
//         .chart-foot b { 
//           color:${C.ink}; 
//           font-weight: 700;
//         }
//         @media(max-width:600px) { 
//           .chart-card { padding:20px; } 
//           .chart-head { flex-direction:column; gap:16px; } 
//           .period { text-align:left; } 
//           .chart { height:220px; } 
//           .bars { gap:8px; } 
//           .chart-foot { flex-direction:column; gap:8px; } 
//         }
//       `}</style>
//     </section>
//   );
// }

// /**
//  * Unified insights card — replaces the previous two-card split
//  * (dark "Kolo Intelligence" panel + separate "Savings Focus" panel).
//  * One card: the read (what Kolo sees) up top, the numbers that back
//  * it up below, so the sidebar doesn't repeat itself.
//  */
// function InsightsCard({ data }: { data: DashboardData }) {
//   const pending = data.contributions.filter(c => c.status !== "completed").length;
//   const completed = data.contributions.filter(c => c.status === "completed").length;
//   const progress = Math.min(data.healthScore, 100);

//   const insight = useMemo(() => {
//     if (!data.contributions.length) return ["Start with a clear savings goal.", "Join or create a savings community and begin recording contributions so Kolo can track your progress."];
//     if (pending) return [`${pending} contribution${pending > 1 ? "s are" : " is"} still pending.`, "Review your activity and confirm outstanding records with the relevant savings group."];
//     if (data.groupCount) return ["Your savings activity is building.", `${completed} completed contribution${completed === 1 ? "" : "s"} across ${data.groupCount} active group${data.groupCount === 1 ? "" : "s"}.`];
//     return ["Keep your savings rhythm consistent.", `You have recorded ${completed} completed contribution${completed === 1 ? "" : "s"}.`];
//   }, [data.contributions.length, data.groupCount, pending, completed]);

//   return (
//     <section className="insights">
//       <div className="top">
//         <div className="mark">✦</div>
//         <div className="top-copy">
//           <small>KOLO INTELLIGENCE</small>
//           <strong>What Kolo sees</strong>
//         </div>
//         <i className="status" aria-hidden="true">●</i>
//       </div>

//       <div className="signal">
//         <span className="label">CURRENT SIGNAL</span>
//         <h3>{insight[0]}</h3>
//         <p>{insight[1]}</p>
//       </div>

//       <div className="totals">
//         <div className="totals-copy">
//           <small>Total saved</small>
//           <strong>{formatNaira(data.totalSavings)}</strong>
//           <span>{formatNaira(data.monthlyContributions)} recorded this month</span>
//         </div>
//         <div className="ring" style={{ '--progress': `${progress * 3.6}deg` } as any}>
//           <div className="ring-hole">
//             <b>{progress}%</b>
//             <small>on track</small>
//           </div>
//         </div>
//       </div>

//       <div className="metrics">
//         <div>
//           <small>This month</small>
//           <b>{formatNaira(data.monthlyContributions)}</b>
//         </div>
//         <div>
//           <small>Active groups</small>
//           <b>{data.groupCount}</b>
//         </div>
//       </div>

//       <Link href="/groups" className="cta">
//         Explore your activity <span>→</span>
//       </Link>

//       <style jsx>{`
//         .insights { 
//           position:relative; 
//           overflow:hidden; 
//           padding:28px; 
//           border-radius:20px; 
//           background: ${C.gradient};
//           color:#fff; 
//           box-shadow: 0 16px 40px rgba(11,28,48,.2);
//         }
//         .insights::before {
//           content: '';
//           position: absolute;
//           top: -50%;
//           right: -50%;
//           width: 200%;
//           height: 200%;
//           background: radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 50%);
//           pointer-events: none;
//         }
//         .top { 
//           display:flex; 
//           align-items:center; 
//           gap:12px; 
//           position: relative;
//           z-index: 1;
//         }
//         .mark { 
//           width:44px; 
//           height:44px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:14px; 
//           background: ${C.green};
//           font-size:20px;
//           box-shadow: 0 8px 20px rgba(8,122,62,.4);
//           flex-shrink: 0;
//         }
//         .top-copy { 
//           display:flex; 
//           flex-direction:column; 
//           gap:4px; 
//         }
//         .top-copy small { 
//           color:#8DE0A8; 
//           font-size:8px; 
//           font-weight:850; 
//           letter-spacing:.12em; 
//         }
//         .top-copy strong { 
//           color:#fff; 
//           font-size:14px; 
//         }
//         .status { 
//           margin-left:auto; 
//           color:#8DE0A8; 
//           font-size:10px;
//           animation: blink 2s infinite;
//         }
//         @keyframes blink {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.3; }
//         }
//         .signal {
//           position: relative;
//           z-index: 1;
//         }
//         .label { 
//           display:block; 
//           margin-top:28px; 
//           color:#7D8B99; 
//           font-size:8px; 
//           font-weight:850; 
//           letter-spacing:.12em; 
//         }
//         h3 { 
//           margin:12px 0; 
//           color:#fff; 
//           font-size:20px; 
//           line-height:1.25; 
//           letter-spacing:-.03em; 
//           font-weight: 700;
//         }
//         .signal p { 
//           margin:0; 
//           color:#C5D0D9; 
//           font-size:11px; 
//           line-height:1.7; 
//         }

//         .totals {
//           position: relative;
//           z-index: 1;
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           gap: 16px;
//           margin-top: 26px;
//           padding-top: 22px;
//           border-top: 1px solid rgba(255,255,255,.12);
//         }
//         .totals-copy {
//           display: flex;
//           flex-direction: column;
//           gap: 4px;
//           min-width: 0;
//         }
//         .totals-copy small {
//           color: #8D9AA6;
//           font-size: 8px;
//           font-weight: 750;
//           letter-spacing: .06em;
//           text-transform: uppercase;
//         }
//         .totals-copy strong {
//           color: #fff;
//           font-size: 22px;
//           font-weight: 780;
//           letter-spacing: -.03em;
//         }
//         .totals-copy span {
//           color: #9FB0BC;
//           font-size: 9px;
//         }
//         .ring {
//           --progress: 0deg;
//           width: 74px;
//           height: 74px;
//           flex-shrink: 0;
//           border-radius: 50%;
//           background: conic-gradient(#4ADE80 var(--progress), rgba(255,255,255,.14) var(--progress));
//           display: grid;
//           place-items: center;
//         }
//         .ring-hole {
//           width: 58px;
//           height: 58px;
//           border-radius: 50%;
//           background: #12263D;
//           display: grid;
//           place-items: center;
//           text-align: center;
//         }
//         .ring-hole b {
//           color: #fff;
//           font-size: 13px;
//           font-weight: 750;
//           line-height: 1.2;
//         }
//         .ring-hole small {
//           color: #8D9AA6;
//           font-size: 7px;
//         }

//         .metrics { 
//           display:grid; 
//           grid-template-columns:1fr 1fr; 
//           gap:12px; 
//           margin-top:16px; 
//           position: relative;
//           z-index: 1;
//         }
//         .metrics div { 
//           padding:16px; 
//           border:1px solid rgba(255,255,255,.12); 
//           border-radius:12px; 
//           background:rgba(255,255,255,.06);
//           backdrop-filter: blur(10px);
//           transition: all 0.3s;
//         }
//         .metrics div:hover {
//           background:rgba(255,255,255,.1);
//           border-color: rgba(255,255,255,.2);
//         }
//         .metrics small,.metrics b { 
//           display:block; 
//         }
//         .metrics small { 
//           color:#8D9AA6; 
//           font-size:8px; 
//           margin-bottom: 8px;
//         }
//         .metrics b { 
//           color:#fff; 
//           font-size:14px; 
//           font-weight: 650;
//         }
//         .cta { 
//           display:flex; 
//           justify-content:space-between; 
//           margin-top:20px; 
//           padding-top:16px; 
//           border-top:1px solid rgba(255,255,255,.12); 
//           color:#fff; 
//           font-size:10px; 
//           font-weight:750; 
//           text-decoration:none;
//           transition: all 0.3s;
//           position: relative;
//           z-index: 1;
//         }
//         .cta:hover {
//           color: #8DE0A8;
//         }
//         .cta span { 
//           color:#8DE0A8; 
//           font-size:16px;
//           transition: transform 0.3s;
//         }
//         .cta:hover span {
//           transform: translateX(4px);
//         }

//         @media(max-width:1100px) and (min-width:701px) {
//           .totals { flex-direction: column; align-items: flex-start; }
//           .ring { align-self: center; }
//         }
//       `}</style>
//     </section>
//   );
// }

// function QuickActions({ hasGroups }: { hasGroups: boolean }) {
//   return (
//     <section className="card quick">
//       <h3>Quick actions</h3>
//       <div className="actions-grid">
//         <Link href="/groups" className="action-item">
//           <i>◎</i>
//           <span>
//             <b>{hasGroups ? "View groups" : "Discover"}</b>
//             <small>Manage communities</small>
//           </span>
//           <strong>→</strong>
//         </Link>
//         <Link href="/groups/create" className="action-item">
//           <i>+</i>
//           <span>
//             <b>Create group</b>
//             <small>Start savings cycle</small>
//           </span>
//           <strong>→</strong>
//         </Link>
//         <Link href="/payments" className="action-item">
//           <i>₦</i>
//           <span>
//             <b>Contribute</b>
//             <small>Add to savings</small>
//           </span>
//           <strong>→</strong>
//         </Link>
//       </div>
//       <style jsx>{`
//         .quick { 
//           padding:24px; 
//         }
//         h3 { 
//           margin:0 0 16px; 
//           color:${C.ink}; 
//           font-size:13px; 
//           font-weight: 700;
//         }
//         .actions-grid {
//           display: flex;
//           flex-direction: column;
//           gap: 8px;
//         }
//         .action-item { 
//           display:flex; 
//           align-items:center; 
//           gap:12px; 
//           padding:12px; 
//           border-radius:12px;
//           text-decoration:none;
//           transition: all 0.2s;
//           background: #FAFCFB;
//           border: 1px solid #EEF2EF;
//         }
//         .action-item:hover {
//           background: ${C.soft};
//           border-color: ${C.green};
//           transform: translateX(4px);
//         }
//         .action-item i { 
//           width:32px; 
//           height:32px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:8px; 
//           color:${C.green}; 
//           background:#fff; 
//           font-style:normal;
//           font-size: 14px;
//           border: 1px solid #E4EBE6;
//         }
//         .action-item span { 
//           flex:1; 
//           display:flex; 
//           flex-direction:column; 
//           gap:2px; 
//         }
//         .action-item b { 
//           color:${C.ink}; 
//           font-size:10px; 
//           font-weight: 650;
//         }
//         .action-item small { 
//           color:${C.muted}; 
//           font-size:8px; 
//         }
//         .action-item > strong { 
//           color:${C.green}; 
//           font-size:14px;
//           transition: transform 0.2s;
//         }
//         .action-item:hover > strong {
//           transform: translateX(4px);
//         }
//       `}</style>
//     </section>
//   );
// }

// function Groups({ groups }: { groups: Group[] }) {
//   return (
//     <section className="card groups-card">
//       <div className="section-head">
//         <div>
//           <span>COMMUNITIES</span>
//           <h2>Your savings groups</h2>
//           <p>The communities you currently belong to.</p>
//         </div>
//         <Link href="/groups" className="view-all">
//           View all <em>→</em>
//         </Link>
//       </div>

//       {!groups.length ? (
//         <div className="empty">
//           <i>◎</i>
//           <div>
//             <b>You're not in a savings group yet.</b>
//             <p>Join a community or create your own savings group.</p>
//           </div>
//           <Link href="/groups/create">Create a group →</Link>
//         </div>
//       ) : (
//         <div className="group-grid">
//           {groups.slice(0,4).map((g, idx) => {
//             const accent = GROUP_ACCENTS[idx % GROUP_ACCENTS.length];
//             const capacity = Number(g.max_members || 0);
//             const filled = Number(g.member_count || 0);
//             const fillPct = capacity ? Math.min(100, Math.round((filled / capacity) * 100)) : 0;
//             return (
//               <Link
//                 key={g.id}
//                 href={`/groups/${g.id}`}
//                 className="group-card"
//                 style={{ '--accent-fg': accent.fg, '--accent-bg': accent.bg, '--accent-ring': accent.ring } as any}
//               >
//                 <div className="group-top">
//                   <i className="avatar">{initials(g.name || "Group")}</i>
//                   <span className="status">Active</span>
//                 </div>

//                 <b className="group-name">{g.name || "Savings group"}</b>

//                 <div className="group-pool">
//                   <small>Group pool</small>
//                   <strong>{formatNaira(Number(g.pool_amount || 0))}</strong>
//                 </div>

//                 <div className="group-capacity">
//                   <div className="capacity-row">
//                     <span>{filled}/{capacity || "—"} members</span>
//                     {capacity > 0 && <span>{fillPct}%</span>}
//                   </div>
//                   {capacity > 0 && (
//                     <div className="capacity-track">
//                       <i style={{ width: `${fillPct}%` }} />
//                     </div>
//                   )}
//                 </div>

//                 <div className="group-footer">
//                   <span>View details</span>
//                   <em>→</em>
//                 </div>
//               </Link>
//             );
//           })}
//         </div>
//       )}

//       <style jsx>{`
//         .groups-card { 
//           padding:28px; 
//         }
//         .section-head { 
//           display:flex; 
//           justify-content:space-between; 
//           align-items: flex-end;
//           gap:16px; 
//           margin-bottom:24px; 
//         }
//         .section-head span { 
//           color:${C.green}; 
//           font-size:8px; 
//           font-weight:850; 
//           letter-spacing:.12em; 
//           display: block;
//           margin-bottom: 6px;
//         }
//         h2 { 
//           margin:0 0 6px; 
//           color:${C.ink}; 
//           font-size:20px; 
//           font-weight: 750;
//         }
//         .section-head p { 
//           color:${C.muted}; 
//           font-size:10px; 
//           margin: 0;
//         }
//         .view-all {
//           display: flex;
//           align-items: center;
//           gap: 6px;
//           padding: 9px 14px;
//           border-radius: 10px;
//           border: 1px solid ${C.border};
//           color:${C.ink}; 
//           font-size:10px; 
//           font-weight:700; 
//           text-decoration:none; 
//           white-space:nowrap;
//           transition: all 0.2s;
//         }
//         .view-all em {
//           font-style: normal;
//           color: ${C.green};
//           transition: transform 0.2s;
//         }
//         .view-all:hover {
//           border-color: ${C.green};
//           background: ${C.soft};
//           color: ${C.green};
//         }
//         .view-all:hover em {
//           transform: translateX(3px);
//         }
//         .group-grid {
//           display: grid;
//           grid-template-columns: repeat(2, 1fr);
//           gap: 16px;
//         }
//         .group-card {
//           --accent-fg: ${C.green};
//           --accent-bg: ${C.soft};
//           --accent-ring: rgba(8,122,62,.18);
//           display: flex;
//           flex-direction: column;
//           padding: 20px;
//           border: 1px solid #EEF2EF;
//           border-radius: 16px;
//           text-decoration: none;
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           background: #FAFCFB;
//           position: relative;
//           overflow: hidden;
//         }
//         .group-card::before {
//           content: '';
//           position: absolute;
//           top: 0; left: 0; right: 0;
//           height: 3px;
//           background: var(--accent-fg);
//           opacity: 0;
//           transition: opacity 0.25s;
//         }
//         .group-card:hover {
//           border-color: var(--accent-ring);
//           background: #fff;
//           box-shadow: 0 10px 28px -6px var(--accent-ring);
//           transform: translateY(-3px);
//         }
//         .group-card:hover::before {
//           opacity: 1;
//         }
//         .group-top {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 14px;
//         }
//         .avatar { 
//           width:40px; 
//           height:40px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:12px; 
//           color: var(--accent-fg); 
//           background: var(--accent-bg); 
//           font-style:normal; 
//           font-size:10px; 
//           font-weight:850;
//         }
//         .status { 
//           color: var(--accent-fg); 
//           font-size:8px; 
//           font-weight:700;
//           background: var(--accent-bg);
//           padding: 4px 9px;
//           border-radius: 99px;
//         }
//         .group-name {
//           display: block;
//           color: ${C.ink};
//           font-size: 13px;
//           font-weight: 700;
//           margin-bottom: 14px;
//         }
//         .group-pool {
//           padding: 12px;
//           background: #fff;
//           border-radius: 10px;
//           border: 1px solid #EEF2EF;
//           margin-bottom: 12px;
//         }
//         .group-pool small {
//           display: block;
//           color: ${C.muted};
//           font-size: 8px;
//           margin-bottom: 4px;
//         }
//         .group-pool strong {
//           color: ${C.ink};
//           font-size: 14px;
//           font-weight: 700;
//         }
//         .group-capacity {
//           margin-bottom: 4px;
//         }
//         .capacity-row {
//           display: flex;
//           justify-content: space-between;
//           color: ${C.muted};
//           font-size: 8px;
//           font-weight: 650;
//           margin-bottom: 6px;
//         }
//         .capacity-track {
//           height: 4px;
//           border-radius: 99px;
//           background: #EDF1EE;
//           overflow: hidden;
//         }
//         .capacity-track i {
//           display: block;
//           height: 100%;
//           border-radius: 99px;
//           background: var(--accent-fg);
//           transition: width 0.6s ease;
//         }
//         .group-footer {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-top: 14px;
//           padding-top: 12px;
//           border-top: 1px solid #EEF2EF;
//           color: var(--accent-fg);
//           font-size: 9px;
//           font-weight: 650;
//         }
//         .group-footer em { 
//           font-style: normal;
//           font-size: 14px;
//           transition: transform 0.2s;
//         }
//         .group-card:hover .group-footer em {
//           transform: translateX(4px);
//         }
//         .empty { 
//           display:flex; 
//           align-items:center; 
//           gap:16px; 
//           padding:24px; 
//           border:1.5px dashed #D9E4DC; 
//           border-radius:14px; 
//           background:#FAFCFB; 
//         }
//         .empty > i { 
//           width:44px; 
//           height:44px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:12px; 
//           color:${C.green}; 
//           background:${C.soft}; 
//           font-style:normal; 
//           font-size: 18px;
//         }
//         .empty > div { 
//           flex:1; 
//         }
//         .empty b { 
//           color:${C.ink}; 
//           font-size:11px; 
//         }
//         .empty p { 
//           margin:4px 0 0; 
//           color:${C.muted}; 
//           font-size:9px; 
//         }
//         .empty > a { 
//           color:${C.green}; 
//           font-size:9px; 
//           font-weight:750; 
//           text-decoration:none; 
//           white-space:nowrap;
//           transition: all 0.2s;
//         }
//         .empty > a:hover {
//           transform: translateX(4px);
//         }
//         @media(max-width:700px) {
//           .group-grid {
//             grid-template-columns: 1fr;
//           }
//         }
//         @media(max-width:500px) { 
//           .empty { 
//             flex-wrap:wrap; 
//             align-items:flex-start; 
//           } 
//           .empty > a { 
//             margin-left:60px; 
//           } 
//         }
//       `}</style>
//     </section>
//   );
// }

// function Transactions({ transactions }: { transactions: Transaction[] }) {
//   return (
//     <section className="card tx">
//       <div className="tx-head">
//         <div>
//           <span>ACTIVITY</span>
//           <h2>Recent contribution activity</h2>
//         </div>
//         <Link href="/payments">View all →</Link>
//       </div>
      
//       {!transactions.length ? (
//         <div className="tx-empty">
//           <i>◎</i>
//           <div>
//             <b>No activity recorded yet.</b>
//             <p>Your contribution activity will appear here.</p>
//           </div>
//         </div>
//       ) : (
//         <div>
//           {transactions.slice(0,6).map(t => (
//             <div className="tx-row" key={t.id}>
//               <i className="tx-icon">₦</i>
//               <span className="tx-info">
//                 <b>{t.type ? t.type.charAt(0).toUpperCase()+t.type.slice(1) : "Contribution"}</b>
//                 <small>{formatDate(t.created_at)}</small>
//               </span>
//               <code>{t.monnify_ref?.slice(0,15) || "Recorded activity"}</code>
//               <strong className="tx-amount">{formatNaira(Number(t.amount || 0))}</strong>
//               <em className={`tx-status ${t.status === "completed" ? "done" : "pending"}`}>
//                 {t.status === "completed" ? "✓ Recorded" : "⏳ Pending"}
//               </em>
//             </div>
//           ))}
//         </div>
//       )}
      
//       <style jsx>{`
//         .tx { 
//           overflow:hidden; 
//         }
//         .tx-head { 
//           display:flex; 
//           align-items:center; 
//           justify-content:space-between; 
//           padding:24px 28px 20px; 
//           border-bottom:1px solid #EEF2EF; 
//         }
//         .tx-head span { 
//           color:${C.green}; 
//           font-size:8px; 
//           font-weight:850; 
//           letter-spacing:.12em; 
//           display: block;
//           margin-bottom: 6px;
//         }
//         h2 { 
//           margin:0; 
//           color:${C.ink}; 
//           font-size:20px; 
//           font-weight: 750;
//         }
//         .tx-head a { 
//           color:${C.green}; 
//           font-size:10px; 
//           font-weight:750; 
//           text-decoration:none;
//           transition: all 0.2s;
//         }
//         .tx-head a:hover {
//           transform: translateX(4px);
//         }
//         .tx-row { 
//           display:grid; 
//           grid-template-columns:36px minmax(0,1fr) 130px 100px 80px; 
//           align-items:center; 
//           gap:12px; 
//           padding:16px 28px; 
//           border-bottom:1px solid #F0F3F1; 
//           transition: background 0.2s;
//         }
//         .tx-row:hover {
//           background: #FAFCFB;
//         }
//         .tx-row:last-child { 
//           border-bottom:0; 
//         }
//         .tx-icon { 
//           width:32px; 
//           height:32px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:9px; 
//           background:${C.soft}; 
//           color:${C.green}; 
//           font-style:normal; 
//           font-size:12px; 
//           font-weight:850;
//         }
//         .tx-info { 
//           display:flex; 
//           flex-direction:column; 
//           gap:4px; 
//           min-width:0; 
//         }
//         .tx-info b { 
//           overflow:hidden; 
//           color:${C.ink}; 
//           font-size:10px; 
//           text-overflow:ellipsis; 
//           white-space:nowrap; 
//           font-weight: 650;
//         }
//         .tx-info small, code { 
//           color:${C.muted}; 
//           font-size:8px; 
//         }
//         code { 
//           overflow:hidden; 
//           text-overflow:ellipsis; 
//           white-space:nowrap; 
//           font-family:inherit; 
//         }
//         .tx-amount { 
//           color:${C.ink}; 
//           font-size:11px; 
//           text-align:right; 
//           font-weight: 650;
//         }
//         .tx-status { 
//           justify-self:end; 
//           padding:6px 10px; 
//           border-radius:99px; 
//           font-style:normal; 
//           font-size:8px; 
//           font-weight:750;
//           white-space: nowrap;
//         }
//         .done { 
//           color:${C.green}; 
//           background:${C.soft}; 
//         }
//         .pending { 
//           color:#87651A; 
//           background:#FFF8E8; 
//         }
//         .tx-empty { 
//           display:flex; 
//           align-items:center; 
//           gap:16px; 
//           padding:40px 28px; 
//         }
//         .tx-empty > i { 
//           width:44px; 
//           height:44px; 
//           display:grid; 
//           place-items:center; 
//           border-radius:12px; 
//           background:${C.soft}; 
//           color:${C.green}; 
//           font-style:normal; 
//           font-size: 18px;
//         }
//         .tx-empty b { 
//           color:${C.ink}; 
//           font-size:11px; 
//         }
//         .tx-empty p { 
//           margin:4px 0 0; 
//           color:${C.muted}; 
//           font-size:9px; 
//         }
//         @media(max-width:700px) {
//           .tx-row { 
//             grid-template-columns:36px minmax(0,1fr) 80px; 
//             padding: 14px 20px;
//           }
//           .tx-head {
//             padding: 20px;
//           }
//           .tx-row code { 
//             display:none; 
//           }
//           .tx-status { 
//             grid-column:3; 
//             grid-row:1; 
//           }
//           .tx-amount { 
//             grid-column:2; 
//             text-align:left; 
//             grid-row:2; 
//           }
//           .tx-info { 
//             grid-row:1 / span 2; 
//           }
//         }
//       `}</style>
//     </section>
//   );
// }

// function formatNaira(n: number) {
//   return `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
// }

// function formatCompact(n: number) {
//   n = Number(n || 0);
//   if (n >= 1000000) return `₦${(n/1000000).toFixed(1).replace(".0","")}m`;
//   if (n >= 1000) return `₦${Math.round(n/1000)}k`;
//   return formatNaira(n);
// }

// function formatDate(value?: string) {
//   if (!value) return "Date unavailable";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "Date unavailable";
//   return d.toLocaleDateString("en-NG", { day:"2-digit", month:"short", year:"numeric" });
// }

// function initials(name: string) {
//   const p = name.trim().split(/\s+/).filter(Boolean);
//   return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : p[0].slice(0,2).toUpperCase();
// }


// // "use client";

// // import Link from "next/link";
// // import { useCallback, useEffect, useMemo, useState } from "react";
// // import { createClient } from "@/lib/supabase/client";

// // type Group = {
// //   id: string;
// //   name?: string;
// //   member_count?: number;
// //   max_members?: number;
// //   pool_amount?: number;
// //   [key: string]: any;
// // };

// // type Contribution = {
// //   amount?: number;
// //   status?: string;
// //   created_at?: string;
// //   groups?: { name?: string } | null;
// //   [key: string]: any;
// // };

// // type Transaction = {
// //   id: string;
// //   type?: string;
// //   status?: string;
// //   amount?: number;
// //   created_at?: string;
// //   monnify_ref?: string;
// //   [key: string]: any;
// // };

// // type DashboardData = {
// //   userName: string;
// //   totalSavings: number;
// //   monthlyContributions: number;
// //   groupCount: number;
// //   memberCount: number;
// //   healthScore: number;
// //   groups: Group[];
// //   contributions: Contribution[];
// //   transactions: Transaction[];
// //   monthlyData: { month: string; amount: number; count: number }[];
// // };

// // const C = {
// //   ink: "#0B1C30",
// //   green: "#087A3E",
// //   soft: "#EDF8F1",
// //   text: "#526171",
// //   muted: "#87929E",
// //   border: "#E4EBE6",
// //   gradient: "linear-gradient(135deg, #0B1C30 0%, #1a3a5c 100%)",
// //   shadow: "0 4px 24px rgba(15,35,25,.06)",
// //   shadowHover: "0 8px 32px rgba(15,35,25,.1)",
// // };

// // export default function DashboardPage() {
// //   const [data, setData] = useState<DashboardData | null>(null);
// //   const [loading, setLoading] = useState(true);
// //   const supabase = createClient();

// //   const fetchData = useCallback(async () => {
// //     setLoading(true);
// //     const { data: { user } } = await supabase.auth.getUser();

// //     if (!user) {
// //       setLoading(false);
// //       return;
// //     }

// //     const { data: profile } = await supabase
// //       .from("profiles").select("full_name").eq("id", user.id).maybeSingle();

// //     const { data: memberships } = await supabase
// //       .from("group_members").select("group_id, groups(*)").eq("user_id", user.id);

// //     const { data: contributions } = await supabase
// //       .from("contributions")
// //       .select("amount, status, created_at, transaction_ref, group_id, groups(name)")
// //       .eq("user_id", user.id)
// //       .order("created_at", { ascending: false });

// //     const { data: transactions } = await supabase
// //       .from("transactions").select("*").eq("user_id", user.id)
// //       .order("created_at", { ascending: false }).limit(10);

// //     const groups = (memberships?.map((m: any) => m.groups).filter(Boolean) || []) as Group[];
// //     const cs = (contributions || []) as Contribution[];
// //     const completed = cs.filter(c => c.status === "completed");
// //     const totalSavings = completed.reduce((s, c) => s + Number(c.amount || 0), 0);
// //     const memberCount = groups.reduce((s, g) => s + Number(g.member_count || 0), 0);

// //     const now = new Date();
// //     const monthlyData: DashboardData["monthlyData"] = [];

// //     for (let i = 5; i >= 0; i--) {
// //       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
// //       const items = completed.filter(c => {
// //         if (!c.created_at) return false;
// //         const x = new Date(c.created_at);
// //         return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
// //       });
// //       monthlyData.push({
// //         month: d.toLocaleDateString("en-US", { month: "short" }),
// //         amount: items.reduce((s, c) => s + Number(c.amount || 0), 0),
// //         count: items.length,
// //       });
// //     }

// //     const thisMonth = cs.filter(c => {
// //       if (!c.created_at) return false;
// //       const d = new Date(c.created_at);
// //       return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
// //     });

// //     const monthlyContributions = thisMonth.reduce((s, c) => s + Number(c.amount || 0), 0);
// //     const healthScore = cs.length ? Math.round((completed.length / cs.length) * 100) : 0;

// //     setData({
// //       userName: profile?.full_name || user.user_metadata?.full_name ||
// //         user.email?.split("@")[0] || "User",
// //       totalSavings,
// //       monthlyContributions,
// //       groupCount: groups.length,
// //       memberCount,
// //       healthScore,
// //       groups,
// //       contributions: cs,
// //       transactions: (transactions || []) as Transaction[],
// //       monthlyData,
// //     });
// //     setLoading(false);
// //   }, [supabase]);

// //   useEffect(() => { fetchData(); }, [fetchData]);
// //   useEffect(() => {
// //     window.addEventListener("focus", fetchData);
// //     return () => window.removeEventListener("focus", fetchData);
// //   }, [fetchData]);

// //   if (loading) return <Loading />;
// //   if (!data) return <NotLoaded />;

// //   return (
// //     <div className="kolo-dashboard">
// //       <Header name={data.userName} groups={data.groupCount} />
// //       <Kpis data={data} />

// //       <div className="layout">
// //         <div className="main">
// //           <ContributionChart data={data} />
// //           <Groups groups={data.groups} />
// //           <Transactions transactions={data.transactions} />
// //         </div>

// //         <aside className="side">
// //           <Intelligence data={data} />
// //           <SavingsFocus data={data} />
// //           <QuickActions hasGroups={data.groupCount > 0} />
// //         </aside>
// //       </div>

// //       <style jsx global>{`
// //         * { box-sizing: border-box; }
// //         .kolo-dashboard {
// //           width: 100%;
// //           color: ${C.ink};
// //           font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
// //           background: #F8FAF9;
// //           min-height: 100vh;
// //         }
// //         .layout {
// //           display: grid;
// //           grid-template-columns: minmax(0, 1fr) 360px;
// //           gap: 24px;
// //           margin-top: 24px;
// //         }
// //         .main, .side { min-width: 0; display: flex; flex-direction: column; gap: 24px; }
// //         .side { align-self: start; }
// //         .card {
// //           border: 1px solid ${C.border};
// //           border-radius: 20px;
// //           background: #fff;
// //           box-shadow: ${C.shadow};
// //           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
// //         }
// //         .card:hover {
// //           box-shadow: ${C.shadowHover};
// //         }
// //         @media(max-width:1100px) {
// //           .layout { grid-template-columns: 1fr; }
// //           .side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
// //         }
// //         @media(max-width:700px) {
// //           .side { display:flex; }
// //           .layout { gap:20px; }
// //         }
// //       `}</style>
// //     </div>
// //   );
// // }

// // function Loading() {
// //   return (
// //     <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", color: C.muted, fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
// //       <div style={{ textAlign: "center" }}>
// //         <div style={{ margin: "0 auto 16px", width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 16, background: C.gradient, color: "#fff", fontWeight: 800, fontSize: 18, boxShadow: "0 12px 32px rgba(11,28,48,.2)" }}>
// //           <span className="pulse">K</span>
// //         </div>
// //         <span style={{ fontSize: 14, fontWeight: 500 }}>Preparing your Kolo dashboard...</span>
// //         <div style={{ marginTop: 16, width: 120, height: 3, background: "#E4EBE6", borderRadius: 99, overflow: "hidden" }}>
// //           <div style={{ width: "40%", height: "100%", background: C.green, borderRadius: 99, animation: "loading 1.5s infinite" }} />
// //         </div>
// //         <style jsx>{`
// //           @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
// //           .pulse { animation: pulse 2s infinite; }
// //           @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
// //         `}</style>
// //       </div>
// //     </div>
// //   );
// // }

// // function NotLoaded() {
// //   return (
// //     <div style={{ minHeight: "55vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "Inter, sans-serif", background: "#F8FAF9" }}>
// //       <div>
// //         <h2 style={{ color: C.ink, marginBottom: 8, fontSize: 24 }}>We couldn't load your dashboard.</h2>
// //         <p style={{ color: C.text, fontSize: 14, marginBottom: 20 }}>Please sign in again and try once more.</p>
// //         <Link href="/login" style={{ color: "#fff", background: C.green, padding: "12px 24px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 18px rgba(8,122,62,.2)" }}>Back to sign in</Link>
// //       </div>
// //     </div>
// //   );
// // }

// // function Header({ name, groups }: { name: string; groups: number }) {
// //   const first = name.split(" ")[0] || "there";
// //   const hour = new Date().getHours();
// //   const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

// //   return (
// //     <header className="head">
// //       <div className="head-left">
// //         <div className="kicker">
// //           <span className="dot" />
// //           KOLO INTELLIGENCE
// //         </div>
// //         <div className="greeting-row">
// //           <span className="greeting">{greeting},</span>
// //           <h1>{first} <span className="wave">👋</span></h1>
// //         </div>
// //         <p>Here's a clear view of your savings activity and communities.</p>
// //       </div>
// //       <div className="actions">
// //         <Link href="/groups" className="outline">
// //           <span className="icon">◎</span>
// //           {groups ? "My groups" : "Find a group"}
// //         </Link>
// //         <Link href="/groups/create" className="primary">
// //           <span className="plus">+</span>
// //           Create group
// //         </Link>
// //       </div>
// //       <style jsx>{`
// //         .head { 
// //           display:flex; 
// //           align-items:center; 
// //           justify-content:space-between; 
// //           gap:24px; 
// //           margin-bottom:32px;
// //           padding: 28px 32px;
// //           background: #fff;
// //           border-radius: 24px;
// //           border: 1px solid ${C.border};
// //           box-shadow: ${C.shadow};
// //         }
// //         .head-left { flex: 1; }
// //         .kicker { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:8px; 
// //           color:${C.green}; 
// //           font-size:10px; 
// //           font-weight:850; 
// //           letter-spacing:.14em; 
// //           margin-bottom: 12px;
// //         }
// //         .dot { 
// //           width:8px; 
// //           height:8px; 
// //           border-radius:50%; 
// //           background:${C.green};
// //           box-shadow: 0 0 0 4px ${C.soft};
// //         }
// //         .greeting-row {
// //           display: flex;
// //           align-items: baseline;
// //           gap: 8px;
// //           margin-bottom: 8px;
// //         }
// //         .greeting {
// //           color: ${C.text};
// //           font-size: 18px;
// //           font-weight: 500;
// //         }
// //         h1 { 
// //           margin:0; 
// //           color:${C.ink}; 
// //           font-size:clamp(24px,2.5vw,30px); 
// //           line-height:1.15; 
// //           letter-spacing:-.04em; 
// //           font-weight:780; 
// //         }
// //         .wave {
// //           display: inline-block;
// //           font-size: 22px;
// //           animation: wave 2s infinite;
// //         }
// //         @keyframes wave {
// //           0%, 100% { transform: rotate(0deg); }
// //           25% { transform: rotate(20deg); }
// //           75% { transform: rotate(-10deg); }
// //         }
// //         p { 
// //           margin:0; 
// //           color:${C.text}; 
// //           font-size:13px; 
// //           line-height: 1.6;
// //         }
// //         .actions { 
// //           display:flex; 
// //           gap:10px; 
// //           align-items: center;
// //         }
// //         .outline, .primary { 
// //           min-height:42px; 
// //           padding:0 18px; 
// //           display:inline-flex; 
// //           align-items:center; 
// //           justify-content:center; 
// //           gap: 6px;
// //           border-radius:12px; 
// //           text-decoration:none; 
// //           font-size:11px; 
// //           font-weight:750;
// //           transition: all 0.2s;
// //         }
// //         .outline { 
// //           color:${C.ink}; 
// //           border:1.5px solid ${C.border}; 
// //           background:#fff; 
// //         }
// //         .outline:hover {
// //           border-color: ${C.green};
// //           color: ${C.green};
// //           background: ${C.soft};
// //         }
// //         .primary { 
// //           color:#fff; 
// //           background:${C.green}; 
// //           box-shadow:0 4px 12px rgba(8,122,62,.2); 
// //         }
// //         .primary:hover {
// //           transform: translateY(-1px);
// //           box-shadow: 0 6px 16px rgba(8,122,62,.3);
// //         }
// //         .icon { font-size: 14px; }
// //         .plus { 
// //           font-size: 16px; 
// //           font-weight: 400;
// //           line-height: 1;
// //         }
// //         @media(max-width:700px) { 
// //           .head { 
// //             align-items:flex-start; 
// //             flex-direction:column; 
// //             padding: 20px;
// //             border-radius: 20px;
// //           } 
// //           .actions { width:100%; } 
// //           .actions a { flex:1; } 
// //         }
// //       `}</style>
// //     </header>
// //   );
// // }

// // function Kpis({ data }: { data: DashboardData }) {
// //   const items = [
// //     {
// //       label: "Total saved",
// //       value: formatNaira(data.totalSavings),
// //       note: "Completed contributions",
// //       icon: "₦",
// //       tone: "green",
// //       trend: "+12.5%"
// //     },
// //     {
// //       label: "This month",
// //       value: formatNaira(data.monthlyContributions),
// //       note: data.monthlyContributions ? "Contribution activity" : "No activity yet",
// //       icon: "↗",
// //       tone: "blue",
// //       trend: "+8.2%"
// //     },
// //     {
// //       label: "My groups",
// //       value: String(data.groupCount),
// //       note: data.groupCount === 1 ? "Active community" : "Active communities",
// //       icon: "◎",
// //       tone: "purple",
// //       trend: `${data.memberCount} members`
// //     },
// //     {
// //       label: "Savings momentum",
// //       value: `${data.healthScore}/100`,
// //       note: data.healthScore >= 80 ? "Strong consistency" : data.healthScore >= 50 ? "Building consistency" : "Start your rhythm",
// //       icon: "✓",
// //       tone: "green",
// //       trend: `${data.healthScore}%`
// //     },
// //   ];

// //   return (
// //     <section className="kpis">
// //       {items.map((item) => (
// //         <div className="kpi" key={item.label}>
// //           <div className="kpi-top">
// //             <span className="label">{item.label}</span>
// //             <b className={`icon ${item.tone}`}>{item.icon}</b>
// //           </div>
// //           <strong className="value">{item.value}</strong>
// //           <small className="note">{item.note}</small>
// //           {item.label === "Savings momentum" ? (
// //             <div className="track">
// //               <i style={{ width: `${Math.min(data.healthScore, 100)}%` }} />
// //             </div>
// //           ) : (
// //             <div className="trend">
// //               <span>{item.trend}</span>
// //             </div>
// //           )}
// //         </div>
// //       ))}
// //       <style jsx>{`
// //         .kpis { 
// //           display:grid; 
// //           grid-template-columns:repeat(4,minmax(0,1fr)); 
// //           gap:16px; 
// //           margin-bottom: 24px;
// //         }
// //         .kpi { 
// //           padding:22px; 
// //           border:1px solid ${C.border}; 
// //           border-radius:18px; 
// //           background:#fff; 
// //           box-shadow: ${C.shadow};
// //           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
// //           position: relative;
// //           overflow: hidden;
// //         }
// //         .kpi::before {
// //           content: '';
// //           position: absolute;
// //           top: 0;
// //           left: 0;
// //           right: 0;
// //           height: 3px;
// //           background: ${C.gradient};
// //           opacity: 0;
// //           transition: opacity 0.3s;
// //         }
// //         .kpi:hover {
// //           box-shadow: ${C.shadowHover};
// //           transform: translateY(-2px);
// //         }
// //         .kpi:hover::before {
// //           opacity: 1;
// //         }
// //         .kpi-top { 
// //           display:flex; 
// //           align-items:center; 
// //           justify-content:space-between; 
// //           gap:12px; 
// //           margin-bottom: 16px;
// //         }
// //         .label { 
// //           color:${C.text}; 
// //           font-size:10px; 
// //           font-weight:650;
// //           text-transform: uppercase;
// //           letter-spacing: 0.05em;
// //         }
// //         .icon { 
// //           width:36px; 
// //           height:36px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:10px; 
// //           font-size:14px;
// //           font-weight: 700;
// //           transition: transform 0.2s;
// //         }
// //         .kpi:hover .icon {
// //           transform: scale(1.1);
// //         }
// //         .green { 
// //           color:${C.green}; 
// //           background:${C.soft}; 
// //         }
// //         .blue { 
// //           color:#415B7A; 
// //           background:#F1F5FA; 
// //         }
// //         .purple { 
// //           color:#62527A; 
// //           background:#F4F1F8; 
// //         }
// //         .value { 
// //           display:block; 
// //           color:${C.ink}; 
// //           font-size:28px; 
// //           line-height:1; 
// //           letter-spacing:-.04em; 
// //           font-weight: 780;
// //           margin-bottom: 8px;
// //         }
// //         .note { 
// //           display:block; 
// //           color:${C.muted}; 
// //           font-size:9px;
// //           margin-bottom: 12px;
// //         }
// //         .track { 
// //           height:5px; 
// //           overflow:hidden; 
// //           border-radius:99px; 
// //           background:#EDF1EE; 
// //         }
// //         .track i { 
// //           display:block; 
// //           height:100%; 
// //           border-radius:99px; 
// //           background: linear-gradient(90deg, ${C.green}, #0A9A4F);
// //           transition: width 1s ease;
// //         }
// //         .trend {
// //           display: flex;
// //           align-items: center;
// //           gap: 6px;
// //           color: ${C.green};
// //           font-size: 9px;
// //           font-weight: 650;
// //         }
// //         @media(max-width:900px) { 
// //           .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } 
// //         }
// //         @media(max-width:500px) { 
// //           .kpis { grid-template-columns:1fr; } 
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function ContributionChart({ data }: { data: DashboardData }) {
// //   const max = Math.max(...data.monthlyData.map(x => x.amount), 1);
// //   const total = data.monthlyData.reduce((s,x) => s+x.amount, 0);

// //   return (
// //     <section className="card chart-card">
// //       <div className="chart-head">
// //         <div>
// //           <span className="eyebrow">SAVINGS ACTIVITY</span>
// //           <h2>Your contribution rhythm</h2>
// //           <p>Recorded contributions over the last six months.</p>
// //         </div>
// //         <div className="period">
// //           <small>6-month total</small>
// //           <strong>{formatNaira(total)}</strong>
// //         </div>
// //       </div>

// //       <div className="chart">
// //         <div className="yaxis">
// //           <span>{formatCompact(max)}</span>
// //           <span>{formatCompact(max/2)}</span>
// //           <span>₦0</span>
// //         </div>
// //         <div className="plot">
// //           <div className="gridlines"><i/><i/><i/></div>
// //           <div className="bars">
// //             {data.monthlyData.map((m,i) => {
// //               const h = m.amount ? Math.max(m.amount/max*100,8) : 3;
// //               const current = i === data.monthlyData.length-1;
// //               return (
// //                 <div className="column" key={m.month}>
// //                   <div className="bar-space">
// //                     {m.amount > 0 && (
// //                       <span className={`value ${current ? "current":""}`}>
// //                         {formatCompact(m.amount)}
// //                       </span>
// //                     )}
// //                     <i 
// //                       className={`bar ${current ? "current":""}`} 
// //                       style={{height:`${h}%`}} 
// //                       title={`${m.month}: ${formatNaira(m.amount)}`} 
// //                     />
// //                   </div>
// //                   <small className={current ? "current":""}>{m.month}</small>
// //                 </div>
// //               );
// //             })}
// //           </div>
// //         </div>
// //       </div>

// //       <div className="chart-foot">
// //         <span><i/> Completed contributions</span>
// //         <span>Total saved to date: <b>{formatNaira(data.totalSavings)}</b></span>
// //       </div>

// //       <style jsx>{`
// //         .chart-card { 
// //           padding:28px; 
// //           transition: all 0.3s;
// //         }
// //         .chart-head { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           gap:24px; 
// //           margin-bottom:32px; 
// //         }
// //         .eyebrow { 
// //           color:${C.green}; 
// //           font-size:9px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //           display: block;
// //           margin-bottom: 8px;
// //         }
// //         h2 { 
// //           margin:0 0 6px; 
// //           color:${C.ink}; 
// //           font-size:20px; 
// //           letter-spacing:-.025em; 
// //           font-weight: 750;
// //         }
// //         .chart-head p { 
// //           color:${C.muted}; 
// //           font-size:11px; 
// //           margin: 0;
// //         }
// //         .period { 
// //           text-align:right; 
// //           min-width:120px;
// //           background: ${C.soft};
// //           padding: 12px 16px;
// //           border-radius: 12px;
// //         }
// //         .period small { 
// //           display:block; 
// //           color:${C.muted}; 
// //           font-size:9px; 
// //           margin-bottom: 6px;
// //         }
// //         .period strong { 
// //           display:block; 
// //           color:${C.green}; 
// //           font-size:20px; 
// //           font-weight: 750;
// //         }
// //         .chart { 
// //           height:280px; 
// //           display:flex; 
// //           gap:16px; 
// //         }
// //         .yaxis { 
// //           width:60px; 
// //           display:flex; 
// //           flex-direction:column; 
// //           justify-content:space-between; 
// //           padding-bottom:32px; 
// //           text-align:right; 
// //           color:#9AA4AE; 
// //           font-size:9px;
// //           font-weight: 600;
// //         }
// //         .plot { 
// //           position:relative; 
// //           flex:1; 
// //           min-width:0; 
// //         }
// //         .gridlines { 
// //           position:absolute; 
// //           inset:0 0 32px; 
// //           display:flex; 
// //           flex-direction:column; 
// //           justify-content:space-between; 
// //         }
// //         .gridlines i { 
// //           border-top:1px dashed #E7ECE9; 
// //         }
// //         .bars { 
// //           position:absolute; 
// //           inset:0; 
// //           display:flex; 
// //           gap:16px; 
// //           padding:0 8px; 
// //         }
// //         .column { 
// //           flex:1; 
// //           min-width:0; 
// //           display:flex; 
// //           flex-direction:column; 
// //           align-items:center; 
// //         }
// //         .bar-space { 
// //           position:relative; 
// //           width:100%; 
// //           height:calc(100% - 32px); 
// //           display:flex; 
// //           justify-content:center; 
// //           align-items:flex-end; 
// //         }
// //         .bar { 
// //           width:min(48px,72%); 
// //           min-height:4px; 
// //           border-radius:8px 8px 4px 4px; 
// //           background: linear-gradient(180deg, #BFD8C8, #A8CDB4);
// //           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
// //           cursor: pointer;
// //           position: relative;
// //         }
// //         .bar.current { 
// //           background: linear-gradient(180deg, #0A9A4F, ${C.green});
// //           box-shadow: 0 4px 12px rgba(8,122,62,.3);
// //         }
// //         .bar:hover { 
// //           transform:translateY(-4px);
// //           box-shadow: 0 8px 20px rgba(8,122,62,.2);
// //         }
// //         .value { 
// //           position:absolute; 
// //           bottom:calc(100% + 8px); 
// //           color:${C.text}; 
// //           font-size:8px; 
// //           font-weight:750; 
// //           white-space:nowrap;
// //           opacity: 0;
// //           transition: opacity 0.2s;
// //           pointer-events: none;
// //         }
// //         .column:hover .value {
// //           opacity: 1;
// //         }
// //         .value.current { 
// //           color:${C.green};
// //           opacity: 1;
// //         }
// //         .column > small { 
// //           margin-top:12px; 
// //           color:#929CA7; 
// //           font-size:9px; 
// //           font-weight:650;
// //           transition: color 0.2s;
// //         }
// //         .column > small.current { 
// //           color:${C.green}; 
// //           font-weight:800; 
// //         }
// //         .chart-foot { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           gap:16px; 
// //           padding-top:20px; 
// //           margin-top:24px; 
// //           border-top:1px solid #EEF2EF; 
// //           color:${C.muted}; 
// //           font-size:10px;
// //         }
// //         .chart-foot > span:first-child { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:8px; 
// //         }
// //         .chart-foot i { 
// //           width:8px; 
// //           height:8px; 
// //           border-radius:50%; 
// //           background:${C.green};
// //           box-shadow: 0 0 0 3px ${C.soft};
// //         }
// //         .chart-foot b { 
// //           color:${C.ink}; 
// //           font-weight: 700;
// //         }
// //         @media(max-width:600px) { 
// //           .chart-card { padding:20px; } 
// //           .chart-head { flex-direction:column; gap:16px; } 
// //           .period { text-align:left; } 
// //           .chart { height:220px; } 
// //           .bars { gap:8px; } 
// //           .chart-foot { flex-direction:column; gap:8px; } 
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function Intelligence({ data }: { data: DashboardData }) {
// //   const pending = data.contributions.filter(c => c.status !== "completed").length;
// //   const completed = data.contributions.filter(c => c.status === "completed").length;

// //   const insight = useMemo(() => {
// //     if (!data.contributions.length) return ["Start with a clear savings goal.", "Join or create a savings community and begin recording your contribution activity so Kolo can understand your progress."];
// //     if (pending) return [`${pending} contribution${pending > 1 ? "s are" : " is"} still pending.`, "Review your contribution activity and confirm outstanding records with the relevant savings group."];
// //     if (data.groupCount) return ["Your savings activity is building.", `You have ${completed} completed contribution${completed === 1 ? "" : "s"} across ${data.groupCount} active group${data.groupCount === 1 ? "" : "s"}.`];
// //     return ["Keep your savings rhythm consistent.", `You have recorded ${completed} completed contribution${completed === 1 ? "" : "s"}.`];
// //   }, [data.contributions.length, data.groupCount, pending, completed]);

// //   return (
// //     <section className="intelligence">
// //       <div className="top">
// //         <div className="mark">✦</div>
// //         <div>
// //           <small>KOLO INTELLIGENCE</small>
// //           <strong>What Kolo sees</strong>
// //         </div>
// //         <i className="status">●</i>
// //       </div>
      
// //       <div className="content">
// //         <span className="label">CURRENT SIGNAL</span>
// //         <h3>{insight[0]}</h3>
// //         <p>{insight[1]}</p>
// //       </div>
      
// //       <div className="metrics">
// //         <div>
// //           <small>This month</small>
// //           <b>{formatNaira(data.monthlyContributions)}</b>
// //         </div>
// //         <div>
// //           <small>Groups</small>
// //           <b>{data.groupCount}</b>
// //         </div>
// //       </div>
      
// //       <Link href="/groups">
// //         Explore your activity <span>→</span>
// //       </Link>
      
// //       <style jsx>{`
// //         .intelligence { 
// //           position:relative; 
// //           overflow:hidden; 
// //           padding:28px; 
// //           border-radius:20px; 
// //           background: ${C.gradient};
// //           color:#fff; 
// //           box-shadow: 0 16px 40px rgba(11,28,48,.2);
// //         }
// //         .intelligence::before {
// //           content: '';
// //           position: absolute;
// //           top: -50%;
// //           right: -50%;
// //           width: 200%;
// //           height: 200%;
// //           background: radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 50%);
// //           pointer-events: none;
// //         }
// //         .top { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:12px; 
// //           position: relative;
// //           z-index: 1;
// //         }
// //         .mark { 
// //           width:44px; 
// //           height:44px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:14px; 
// //           background: ${C.green};
// //           font-size:20px;
// //           box-shadow: 0 8px 20px rgba(8,122,62,.4);
// //         }
// //         .top > div:nth-child(2) { 
// //           display:flex; 
// //           flex-direction:column; 
// //           gap:4px; 
// //         }
// //         .top small { 
// //           color:#8DE0A8; 
// //           font-size:8px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //         }
// //         .top strong { 
// //           color:#fff; 
// //           font-size:14px; 
// //         }
// //         .status { 
// //           margin-left:auto; 
// //           color:#8DE0A8; 
// //           font-size:10px;
// //           animation: blink 2s infinite;
// //         }
// //         @keyframes blink {
// //           0%, 100% { opacity: 1; }
// //           50% { opacity: 0.3; }
// //         }
// //         .content {
// //           position: relative;
// //           z-index: 1;
// //         }
// //         .label { 
// //           display:block; 
// //           margin-top:32px; 
// //           color:#7D8B99; 
// //           font-size:8px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //         }
// //         h3 { 
// //           margin:12px 0; 
// //           color:#fff; 
// //           font-size:22px; 
// //           line-height:1.2; 
// //           letter-spacing:-.03em; 
// //           font-weight: 700;
// //         }
// //         p { 
// //           margin:0; 
// //           color:#C5D0D9; 
// //           font-size:11px; 
// //           line-height:1.7; 
// //         }
// //         .metrics { 
// //           display:grid; 
// //           grid-template-columns:1fr 1fr; 
// //           gap:12px; 
// //           margin-top:24px; 
// //           position: relative;
// //           z-index: 1;
// //         }
// //         .metrics div { 
// //           padding:16px; 
// //           border:1px solid rgba(255,255,255,.12); 
// //           border-radius:12px; 
// //           background:rgba(255,255,255,.06);
// //           backdrop-filter: blur(10px);
// //           transition: all 0.3s;
// //         }
// //         .metrics div:hover {
// //           background:rgba(255,255,255,.1);
// //           border-color: rgba(255,255,255,.2);
// //         }
// //         .metrics small,.metrics b { 
// //           display:block; 
// //         }
// //         .metrics small { 
// //           color:#8D9AA6; 
// //           font-size:8px; 
// //           margin-bottom: 8px;
// //         }
// //         .metrics b { 
// //           color:#fff; 
// //           font-size:14px; 
// //           font-weight: 650;
// //         }
// //         .intelligence > a { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           margin-top:20px; 
// //           padding-top:16px; 
// //           border-top:1px solid rgba(255,255,255,.12); 
// //           color:#fff; 
// //           font-size:10px; 
// //           font-weight:750; 
// //           text-decoration:none;
// //           transition: all 0.3s;
// //           position: relative;
// //           z-index: 1;
// //         }
// //         .intelligence > a:hover {
// //           color: #8DE0A8;
// //         }
// //         .intelligence > a span { 
// //           color:#8DE0A8; 
// //           font-size:16px;
// //           transition: transform 0.3s;
// //         }
// //         .intelligence > a:hover span {
// //           transform: translateX(4px);
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function SavingsFocus({ data }: { data: DashboardData }) {
// //   const progress = data.healthScore;
  
// //   return (
// //     <section className="card focus">
// //       <div className="focus-head">
// //         <div>
// //           <span>SAVINGS FOCUS</span>
// //           <h3>Keep the momentum.</h3>
// //         </div>
// //         <i>↗</i>
// //       </div>
      
// //       <strong className="total">{formatNaira(data.totalSavings)}</strong>
      
// //       <div className="sub">
// //         <span>Recorded savings</span>
// //         <b>{formatNaira(data.monthlyContributions)} this month</b>
// //       </div>
      
// //       <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as any}>
// //         <div className="ring">
// //           <span>{progress}%</span>
// //         </div>
// //       </div>
      
// //       <hr />
      
// //       <div className="row">
// //         <span>Active communities</span>
// //         <b>{data.groupCount}</b>
// //       </div>
      
// //       <p>Your goals, contributions and communities become easier to understand when they stay organized in one place.</p>
      
// //       <style jsx>{`
// //         .focus { 
// //           padding:24px; 
// //         }
// //         .focus-head { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           align-items: flex-start;
// //           margin-bottom: 24px;
// //         }
// //         .focus-head span { 
// //           color:${C.green}; 
// //           font-size:8px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //           display: block;
// //           margin-bottom: 6px;
// //         }
// //         h3 { 
// //           margin:0; 
// //           color:${C.ink}; 
// //           font-size:18px; 
// //           font-weight: 700;
// //         }
// //         .focus-head i { 
// //           width:36px; 
// //           height:36px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:10px; 
// //           color:${C.green}; 
// //           background:${C.soft}; 
// //           font-style:normal;
// //           font-size: 18px;
// //         }
// //         .total { 
// //           display:block; 
// //           color:${C.ink}; 
// //           font-size:30px; 
// //           letter-spacing:-.04em; 
// //           font-weight: 780;
// //           margin-bottom: 8px;
// //         }
// //         .sub,.row { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           gap:12px; 
// //         }
// //         .sub { 
// //           color:${C.muted}; 
// //           font-size:9px; 
// //           margin-bottom: 24px;
// //         }
// //         .sub b { 
// //           color:${C.text}; 
// //           font-weight: 600;
// //         }
// //         .progress-ring {
// //           width: 120px;
// //           height: 120px;
// //           margin: 0 auto 24px;
// //           border-radius: 50%;
// //           background: conic-gradient(${C.green} var(--progress), #E4EBE6 var(--progress));
// //           display: grid;
// //           place-items: center;
// //           position: relative;
// //           transition: all 0.3s;
// //         }
// //         .ring {
// //           width: 96px;
// //           height: 96px;
// //           border-radius: 50%;
// //           background: #fff;
// //           display: grid;
// //           place-items: center;
// //         }
// //         .ring span {
// //           color: ${C.ink};
// //           font-size: 18px;
// //           font-weight: 750;
// //         }
// //         hr { 
// //           border:0; 
// //           border-top:1px solid #EEF2EF; 
// //           margin:20px 0; 
// //         }
// //         .row { 
// //           color:${C.text}; 
// //           font-size:10px; 
// //           font-weight: 500;
// //         }
// //         .row b { 
// //           color:${C.ink}; 
// //           font-size:16px; 
// //           font-weight: 700;
// //         }
// //         .focus > p { 
// //           margin:20px 0 0; 
// //           color:${C.muted}; 
// //           font-size:10px; 
// //           line-height:1.7; 
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function QuickActions({ hasGroups }: { hasGroups: boolean }) {
// //   return (
// //     <section className="card quick">
// //       <h3>Quick actions</h3>
// //       <div className="actions-grid">
// //         <Link href="/groups" className="action-item">
// //           <i>◎</i>
// //           <span>
// //             <b>{hasGroups ? "View groups" : "Discover"}</b>
// //             <small>Manage communities</small>
// //           </span>
// //           <strong>→</strong>
// //         </Link>
// //         <Link href="/groups/create" className="action-item">
// //           <i>+</i>
// //           <span>
// //             <b>Create group</b>
// //             <small>Start savings cycle</small>
// //           </span>
// //           <strong>→</strong>
// //         </Link>
// //         <Link href="/payments" className="action-item">
// //           <i>₦</i>
// //           <span>
// //             <b>Contribute</b>
// //             <small>Add to savings</small>
// //           </span>
// //           <strong>→</strong>
// //         </Link>
// //       </div>
// //       <style jsx>{`
// //         .quick { 
// //           padding:24px; 
// //         }
// //         h3 { 
// //           margin:0 0 16px; 
// //           color:${C.ink}; 
// //           font-size:13px; 
// //           font-weight: 700;
// //         }
// //         .actions-grid {
// //           display: flex;
// //           flex-direction: column;
// //           gap: 8px;
// //         }
// //         .action-item { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:12px; 
// //           padding:12px; 
// //           border-radius:12px;
// //           text-decoration:none;
// //           transition: all 0.2s;
// //           background: #FAFCFB;
// //           border: 1px solid #EEF2EF;
// //         }
// //         .action-item:hover {
// //           background: ${C.soft};
// //           border-color: ${C.green};
// //           transform: translateX(4px);
// //         }
// //         .action-item i { 
// //           width:32px; 
// //           height:32px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:8px; 
// //           color:${C.green}; 
// //           background:#fff; 
// //           font-style:normal;
// //           font-size: 14px;
// //           border: 1px solid #E4EBE6;
// //         }
// //         .action-item span { 
// //           flex:1; 
// //           display:flex; 
// //           flex-direction:column; 
// //           gap:2px; 
// //         }
// //         .action-item b { 
// //           color:${C.ink}; 
// //           font-size:10px; 
// //           font-weight: 650;
// //         }
// //         .action-item small { 
// //           color:${C.muted}; 
// //           font-size:8px; 
// //         }
// //         .action-item > strong { 
// //           color:${C.green}; 
// //           font-size:14px;
// //           transition: transform 0.2s;
// //         }
// //         .action-item:hover > strong {
// //           transform: translateX(4px);
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function Groups({ groups }: { groups: Group[] }) {
// //   return (
// //     <section className="card groups-card">
// //       <div className="section-head">
// //         <div>
// //           <span>COMMUNITIES</span>
// //           <h2>Your savings groups</h2>
// //           <p>The communities you currently belong to.</p>
// //         </div>
// //         <Link href="/groups">View all →</Link>
// //       </div>

// //       {!groups.length ? (
// //         <div className="empty">
// //           <i>◎</i>
// //           <div>
// //             <b>You're not in a savings group yet.</b>
// //             <p>Join a community or create your own savings group.</p>
// //           </div>
// //           <Link href="/groups/create">Create a group →</Link>
// //         </div>
// //       ) : (
// //         <div className="group-grid">
// //           {groups.slice(0,4).map(g => (
// //             <Link key={g.id} href={`/groups/${g.id}`} className="group-card">
// //               <div className="group-header">
// //                 <i className="avatar">{initials(g.name || "Group")}</i>
// //                 <span className="status">✓ Active</span>
// //               </div>
// //               <div className="group-body">
// //                 <b className="group-name">{g.name || "Savings group"}</b>
// //                 <small className="group-meta">{g.member_count || 0}/{g.max_members || 20} members</small>
// //                 <div className="group-pool">
// //                   <small>Group pool</small>
// //                   <b>{formatNaira(Number(g.pool_amount || 0))}</b>
// //                 </div>
// //               </div>
// //               <div className="group-footer">
// //                 <span>View details</span>
// //                 <em>→</em>
// //               </div>
// //             </Link>
// //           ))}
// //         </div>
// //       )}

// //       <style jsx>{`
// //         .groups-card { 
// //           padding:28px; 
// //         }
// //         .section-head { 
// //           display:flex; 
// //           justify-content:space-between; 
// //           gap:16px; 
// //           margin-bottom:24px; 
// //         }
// //         .section-head span { 
// //           color:${C.green}; 
// //           font-size:8px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //           display: block;
// //           margin-bottom: 6px;
// //         }
// //         h2 { 
// //           margin:0 0 6px; 
// //           color:${C.ink}; 
// //           font-size:20px; 
// //           font-weight: 750;
// //         }
// //         .section-head p { 
// //           color:${C.muted}; 
// //           font-size:10px; 
// //           margin: 0;
// //         }
// //         .section-head > a { 
// //           color:${C.green}; 
// //           font-size:10px; 
// //           font-weight:750; 
// //           text-decoration:none; 
// //           white-space:nowrap;
// //           transition: all 0.2s;
// //         }
// //         .section-head > a:hover {
// //           transform: translateX(4px);
// //         }
// //         .group-grid {
// //           display: grid;
// //           grid-template-columns: repeat(2, 1fr);
// //           gap: 16px;
// //         }
// //         .group-card {
// //           display: flex;
// //           flex-direction: column;
// //           padding: 20px;
// //           border: 1px solid #EEF2EF;
// //           border-radius: 14px;
// //           text-decoration: none;
// //           transition: all 0.3s;
// //           background: #FAFCFB;
// //         }
// //         .group-card:hover {
// //           border-color: ${C.green};
// //           background: #fff;
// //           box-shadow: 0 8px 24px rgba(8,122,62,.1);
// //           transform: translateY(-2px);
// //         }
// //         .group-header {
// //           display: flex;
// //           justify-content: space-between;
// //           align-items: center;
// //           margin-bottom: 16px;
// //         }
// //         .avatar { 
// //           width:40px; 
// //           height:40px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:12px; 
// //           color:${C.green}; 
// //           background:${C.soft}; 
// //           font-style:normal; 
// //           font-size:10px; 
// //           font-weight:850;
// //         }
// //         .status { 
// //           color:${C.green}; 
// //           font-size:8px; 
// //           font-weight:700;
// //           background: ${C.soft};
// //           padding: 4px 8px;
// //           border-radius: 99px;
// //         }
// //         .group-body {
// //           flex: 1;
// //         }
// //         .group-name {
// //           display: block;
// //           color: ${C.ink};
// //           font-size: 12px;
// //           font-weight: 650;
// //           margin-bottom: 4px;
// //         }
// //         .group-meta {
// //           color: ${C.muted};
// //           font-size: 9px;
// //           margin-bottom: 16px;
// //         }
// //         .group-pool {
// //           padding: 12px;
// //           background: #fff;
// //           border-radius: 10px;
// //           border: 1px solid #EEF2EF;
// //         }
// //         .group-pool small {
// //           display: block;
// //           color: ${C.muted};
// //           font-size: 8px;
// //           margin-bottom: 4px;
// //         }
// //         .group-pool b {
// //           color: ${C.ink};
// //           font-size: 12px;
// //           font-weight: 650;
// //         }
// //         .group-footer {
// //           display: flex;
// //           justify-content: space-between;
// //           align-items: center;
// //           margin-top: 16px;
// //           padding-top: 12px;
// //           border-top: 1px solid #EEF2EF;
// //           color: ${C.green};
// //           font-size: 9px;
// //           font-weight: 650;
// //         }
// //         .group-footer em { 
// //           font-style: normal;
// //           font-size: 14px;
// //           transition: transform 0.2s;
// //         }
// //         .group-card:hover .group-footer em {
// //           transform: translateX(4px);
// //         }
// //         .empty { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:16px; 
// //           padding:24px; 
// //           border:1.5px dashed #D9E4DC; 
// //           border-radius:14px; 
// //           background:#FAFCFB; 
// //         }
// //         .empty > i { 
// //           width:44px; 
// //           height:44px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:12px; 
// //           color:${C.green}; 
// //           background:${C.soft}; 
// //           font-style:normal; 
// //           font-size: 18px;
// //         }
// //         .empty > div { 
// //           flex:1; 
// //         }
// //         .empty b { 
// //           color:${C.ink}; 
// //           font-size:11px; 
// //         }
// //         .empty p { 
// //           margin:4px 0 0; 
// //           color:${C.muted}; 
// //           font-size:9px; 
// //         }
// //         .empty > a { 
// //           color:${C.green}; 
// //           font-size:9px; 
// //           font-weight:750; 
// //           text-decoration:none; 
// //           white-space:nowrap;
// //           transition: all 0.2s;
// //         }
// //         .empty > a:hover {
// //           transform: translateX(4px);
// //         }
// //         @media(max-width:700px) {
// //           .group-grid {
// //             grid-template-columns: 1fr;
// //           }
// //         }
// //         @media(max-width:500px) { 
// //           .empty { 
// //             flex-wrap:wrap; 
// //             align-items:flex-start; 
// //           } 
// //           .empty > a { 
// //             margin-left:60px; 
// //           } 
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function Transactions({ transactions }: { transactions: Transaction[] }) {
// //   return (
// //     <section className="card tx">
// //       <div className="tx-head">
// //         <div>
// //           <span>ACTIVITY</span>
// //           <h2>Recent contribution activity</h2>
// //         </div>
// //         <Link href="/payments">View all →</Link>
// //       </div>
      
// //       {!transactions.length ? (
// //         <div className="tx-empty">
// //           <i>◎</i>
// //           <div>
// //             <b>No activity recorded yet.</b>
// //             <p>Your contribution activity will appear here.</p>
// //           </div>
// //         </div>
// //       ) : (
// //         <div>
// //           {transactions.slice(0,6).map(t => (
// //             <div className="tx-row" key={t.id}>
// //               <i className="tx-icon">₦</i>
// //               <span className="tx-info">
// //                 <b>{t.type ? t.type.charAt(0).toUpperCase()+t.type.slice(1) : "Contribution"}</b>
// //                 <small>{formatDate(t.created_at)}</small>
// //               </span>
// //               <code>{t.monnify_ref?.slice(0,15) || "Recorded activity"}</code>
// //               <strong className="tx-amount">{formatNaira(Number(t.amount || 0))}</strong>
// //               <em className={`tx-status ${t.status === "completed" ? "done" : "pending"}`}>
// //                 {t.status === "completed" ? "✓ Recorded" : "⏳ Pending"}
// //               </em>
// //             </div>
// //           ))}
// //         </div>
// //       )}
      
// //       <style jsx>{`
// //         .tx { 
// //           overflow:hidden; 
// //         }
// //         .tx-head { 
// //           display:flex; 
// //           align-items:center; 
// //           justify-content:space-between; 
// //           padding:24px 28px 20px; 
// //           border-bottom:1px solid #EEF2EF; 
// //         }
// //         .tx-head span { 
// //           color:${C.green}; 
// //           font-size:8px; 
// //           font-weight:850; 
// //           letter-spacing:.12em; 
// //           display: block;
// //           margin-bottom: 6px;
// //         }
// //         h2 { 
// //           margin:0; 
// //           color:${C.ink}; 
// //           font-size:20px; 
// //           font-weight: 750;
// //         }
// //         .tx-head a { 
// //           color:${C.green}; 
// //           font-size:10px; 
// //           font-weight:750; 
// //           text-decoration:none;
// //           transition: all 0.2s;
// //         }
// //         .tx-head a:hover {
// //           transform: translateX(4px);
// //         }
// //         .tx-row { 
// //           display:grid; 
// //           grid-template-columns:36px minmax(0,1fr) 130px 100px 80px; 
// //           align-items:center; 
// //           gap:12px; 
// //           padding:16px 28px; 
// //           border-bottom:1px solid #F0F3F1; 
// //           transition: background 0.2s;
// //         }
// //         .tx-row:hover {
// //           background: #FAFCFB;
// //         }
// //         .tx-row:last-child { 
// //           border-bottom:0; 
// //         }
// //         .tx-icon { 
// //           width:32px; 
// //           height:32px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:9px; 
// //           background:${C.soft}; 
// //           color:${C.green}; 
// //           font-style:normal; 
// //           font-size:12px; 
// //           font-weight:850;
// //         }
// //         .tx-info { 
// //           display:flex; 
// //           flex-direction:column; 
// //           gap:4px; 
// //           min-width:0; 
// //         }
// //         .tx-info b { 
// //           overflow:hidden; 
// //           color:${C.ink}; 
// //           font-size:10px; 
// //           text-overflow:ellipsis; 
// //           white-space:nowrap; 
// //           font-weight: 650;
// //         }
// //         .tx-info small, code { 
// //           color:${C.muted}; 
// //           font-size:8px; 
// //         }
// //         code { 
// //           overflow:hidden; 
// //           text-overflow:ellipsis; 
// //           white-space:nowrap; 
// //           font-family:inherit; 
// //         }
// //         .tx-amount { 
// //           color:${C.ink}; 
// //           font-size:11px; 
// //           text-align:right; 
// //           font-weight: 650;
// //         }
// //         .tx-status { 
// //           justify-self:end; 
// //           padding:6px 10px; 
// //           border-radius:99px; 
// //           font-style:normal; 
// //           font-size:8px; 
// //           font-weight:750;
// //           white-space: nowrap;
// //         }
// //         .done { 
// //           color:${C.green}; 
// //           background:${C.soft}; 
// //         }
// //         .pending { 
// //           color:#87651A; 
// //           background:#FFF8E8; 
// //         }
// //         .tx-empty { 
// //           display:flex; 
// //           align-items:center; 
// //           gap:16px; 
// //           padding:40px 28px; 
// //         }
// //         .tx-empty > i { 
// //           width:44px; 
// //           height:44px; 
// //           display:grid; 
// //           place-items:center; 
// //           border-radius:12px; 
// //           background:${C.soft}; 
// //           color:${C.green}; 
// //           font-style:normal; 
// //           font-size: 18px;
// //         }
// //         .tx-empty b { 
// //           color:${C.ink}; 
// //           font-size:11px; 
// //         }
// //         .tx-empty p { 
// //           margin:4px 0 0; 
// //           color:${C.muted}; 
// //           font-size:9px; 
// //         }
// //         @media(max-width:700px) {
// //           .tx-row { 
// //             grid-template-columns:36px minmax(0,1fr) 80px; 
// //             padding: 14px 20px;
// //           }
// //           .tx-head {
// //             padding: 20px;
// //           }
// //           .tx-row code { 
// //             display:none; 
// //           }
// //           .tx-status { 
// //             grid-column:3; 
// //             grid-row:1; 
// //           }
// //           .tx-amount { 
// //             grid-column:2; 
// //             text-align:left; 
// //             grid-row:2; 
// //           }
// //           .tx-info { 
// //             grid-row:1 / span 2; 
// //           }
// //         }
// //       `}</style>
// //     </section>
// //   );
// // }

// // function formatNaira(n: number) {
// //   return `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
// // }

// // function formatCompact(n: number) {
// //   n = Number(n || 0);
// //   if (n >= 1000000) return `₦${(n/1000000).toFixed(1).replace(".0","")}m`;
// //   if (n >= 1000) return `₦${Math.round(n/1000)}k`;
// //   return formatNaira(n);
// // }

// // function formatDate(value?: string) {
// //   if (!value) return "Date unavailable";
// //   const d = new Date(value);
// //   if (Number.isNaN(d.getTime())) return "Date unavailable";
// //   return d.toLocaleDateString("en-NG", { day:"2-digit", month:"short", year:"numeric" });
// // }

// // function initials(name: string) {
// //   const p = name.trim().split(/\s+/).filter(Boolean);
// //   return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : p[0].slice(0,2).toUpperCase();
// // }


// // // "use client";

// // // import Link from "next/link";
// // // import { useEffect, useState, useCallback } from "react";
// // // import { createClient } from "@/lib/supabase/client";

// // // export default function DashboardPage() {
// // //   const [data, setData] = useState<any>(null);
// // //   const [loading, setLoading] = useState(true);
// // //   const supabase = createClient();

// // //   const fetchDashboardData = useCallback(async () => {
// // //     setLoading(true);
    
// // //     const { data: { user } } = await supabase.auth.getUser();
// // //     if (!user) return;

// // //     const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

// // //     const { data: memberships } = await supabase.from("group_members").select("group_id, groups(*)").eq("user_id", user.id);

// // //     const { data: contributions } = await supabase.from("contributions").select("amount, status, created_at, transaction_ref, group_id, groups(name)").eq("user_id", user.id).order("created_at", { ascending: false });

// // //     const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);

// // //     const groups = memberships?.map((m: any) => m.groups) || [];
// // //     const totalMembers = groups.reduce((sum: number, g: any) => sum + (g.member_count || 0), 0);
    
// // //     const completedContributions = (contributions || []).filter((c: any) => c.status === "completed");
// // //     const totalSavings = completedContributions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

// // //     const monthlyData: { month: string; amount: number; count: number }[] = [];
// // //     const now = new Date();
// // //     for (let i = 5; i >= 0; i--) {
// // //       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
// // //       const monthKey = d.toLocaleDateString("en-US", { month: "short" });
// // //       const monthContributions = (contributions || []).filter((c: any) => {
// // //         const cd = new Date(c.created_at);
// // //         return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear() && c.status === "completed";
// // //       });
// // //       monthlyData.push({
// // //         month: monthKey,
// // //         amount: monthContributions.reduce((s: number, c: any) => s + c.amount, 0),
// // //         count: monthContributions.length,
// // //       });
// // //     }

// // //     const thisMonth = (contributions || []).filter((c: any) => {
// // //       const d = new Date(c.created_at);
// // //       return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
// // //     });
// // //     const monthlyContributions = thisMonth.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

// // //     const completedCount = completedContributions.length;
// // //     const totalCount = (contributions || []).length || 1;
// // //     const healthScore = Math.round((completedCount / totalCount) * 100);

// // //     setData({
// // //       userName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
// // //       totalSavings,
// // //       monthlyContributions,
// // //       groupCount: groups.length,
// // //       memberCount: totalMembers,
// // //       healthScore,
// // //       transactions: transactions || [],
// // //       groups,
// // //       contributions: contributions || [],
// // //       monthlyData,
// // //     });
// // //     setLoading(false);
// // //   }, [supabase]);

// // //   useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

// // //   useEffect(() => {
// // //     const handleFocus = () => fetchDashboardData();
// // //     window.addEventListener("focus", handleFocus);
// // //     return () => window.removeEventListener("focus", handleFocus);
// // //   }, [fetchDashboardData]);

// // //   if (loading) {
// // //     return (
// // //       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
// // //         Loading your dashboard...
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <>
// // //       <TopHeader userName={data?.userName || "User"} />
// // //       <KPIRow totalSavings={data?.totalSavings || 0} monthlyContributions={data?.monthlyContributions || 0} groupCount={data?.groupCount || 0} memberCount={data?.memberCount || 0} healthScore={data?.healthScore || 0} />
// // //       <ChartsSection groups={data?.groups || []} contributions={data?.contributions || []} monthlyData={data?.monthlyData || []} />
// // //       <TransactionsTable transactions={data?.transactions || []} />
// // //     </>
// // //   );
// // // }

// // // /* ===========================
// // //    TOP HEADER
// // //    =========================== */
// // // function TopHeader({ userName }: { userName: string }) {
// // //   return (
// // //     <header className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
// // //       <div>
// // //         <h2 style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Welcome back, {userName}</h2>
// // //         <p style={{ fontSize: "15px", color: "#3e4a3d", marginTop: "4px" }}>Here is your wealth overview for today.</p>
// // //       </div>
// // //     </header>
// // //   );
// // // }

// // // /* ===========================
// // //    KPI ROW
// // //    =========================== */
// // // function KPIRow({ totalSavings, monthlyContributions, groupCount, memberCount, healthScore }: {
// // //   totalSavings: number; monthlyContributions: number; groupCount: number; memberCount: number; healthScore: number;
// // // }) {
// // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// // //   return (
// // //     <section className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
// // //       {[
// // //         { label: "Total Saved", value: formatNaira(totalSavings), sub: "All time", icon: "savings", color: "#006b2c", bg: "rgba(0,107,44,0.06)" },
// // //         { label: "This Month", value: formatNaira(monthlyContributions), sub: monthlyContributions > 0 ? "Keep going" : "Start now", icon: "payments", color: "#565e74", bg: "rgba(86,94,116,0.06)" },
// // //         { label: "Active Groups", value: groupCount.toString(), sub: `${memberCount} members`, icon: "groups", color: "#825100", bg: "rgba(130,81,0,0.06)" },
// // //         { label: "Health Score", value: `${healthScore}/100`, icon: "verified_user", color: "#006b2c", bg: "rgba(0,107,44,0.06)", progress: healthScore },
// // //       ].map((kpi) => (
// // //         <div key={kpi.label} className="kpi-card" style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "22px", transition: "transform 0.2s", cursor: "default" }}
// // //           onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
// // //           onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
// // //           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
// // //             <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{kpi.label}</span>
// // //             <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
// // //               <span className="material-symbols-outlined" style={{ color: kpi.color, fontSize: "20px" }}>{kpi.icon}</span>
// // //             </div>
// // //           </div>
// // //           <p style={{ fontSize: "26px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>{kpi.value}</p>
// // //           {kpi.progress ? (
// // //             <div style={{ width: "100%", height: "5px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden", marginTop: "8px" }}>
// // //               <div style={{ height: "100%", width: `${kpi.progress}%`, backgroundColor: kpi.color, borderRadius: "4px", transition: "width 0.5s ease" }} />
// // //             </div>
// // //           ) : (
// // //             <p style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{kpi.sub}</p>
// // //           )}
// // //         </div>
// // //       ))}
// // //       {/* Mobile responsive styles for KPI grid */}
// // //       <style jsx>{`
// // //         @media (max-width: 900px) {
// // //           .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
// // //         }
// // //         @media (max-width: 500px) {
// // //           .kpi-grid { grid-template-columns: 1fr !important; }
// // //           .kpi-card { padding: 18px !important; }
// // //         }
// // //       `}</style>
// // //     </section>
// // //   );
// // // }

// // // /* ===========================
// // //    CHARTS SECTION
// // //    =========================== */
// // // function ChartsSection({ groups, contributions, monthlyData }: { groups: any[]; contributions: any[]; monthlyData: any[] }) {
// // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
// // //   const maxAmount = Math.max(...monthlyData.map((m: any) => m.amount), 1);
// // //   const totalContributionsThisYear = monthlyData.reduce((s: number, m: any) => s + m.amount, 0);

// // //   return (
// // //     <section className="charts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px", marginBottom: "32px" }}>
// // //       {/* Contribution History Chart */}
// // //       <div className="chart-main" style={{ gridColumn: "span 8", background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "28px", display: "flex", flexDirection: "column" }}>
// // //         <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
// // //           <div>
// // //             <h3 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Contribution History</h3>
// // //             <p style={{ fontSize: "13px", color: "#6e7b6c", marginTop: "2px" }}>Last 6 months</p>
// // //           </div>
// // //           <div style={{ textAlign: "right" }}>
// // //             <p style={{ fontSize: "22px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(totalContributionsThisYear)}</p>
// // //             <p style={{ fontSize: "12px", color: "#6e7b6c" }}>total this period</p>
// // //           </div>
// // //         </div>

// // //         <div className="bar-chart" style={{ flex: 1, minHeight: "260px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "0 4px", marginTop: "8px" }}>
// // //           {monthlyData.map((m: any, i: number) => {
// // //             const height = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, 4) : 4;
// // //             const isCurrentMonth = i === monthlyData.length - 1;
// // //             return (
// // //               <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
// // //                 <div style={{ position: "relative", width: "100%", height: `${height}%`, minHeight: "4px" }}>
// // //                   <div style={{
// // //                     position: "absolute", bottom: 0, left: 0, right: 0,
// // //                     background: isCurrentMonth ? "linear-gradient(180deg, #006b2c 0%, #00873a 100%)" : "linear-gradient(180deg, rgba(0,107,44,0.4) 0%, rgba(0,107,44,0.15) 100%)",
// // //                     borderRadius: "8px 8px 4px 4px", height: "100%",
// // //                     transition: "height 0.5s ease", cursor: "pointer",
// // //                   }}
// // //                     onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
// // //                     onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
// // //                     title={`${m.month}: ${formatNaira(m.amount)} (${m.count} contributions)`}
// // //                   />
// // //                   {m.amount > 0 && (
// // //                     <div className="bar-label" style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", fontSize: "11px", fontWeight: 700, color: isCurrentMonth ? "#006b2c" : "#3e4a3d", whiteSpace: "nowrap" }}>
// // //                       {formatNaira(m.amount)}
// // //                     </div>
// // //                   )}
// // //                 </div>
// // //                 <span style={{ fontSize: "12px", fontWeight: 600, color: isCurrentMonth ? "#006b2c" : "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{m.month}</span>
// // //               </div>
// // //             );
// // //           })}
// // //         </div>
// // //       </div>

// // //       {/* Right Column */}
// // //       <div className="chart-sidebar" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: "20px" }}>
// // //         {/* Group Portfolio */}
// // //         <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "24px", flex: 1 }}>
// // //           <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Your Groups</h3>
// // //           {groups.length === 0 ? (
// // //             <div style={{ textAlign: "center", padding: "30px 0" }}>
// // //               <span className="material-symbols-outlined" style={{ fontSize: "44px", color: "#bdcaba", display: "block", marginBottom: "12px" }}>groups</span>
// // //               <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "16px" }}>No groups yet</p>
// // //               <Link href="/groups/create" style={{ color: "#006b2c", fontWeight: 600, fontSize: "14px", textDecoration: "underline" }}>Create your first group</Link>
// // //             </div>
// // //           ) : (
// // //             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
// // //               {groups.slice(0, 4).map((g: any) => (
// // //                 <Link key={g.id} href={`/groups/${g.id}`} className="group-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "#f8fafc", textDecoration: "none", color: "inherit", transition: "background 0.15s", flexWrap: "wrap", gap: "8px" }}
// // //                   onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
// // //                   onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; }}>
// // //                   <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// // //                     <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(0,107,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// // //                       <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>account_balance</span>
// // //                     </div>
// // //                     <div>
// // //                       <p style={{ fontSize: "14px", fontWeight: 600 }}>{g.name}</p>
// // //                       <p style={{ fontSize: "11px", color: "#6e7b6c" }}>{g.member_count || 0}/{g.max_members || 20} members</p>
// // //                     </div>
// // //                   </div>
// // //                   <span style={{ fontSize: "14px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(g.pool_amount || 0)}</span>
// // //                 </Link>
// // //               ))}
// // //               {groups.length > 4 && (
// // //                 <Link href="/groups" style={{ textAlign: "center", fontSize: "13px", color: "#006b2c", fontWeight: 600, textDecoration: "underline", padding: "8px" }}>
// // //                   +{groups.length - 4} more groups
// // //                 </Link>
// // //               )}
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* AI Insight — Garden Green */}
// // //         <div style={{ backgroundColor: "#00873a", color: "#f7fff2", padding: "24px", borderRadius: "14px", position: "relative", overflow: "hidden", border: "1px solid rgba(0,107,44,0.2)", boxShadow: "0 10px 15px -3px rgba(0,107,44,0.1), 0 4px 6px -2px rgba(0,107,44,0.05)" }}>
// // //           <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle at center, rgba(0,107,44,0.05) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
// // //           <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", position: "relative", zIndex: 10 }}>
// // //             <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>auto_awesome</span>
// // //             <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Insight</span>
// // //           </div>
// // //           <p style={{ fontSize: "15px", position: "relative", zIndex: 10, fontWeight: 500, lineHeight: 1.5 }}>
// // //             {contributions.length === 0
// // //               ? "Start your wealth journey by creating or joining a savings group. Every contribution builds your financial future."
// // //               : groups.length > 0
// // //                 ? `You have ${groups.length} active group${groups.length > 1 ? "s" : ""} with ${contributions.filter((c: any) => c.status === "completed").length} completed contributions. Your most recent was ${formatNaira(contributions[0]?.amount || 0)} to ${contributions[0]?.groups?.name || "a group"}.`
// // //                 : `You've made ${contributions.length} contribution${contributions.length > 1 ? "s" : ""} totaling ${formatNaira(contributions.reduce((s: number, c: any) => s + c.amount, 0))}.`}
// // //           </p>
// // //           <Link href={groups.length > 0 ? "/groups" : "/groups/create"} style={{ marginTop: "20px", fontSize: "13px", fontWeight: 700, color: "#f7fff2", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", position: "relative", zIndex: 10 }}>
// // //             {groups.length > 0 ? "View your groups" : "Create a group"}
// // //             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
// // //           </Link>
// // //         </div>
// // //       </div>

// // //       {/* Mobile responsive styles for Charts */}
// // //       <style jsx>{`
// // //         @media (max-width: 900px) {
// // //           .charts-grid { grid-template-columns: 1fr !important; }
// // //           .chart-main { grid-column: span 1 !important; }
// // //           .chart-sidebar { grid-column: span 1 !important; }
// // //           .bar-chart { min-height: 200px !important; }
// // //           .bar-label { font-size: 10px !important; }
// // //         }
// // //         @media (max-width: 500px) {
// // //           .chart-header { flex-direction: column !important; align-items: flex-start !important; }
// // //           .chart-header > div:last-child { text-align: left !important; }
// // //           .bar-chart { min-height: 160px !important; gap: 6px !important; }
// // //           .group-row { flex-direction: column !important; align-items: flex-start !important; }
// // //         }
// // //       `}</style>
// // //     </section>
// // //   );
// // // }

// // // /* ===========================
// // //    TRANSACTIONS TABLE
// // //    =========================== */
// // // function TransactionsTable({ transactions }: { transactions: any[] }) {
// // //   const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
// // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// // //   return (
// // //     <section className="tx-section" style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", overflow: "hidden", marginBottom: "40px" }}>
// // //       <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(189,202,186,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// // //         <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Recent Transactions</h3>
// // //         <Link href="/payments" style={{ fontSize: "13px", color: "#006b2c", fontWeight: 600, textDecoration: "none" }}>View all</Link>
// // //       </div>
// // //       <div className="tx-table-wrap" style={{ overflowX: "auto" }}>
// // //         {!transactions || transactions.length === 0 ? (
// // //           <div style={{ padding: "60px 24px", textAlign: "center" }}>
// // //             <span className="material-symbols-outlined" style={{ fontSize: "44px", display: "block", marginBottom: "12px", color: "#bdcaba" }}>receipt_long</span>
// // //             <p style={{ fontSize: "14px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>No transactions yet. Start contributing to see your activity.</p>
// // //           </div>
// // //         ) : (
// // //           <table className="tx-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: "600px" }}>
// // //             <thead>
// // //               <tr style={{ backgroundColor: "#f8fafc", fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>
// // //                 <th style={{ padding: "14px 24px" }}>Type</th>
// // //                 <th style={{ padding: "14px 24px" }}>Reference</th>
// // //                 <th style={{ padding: "14px 24px" }}>Date</th>
// // //                 <th style={{ padding: "14px 24px" }}>Amount</th>
// // //                 <th style={{ padding: "14px 24px" }}>Status</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody style={{ borderTop: "1px solid rgba(189,202,186,0.15)" }}>
// // //               {transactions.map((tx: any) => (
// // //                 <tr key={tx.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.1)", transition: "background 0.15s", cursor: "pointer" }}
// // //                   onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
// // //                   onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
// // //                   <td style={{ padding: "14px 24px" }}>
// // //                     <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
// // //                       <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(0,107,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// // //                         <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#006b2c" }}>payments</span>
// // //                       </div>
// // //                       <span style={{ fontSize: "14px", fontWeight: 500, textTransform: "capitalize" }}>{tx.type || "Transaction"}</span>
// // //                     </div>
// // //                   </td>
// // //                   <td style={{ padding: "14px 24px", fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "#6e7b6c" }}>{tx.monnify_ref?.slice(0, 14) || "N/A"}</td>
// // //                   <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(tx.created_at)}</td>
// // //                   <td style={{ padding: "14px 24px", fontWeight: 600, fontSize: "14px" }}>{formatNaira(tx.amount || 0)}</td>
// // //                   <td style={{ padding: "14px 24px" }}>
// // //                     <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: tx.status === "completed" ? "#f0fdf4" : "#fefce8", color: tx.status === "completed" ? "#006b2c" : "#825100" }}>
// // //                       {tx.status === "completed" ? "Completed" : "Pending"}
// // //                     </span>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //             </tbody>
// // //           </table>
// // //         )}
// // //       </div>

// // //       {/* Mobile responsive styles for Table */}
// // //       <style jsx>{`
// // //         @media (max-width: 768px) {
// // //           .tx-table { font-size: 12px !important; }
// // //           .tx-table th, .tx-table td { padding: 10px 14px !important; }
// // //           .tx-section { border-radius: 10px !important; }
// // //         }
// // //         @media (max-width: 500px) {
// // //           .tx-table th, .tx-table td { padding: 8px 10px !important; font-size: 11px !important; }
// // //         }
// // //       `}</style>
// // //     </section>
// // //   );
// // // }



// // // // "use client";

// // // // import Link from "next/link";
// // // // import { useEffect, useState, useCallback } from "react";
// // // // import { createClient } from "@/lib/supabase/client";

// // // // export default function DashboardPage() {
// // // //   const [data, setData] = useState<any>(null);
// // // //   const [loading, setLoading] = useState(true);
// // // //   const supabase = createClient();

// // // //   const fetchDashboardData = useCallback(async () => {
// // // //     setLoading(true);
    
// // // //     const { data: { user } } = await supabase.auth.getUser();
// // // //     if (!user) return;

// // // //     const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

// // // //     const { data: memberships } = await supabase.from("group_members").select("group_id, groups(*)").eq("user_id", user.id);

// // // //     const { data: contributions } = await supabase.from("contributions").select("amount, status, created_at, transaction_ref, group_id, groups(name)").eq("user_id", user.id).order("created_at", { ascending: false });

// // // //     const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);

// // // //     const groups = memberships?.map((m: any) => m.groups) || [];
// // // //     const totalMembers = groups.reduce((sum: number, g: any) => sum + (g.member_count || 0), 0);
    
// // // //     const completedContributions = (contributions || []).filter((c: any) => c.status === "completed");
// // // //     const totalSavings = completedContributions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

// // // //     const monthlyData: { month: string; amount: number; count: number }[] = [];
// // // //     const now = new Date();
// // // //     for (let i = 5; i >= 0; i--) {
// // // //       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
// // // //       const monthKey = d.toLocaleDateString("en-US", { month: "short" });
// // // //       const monthContributions = (contributions || []).filter((c: any) => {
// // // //         const cd = new Date(c.created_at);
// // // //         return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear() && c.status === "completed";
// // // //       });
// // // //       monthlyData.push({
// // // //         month: monthKey,
// // // //         amount: monthContributions.reduce((s: number, c: any) => s + c.amount, 0),
// // // //         count: monthContributions.length,
// // // //       });
// // // //     }

// // // //     const thisMonth = (contributions || []).filter((c: any) => {
// // // //       const d = new Date(c.created_at);
// // // //       return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
// // // //     });
// // // //     const monthlyContributions = thisMonth.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

// // // //     const completedCount = completedContributions.length;
// // // //     const totalCount = (contributions || []).length || 1;
// // // //     const healthScore = Math.round((completedCount / totalCount) * 100);

// // // //     setData({
// // // //       userName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
// // // //       totalSavings,
// // // //       monthlyContributions,
// // // //       groupCount: groups.length,
// // // //       memberCount: totalMembers,
// // // //       healthScore,
// // // //       transactions: transactions || [],
// // // //       groups,
// // // //       contributions: contributions || [],
// // // //       monthlyData,
// // // //     });
// // // //     setLoading(false);
// // // //   }, [supabase]);

// // // //   useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

// // // //   useEffect(() => {
// // // //     const handleFocus = () => fetchDashboardData();
// // // //     window.addEventListener("focus", handleFocus);
// // // //     return () => window.removeEventListener("focus", handleFocus);
// // // //   }, [fetchDashboardData]);

// // // //   if (loading) {
// // // //     return (
// // // //       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
// // // //         Loading your dashboard...
// // // //       </div>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <>
// // // //       <TopHeader userName={data?.userName || "User"} />
// // // //       <KPIRow totalSavings={data?.totalSavings || 0} monthlyContributions={data?.monthlyContributions || 0} groupCount={data?.groupCount || 0} memberCount={data?.memberCount || 0} healthScore={data?.healthScore || 0} />
// // // //       <ChartsSection groups={data?.groups || []} contributions={data?.contributions || []} monthlyData={data?.monthlyData || []} />
// // // //       <TransactionsTable transactions={data?.transactions || []} />
// // // //     </>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TOP HEADER
// // // //    =========================== */
// // // // function TopHeader({ userName }: { userName: string }) {
// // // //   return (
// // // //     <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
// // // //       <div>
// // // //         <h2 style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Welcome back, {userName}</h2>
// // // //         <p style={{ fontSize: "15px", color: "#3e4a3d", marginTop: "4px" }}>Here is your wealth overview for today.</p>
// // // //       </div>
// // // //     </header>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    KPI ROW
// // // //    =========================== */
// // // // function KPIRow({ totalSavings, monthlyContributions, groupCount, memberCount, healthScore }: {
// // // //   totalSavings: number; monthlyContributions: number; groupCount: number; memberCount: number; healthScore: number;
// // // // }) {
// // // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// // // //   return (
// // // //     <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
// // // //       {[
// // // //         { label: "Total Saved", value: formatNaira(totalSavings), sub: "All time", icon: "savings", color: "#006b2c", bg: "rgba(0,107,44,0.06)" },
// // // //         { label: "This Month", value: formatNaira(monthlyContributions), sub: monthlyContributions > 0 ? "Keep going" : "Start now", icon: "payments", color: "#565e74", bg: "rgba(86,94,116,0.06)" },
// // // //         { label: "Active Groups", value: groupCount.toString(), sub: `${memberCount} members`, icon: "groups", color: "#825100", bg: "rgba(130,81,0,0.06)" },
// // // //         { label: "Health Score", value: `${healthScore}/100`, icon: "verified_user", color: "#006b2c", bg: "rgba(0,107,44,0.06)", progress: healthScore },
// // // //       ].map((kpi) => (
// // // //         <div key={kpi.label} style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "22px", transition: "transform 0.2s", cursor: "default" }}
// // // //           onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
// // // //           onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
// // // //           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
// // // //             <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>{kpi.label}</span>
// // // //             <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
// // // //               <span className="material-symbols-outlined" style={{ color: kpi.color, fontSize: "20px" }}>{kpi.icon}</span>
// // // //             </div>
// // // //           </div>
// // // //           <p style={{ fontSize: "26px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#0b1c30", marginBottom: "4px" }}>{kpi.value}</p>
// // // //           {kpi.progress ? (
// // // //             <div style={{ width: "100%", height: "5px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden", marginTop: "8px" }}>
// // // //               <div style={{ height: "100%", width: `${kpi.progress}%`, backgroundColor: kpi.color, borderRadius: "4px", transition: "width 0.5s ease" }} />
// // // //             </div>
// // // //           ) : (
// // // //             <p style={{ fontSize: "12px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{kpi.sub}</p>
// // // //           )}
// // // //         </div>
// // // //       ))}
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    CHARTS SECTION
// // // //    =========================== */
// // // // function ChartsSection({ groups, contributions, monthlyData }: { groups: any[]; contributions: any[]; monthlyData: any[] }) {
// // // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
// // // //   const maxAmount = Math.max(...monthlyData.map((m: any) => m.amount), 1);
// // // //   const totalContributionsThisYear = monthlyData.reduce((s: number, m: any) => s + m.amount, 0);

// // // //   return (
// // // //     <section style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "20px", marginBottom: "32px" }}>
// // // //       {/* Contribution History Chart */}
// // // //       <div style={{ gridColumn: "span 8", background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "28px", display: "flex", flexDirection: "column" }}>
// // // //         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
// // // //           <div>
// // // //             <h3 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Contribution History</h3>
// // // //             <p style={{ fontSize: "13px", color: "#6e7b6c", marginTop: "2px" }}>Last 6 months</p>
// // // //           </div>
// // // //           <div style={{ textAlign: "right" }}>
// // // //             <p style={{ fontSize: "22px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(totalContributionsThisYear)}</p>
// // // //             <p style={{ fontSize: "12px", color: "#6e7b6c" }}>total this period</p>
// // // //           </div>
// // // //         </div>

// // // //         <div style={{ flex: 1, minHeight: "260px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "0 4px", marginTop: "8px" }}>
// // // //           {monthlyData.map((m: any, i: number) => {
// // // //             const height = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, 4) : 4;
// // // //             const isCurrentMonth = i === monthlyData.length - 1;
// // // //             return (
// // // //               <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
// // // //                 <div style={{ position: "relative", width: "100%", height: `${height}%`, minHeight: "4px" }}>
// // // //                   <div style={{
// // // //                     position: "absolute", bottom: 0, left: 0, right: 0,
// // // //                     background: isCurrentMonth ? "linear-gradient(180deg, #006b2c 0%, #00873a 100%)" : "linear-gradient(180deg, rgba(0,107,44,0.4) 0%, rgba(0,107,44,0.15) 100%)",
// // // //                     borderRadius: "8px 8px 4px 4px", height: "100%",
// // // //                     transition: "height 0.5s ease", cursor: "pointer",
// // // //                   }}
// // // //                     onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
// // // //                     onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
// // // //                     title={`${m.month}: ${formatNaira(m.amount)} (${m.count} contributions)`}
// // // //                   />
// // // //                   {m.amount > 0 && (
// // // //                     <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", fontSize: "11px", fontWeight: 700, color: isCurrentMonth ? "#006b2c" : "#3e4a3d", whiteSpace: "nowrap" }}>
// // // //                       {formatNaira(m.amount)}
// // // //                     </div>
// // // //                   )}
// // // //                 </div>
// // // //                 <span style={{ fontSize: "12px", fontWeight: 600, color: isCurrentMonth ? "#006b2c" : "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>{m.month}</span>
// // // //               </div>
// // // //             );
// // // //           })}
// // // //         </div>
// // // //       </div>

// // // //       {/* Right Column */}
// // // //       <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: "20px" }}>
// // // //         {/* Group Portfolio */}
// // // //         <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", padding: "24px", flex: 1 }}>
// // // //           <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Your Groups</h3>
// // // //           {groups.length === 0 ? (
// // // //             <div style={{ textAlign: "center", padding: "30px 0" }}>
// // // //               <span className="material-symbols-outlined" style={{ fontSize: "44px", color: "#bdcaba", display: "block", marginBottom: "12px" }}>groups</span>
// // // //               <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "16px" }}>No groups yet</p>
// // // //               <Link href="/groups/create" style={{ color: "#006b2c", fontWeight: 600, fontSize: "14px", textDecoration: "underline" }}>Create your first group</Link>
// // // //             </div>
// // // //           ) : (
// // // //             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
// // // //               {groups.slice(0, 4).map((g: any) => (
// // // //                 <Link key={g.id} href={`/groups/${g.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: "#f8fafc", textDecoration: "none", color: "inherit", transition: "background 0.15s" }}
// // // //                   onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
// // // //                   onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; }}>
// // // //                   <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// // // //                     <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(0,107,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// // // //                       <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>account_balance</span>
// // // //                     </div>
// // // //                     <div>
// // // //                       <p style={{ fontSize: "14px", fontWeight: 600 }}>{g.name}</p>
// // // //                       <p style={{ fontSize: "11px", color: "#6e7b6c" }}>{g.member_count || 0}/{g.max_members || 20} members</p>
// // // //                     </div>
// // // //                   </div>
// // // //                   <span style={{ fontSize: "14px", fontWeight: 700, color: "#006b2c" }}>{formatNaira(g.pool_amount || 0)}</span>
// // // //                 </Link>
// // // //               ))}
// // // //               {groups.length > 4 && (
// // // //                 <Link href="/groups" style={{ textAlign: "center", fontSize: "13px", color: "#006b2c", fontWeight: 600, textDecoration: "underline", padding: "8px" }}>
// // // //                   +{groups.length - 4} more groups
// // // //                 </Link>
// // // //               )}
// // // //             </div>
// // // //           )}
// // // //         </div>

// // // //         {/* AI Insight — Garden Green */}
// // // //         <div style={{ backgroundColor: "#00873a", color: "#f7fff2", padding: "24px", borderRadius: "14px", position: "relative", overflow: "hidden", border: "1px solid rgba(0,107,44,0.2)", boxShadow: "0 10px 15px -3px rgba(0,107,44,0.1), 0 4px 6px -2px rgba(0,107,44,0.05)" }}>
// // // //           <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle at center, rgba(0,107,44,0.05) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
// // // //           <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", position: "relative", zIndex: 10 }}>
// // // //             <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>auto_awesome</span>
// // // //             <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Insight</span>
// // // //           </div>
// // // //           <p style={{ fontSize: "15px", position: "relative", zIndex: 10, fontWeight: 500, lineHeight: 1.5 }}>
// // // //             {contributions.length === 0
// // // //               ? "Start your wealth journey by creating or joining a savings group. Every contribution builds your financial future."
// // // //               : groups.length > 0
// // // //                 ? `You have ${groups.length} active group${groups.length > 1 ? "s" : ""} with ${contributions.filter((c: any) => c.status === "completed").length} completed contributions. Your most recent was ${formatNaira(contributions[0]?.amount || 0)} to ${contributions[0]?.groups?.name || "a group"}.`
// // // //                 : `You've made ${contributions.length} contribution${contributions.length > 1 ? "s" : ""} totaling ${formatNaira(contributions.reduce((s: number, c: any) => s + c.amount, 0))}.`}
// // // //           </p>
// // // //           <Link href={groups.length > 0 ? "/groups" : "/groups/create"} style={{ marginTop: "20px", fontSize: "13px", fontWeight: 700, color: "#f7fff2", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", position: "relative", zIndex: 10 }}>
// // // //             {groups.length > 0 ? "View your groups" : "Create a group"}
// // // //             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
// // // //           </Link>
// // // //         </div>
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TRANSACTIONS TABLE
// // // //    =========================== */
// // // // function TransactionsTable({ transactions }: { transactions: any[] }) {
// // // //   const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
// // // //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// // // //   return (
// // // //     <section style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 12px rgba(15,23,42,0.04)", borderRadius: "14px", overflow: "hidden", marginBottom: "40px" }}>
// // // //       <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(189,202,186,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
// // // //         <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Recent Transactions</h3>
// // // //         <Link href="/payments" style={{ fontSize: "13px", color: "#006b2c", fontWeight: 600, textDecoration: "none" }}>View all</Link>
// // // //       </div>
// // // //       <div style={{ overflowX: "auto" }}>
// // // //         {!transactions || transactions.length === 0 ? (
// // // //           <div style={{ padding: "60px 24px", textAlign: "center" }}>
// // // //             <span className="material-symbols-outlined" style={{ fontSize: "44px", display: "block", marginBottom: "12px", color: "#bdcaba" }}>receipt_long</span>
// // // //             <p style={{ fontSize: "14px", color: "#6e7b6c", fontFamily: "'Geist', sans-serif" }}>No transactions yet. Start contributing to see your activity.</p>
// // // //           </div>
// // // //         ) : (
// // // //           <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
// // // //             <thead>
// // // //               <tr style={{ backgroundColor: "#f8fafc", fontSize: "11px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#6e7b6c", textTransform: "uppercase", letterSpacing: "0.05em" }}>
// // // //                 <th style={{ padding: "14px 24px" }}>Type</th>
// // // //                 <th style={{ padding: "14px 24px" }}>Reference</th>
// // // //                 <th style={{ padding: "14px 24px" }}>Date</th>
// // // //                 <th style={{ padding: "14px 24px" }}>Amount</th>
// // // //                 <th style={{ padding: "14px 24px" }}>Status</th>
// // // //               </tr>
// // // //             </thead>
// // // //             <tbody style={{ borderTop: "1px solid rgba(189,202,186,0.15)" }}>
// // // //               {transactions.map((tx: any) => (
// // // //                 <tr key={tx.id} style={{ borderBottom: "1px solid rgba(189,202,186,0.1)", transition: "background 0.15s", cursor: "pointer" }}
// // // //                   onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
// // // //                   onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
// // // //                   <td style={{ padding: "14px 24px" }}>
// // // //                     <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
// // // //                       <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(0,107,44,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// // // //                         <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#006b2c" }}>payments</span>
// // // //                       </div>
// // // //                       <span style={{ fontSize: "14px", fontWeight: 500, textTransform: "capitalize" }}>{tx.type || "Transaction"}</span>
// // // //                     </div>
// // // //                   </td>
// // // //                   <td style={{ padding: "14px 24px", fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "#6e7b6c" }}>{tx.monnify_ref?.slice(0, 14) || "N/A"}</td>
// // // //                   <td style={{ padding: "14px 24px", fontSize: "13px", color: "#3e4a3d" }}>{formatDate(tx.created_at)}</td>
// // // //                   <td style={{ padding: "14px 24px", fontWeight: 600, fontSize: "14px" }}>{formatNaira(tx.amount || 0)}</td>
// // // //                   <td style={{ padding: "14px 24px" }}>
// // // //                     <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: tx.status === "completed" ? "#f0fdf4" : "#fefce8", color: tx.status === "completed" ? "#006b2c" : "#825100" }}>
// // // //                       {tx.status === "completed" ? "Completed" : "Pending"}
// // // //                     </span>
// // // //                   </td>
// // // //                 </tr>
// // // //               ))}
// // // //             </tbody>
// // // //           </table>
// // // //         )}
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }



// // // // "use client";

// // // // import Link from "next/link";

// // // // export default function DashboardPage() {
// // // //   return (
// // // //     <>
// // // //       <TopHeader />
// // // //       <KPIRow />
// // // //       <ChartsSection />
// // // //       <TransactionsTable />
// // // //     </>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TOP HEADER
// // // //    =========================== */
// // // // function TopHeader() {
// // // //   return (
// // // //     <header
// // // //       style={{
// // // //         display: "flex",
// // // //         justifyContent: "space-between",
// // // //         alignItems: "center",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       <div>
// // // //         <h2
// // // //           style={{
// // // //             fontSize: "24px",
// // // //             lineHeight: "32px",
// // // //             letterSpacing: "-0.01em",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Inter', sans-serif",
// // // //             color: "#0b1c30",
// // // //           }}
// // // //         >
// // // //           Welcome back, Admin
// // // //         </h2>
// // // //         <p
// // // //           style={{
// // // //             fontSize: "16px",
// // // //             lineHeight: "24px",
// // // //             color: "#3e4a3d",
// // // //           }}
// // // //         >
// // // //           Here is your institutional wealth overview for today.
// // // //         </p>
// // // //       </div>
// // // //       <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
// // // //         <div style={{ position: "relative", width: "256px" }}>
// // // //           <span
// // // //             className="material-symbols-outlined"
// // // //             style={{
// // // //               position: "absolute",
// // // //               left: "12px",
// // // //               top: "50%",
// // // //               transform: "translateY(-50%)",
// // // //               color: "#6e7b6c",
// // // //             }}
// // // //           >
// // // //             search
// // // //           </span>
// // // //           <input
// // // //             type="text"
// // // //             placeholder="Search analytics..."
// // // //             style={{
// // // //               width: "100%",
// // // //               backgroundColor: "#eff4ff",
// // // //               border: "1px solid rgba(189, 202, 186, 0.5)",
// // // //               borderRadius: "12px",
// // // //               padding: "8px 16px 8px 40px",
// // // //               fontSize: "14px",
// // // //               lineHeight: "20px",
// // // //               letterSpacing: "0.01em",
// // // //               fontWeight: 500,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               outline: "none",
// // // //               transition: "all 0.2s",
// // // //               boxSizing: "border-box",
// // // //             }}
// // // //           />
// // // //         </div>
// // // //         <button
// // // //           style={{
// // // //             width: "40px",
// // // //             height: "40px",
// // // //             display: "flex",
// // // //             alignItems: "center",
// // // //             justifyContent: "center",
// // // //             borderRadius: "50%",
// // // //             backgroundColor: "#e5eeff",
// // // //             border: "none",
// // // //             cursor: "pointer",
// // // //             color: "#3e4a3d",
// // // //             position: "relative",
// // // //             transition: "background-color 0.2s",
// // // //           }}
// // // //         >
// // // //           <span className="material-symbols-outlined">notifications</span>
// // // //           <span
// // // //             style={{
// // // //               position: "absolute",
// // // //               top: "8px",
// // // //               right: "10px",
// // // //               width: "8px",
// // // //               height: "8px",
// // // //               backgroundColor: "#ba1a1a",
// // // //               borderRadius: "50%",
// // // //               border: "2px solid #f8f9ff",
// // // //             }}
// // // //           />
// // // //         </button>
// // // //       </div>
// // // //     </header>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    KPI ROW
// // // //    =========================== */
// // // // function KPIRow() {
// // // //   const kpis = [
// // // //     {
// // // //       label: "Total Savings",
// // // //       value: "₦45,500,000",
// // // //       change: "+2.4% vs last month",
// // // //       icon: "savings",
// // // //       iconBg: "rgba(0, 107, 44, 0.1)",
// // // //       iconColor: "#006b2c",
// // // //       trend: "trending_up",
// // // //     },
// // // //     {
// // // //       label: "Monthly Contributions",
// // // //       value: "₦8,240,500",
// // // //       change: "+12% growth",
// // // //       icon: "payments",
// // // //       iconBg: "rgba(86, 94, 116, 0.1)",
// // // //       iconColor: "#565e74",
// // // //       trend: "arrow_upward",
// // // //     },
// // // //     {
// // // //       label: "Active Groups",
// // // //       value: "42",
// // // //       change: "1,240 Total Members",
// // // //       icon: "group",
// // // //       iconBg: "rgba(130, 81, 0, 0.1)",
// // // //       iconColor: "#825100",
// // // //       trend: "person",
// // // //     },
// // // //     {
// // // //       label: "Health Score",
// // // //       value: "94",
// // // //       suffix: "/100",
// // // //       icon: "verified_user",
// // // //       iconBg: "rgba(0, 107, 44, 0.1)",
// // // //       iconColor: "#006b2c",
// // // //       progress: 94,
// // // //     },
// // // //   ];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         display: "grid",
// // // //         gridTemplateColumns: "repeat(4, 1fr)",
// // // //         gap: "24px",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       {kpis.map((kpi) => (
// // // //         <div
// // // //           key={kpi.label}
// // // //           style={{
// // // //             background: "rgba(255, 255, 255, 0.8)",
// // // //             backdropFilter: "blur(12px)",
// // // //             border: "1px solid #E2E8F0",
// // // //             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             cursor: "pointer",
// // // //             transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
// // // //           }}
// // // //           onMouseEnter={(e) => {
// // // //             e.currentTarget.style.transform = "translateY(-2px)";
// // // //           }}
// // // //           onMouseLeave={(e) => {
// // // //             e.currentTarget.style.transform = "translateY(0)";
// // // //           }}
// // // //         >
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               justifyContent: "space-between",
// // // //               alignItems: "flex-start",
// // // //               marginBottom: "8px",
// // // //             }}
// // // //           >
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "14px",
// // // //                 lineHeight: "20px",
// // // //                 letterSpacing: "0.01em",
// // // //                 fontWeight: 500,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 color: "#3e4a3d",
// // // //               }}
// // // //             >
// // // //               {kpi.label}
// // // //             </span>
// // // //             <span
// // // //               className="material-symbols-outlined"
// // // //               style={{
// // // //                 padding: "6px",
// // // //                 borderRadius: "8px",
// // // //                 backgroundColor: kpi.iconBg,
// // // //                 color: kpi.iconColor,
// // // //                 fontSize: "20px",
// // // //               }}
// // // //             >
// // // //               {kpi.icon}
// // // //             </span>
// // // //           </div>
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               alignItems: "baseline",
// // // //               gap: "8px",
// // // //               marginBottom: kpi.progress ? "12px" : "8px",
// // // //             }}
// // // //           >
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "24px",
// // // //                 lineHeight: "32px",
// // // //                 letterSpacing: "-0.01em",
// // // //                 fontWeight: 700,
// // // //                 fontFamily: "'Inter', sans-serif",
// // // //               }}
// // // //             >
// // // //               {kpi.value}
// // // //             </span>
// // // //             {kpi.suffix && (
// // // //               <span
// // // //                 style={{
// // // //                   fontSize: "14px",
// // // //                   lineHeight: "20px",
// // // //                   letterSpacing: "0.01em",
// // // //                   fontWeight: 500,
// // // //                   fontFamily: "'Geist', sans-serif",
// // // //                   color: "#3e4a3d",
// // // //                 }}
// // // //               >
// // // //                 {kpi.suffix}
// // // //               </span>
// // // //             )}
// // // //           </div>
// // // //           {kpi.progress ? (
// // // //             <div
// // // //               style={{
// // // //                 width: "100%",
// // // //                 height: "6px",
// // // //                 backgroundColor: "#dce9ff",
// // // //                 borderRadius: "9999px",
// // // //                 overflow: "hidden",
// // // //               }}
// // // //             >
// // // //               <div
// // // //                 style={{
// // // //                   height: "100%",
// // // //                   width: `${kpi.progress}%`,
// // // //                   backgroundColor: "#006b2c",
// // // //                 }}
// // // //               />
// // // //             </div>
// // // //           ) : (
// // // //             <div
// // // //               style={{
// // // //                 display: "flex",
// // // //                 alignItems: "center",
// // // //                 gap: "4px",
// // // //                 color: "#006b2c",
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 600,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //               }}
// // // //             >
// // // //               <span
// // // //                 className="material-symbols-outlined"
// // // //                 style={{ fontSize: "16px" }}
// // // //               >
// // // //                 {kpi.trend}
// // // //               </span>
// // // //               <span>{kpi.change}</span>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       ))}
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    CHARTS SECTION
// // // //    =========================== */
// // // // function ChartsSection() {
// // // //   const bars = [40, 55, 45, 70, 85, 100];
// // // //   const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         display: "grid",
// // // //         gridTemplateColumns: "repeat(12, 1fr)",
// // // //         gap: "24px",
// // // //         marginBottom: "40px",
// // // //         alignItems: "stretch",
// // // //       }}
// // // //     >
// // // //       {/* Savings Growth Chart */}
// // // //       <div
// // // //         style={{
// // // //           gridColumn: "span 8",
// // // //           background: "rgba(255, 255, 255, 0.8)",
// // // //           backdropFilter: "blur(12px)",
// // // //           border: "1px solid #E2E8F0",
// // // //           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //           padding: "24px",
// // // //           borderRadius: "12px",
// // // //           display: "flex",
// // // //           flexDirection: "column",
// // // //         }}
// // // //       >
// // // //         <div
// // // //           style={{
// // // //             display: "flex",
// // // //             justifyContent: "space-between",
// // // //             alignItems: "center",
// // // //             marginBottom: "40px",
// // // //           }}
// // // //         >
// // // //           <h3
// // // //             style={{
// // // //               fontSize: "18px",
// // // //               lineHeight: "28px",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Inter', sans-serif",
// // // //             }}
// // // //           >
// // // //             Savings Growth
// // // //           </h3>
// // // //           <select
// // // //             style={{
// // // //               backgroundColor: "#eff4ff",
// // // //               border: "none",
// // // //               fontSize: "12px",
// // // //               lineHeight: "16px",
// // // //               letterSpacing: "0.03em",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               padding: "6px 12px",
// // // //               borderRadius: "8px",
// // // //               outline: "none",
// // // //               cursor: "pointer",
// // // //             }}
// // // //           >
// // // //             <option>Last 6 Months</option>
// // // //             <option>Last Year</option>
// // // //           </select>
// // // //         </div>

// // // //         <div style={{ flex: 1, minHeight: "300px", position: "relative" }}>
// // // //           <div
// // // //             style={{
// // // //               position: "absolute",
// // // //               inset: 0,
// // // //               display: "flex",
// // // //               alignItems: "flex-end",
// // // //               justifyContent: "space-between",
// // // //               padding: "0 8px",
// // // //               gap: "16px",
// // // //             }}
// // // //           >
// // // //             {bars.map((height, i) => (
// // // //               <div
// // // //                 key={i}
// // // //                 style={{
// // // //                   flex: 1,
// // // //                   backgroundColor:
// // // //                     i === bars.length - 1
// // // //                       ? "#006b2c"
// // // //                       : "rgba(0, 107, 44, 0.1)",
// // // //                   borderRadius: "8px 8px 0 0",
// // // //                   height: `${height}%`,
// // // //                   transition: "background-color 0.2s",
// // // //                   cursor: "pointer",
// // // //                   position: "relative",
// // // //                 }}
// // // //                 onMouseEnter={(e) => {
// // // //                   if (i !== bars.length - 1) {
// // // //                     e.currentTarget.style.backgroundColor =
// // // //                       "rgba(0, 107, 44, 0.2)";
// // // //                   }
// // // //                 }}
// // // //                 onMouseLeave={(e) => {
// // // //                   if (i !== bars.length - 1) {
// // // //                     e.currentTarget.style.backgroundColor =
// // // //                       "rgba(0, 107, 44, 0.1)";
// // // //                   }
// // // //                 }}
// // // //               />
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         <div
// // // //           style={{
// // // //             display: "flex",
// // // //             justifyContent: "space-between",
// // // //             marginTop: "16px",
// // // //             fontSize: "12px",
// // // //             lineHeight: "16px",
// // // //             letterSpacing: "0.03em",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             color: "#3e4a3d",
// // // //             padding: "0 8px",
// // // //           }}
// // // //         >
// // // //           {months.map((m) => (
// // // //             <span key={m}>{m}</span>
// // // //           ))}
// // // //         </div>
// // // //       </div>

// // // //       {/* Right Column */}
// // // //       <div
// // // //         style={{
// // // //           gridColumn: "span 4",
// // // //           display: "flex",
// // // //           flexDirection: "column",
// // // //           gap: "24px",
// // // //         }}
// // // //       >
// // // //         {/* Loan Analytics */}
// // // //         <div
// // // //           style={{
// // // //             background: "rgba(255, 255, 255, 0.8)",
// // // //             backdropFilter: "blur(12px)",
// // // //             border: "1px solid #E2E8F0",
// // // //             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             flex: 1,
// // // //             display: "flex",
// // // //             flexDirection: "column",
// // // //           }}
// // // //         >
// // // //           <h3
// // // //             style={{
// // // //               fontSize: "18px",
// // // //               lineHeight: "28px",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Inter', sans-serif",
// // // //               marginBottom: "40px",
// // // //             }}
// // // //           >
// // // //             Loan Analytics
// // // //           </h3>
// // // //           <div
// // // //             style={{
// // // //               flex: 1,
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               justifyContent: "center",
// // // //               position: "relative",
// // // //               padding: "16px 0",
// // // //             }}
// // // //           >
// // // //             <div
// // // //               style={{
// // // //                 width: "160px",
// // // //                 height: "160px",
// // // //                 borderRadius: "50%",
// // // //                 border: "14px solid #e5eeff",
// // // //                 display: "flex",
// // // //                 alignItems: "center",
// // // //                 justifyContent: "center",
// // // //                 position: "relative",
// // // //               }}
// // // //             >
// // // //               <div
// // // //                 style={{
// // // //                   position: "absolute",
// // // //                   inset: "-14px",
// // // //                   borderRadius: "50%",
// // // //                   border: "14px solid #006b2c",
// // // //                   borderRightColor: "transparent",
// // // //                   borderBottomColor: "transparent",
// // // //                   transform: "rotate(45deg)",
// // // //                 }}
// // // //               />
// // // //               <div style={{ textAlign: "center" }}>
// // // //                 <p
// // // //                   style={{
// // // //                     fontSize: "12px",
// // // //                     lineHeight: "16px",
// // // //                     letterSpacing: "0.03em",
// // // //                     fontWeight: 600,
// // // //                     fontFamily: "'Geist', sans-serif",
// // // //                     color: "#3e4a3d",
// // // //                     textTransform: "uppercase",
// // // //                     letterSpacing: "0.05em",
// // // //                   }}
// // // //                 >
// // // //                   Utilization
// // // //                 </p>
// // // //                 <p
// // // //                   style={{
// // // //                     fontSize: "24px",
// // // //                     lineHeight: "32px",
// // // //                     letterSpacing: "-0.01em",
// // // //                     fontWeight: 700,
// // // //                   }}
// // // //                 >
// // // //                   68%
// // // //                 </p>
// // // //               </div>
// // // //             </div>
// // // //           </div>
// // // //           <div
// // // //             style={{
// // // //               display: "grid",
// // // //               gridTemplateColumns: "1fr 1fr",
// // // //               gap: "16px",
// // // //               marginTop: "16px",
// // // //             }}
// // // //           >
// // // //             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// // // //               <span
// // // //                 style={{
// // // //                   width: "10px",
// // // //                   height: "10px",
// // // //                   borderRadius: "50%",
// // // //                   backgroundColor: "#006b2c",
// // // //                 }}
// // // //               />
// // // //               <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
// // // //                 Repaid: 72%
// // // //               </span>
// // // //             </div>
// // // //             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// // // //               <span
// // // //                 style={{
// // // //                   width: "10px",
// // // //                   height: "10px",
// // // //                   borderRadius: "50%",
// // // //                   backgroundColor: "#e5eeff",
// // // //                 }}
// // // //               />
// // // //               <span style={{ fontSize: "12px", color: "#3e4a3d" }}>
// // // //                 Active: 28%
// // // //               </span>
// // // //             </div>
// // // //           </div>
// // // //         </div>

// // // //         {/* AI Insight */}
// // // //         <div
// // // //           style={{
// // // //             backgroundColor: "#00873a",
// // // //             color: "#f7fff2",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             display: "flex",
// // // //             flexDirection: "column",
// // // //             justifyContent: "center",
// // // //             border: "1px solid rgba(0, 107, 44, 0.2)",
// // // //             boxShadow:
// // // //               "0 10px 15px -3px rgba(0, 107, 44, 0.1), 0 4px 6px -2px rgba(0, 107, 44, 0.05)",
// // // //             position: "relative",
// // // //             overflow: "hidden",
// // // //           }}
// // // //         >
// // // //           <div
// // // //             style={{
// // // //               position: "absolute",
// // // //               top: "-50%",
// // // //               left: "-50%",
// // // //               width: "200%",
// // // //               height: "200%",
// // // //               background:
// // // //                 "radial-gradient(circle at center, rgba(0, 107, 44, 0.05) 0%, transparent 70%)",
// // // //               zIndex: 0,
// // // //               pointerEvents: "none",
// // // //             }}
// // // //           />
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "8px",
// // // //               marginBottom: "8px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //             }}
// // // //           >
// // // //             <span className="material-symbols-outlined">auto_awesome</span>
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 700,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 textTransform: "uppercase",
// // // //                 letterSpacing: "0.1em",
// // // //               }}
// // // //             >
// // // //               AI Intelligence
// // // //             </span>
// // // //           </div>
// // // //           <p
// // // //             style={{
// // // //               fontSize: "16px",
// // // //               lineHeight: "24px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //               fontWeight: 500,
// // // //             }}
// // // //           >
// // // //             Predictive Analysis: Group B is likely to exceed contribution
// // // //             targets by{" "}
// // // //             <span
// // // //               style={{
// // // //                 fontWeight: 700,
// // // //                 textDecoration: "underline",
// // // //                 textDecorationColor: "#62df7d",
// // // //                 textUnderlineOffset: "4px",
// // // //               }}
// // // //             >
// // // //               15%
// // // //             </span>{" "}
// // // //             this quarter.
// // // //           </p>
// // // //           <button
// // // //             style={{
// // // //               marginTop: "24px",
// // // //               fontSize: "12px",
// // // //               lineHeight: "16px",
// // // //               letterSpacing: "0.03em",
// // // //               fontWeight: 700,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               background: "none",
// // // //               border: "none",
// // // //               color: "#f7fff2",
// // // //               cursor: "pointer",
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "4px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //               padding: 0,
// // // //               transition: "transform 0.2s",
// // // //             }}
// // // //             onMouseEnter={(e) => {
// // // //               e.currentTarget.style.transform = "translateX(4px)";
// // // //             }}
// // // //             onMouseLeave={(e) => {
// // // //               e.currentTarget.style.transform = "translateX(0)";
// // // //             }}
// // // //           >
// // // //             Review detailed forecast
// // // //             <span
// // // //               className="material-symbols-outlined"
// // // //               style={{ fontSize: "16px" }}
// // // //             >
// // // //               arrow_forward
// // // //             </span>
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TRANSACTIONS TABLE
// // // //    =========================== */
// // // // function TransactionsTable() {
// // // //   const transactions = [
// // // //     {
// // // //       group: "Lagos West Savers",
// // // //       id: "MNFY_90218321",
// // // //       date: "Oct 24, 2023",
// // // //       amount: "₦1,250,000.00",
// // // //       status: "Success",
// // // //       icon: "family_restroom",
// // // //       iconBg: "#dae2fd",
// // // //       iconColor: "#5c647a",
// // // //       isNegative: false,
// // // //     },
// // // //     {
// // // //       group: "Tech Founders Hub",
// // // //       id: "MNFY_88129332",
// // // //       date: "Oct 23, 2023",
// // // //       amount: "₦2,100,000.00",
// // // //       status: "Pending",
// // // //       icon: "business",
// // // //       iconBg: "#ffddb8",
// // // //       iconColor: "#2a1700",
// // // //       isNegative: false,
// // // //     },
// // // //     {
// // // //       group: "Adekunle Gold (Loan)",
// // // //       id: "MNFY_77211029",
// // // //       date: "Oct 22, 2023",
// // // //       amount: "-₦450,000.00",
// // // //       status: "Success",
// // // //       icon: "person",
// // // //       iconBg: "#7ffc97",
// // // //       iconColor: "#002109",
// // // //       isNegative: true,
// // // //     },
// // // //   ];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         background: "rgba(255, 255, 255, 0.8)",
// // // //         backdropFilter: "blur(12px)",
// // // //         border: "1px solid #E2E8F0",
// // // //         boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //         borderRadius: "12px",
// // // //         overflow: "hidden",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       <div
// // // //         style={{
// // // //           padding: "16px 24px",
// // // //           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
// // // //           display: "flex",
// // // //           justifyContent: "space-between",
// // // //           alignItems: "center",
// // // //           backgroundColor: "#ffffff",
// // // //         }}
// // // //       >
// // // //         <h3
// // // //           style={{
// // // //             fontSize: "18px",
// // // //             lineHeight: "28px",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Inter', sans-serif",
// // // //           }}
// // // //         >
// // // //           Recent Transactions
// // // //         </h3>
// // // //         <button
// // // //           style={{
// // // //             color: "#006b2c",
// // // //             fontSize: "14px",
// // // //             lineHeight: "20px",
// // // //             letterSpacing: "0.01em",
// // // //             fontWeight: 700,
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             background: "none",
// // // //             border: "none",
// // // //             cursor: "pointer",
// // // //           }}
// // // //         >
// // // //           View All
// // // //         </button>
// // // //       </div>

// // // //       <div style={{ overflowX: "auto" }}>
// // // //         <table
// // // //           style={{
// // // //             width: "100%",
// // // //             textAlign: "left",
// // // //             borderCollapse: "collapse",
// // // //           }}
// // // //         >
// // // //           <thead>
// // // //             <tr
// // // //               style={{
// // // //                 backgroundColor: "rgba(239, 244, 255, 0.5)",
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 600,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 color: "#3e4a3d",
// // // //                 textTransform: "uppercase",
// // // //                 letterSpacing: "0.05em",
// // // //               }}
// // // //             >
// // // //               <th style={{ padding: "16px 24px" }}>Beneficiary / Group</th>
// // // //               <th style={{ padding: "16px 24px" }}>Transaction ID</th>
// // // //               <th style={{ padding: "16px 24px" }}>Date</th>
// // // //               <th style={{ padding: "16px 24px" }}>Amount</th>
// // // //               <th style={{ padding: "16px 24px" }}>Status</th>
// // // //             </tr>
// // // //           </thead>
// // // //           <tbody
// // // //             style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}
// // // //           >
// // // //             {transactions.map((tx) => (
// // // //               <tr
// // // //                 key={tx.id}
// // // //                 style={{
// // // //                   borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
// // // //                   transition: "background-color 0.2s",
// // // //                   cursor: "pointer",
// // // //                 }}
// // // //                 onMouseEnter={(e) => {
// // // //                   e.currentTarget.style.backgroundColor = "#eff4ff";
// // // //                 }}
// // // //                 onMouseLeave={(e) => {
// // // //                   e.currentTarget.style.backgroundColor = "transparent";
// // // //                 }}
// // // //               >
// // // //                 <td style={{ padding: "16px 24px" }}>
// // // //                   <div
// // // //                     style={{
// // // //                       display: "flex",
// // // //                       alignItems: "center",
// // // //                       gap: "16px",
// // // //                     }}
// // // //                   >
// // // //                     <div
// // // //                       style={{
// // // //                         width: "32px",
// // // //                         height: "32px",
// // // //                         borderRadius: "50%",
// // // //                         backgroundColor: tx.iconBg,
// // // //                         display: "flex",
// // // //                         alignItems: "center",
// // // //                         justifyContent: "center",
// // // //                         color: tx.iconColor,
// // // //                       }}
// // // //                     >
// // // //                       <span
// // // //                         className="material-symbols-outlined"
// // // //                         style={{ fontSize: "18px" }}
// // // //                       >
// // // //                         {tx.icon}
// // // //                       </span>
// // // //                     </div>
// // // //                     <span
// // // //                       style={{
// // // //                         fontSize: "14px",
// // // //                         lineHeight: "20px",
// // // //                         letterSpacing: "0.01em",
// // // //                         fontWeight: 700,
// // // //                         fontFamily: "'Geist', sans-serif",
// // // //                       }}
// // // //                     >
// // // //                       {tx.group}
// // // //                     </span>
// // // //                   </div>
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontFamily: "monospace",
// // // //                     fontSize: "12px",
// // // //                     color: "#3e4a3d",
// // // //                   }}
// // // //                 >
// // // //                   {tx.id}
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontSize: "14px",
// // // //                     lineHeight: "20px",
// // // //                     letterSpacing: "0.01em",
// // // //                     fontWeight: 500,
// // // //                     fontFamily: "'Geist', sans-serif",
// // // //                     color: "#3e4a3d",
// // // //                   }}
// // // //                 >
// // // //                   {tx.date}
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontWeight: 700,
// // // //                     color: tx.isNegative ? "#ba1a1a" : "#0b1c30",
// // // //                   }}
// // // //                 >
// // // //                   {tx.amount}
// // // //                 </td>
// // // //                 <td style={{ padding: "16px 24px" }}>
// // // //                   <span
// // // //                     style={{
// // // //                       backgroundColor:
// // // //                         tx.status === "Success"
// // // //                           ? "rgba(0, 107, 44, 0.1)"
// // // //                           : "#cbdbf5",
// // // //                       color:
// // // //                         tx.status === "Success" ? "#006b2c" : "#3f465c",
// // // //                       fontSize: "11px",
// // // //                       fontWeight: 700,
// // // //                       padding: "4px 8px",
// // // //                       borderRadius: "9999px",
// // // //                       textTransform: "uppercase",
// // // //                     }}
// // // //                   >
// // // //                     {tx.status}
// // // //                   </span>
// // // //                 </td>
// // // //               </tr>
// // // //             ))}
// // // //           </tbody>
// // // //         </table>
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }


// // // // "use client";

// // // // import { useState } from "react";
// // // // import Link from "next/link";

// // // // export default function DashboardPage() {
// // // //   return (
// // // //     <div
// // // //       style={{
// // // //         backgroundColor: "#f8f9ff",
// // // //         color: "#0b1c30",
// // // //         fontFamily: "'Inter', sans-serif",
// // // //         minHeight: "100vh",
// // // //         display: "flex",
// // // //       }}
// // // //     >
// // // //       <Sidebar />
// // // //       <MainContent />
// // // //       <FloatingAI />
// // // //     </div>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    SIDEBAR
// // // //    =========================== */
// // // // function Sidebar() {
// // // //   const navItems = [
// // // //     { icon: "dashboard", label: "Dashboard", active: true },
// // // //     { icon: "groups", label: "My Groups", active: false },
// // // //     { icon: "psychology", label: "Treasurer AI", active: false },
// // // //     { icon: "account_balance_wallet", label: "Payments", active: false },
// // // //     { icon: "settings", label: "Settings", active: false },
// // // //   ];

// // // //   return (
// // // //     <aside
// // // //       style={{
// // // //         position: "fixed",
// // // //         left: 0,
// // // //         top: 0,
// // // //         height: "100vh",
// // // //         width: "280px",
// // // //         backgroundColor: "#213145",
// // // //         display: "flex",
// // // //         flexDirection: "column",
// // // //         padding: "24px 16px",
// // // //         gap: "8px",
// // // //         zIndex: 50,
// // // //         boxShadow:
// // // //           "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
// // // //       }}
// // // //     >
// // // //       {/* Logo */}
// // // //       <div style={{ padding: "0 16px", marginBottom: "40px" }}>
// // // //         <h1
// // // //           style={{
// // // //             fontSize: "24px",
// // // //             lineHeight: "32px",
// // // //             letterSpacing: "-0.01em",
// // // //             fontWeight: 900,
// // // //             fontFamily: "'Inter', sans-serif",
// // // //             color: "#ffffff",
// // // //           }}
// // // //         >
// // // //           Kolo AI
// // // //         </h1>
// // // //         <p
// // // //           style={{
// // // //             fontSize: "14px",
// // // //             lineHeight: "20px",
// // // //             letterSpacing: "0.01em",
// // // //             fontWeight: 500,
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             color: "rgba(211, 228, 254, 0.7)",
// // // //           }}
// // // //         >
// // // //           Institutional Wealth
// // // //         </p>
// // // //       </div>

// // // //       {/* Navigation */}
// // // //       <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
// // // //         {navItems.map((item) => (
// // // //           <Link
// // // //             key={item.label}
// // // //             href="#"
// // // //             style={{
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "16px",
// // // //               padding: "12px 24px",
// // // //               borderRadius: "8px",
// // // //               fontWeight: item.active ? 700 : 400,
// // // //               transition: "all 0.2s",
// // // //               textDecoration: "none",
// // // //               backgroundColor: item.active ? "#00873a" : "transparent",
// // // //               color: item.active ? "#f7fff2" : "#d3e4fe",
// // // //               transform: item.active ? "translateX(4px)" : "none",
// // // //             }}
// // // //           >
// // // //             <span className="material-symbols-outlined">{item.icon}</span>
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "14px",
// // // //                 lineHeight: "20px",
// // // //                 letterSpacing: "0.01em",
// // // //                 fontWeight: 500,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //               }}
// // // //             >
// // // //               {item.label}
// // // //             </span>
// // // //           </Link>
// // // //         ))}
// // // //       </nav>

// // // //       {/* Bottom CTA */}
// // // //       <div
// // // //         style={{
// // // //           marginTop: "auto",
// // // //           padding: "0 16px",
// // // //           paddingTop: "24px",
// // // //           borderTop: "1px solid rgba(211, 228, 254, 0.1)",
// // // //         }}
// // // //       >
// // // //         <button
// // // //           style={{
// // // //             width: "100%",
// // // //             backgroundColor: "#006b2c",
// // // //             color: "#ffffff",
// // // //             padding: "16px",
// // // //             borderRadius: "12px",
// // // //             fontWeight: 700,
// // // //             border: "none",
// // // //             cursor: "pointer",
// // // //             display: "flex",
// // // //             alignItems: "center",
// // // //             justifyContent: "center",
// // // //             gap: "8px",
// // // //             fontSize: "14px",
// // // //             lineHeight: "20px",
// // // //             letterSpacing: "0.01em",
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             transition: "all 0.2s",
// // // //           }}
// // // //         >
// // // //           <span className="material-symbols-outlined">add</span>
// // // //           New Contribution
// // // //         </button>

// // // //         {/* Profile */}
// // // //         <div
// // // //           style={{
// // // //             marginTop: "24px",
// // // //             display: "flex",
// // // //             alignItems: "center",
// // // //             gap: "16px",
// // // //             padding: "8px",
// // // //             backgroundColor: "rgba(211, 228, 254, 0.05)",
// // // //             borderRadius: "8px",
// // // //           }}
// // // //         >
// // // //           <img
// // // //             style={{
// // // //               width: "40px",
// // // //               height: "40px",
// // // //               borderRadius: "50%",
// // // //               objectFit: "cover",
// // // //             }}
// // // //             alt="Profile"
// // // //             src="https://lh3.googleusercontent.com/aida-public/AB6AXuD98sc4_zsOKM1zxUUqA1UWT-hb3DCKWZC2q8v6wosON1R3NoQuWCUUAS4AS8V8FRG3_JKIXlb59CJ7ZdhPsCnnb7yO4UJB0Qe6tEOKhuHy18mgEMrk7DhatgrAOTs2VY0jFryzf-nrjrtNhnrXSj1SEQpCgiHwQmONDzY4e1dzuJdh6UlcbG4A_ayvCjYotIr_rgA9xyuzJV9wPAmoYw0TCyimzWwCA813j2df2Mhtf8WYAq73aw9JTTk9FoqgkInYTE19VnlCKnyP"
// // // //           />
// // // //           <div style={{ overflow: "hidden" }}>
// // // //             <p
// // // //               style={{
// // // //                 fontSize: "14px",
// // // //                 lineHeight: "20px",
// // // //                 letterSpacing: "0.01em",
// // // //                 fontWeight: 500,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 color: "#ffffff",
// // // //                 whiteSpace: "nowrap",
// // // //                 overflow: "hidden",
// // // //                 textOverflow: "ellipsis",
// // // //               }}
// // // //             >
// // // //               Executive User
// // // //             </p>
// // // //             <p
// // // //               style={{
// // // //                 fontSize: "12px",
// // // //                 color: "#d3e4fe",
// // // //                 whiteSpace: "nowrap",
// // // //                 overflow: "hidden",
// // // //                 textOverflow: "ellipsis",
// // // //               }}
// // // //             >
// // // //               Premium Account
// // // //             </p>
// // // //           </div>
// // // //         </div>
// // // //       </div>
// // // //     </aside>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    MAIN CONTENT
// // // //    =========================== */
// // // // function MainContent() {
// // // //   return (
// // // //     <main
// // // //       style={{
// // // //         marginLeft: "280px",
// // // //         minHeight: "100vh",
// // // //         display: "flex",
// // // //         flexDirection: "column",
// // // //         padding: "24px",
// // // //         flex: 1,
// // // //       }}
// // // //     >
// // // //       <TopHeader />
// // // //       <KPIRow />
// // // //       <ChartsSection />
// // // //       <TransactionsTable />
// // // //     </main>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TOP HEADER
// // // //    =========================== */
// // // // function TopHeader() {
// // // //   return (
// // // //     <header
// // // //       style={{
// // // //         display: "flex",
// // // //         justifyContent: "space-between",
// // // //         alignItems: "center",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       <div>
// // // //         <h2
// // // //           style={{
// // // //             fontSize: "24px",
// // // //             lineHeight: "32px",
// // // //             letterSpacing: "-0.01em",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Inter', sans-serif",
// // // //             color: "#0b1c30",
// // // //           }}
// // // //         >
// // // //           Welcome back, Admin
// // // //         </h2>
// // // //         <p
// // // //           style={{
// // // //             fontSize: "16px",
// // // //             lineHeight: "24px",
// // // //             color: "#3e4a3d",
// // // //           }}
// // // //         >
// // // //           Here is your institutional wealth overview for today.
// // // //         </p>
// // // //       </div>
// // // //       <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
// // // //         {/* Search */}
// // // //         <div style={{ position: "relative", width: "256px" }}>
// // // //           <span
// // // //             className="material-symbols-outlined"
// // // //             style={{
// // // //               position: "absolute",
// // // //               left: "12px",
// // // //               top: "50%",
// // // //               transform: "translateY(-50%)",
// // // //               color: "#6e7b6c",
// // // //             }}
// // // //           >
// // // //             search
// // // //           </span>
// // // //           <input
// // // //             type="text"
// // // //             placeholder="Search analytics..."
// // // //             style={{
// // // //               width: "100%",
// // // //               backgroundColor: "#eff4ff",
// // // //               border: "1px solid rgba(189, 202, 186, 0.5)",
// // // //               borderRadius: "12px",
// // // //               padding: "8px 16px 8px 40px",
// // // //               fontSize: "14px",
// // // //               lineHeight: "20px",
// // // //               letterSpacing: "0.01em",
// // // //               fontWeight: 500,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               outline: "none",
// // // //               transition: "all 0.2s",
// // // //               boxSizing: "border-box",
// // // //             }}
// // // //           />
// // // //         </div>
// // // //         {/* Notification */}
// // // //         <button
// // // //           style={{
// // // //             width: "40px",
// // // //             height: "40px",
// // // //             display: "flex",
// // // //             alignItems: "center",
// // // //             justifyContent: "center",
// // // //             borderRadius: "50%",
// // // //             backgroundColor: "#e5eeff",
// // // //             border: "none",
// // // //             cursor: "pointer",
// // // //             color: "#3e4a3d",
// // // //             position: "relative",
// // // //             transition: "background-color 0.2s",
// // // //           }}
// // // //         >
// // // //           <span className="material-symbols-outlined">notifications</span>
// // // //           <span
// // // //             style={{
// // // //               position: "absolute",
// // // //               top: "8px",
// // // //               right: "10px",
// // // //               width: "8px",
// // // //               height: "8px",
// // // //               backgroundColor: "#ba1a1a",
// // // //               borderRadius: "50%",
// // // //               border: "2px solid #f8f9ff",
// // // //             }}
// // // //           />
// // // //         </button>
// // // //       </div>
// // // //     </header>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    KPI ROW
// // // //    =========================== */
// // // // function KPIRow() {
// // // //   const kpis = [
// // // //     {
// // // //       label: "Total Savings",
// // // //       value: "₦45,500,000",
// // // //       change: "+2.4% vs last month",
// // // //       icon: "savings",
// // // //       iconBg: "rgba(0, 107, 44, 0.1)",
// // // //       iconColor: "#006b2c",
// // // //       trend: "trending_up",
// // // //     },
// // // //     {
// // // //       label: "Monthly Contributions",
// // // //       value: "₦8,240,500",
// // // //       change: "+12% growth",
// // // //       icon: "payments",
// // // //       iconBg: "rgba(86, 94, 116, 0.1)",
// // // //       iconColor: "#565e74",
// // // //       trend: "arrow_upward",
// // // //     },
// // // //     {
// // // //       label: "Active Groups",
// // // //       value: "42",
// // // //       change: "1,240 Total Members",
// // // //       icon: "group",
// // // //       iconBg: "rgba(130, 81, 0, 0.1)",
// // // //       iconColor: "#825100",
// // // //       trend: "person",
// // // //     },
// // // //     {
// // // //       label: "Health Score",
// // // //       value: "94",
// // // //       suffix: "/100",
// // // //       icon: "verified_user",
// // // //       iconBg: "rgba(0, 107, 44, 0.1)",
// // // //       iconColor: "#006b2c",
// // // //       progress: 94,
// // // //     },
// // // //   ];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         display: "grid",
// // // //         gridTemplateColumns: "repeat(4, 1fr)",
// // // //         gap: "24px",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       {kpis.map((kpi) => (
// // // //         <div
// // // //           key={kpi.label}
// // // //           className="glass-card-hover"
// // // //           style={{
// // // //             background: "rgba(255, 255, 255, 0.8)",
// // // //             backdropFilter: "blur(12px)",
// // // //             border: "1px solid #E2E8F0",
// // // //             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             cursor: "pointer",
// // // //             transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
// // // //           }}
// // // //           onMouseEnter={(e) => {
// // // //             e.currentTarget.style.transform = "translateY(-2px)";
// // // //           }}
// // // //           onMouseLeave={(e) => {
// // // //             e.currentTarget.style.transform = "translateY(0)";
// // // //           }}
// // // //         >
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               justifyContent: "space-between",
// // // //               alignItems: "flex-start",
// // // //               marginBottom: "8px",
// // // //             }}
// // // //           >
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "14px",
// // // //                 lineHeight: "20px",
// // // //                 letterSpacing: "0.01em",
// // // //                 fontWeight: 500,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 color: "#3e4a3d",
// // // //               }}
// // // //             >
// // // //               {kpi.label}
// // // //             </span>
// // // //             <span
// // // //               className="material-symbols-outlined"
// // // //               style={{
// // // //                 padding: "6px",
// // // //                 borderRadius: "8px",
// // // //                 backgroundColor: kpi.iconBg,
// // // //                 color: kpi.iconColor,
// // // //                 fontSize: "20px",
// // // //               }}
// // // //             >
// // // //               {kpi.icon}
// // // //             </span>
// // // //           </div>
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               alignItems: "baseline",
// // // //               gap: "8px",
// // // //               marginBottom: kpi.progress ? "12px" : "8px",
// // // //             }}
// // // //           >
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "24px",
// // // //                 lineHeight: "32px",
// // // //                 letterSpacing: "-0.01em",
// // // //                 fontWeight: 700,
// // // //                 fontFamily: "'Inter', sans-serif",
// // // //               }}
// // // //             >
// // // //               {kpi.value}
// // // //             </span>
// // // //             {kpi.suffix && (
// // // //               <span
// // // //                 style={{
// // // //                   fontSize: "14px",
// // // //                   lineHeight: "20px",
// // // //                   letterSpacing: "0.01em",
// // // //                   fontWeight: 500,
// // // //                   fontFamily: "'Geist', sans-serif",
// // // //                   color: "#3e4a3d",
// // // //                 }}
// // // //               >
// // // //                 {kpi.suffix}
// // // //               </span>
// // // //             )}
// // // //           </div>
// // // //           {kpi.progress ? (
// // // //             <div
// // // //               style={{
// // // //                 width: "100%",
// // // //                 height: "6px",
// // // //                 backgroundColor: "#dce9ff",
// // // //                 borderRadius: "9999px",
// // // //                 overflow: "hidden",
// // // //               }}
// // // //             >
// // // //               <div
// // // //                 style={{
// // // //                   height: "100%",
// // // //                   width: `${kpi.progress}%`,
// // // //                   backgroundColor: "#006b2c",
// // // //                 }}
// // // //               />
// // // //             </div>
// // // //           ) : (
// // // //             <div
// // // //               style={{
// // // //                 display: "flex",
// // // //                 alignItems: "center",
// // // //                 gap: "4px",
// // // //                 color: "#006b2c",
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 600,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //               }}
// // // //             >
// // // //               <span
// // // //                 className="material-symbols-outlined"
// // // //                 style={{ fontSize: "16px" }}
// // // //               >
// // // //                 {kpi.trend}
// // // //               </span>
// // // //               <span>{kpi.change}</span>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       ))}
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    CHARTS SECTION
// // // //    =========================== */
// // // // function ChartsSection() {
// // // //   const bars = [40, 55, 45, 70, 85, 100];
// // // //   const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN"];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         display: "grid",
// // // //         gridTemplateColumns: "repeat(12, 1fr)",
// // // //         gap: "24px",
// // // //         marginBottom: "40px",
// // // //         alignItems: "stretch",
// // // //       }}
// // // //     >
// // // //       {/* Savings Growth Chart */}
// // // //       <div
// // // //         style={{
// // // //           gridColumn: "span 8",
// // // //           background: "rgba(255, 255, 255, 0.8)",
// // // //           backdropFilter: "blur(12px)",
// // // //           border: "1px solid #E2E8F0",
// // // //           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //           padding: "24px",
// // // //           borderRadius: "12px",
// // // //           display: "flex",
// // // //           flexDirection: "column",
// // // //         }}
// // // //       >
// // // //         <div
// // // //           style={{
// // // //             display: "flex",
// // // //             justifyContent: "space-between",
// // // //             alignItems: "center",
// // // //             marginBottom: "40px",
// // // //           }}
// // // //         >
// // // //           <h3
// // // //             style={{
// // // //               fontSize: "18px",
// // // //               lineHeight: "28px",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Inter', sans-serif",
// // // //             }}
// // // //           >
// // // //             Savings Growth
// // // //           </h3>
// // // //           <select
// // // //             style={{
// // // //               backgroundColor: "#eff4ff",
// // // //               border: "none",
// // // //               fontSize: "12px",
// // // //               lineHeight: "16px",
// // // //               letterSpacing: "0.03em",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               padding: "6px 12px",
// // // //               borderRadius: "8px",
// // // //               outline: "none",
// // // //               cursor: "pointer",
// // // //             }}
// // // //           >
// // // //             <option>Last 6 Months</option>
// // // //             <option>Last Year</option>
// // // //           </select>
// // // //         </div>

// // // //         {/* Bar Chart */}
// // // //         <div
// // // //           style={{
// // // //             flex: 1,
// // // //             minHeight: "300px",
// // // //             position: "relative",
// // // //           }}
// // // //         >
// // // //           <div
// // // //             style={{
// // // //               position: "absolute",
// // // //               inset: 0,
// // // //               display: "flex",
// // // //               alignItems: "flex-end",
// // // //               justifyContent: "space-between",
// // // //               padding: "0 8px",
// // // //               gap: "16px",
// // // //             }}
// // // //           >
// // // //             {bars.map((height, i) => (
// // // //               <div
// // // //                 key={i}
// // // //                 style={{
// // // //                   flex: 1,
// // // //                   backgroundColor:
// // // //                     i === bars.length - 1
// // // //                       ? "#006b2c"
// // // //                       : "rgba(0, 107, 44, 0.1)",
// // // //                   borderRadius: "8px 8px 0 0",
// // // //                   height: `${height}%`,
// // // //                   transition: "background-color 0.2s",
// // // //                   cursor: "pointer",
// // // //                   position: "relative",
// // // //                 }}
// // // //                 onMouseEnter={(e) => {
// // // //                   if (i !== bars.length - 1) {
// // // //                     e.currentTarget.style.backgroundColor =
// // // //                       "rgba(0, 107, 44, 0.2)";
// // // //                   }
// // // //                 }}
// // // //                 onMouseLeave={(e) => {
// // // //                   if (i !== bars.length - 1) {
// // // //                     e.currentTarget.style.backgroundColor =
// // // //                       "rgba(0, 107, 44, 0.1)";
// // // //                   }
// // // //                 }}
// // // //               >
// // // //                 {/* Tooltip */}
// // // //                 <div
// // // //                   style={{
// // // //                     position: "absolute",
// // // //                     top: "-28px",
// // // //                     left: "50%",
// // // //                     transform: "translateX(-50%)",
// // // //                     backgroundColor: "#0b1c30",
// // // //                     color: "#f8f9ff",
// // // //                     fontSize: "10px",
// // // //                     padding: "4px 8px",
// // // //                     borderRadius: "4px",
// // // //                     whiteSpace: "nowrap",
// // // //                     display: "none",
// // // //                     fontWeight: 700,
// // // //                   }}
// // // //                   className="bar-tooltip"
// // // //                 >
// // // //                   {i === bars.length - 1
// // // //                     ? "₦45.5M (Current)"
// // // //                     : `₦${(12 + i * 6)}.${i % 2 === 0 ? "4" : "2"}M`}
// // // //                 </div>
// // // //               </div>
// // // //             ))}
// // // //           </div>
// // // //         </div>

// // // //         {/* X-axis labels */}
// // // //         <div
// // // //           style={{
// // // //             display: "flex",
// // // //             justifyContent: "space-between",
// // // //             marginTop: "16px",
// // // //             fontSize: "12px",
// // // //             lineHeight: "16px",
// // // //             letterSpacing: "0.03em",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             color: "#3e4a3d",
// // // //             padding: "0 8px",
// // // //           }}
// // // //         >
// // // //           {months.map((m) => (
// // // //             <span key={m}>{m}</span>
// // // //           ))}
// // // //         </div>
// // // //       </div>

// // // //       {/* Right Column: Loan Analytics + AI Insight */}
// // // //       <div
// // // //         style={{
// // // //           gridColumn: "span 4",
// // // //           display: "flex",
// // // //           flexDirection: "column",
// // // //           gap: "24px",
// // // //         }}
// // // //       >
// // // //         {/* Loan Analytics */}
// // // //         <div
// // // //           style={{
// // // //             background: "rgba(255, 255, 255, 0.8)",
// // // //             backdropFilter: "blur(12px)",
// // // //             border: "1px solid #E2E8F0",
// // // //             boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             flex: 1,
// // // //             display: "flex",
// // // //             flexDirection: "column",
// // // //           }}
// // // //         >
// // // //           <h3
// // // //             style={{
// // // //               fontSize: "18px",
// // // //               lineHeight: "28px",
// // // //               fontWeight: 600,
// // // //               fontFamily: "'Inter', sans-serif",
// // // //               marginBottom: "40px",
// // // //             }}
// // // //           >
// // // //             Loan Analytics
// // // //           </h3>
// // // //           <div
// // // //             style={{
// // // //               flex: 1,
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               justifyContent: "center",
// // // //               position: "relative",
// // // //               padding: "16px 0",
// // // //             }}
// // // //           >
// // // //             {/* Doughnut */}
// // // //             <div
// // // //               style={{
// // // //                 width: "160px",
// // // //                 height: "160px",
// // // //                 borderRadius: "50%",
// // // //                 border: "14px solid #e5eeff",
// // // //                 display: "flex",
// // // //                 alignItems: "center",
// // // //                 justifyContent: "center",
// // // //                 position: "relative",
// // // //               }}
// // // //             >
// // // //               <div
// // // //                 style={{
// // // //                   position: "absolute",
// // // //                   inset: "-14px",
// // // //                   borderRadius: "50%",
// // // //                   border: "14px solid #006b2c",
// // // //                   borderRightColor: "transparent",
// // // //                   borderBottomColor: "transparent",
// // // //                   transform: "rotate(45deg)",
// // // //                 }}
// // // //               />
// // // //               <div style={{ textAlign: "center" }}>
// // // //                 <p
// // // //                   style={{
// // // //                     fontSize: "12px",
// // // //                     lineHeight: "16px",
// // // //                     letterSpacing: "0.03em",
// // // //                     fontWeight: 600,
// // // //                     fontFamily: "'Geist', sans-serif",
// // // //                     color: "#3e4a3d",
// // // //                     textTransform: "uppercase",
// // // //                     letterSpacing: "0.05em",
// // // //                   }}
// // // //                 >
// // // //                   Utilization
// // // //                 </p>
// // // //                 <p
// // // //                   style={{
// // // //                     fontSize: "24px",
// // // //                     lineHeight: "32px",
// // // //                     letterSpacing: "-0.01em",
// // // //                     fontWeight: 700,
// // // //                   }}
// // // //                 >
// // // //                   68%
// // // //                 </p>
// // // //               </div>
// // // //             </div>
// // // //           </div>
// // // //           <div
// // // //             style={{
// // // //               display: "grid",
// // // //               gridTemplateColumns: "1fr 1fr",
// // // //               gap: "16px",
// // // //               marginTop: "16px",
// // // //             }}
// // // //           >
// // // //             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// // // //               <span
// // // //                 style={{
// // // //                   width: "10px",
// // // //                   height: "10px",
// // // //                   borderRadius: "50%",
// // // //                   backgroundColor: "#006b2c",
// // // //                 }}
// // // //               />
// // // //               <span
// // // //                 style={{
// // // //                   fontSize: "12px",
// // // //                   color: "#3e4a3d",
// // // //                 }}
// // // //               >
// // // //                 Repaid: 72%
// // // //               </span>
// // // //             </div>
// // // //             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// // // //               <span
// // // //                 style={{
// // // //                   width: "10px",
// // // //                   height: "10px",
// // // //                   borderRadius: "50%",
// // // //                   backgroundColor: "#e5eeff",
// // // //                 }}
// // // //               />
// // // //               <span
// // // //                 style={{
// // // //                   fontSize: "12px",
// // // //                   color: "#3e4a3d",
// // // //                 }}
// // // //               >
// // // //                 Active: 28%
// // // //               </span>
// // // //             </div>
// // // //           </div>
// // // //         </div>

// // // //         {/* AI Insight */}
// // // //         <div
// // // //           style={{
// // // //             backgroundColor: "#00873a",
// // // //             color: "#f7fff2",
// // // //             padding: "24px",
// // // //             borderRadius: "12px",
// // // //             display: "flex",
// // // //             flexDirection: "column",
// // // //             justifyContent: "center",
// // // //             border: "1px solid rgba(0, 107, 44, 0.2)",
// // // //             boxShadow:
// // // //               "0 10px 15px -3px rgba(0, 107, 44, 0.1), 0 4px 6px -2px rgba(0, 107, 44, 0.05)",
// // // //             position: "relative",
// // // //             overflow: "hidden",
// // // //           }}
// // // //         >
// // // //           {/* Glow effect */}
// // // //           <div
// // // //             style={{
// // // //               position: "absolute",
// // // //               top: "-50%",
// // // //               left: "-50%",
// // // //               width: "200%",
// // // //               height: "200%",
// // // //               background:
// // // //                 "radial-gradient(circle at center, rgba(0, 107, 44, 0.05) 0%, transparent 70%)",
// // // //               zIndex: 0,
// // // //               pointerEvents: "none",
// // // //             }}
// // // //           />
// // // //           <div
// // // //             style={{
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "8px",
// // // //               marginBottom: "8px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //             }}
// // // //           >
// // // //             <span className="material-symbols-outlined">auto_awesome</span>
// // // //             <span
// // // //               style={{
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 700,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 textTransform: "uppercase",
// // // //                 letterSpacing: "0.1em",
// // // //               }}
// // // //             >
// // // //               AI Intelligence
// // // //             </span>
// // // //           </div>
// // // //           <p
// // // //             style={{
// // // //               fontSize: "16px",
// // // //               lineHeight: "24px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //               fontWeight: 500,
// // // //             }}
// // // //           >
// // // //             Predictive Analysis: Group B is likely to exceed contribution
// // // //             targets by{" "}
// // // //             <span
// // // //               style={{
// // // //                 fontWeight: 700,
// // // //                 textDecoration: "underline",
// // // //                 textDecorationColor: "#62df7d",
// // // //                 textUnderlineOffset: "4px",
// // // //               }}
// // // //             >
// // // //               15%
// // // //             </span>{" "}
// // // //             this quarter.
// // // //           </p>
// // // //           <button
// // // //             style={{
// // // //               marginTop: "24px",
// // // //               fontSize: "12px",
// // // //               lineHeight: "16px",
// // // //               letterSpacing: "0.03em",
// // // //               fontWeight: 700,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               background: "none",
// // // //               border: "none",
// // // //               color: "#f7fff2",
// // // //               cursor: "pointer",
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "4px",
// // // //               position: "relative",
// // // //               zIndex: 10,
// // // //               padding: 0,
// // // //               transition: "transform 0.2s",
// // // //             }}
// // // //             onMouseEnter={(e) => {
// // // //               e.currentTarget.style.transform = "translateX(4px)";
// // // //             }}
// // // //             onMouseLeave={(e) => {
// // // //               e.currentTarget.style.transform = "translateX(0)";
// // // //             }}
// // // //           >
// // // //             Review detailed forecast
// // // //             <span
// // // //               className="material-symbols-outlined"
// // // //               style={{ fontSize: "16px" }}
// // // //             >
// // // //               arrow_forward
// // // //             </span>
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    TRANSACTIONS TABLE
// // // //    =========================== */
// // // // function TransactionsTable() {
// // // //   const transactions = [
// // // //     {
// // // //       group: "Lagos West Savers",
// // // //       id: "MNFY_90218321",
// // // //       date: "Oct 24, 2023",
// // // //       amount: "₦1,250,000.00",
// // // //       status: "Success",
// // // //       icon: "family_restroom",
// // // //       iconBg: "#dae2fd",
// // // //       iconColor: "#5c647a",
// // // //       isNegative: false,
// // // //     },
// // // //     {
// // // //       group: "Tech Founders Hub",
// // // //       id: "MNFY_88129332",
// // // //       date: "Oct 23, 2023",
// // // //       amount: "₦2,100,000.00",
// // // //       status: "Pending",
// // // //       icon: "business",
// // // //       iconBg: "#ffddb8",
// // // //       iconColor: "#2a1700",
// // // //       isNegative: false,
// // // //     },
// // // //     {
// // // //       group: "Adekunle Gold (Loan)",
// // // //       id: "MNFY_77211029",
// // // //       date: "Oct 22, 2023",
// // // //       amount: "-₦450,000.00",
// // // //       status: "Success",
// // // //       icon: "person",
// // // //       iconBg: "#7ffc97",
// // // //       iconColor: "#002109",
// // // //       isNegative: true,
// // // //     },
// // // //   ];

// // // //   return (
// // // //     <section
// // // //       style={{
// // // //         background: "rgba(255, 255, 255, 0.8)",
// // // //         backdropFilter: "blur(12px)",
// // // //         border: "1px solid #E2E8F0",
// // // //         boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// // // //         borderRadius: "12px",
// // // //         overflow: "hidden",
// // // //         marginBottom: "40px",
// // // //       }}
// // // //     >
// // // //       {/* Table Header */}
// // // //       <div
// // // //         style={{
// // // //           padding: "16px 24px",
// // // //           borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
// // // //           display: "flex",
// // // //           justifyContent: "space-between",
// // // //           alignItems: "center",
// // // //           backgroundColor: "#ffffff",
// // // //         }}
// // // //       >
// // // //         <h3
// // // //           style={{
// // // //             fontSize: "18px",
// // // //             lineHeight: "28px",
// // // //             fontWeight: 600,
// // // //             fontFamily: "'Inter', sans-serif",
// // // //           }}
// // // //         >
// // // //           Recent Transactions
// // // //         </h3>
// // // //         <button
// // // //           style={{
// // // //             color: "#006b2c",
// // // //             fontSize: "14px",
// // // //             lineHeight: "20px",
// // // //             letterSpacing: "0.01em",
// // // //             fontWeight: 700,
// // // //             fontFamily: "'Geist', sans-serif",
// // // //             background: "none",
// // // //             border: "none",
// // // //             cursor: "pointer",
// // // //           }}
// // // //         >
// // // //           View All
// // // //         </button>
// // // //       </div>

// // // //       {/* Table */}
// // // //       <div style={{ overflowX: "auto" }}>
// // // //         <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
// // // //           <thead>
// // // //             <tr
// // // //               style={{
// // // //                 backgroundColor: "rgba(239, 244, 255, 0.5)",
// // // //                 fontSize: "12px",
// // // //                 lineHeight: "16px",
// // // //                 letterSpacing: "0.03em",
// // // //                 fontWeight: 600,
// // // //                 fontFamily: "'Geist', sans-serif",
// // // //                 color: "#3e4a3d",
// // // //                 textTransform: "uppercase",
// // // //                 letterSpacing: "0.05em",
// // // //               }}
// // // //             >
// // // //               <th style={{ padding: "16px 24px" }}>Beneficiary / Group</th>
// // // //               <th style={{ padding: "16px 24px" }}>Transaction ID</th>
// // // //               <th style={{ padding: "16px 24px" }}>Date</th>
// // // //               <th style={{ padding: "16px 24px" }}>Amount</th>
// // // //               <th style={{ padding: "16px 24px" }}>Status</th>
// // // //             </tr>
// // // //           </thead>
// // // //           <tbody style={{ borderTop: "1px solid rgba(189, 202, 186, 0.2)" }}>
// // // //             {transactions.map((tx, i) => (
// // // //               <tr
// // // //                 key={tx.id}
// // // //                 style={{
// // // //                   borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
// // // //                   transition: "background-color 0.2s",
// // // //                   cursor: "pointer",
// // // //                 }}
// // // //                 onMouseEnter={(e) => {
// // // //                   e.currentTarget.style.backgroundColor = "#eff4ff";
// // // //                 }}
// // // //                 onMouseLeave={(e) => {
// // // //                   e.currentTarget.style.backgroundColor = "transparent";
// // // //                 }}
// // // //               >
// // // //                 <td style={{ padding: "16px 24px" }}>
// // // //                   <div
// // // //                     style={{
// // // //                       display: "flex",
// // // //                       alignItems: "center",
// // // //                       gap: "16px",
// // // //                     }}
// // // //                   >
// // // //                     <div
// // // //                       style={{
// // // //                         width: "32px",
// // // //                         height: "32px",
// // // //                         borderRadius: "50%",
// // // //                         backgroundColor: tx.iconBg,
// // // //                         display: "flex",
// // // //                         alignItems: "center",
// // // //                         justifyContent: "center",
// // // //                         color: tx.iconColor,
// // // //                       }}
// // // //                     >
// // // //                       <span
// // // //                         className="material-symbols-outlined"
// // // //                         style={{ fontSize: "18px" }}
// // // //                       >
// // // //                         {tx.icon}
// // // //                       </span>
// // // //                     </div>
// // // //                     <span
// // // //                       style={{
// // // //                         fontSize: "14px",
// // // //                         lineHeight: "20px",
// // // //                         letterSpacing: "0.01em",
// // // //                         fontWeight: 700,
// // // //                         fontFamily: "'Geist', sans-serif",
// // // //                       }}
// // // //                     >
// // // //                       {tx.group}
// // // //                     </span>
// // // //                   </div>
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontFamily: "monospace",
// // // //                     fontSize: "12px",
// // // //                     color: "#3e4a3d",
// // // //                   }}
// // // //                 >
// // // //                   {tx.id}
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontSize: "14px",
// // // //                     lineHeight: "20px",
// // // //                     letterSpacing: "0.01em",
// // // //                     fontWeight: 500,
// // // //                     fontFamily: "'Geist', sans-serif",
// // // //                     color: "#3e4a3d",
// // // //                   }}
// // // //                 >
// // // //                   {tx.date}
// // // //                 </td>
// // // //                 <td
// // // //                   style={{
// // // //                     padding: "16px 24px",
// // // //                     fontWeight: 700,
// // // //                     color: tx.isNegative ? "#ba1a1a" : "#0b1c30",
// // // //                   }}
// // // //                 >
// // // //                   {tx.amount}
// // // //                 </td>
// // // //                 <td style={{ padding: "16px 24px" }}>
// // // //                   <span
// // // //                     style={{
// // // //                       backgroundColor:
// // // //                         tx.status === "Success"
// // // //                           ? "rgba(0, 107, 44, 0.1)"
// // // //                           : "#cbdbf5",
// // // //                       color:
// // // //                         tx.status === "Success"
// // // //                           ? "#006b2c"
// // // //                           : "#3f465c",
// // // //                       fontSize: "11px",
// // // //                       fontWeight: 700,
// // // //                       padding: "4px 8px",
// // // //                       borderRadius: "9999px",
// // // //                       textTransform: "uppercase",
// // // //                     }}
// // // //                   >
// // // //                     {tx.status}
// // // //                   </span>
// // // //                 </td>
// // // //               </tr>
// // // //             ))}
// // // //           </tbody>
// // // //         </table>
// // // //       </div>
// // // //     </section>
// // // //   );
// // // // }

// // // // /* ===========================
// // // //    FLOATING AI BUTTON
// // // //    =========================== */
// // // // function FloatingAI() {
// // // //   const [isOpen, setIsOpen] = useState(false);

// // // //   return (
// // // //     <div
// // // //       style={{
// // // //         position: "fixed",
// // // //         bottom: "24px",
// // // //         right: "24px",
// // // //         zIndex: 100,
// // // //       }}
// // // //     >
// // // //       {/* Chat Bubble */}
// // // //       {isOpen && (
// // // //         <div
// // // //           style={{
// // // //             position: "absolute",
// // // //             bottom: "80px",
// // // //             right: 0,
// // // //             backgroundColor: "#0b1c30",
// // // //             color: "#f8f9ff",
// // // //             padding: "24px",
// // // //             borderRadius: "16px",
// // // //             boxShadow:
// // // //               "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
// // // //             width: "256px",
// // // //           }}
// // // //         >
// // // //           <p
// // // //             style={{
// // // //               fontSize: "14px",
// // // //               lineHeight: "20px",
// // // //               letterSpacing: "0.01em",
// // // //               fontWeight: 700,
// // // //               fontFamily: "'Geist', sans-serif",
// // // //               marginBottom: "8px",
// // // //             }}
// // // //           >
// // // //             I&apos;m Treasurer AI
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               fontSize: "12px",
// // // //               opacity: 0.8,
// // // //               marginBottom: "16px",
// // // //             }}
// // // //           >
// // // //             I can help you analyze your portfolio or initiate group
// // // //             disbursements. What&apos;s on your mind?
// // // //           </p>
// // // //           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
// // // //             <button
// // // //               style={{
// // // //                 width: "100%",
// // // //                 textAlign: "left",
// // // //                 backgroundColor: "rgba(255, 255, 255, 0.1)",
// // // //                 border: "none",
// // // //                 color: "#f8f9ff",
// // // //                 padding: "8px 12px",
// // // //                 borderRadius: "8px",
// // // //                 fontSize: "11px",
// // // //                 cursor: "pointer",
// // // //                 transition: "background-color 0.2s",
// // // //                 fontFamily: "'Inter', sans-serif",
// // // //               }}
// // // //             >
// // // //               Analyze loan defaults
// // // //             </button>
// // // //             <button
// // // //               style={{
// // // //                 width: "100%",
// // // //                 textAlign: "left",
// // // //                 backgroundColor: "rgba(255, 255, 255, 0.1)",
// // // //                 border: "none",
// // // //                 color: "#f8f9ff",
// // // //                 padding: "8px 12px",
// // // //                 borderRadius: "8px",
// // // //                 fontSize: "11px",
// // // //                 cursor: "pointer",
// // // //                 transition: "background-color 0.2s",
// // // //                 fontFamily: "'Inter', sans-serif",
// // // //               }}
// // // //             >
// // // //               Generate monthly report
// // // //             </button>
// // // //           </div>
// // // //         </div>
// // // //       )}

// // // //       {/* Toggle Button */}
// // // //       <button
// // // //         onClick={() => setIsOpen(!isOpen)}
// // // //         style={{
// // // //           width: "56px",
// // // //           height: "56px",
// // // //           backgroundColor: "#006b2c",
// // // //           color: "#ffffff",
// // // //           borderRadius: "50%",
// // // //           display: "flex",
// // // //           alignItems: "center",
// // // //           justifyContent: "center",
// // // //           border: "none",
// // // //           cursor: "pointer",
// // // //           boxShadow:
// // // //             "0 20px 25px -5px rgba(0, 107, 44, 0.2), 0 10px 10px -5px rgba(0, 107, 44, 0.1)",
// // // //           position: "relative",
// // // //           overflow: "hidden",
// // // //           transition: "all 0.3s",
// // // //         }}
// // // //       >
// // // //         <span
// // // //           className="material-symbols-outlined"
// // // //           style={{ fontSize: "28px", position: "relative", zIndex: 10 }}
// // // //         >
// // // //           {isOpen ? "close" : "psychology"}
// // // //         </span>
// // // //         {!isOpen && (
// // // //           <div
// // // //             style={{
// // // //               position: "absolute",
// // // //               inset: 0,
// // // //               backgroundColor: "rgba(255, 255, 255, 0.2)",
// // // //               animation: "pulse 2s infinite",
// // // //             }}
// // // //           />
// // // //         )}
// // // //       </button>
// // // //     </div>
// // // //   );
// // // // }
