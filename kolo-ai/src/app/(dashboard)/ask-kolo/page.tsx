"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  role: "user" | "kolo";
  text: string;
  time: string;
};

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
};

type Contribution = {
  amount?: number;
  status?: string;
  created_at?: string;
  groups?: { name?: string } | null;
};

type Group = {
  id: string;
  name?: string;
  member_count?: number;
  pool_amount?: number;
};

type UserContext = {
  name: string;
  totalSaved: number;
  thisMonth: number;
  groups: Group[];
  contributions: Contribution[];
  goals: Goal[];
};

const C = {
  ink: "#0B1C30",
  green: "#087A3E",
  greenSoft: "#EDF8F1",
  text: "#526171",
  muted: "#87929E",
  border: "#E4EBE6",
  page: "#F7FAF8",
};

const suggestedQuestions = [
  "Am I on track with my savings goals?",
  "How much should I save to reach my goal?",
  "What do you notice about my savings?",
  "How is my savings group performing?",
];

export default function AskKoloPage() {
  const supabase = createClient();
  const [context, setContext] = useState<UserContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContext();
  }, []);

  async function loadContext() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: memberships }, { data: contributions }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("group_members")
          .select("group_id, groups(*)")
          .eq("user_id", user.id),
        supabase
          .from("contributions")
          .select("amount, status, created_at, group_id, groups(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    const groups = (memberships?.map((m: any) => m.groups).filter(Boolean) ||
      []) as Group[];

    const cs = (contributions || []) as Contribution[];
    const completed = cs.filter((c) => c.status === "completed");
    const totalSaved = completed.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );

    const now = new Date();
    const thisMonth = cs
      .filter((c) => {
        if (!c.created_at) return false;
        const date = new Date(c.created_at);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    let goals: Goal[] = [];
    try {
      const stored = window.localStorage.getItem("kolo-ai-savings-goals");
      if (stored) goals = JSON.parse(stored);
    } catch {
      goals = [];
    }

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "there";

    const userContext: UserContext = {
      name,
      totalSaved,
      thisMonth,
      groups,
      contributions: cs,
      goals,
    };

    setContext(userContext);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "kolo",
        text: getWelcome(userContext),
        time: currentTime(),
      },
    ]);
    setLoading(false);
  }

  function getWelcome(data: UserContext) {
    const firstName = data.name.split(" ")[0];

    if (!data.goals.length && !data.contributions.length) {
      return `Good evening, ${firstName}. I'm Kolo. I can help you make sense of your savings, goals and group activity. Start by asking me anything about your savings plan.`;
    }

    if (data.goals.length) {
      const best = [...data.goals].sort(
        (a, b) => b.saved / Math.max(b.target, 1) - a.saved / Math.max(a.target, 1)
      )[0];
      const progress = Math.round(
        (best.saved / Math.max(best.target, 1)) * 100
      );

      return `Good evening, ${firstName}. I can see your savings activity and ${data.goals.length} active goal${data.goals.length > 1 ? "s" : ""}. Your strongest goal is ${best.name}, currently at ${Math.min(progress, 100)}%. What would you like to understand?`;
    }

    return `Good evening, ${firstName}. I can see your savings activity and ${data.groups.length} savings group${data.groups.length !== 1 ? "s" : ""}. Ask me about your progress, consistency or what you should focus on next.`;
  }

  async function sendMessage(value?: string) {
    const question = (value ?? input).trim();
    if (!question || thinking || !context) return;

    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: question,
        time: currentTime(),
      },
    ]);

    setThinking(true);

    // Replace this local intelligence layer with your secure AI API route.
    // It deliberately uses the user's real Kolo context instead of pretending
    // that a generic chatbot has access to their savings.
    await new Promise((resolve) => setTimeout(resolve, 650));

    const answer = buildInsight(question, context);

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "kolo",
        text: answer,
        time: currentTime(),
      },
    ]);

    setThinking(false);
  }

  const firstName = useMemo(
    () => context?.name?.split(" ")[0] || "there",
    [context]
  );

  if (loading) return <Loading />;

  if (!context) {
    return (
      <div className="auth-empty">
        <h2>Sign in to ask Kolo.</h2>
        <p>Kolo needs your savings context to give meaningful answers.</p>
        <Link href="/login">Back to sign in</Link>
        <style jsx>{authStyles}</style>
      </div>
    );
  }

  return (
    <div className="ask-page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span />
            KOLO INTELLIGENCE
          </div>
          <h1>Ask Kolo.</h1>
          <p>
            Your savings, goals and group activity — understood in one place.
          </p>
        </div>

        <Link href="/dashboard" className="back">
          ← Dashboard
        </Link>
      </header>

      <div className="workspace">
        <aside className="context-panel">
          <div className="ai-brand">
            <div className="ai-mark">✦</div>
            <div>
              <span>KOLO AI</span>
              <strong>Your savings intelligence</strong>
            </div>
            <i />
          </div>

          <div className="context-title">
            <span>YOUR CONTEXT</span>
            <h2>What Kolo can see</h2>
          </div>

          <div className="context-list">
            <ContextItem
              icon="₦"
              label="Recorded savings"
              value={formatNaira(context.totalSaved)}
            />
            <ContextItem
              icon="↗"
              label="This month"
              value={formatNaira(context.thisMonth)}
            />
            <ContextItem
              icon="◎"
              label="Savings groups"
              value={String(context.groups.length)}
            />
            <ContextItem
              icon="◇"
              label="Active goals"
              value={String(context.goals.length)}
            />
          </div>

          <div className="privacy-note">
            <span>✓</span>
            <p>
              Kolo uses your Kolo activity to make answers more relevant. It
              doesn't need your banking password or payment credentials.
            </p>
          </div>

          <Link href="/goals" className="side-link">
            View my goals <span>→</span>
          </Link>
        </aside>

        <main className="chat-panel">
          <div className="chat-head">
            <div>
              <span>PERSONAL AI ASSISTANT</span>
              <h2>What would you like to know?</h2>
            </div>
            <div className="online">
              <i />
              Ready
            </div>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {thinking && (
              <div className="thinking">
                <div className="avatar">✦</div>
                <div className="thinking-bubble">
                  <span />
                  <span />
                  <span />
                  <small>Kolo is thinking</small>
                </div>
              </div>
            )}

            {messages.length <= 1 && !thinking && (
              <div className="suggestions">
                <div className="suggestion-label">TRY ASKING KOLO</div>
                <div className="suggestion-grid">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                    >
                      <span>{suggestionIcon(question)}</span>
                      {question}
                      <b>→</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="composer">
            <div className="composer-box">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Ask Kolo about your savings..."
                disabled={thinking}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking}
                aria-label="Send message"
              >
                ↑
              </button>
            </div>
            <p>
              Kolo provides savings insights based on the information available
              in your account. It does not provide regulated financial advice.
            </p>
          </div>
        </main>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          background: ${C.page};
        }

        .ask-page {
          min-height: 100%;
          color: ${C.ink};
          font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        @media (max-width: 950px) {
          .workspace {
            grid-template-columns: 1fr !important;
          }

          .context-panel {
            display: none;
          }
        }
      `}</style>

      <style jsx>{`
        .page-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: ${C.green};
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .12em;
        }

        .eyebrow span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${C.green};
        }

        h1 {
          margin: 9px 0 5px;
          color: ${C.ink};
          font-size: clamp(27px, 3vw, 34px);
          line-height: 1;
          letter-spacing: -.05em;
          font-weight: 800;
        }

        .page-head p {
          margin: 0;
          color: ${C.text};
          font-size: 11px;
        }

        .back {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          padding: 0 13px;
          border: 1px solid ${C.border};
          border-radius: 9px;
          color: ${C.text};
          background: #fff;
          font-size: 9px;
          font-weight: 700;
          text-decoration: none;
        }

        .workspace {
          min-height: 650px;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid ${C.border};
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 7px 30px rgba(15, 35, 25, .045);
        }

        .context-panel {
          display: flex;
          flex-direction: column;
          padding: 21px;
          border-right: 1px solid ${C.border};
          background: #FBFCFB;
        }

        .ai-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .ai-mark {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #fff;
          background: ${C.green};
          font-size: 16px;
        }

        .ai-brand > div:nth-child(2) {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 3px;
        }

        .ai-brand span {
          color: ${C.green};
          font-size: 7px;
          font-weight: 850;
          letter-spacing: .1em;
        }

        .ai-brand strong {
          color: ${C.ink};
          font-size: 9px;
        }

        .ai-brand > i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #64C87F;
          box-shadow: 0 0 0 4px #E5F5EA;
        }

        .context-title {
          margin-top: 44px;
        }

        .context-title span,
        .chat-head > div:first-child > span {
          color: ${C.green};
          font-size: 7px;
          font-weight: 850;
          letter-spacing: .11em;
        }

        .context-title h2 {
          margin: 6px 0 0;
          color: ${C.ink};
          font-size: 16px;
          letter-spacing: -.025em;
        }

        .context-list {
          display: flex;
          flex-direction: column;
          margin-top: 17px;
          border-top: 1px solid ${C.border};
        }

        .privacy-note {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding: 11px;
          border: 1px solid #DDEBE1;
          border-radius: 9px;
          background: ${C.greenSoft};
        }

        .privacy-note > span {
          color: ${C.green};
          font-size: 9px;
          font-weight: 800;
        }

        .privacy-note p {
          margin: 0;
          color: #5F7266;
          font-size: 7px;
          line-height: 1.65;
        }

        .side-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 13px;
          padding: 10px 1px 0;
          color: ${C.green};
          font-size: 8px;
          font-weight: 750;
          text-decoration: none;
        }

        .side-link span {
          font-size: 12px;
        }

        .chat-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 650px;
        }

        .chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 21px 25px;
          border-bottom: 1px solid ${C.border};
        }

        .chat-head h2 {
          margin: 6px 0 0;
          color: ${C.ink};
          font-size: 18px;
          letter-spacing: -.03em;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 99px;
          color: ${C.green};
          background: ${C.greenSoft};
          font-size: 7px;
          font-weight: 750;
        }

        .online i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: ${C.green};
        }

        .messages {
          flex: 1;
          min-height: 430px;
          overflow-y: auto;
          padding: 26px 25px;
        }

        .suggestions {
          max-width: 590px;
          margin: 27px auto 0;
        }

        .suggestion-label {
          margin-bottom: 9px;
          color: ${C.muted};
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .suggestion-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .suggestion-grid button {
          position: relative;
          display: grid;
          grid-template-columns: 27px 1fr 12px;
          align-items: center;
          gap: 8px;
          min-height: 55px;
          padding: 9px 10px;
          border: 1px solid ${C.border};
          border-radius: 10px;
          color: ${C.text};
          background: #fff;
          text-align: left;
          font-size: 8px;
          line-height: 1.45;
          cursor: pointer;
          transition: border-color 150ms, transform 150ms;
        }

        .suggestion-grid button:hover {
          transform: translateY(-1px);
          border-color: #C6D8CB;
        }

        .suggestion-grid button > span {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          color: ${C.green};
          background: ${C.greenSoft};
          font-size: 10px;
        }

        .suggestion-grid button > b {
          color: ${C.green};
          font-size: 11px;
        }

        .composer {
          padding: 17px 25px 20px;
          border-top: 1px solid ${C.border};
          background: #fff;
        }

        .composer-box {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 50px;
          padding: 5px 5px 5px 14px;
          border: 1px solid #CCD9D1;
          border-radius: 11px;
          background: #fff;
          box-shadow: 0 4px 15px rgba(15, 35, 25, .025);
        }

        .composer-box:focus-within {
          border-color: #9DC3A9;
          box-shadow: 0 0 0 3px ${C.greenSoft};
        }

        .composer-box input {
          min-width: 0;
          flex: 1;
          height: 38px;
          border: 0;
          outline: 0;
          color: ${C.ink};
          background: transparent;
          font-size: 10px;
        }

        .composer-box input::placeholder {
          color: #9AA4AE;
        }

        .composer-box button {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 8px;
          color: #fff;
          background: ${C.green};
          font-size: 16px;
          cursor: pointer;
        }

        .composer-box button:disabled {
          opacity: .4;
          cursor: default;
        }

        .composer > p {
          margin: 8px 2px 0;
          color: ${C.muted};
          font-size: 7px;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .page-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .workspace,
          .chat-panel {
            min-height: 600px;
          }

          .suggestion-grid {
            grid-template-columns: 1fr;
          }

          .chat-head,
          .messages,
          .composer {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>
    </div>
  );
}

function ContextItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="context-item">
      <i>{icon}</i>
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>

      <style jsx>{`
        .context-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 0;
          border-bottom: 1px solid ${C.border};
        }

        .context-item > i {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          color: ${C.green};
          background: ${C.greenSoft};
          font-style: normal;
          font-size: 9px;
          font-weight: 800;
        }

        .context-item > span {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .context-item small {
          color: ${C.muted};
          font-size: 7px;
        }

        .context-item b {
          color: ${C.ink};
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isKolo = message.role === "kolo";

  return (
    <div className={`message-row ${isKolo ? "kolo" : "user"}`}>
      {isKolo && <div className="message-avatar">✦</div>}

      <div className="message-content">
        <div className="message-meta">
          <b>{isKolo ? "Kolo" : "You"}</b>
          <span>{message.time}</span>
        </div>
        <div className="message-bubble">{message.text}</div>
      </div>

      <style jsx>{`
        .message-row {
          display: flex;
          gap: 9px;
          margin-bottom: 20px;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-avatar {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 8px;
          color: #fff;
          background: ${C.green};
          font-size: 12px;
        }

        .message-content {
          max-width: min(680px, 84%);
        }

        .user .message-content {
          max-width: min(560px, 84%);
        }

        .message-meta {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
        }

        .user .message-meta {
          justify-content: flex-end;
        }

        .message-meta b {
          color: ${C.ink};
          font-size: 8px;
        }

        .message-meta span {
          color: ${C.muted};
          font-size: 7px;
        }

        .message-bubble {
          padding: 12px 14px;
          border: 1px solid ${C.border};
          border-radius: 4px 12px 12px 12px;
          color: ${C.text};
          background: #FBFCFB;
          font-size: 9px;
          line-height: 1.75;
          white-space: pre-line;
        }

        .user .message-bubble {
          border: 0;
          border-radius: 12px 4px 12px 12px;
          color: #fff;
          background: ${C.ink};
        }
      `}</style>
    </div>
  );
}

function buildInsight(question: string, data: UserContext) {
  const q = question.toLowerCase();

  if (
    q.includes("goal") &&
    (q.includes("track") ||
      q.includes("on track") ||
      q.includes("reach") ||
      q.includes("achieve"))
  ) {
    if (!data.goals.length) {
      return "You don't have a savings goal set up yet. Create one in Goals with a target amount and date. Once it has context, Kolo can assess your progress against it.";
    }

    const goal = [...data.goals].sort(
      (a, b) => b.saved / Math.max(b.target, 1) - a.saved / Math.max(a.target, 1)
    )[0];

    const progress = Math.min(
      Math.round((goal.saved / Math.max(goal.target, 1)) * 100),
      100
    );
    const remaining = Math.max(goal.target - goal.saved, 0);
    const days = daysUntil(goal.targetDate);

    if (remaining === 0) {
      return `You're there. Your ${goal.name} goal has reached ${formatNaira(
        goal.target
      )}. That's ${progress}% of the target. Consider setting your next milestone rather than letting the savings momentum stop here.`;
    }

    if (days <= 0) {
      return `Your ${goal.name} goal is ${progress}% complete, with ${formatNaira(
        remaining
      )} remaining. The target date has passed, so I'd review the date and reset it to something realistic rather than treating the original deadline as a failure.`;
    }

    const daily = remaining / days;
    const monthly = daily * 30;

    return `Your ${goal.name} goal is ${progress}% complete. You have ${formatNaira(
      remaining
    )} left and about ${days} days until ${formatDate(
      goal.targetDate
    )}.\n\nTo close the remaining gap at a steady pace, the simple planning benchmark is about ${formatNaira(
      monthly
    )} per 30 days. That is a planning estimate, not financial advice.`;
  }

  if (
    q.includes("how much") ||
    q.includes("save") ||
    q.includes("contribute") ||
    q.includes("monthly")
  ) {
    if (!data.goals.length) {
      return `You've recorded ${formatNaira(
        data.totalSaved
      )} in completed savings activity. To calculate a meaningful target contribution, create a savings goal with an amount and date first.`;
    }

    const goal = data.goals[0];
    const remaining = Math.max(goal.target - goal.saved, 0);
    const days = Math.max(daysUntil(goal.targetDate), 1);
    const monthly = (remaining / days) * 30;

    return `For ${goal.name}, you have ${formatNaira(
      remaining
    )} remaining over roughly ${days} days. A simple pace benchmark is around ${formatNaira(
      monthly
    )} every 30 days.\n\nIf that pace doesn't fit your real contribution pattern, we should adjust the goal date or target rather than forcing an unrealistic plan.`;
  }

  if (
    q.includes("notice") ||
    q.includes("pattern") ||
    q.includes("consistent") ||
    q.includes("progress")
  ) {
    const completed = data.contributions.filter(
      (c) => c.status === "completed"
    );
    const pending = data.contributions.filter(
      (c) => c.status !== "completed"
    );

    if (!data.contributions.length) {
      return "I don't have enough contribution history yet to identify a meaningful pattern. Once your activity builds up, Kolo can compare contribution frequency, completed records and goal progress.";
    }

    return `Here's what I can see right now:\n\n• ${formatNaira(
      data.totalSaved
    )} in completed savings activity\n• ${completed.length} completed contribution${
      completed.length === 1 ? "" : "s"
    }\n• ${pending.length} contribution${
      pending.length === 1 ? "" : "s"
    } not currently marked completed\n• ${data.groups.length} savings group${
      data.groups.length === 1 ? "" : "s"
    }\n\nThe strongest next step is consistency: keep your contribution records accurate so Kolo can identify real trends instead of guessing from incomplete data.`;
  }

  if (
    q.includes("group") ||
    q.includes("community") ||
    q.includes("member")
  ) {
    if (!data.groups.length) {
      return "You're not currently connected to a savings group in the data I can see. Once you join a group, Kolo can use group activity to surface useful community-level insights.";
    }

    const group = data.groups[0];

    return `You currently have ${data.groups.length} active savings group${
      data.groups.length === 1 ? "" : "s"
    }. Your first group is ${group.name || "your savings group"}${
      group.member_count ? ` with ${group.member_count} members` : ""
    }.\n\nFor deeper group intelligence, Kolo will eventually compare expected contributions, completed contributions, participation and group-cycle patterns.`;
  }

  return `I can help you reason about your savings, ${data.goals.length} active goal${
    data.goals.length === 1 ? "" : "s"
  }, ${data.groups.length} savings group${
    data.groups.length === 1 ? "" : "s"
  } and contribution activity.\n\nTry asking:\n• “Am I on track with my savings goals?”\n• “How much should I save to reach my goal?”\n• “What do you notice about my savings?”`;
}

function suggestionIcon(question: string) {
  if (question.includes("group")) return "◎";
  if (question.includes("goal")) return "◇";
  if (question.includes("notice")) return "✦";
  return "₦";
}

function formatNaira(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "your target date";
  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string) {
  const target = new Date(`${value}T23:59:59`);
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function currentTime() {
  return new Date().toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        color: C.muted,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 10px",
            display: "grid",
            placeItems: "center",
            borderRadius: 11,
            color: "#fff",
            background: C.green,
            fontWeight: 800,
          }}
        >
          ✦
        </div>
        <span style={{ fontSize: 9 }}>Preparing Kolo Intelligence...</span>
      </div>
    </div>
  );
}

const authStyles = `
  .auth-empty {
    min-height: 55vh;
    display: grid;
    place-content: center;
    text-align: center;
    font-family: Inter, sans-serif;
  }
  .auth-empty h2 {
    color: ${C.ink};
    font-size: 20px;
    margin: 0 0 6px;
  }
  .auth-empty p {
    color: ${C.text};
    font-size: 10px;
    margin: 0 0 14px;
  }
  .auth-empty a {
    color: ${C.green};
    font-size: 10px;
    font-weight: 750;
    text-decoration: none;
  }
`;


// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/client";

// type Message = {
//   id: string;
//   role: "user" | "kolo";
//   text: string;
//   time: string;
// };

// type Goal = {
//   id: string;
//   name: string;
//   target: number;
//   saved: number;
//   targetDate: string;
// };

// type Contribution = {
//   amount?: number;
//   status?: string;
//   created_at?: string;
//   groups?: { name?: string } | null;
// };

// type Group = {
//   id: string;
//   name?: string;
//   member_count?: number;
//   pool_amount?: number;
// };

// type UserContext = {
//   name: string;
//   totalSaved: number;
//   thisMonth: number;
//   groups: Group[];
//   contributions: Contribution[];
//   goals: Goal[];
// };

// const C = {
//   ink: "#0B1C30",
//   green: "#087A3E",
//   greenSoft: "#EDF8F1",
//   text: "#526171",
//   muted: "#87929E",
//   border: "#E4EBE6",
//   page: "#F7FAF8",
// };

// const suggestedQuestions = [
//   "Am I on track with my savings goals?",
//   "How much should I save to reach my goal?",
//   "What do you notice about my savings?",
//   "How is my savings group performing?",
// ];

// export default function AskKoloPage() {
//   const supabase = createClient();
//   const [context, setContext] = useState<UserContext | null>(null);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [thinking, setThinking] = useState(false);
//   const inputRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     loadContext();
//   }, []);

//   async function loadContext() {
//     setLoading(true);

//     const {
//       data: { user },
//     } = await supabase.auth.getUser();

//     if (!user) {
//       setLoading(false);
//       return;
//     }

//     const [{ data: profile }, { data: memberships }, { data: contributions }] =
//       await Promise.all([
//         supabase
//           .from("profiles")
//           .select("full_name")
//           .eq("id", user.id)
//           .maybeSingle(),
//         supabase
//           .from("group_members")
//           .select("group_id, groups(*)")
//           .eq("user_id", user.id),
//         supabase
//           .from("contributions")
//           .select("amount, status, created_at, group_id, groups(name)")
//           .eq("user_id", user.id)
//           .order("created_at", { ascending: false }),
//       ]);

//     const groups = (memberships?.map((m: any) => m.groups).filter(Boolean) ||
//       []) as Group[];

//     const cs = (contributions || []) as Contribution[];
//     const completed = cs.filter((c) => c.status === "completed");
//     const totalSaved = completed.reduce(
//       (sum, c) => sum + Number(c.amount || 0),
//       0
//     );

//     const now = new Date();
//     const thisMonth = cs
//       .filter((c) => {
//         if (!c.created_at) return false;
//         const date = new Date(c.created_at);
//         return (
//           date.getMonth() === now.getMonth() &&
//           date.getFullYear() === now.getFullYear()
//         );
//       })
//       .reduce((sum, c) => sum + Number(c.amount || 0), 0);

//     let goals: Goal[] = [];
//     try {
//       const stored = window.localStorage.getItem("kolo-ai-savings-goals");
//       if (stored) goals = JSON.parse(stored);
//     } catch {
//       goals = [];
//     }

//     const name =
//       profile?.full_name ||
//       user.user_metadata?.full_name ||
//       user.email?.split("@")[0] ||
//       "there";

//     const userContext: UserContext = {
//       name,
//       totalSaved,
//       thisMonth,
//       groups,
//       contributions: cs,
//       goals,
//     };

//     setContext(userContext);
//     setMessages([
//       {
//         id: crypto.randomUUID(),
//         role: "kolo",
//         text: getWelcome(userContext),
//         time: currentTime(),
//       },
//     ]);
//     setLoading(false);
//   }

//   function getWelcome(data: UserContext) {
//     const firstName = data.name.split(" ")[0];

//     if (!data.goals.length && !data.contributions.length) {
//       return `Good evening, ${firstName}. I'm Kolo. I can help you make sense of your savings, goals and group activity. Start by asking me anything about your savings plan.`;
//     }

//     if (data.goals.length) {
//       const best = [...data.goals].sort(
//         (a, b) => b.saved / Math.max(b.target, 1) - a.saved / Math.max(a.target, 1)
//       )[0];
//       const progress = Math.round(
//         (best.saved / Math.max(best.target, 1)) * 100
//       );

//       return `Good evening, ${firstName}. I can see your savings activity and ${data.goals.length} active goal${data.goals.length > 1 ? "s" : ""}. Your strongest goal is ${best.name}, currently at ${Math.min(progress, 100)}%. What would you like to understand?`;
//     }

//     return `Good evening, ${firstName}. I can see your savings activity and ${data.groups.length} savings group${data.groups.length !== 1 ? "s" : ""}. Ask me about your progress, consistency or what you should focus on next.`;
//   }

//   async function sendMessage(value?: string) {
//     const question = (value ?? input).trim();
//     if (!question || thinking || !context) return;

//     setInput("");
//     setMessages((current) => [
//       ...current,
//       {
//         id: crypto.randomUUID(),
//         role: "user",
//         text: question,
//         time: currentTime(),
//       },
//     ]);

//     setThinking(true);

//     // Replace this local intelligence layer with your secure AI API route.
//     // It deliberately uses the user's real Kolo context instead of pretending
//     // that a generic chatbot has access to their savings.
//     await new Promise((resolve) => setTimeout(resolve, 650));

//     const answer = buildInsight(question, context);

//     setMessages((current) => [
//       ...current,
//       {
//         id: crypto.randomUUID(),
//         role: "kolo",
//         text: answer,
//         time: currentTime(),
//       },
//     ]);

//     setThinking(false);
//   }

//   const firstName = useMemo(
//     () => context?.name?.split(" ")[0] || "there",
//     [context]
//   );

//   if (loading) return <Loading />;

//   if (!context) {
//     return (
//       <div className="auth-empty">
//         <h2>Sign in to ask Kolo.</h2>
//         <p>Kolo needs your savings context to give meaningful answers.</p>
//         <Link href="/login">Back to sign in</Link>
//         <style jsx>{authStyles}</style>
//       </div>
//     );
//   }

//   return (
//     <div className="ask-page">
//       <header className="page-head">
//         <div>
//           <div className="eyebrow">
//             <span />
//             KOLO INTELLIGENCE
//           </div>
//           <h1>Ask Kolo.</h1>
//           <p>
//             Your savings, goals and group activity — understood in one place.
//           </p>
//         </div>

//         <Link href="/dashboard" className="back">
//           ← Dashboard
//         </Link>
//       </header>

//       <div className="workspace">
//         <aside className="context-panel">
//           <div className="ai-brand">
//             <div className="ai-mark">✦</div>
//             <div>
//               <span>KOLO AI</span>
//               <strong>Your savings intelligence</strong>
//             </div>
//             <i />
//           </div>

//           <div className="context-title">
//             <span>YOUR CONTEXT</span>
//             <h2>What Kolo can see</h2>
//           </div>

//           <div className="context-list">
//             <ContextItem
//               icon="₦"
//               label="Recorded savings"
//               value={formatNaira(context.totalSaved)}
//             />
//             <ContextItem
//               icon="↗"
//               label="This month"
//               value={formatNaira(context.thisMonth)}
//             />
//             <ContextItem
//               icon="◎"
//               label="Savings groups"
//               value={String(context.groups.length)}
//             />
//             <ContextItem
//               icon="◇"
//               label="Active goals"
//               value={String(context.goals.length)}
//             />
//           </div>

//           <div className="privacy-note">
//             <span>✓</span>
//             <p>
//               Kolo uses your Kolo activity to make answers more relevant. It
//               doesn't need your banking password or payment credentials.
//             </p>
//           </div>

//           <Link href="/goals" className="side-link">
//             View my goals <span>→</span>
//           </Link>
//         </aside>

//         <main className="chat-panel">
//           <div className="chat-head">
//             <div>
//               <span>PERSONAL AI ASSISTANT</span>
//               <h2>What would you like to know?</h2>
//             </div>
//             <div className="online">
//               <i />
//               Ready
//             </div>
//           </div>

//           <div className="messages">
//             {messages.map((message) => (
//               <MessageBubble key={message.id} message={message} />
//             ))}

//             {thinking && (
//               <div className="thinking">
//                 <div className="avatar">✦</div>
//                 <div className="thinking-bubble">
//                   <span />
//                   <span />
//                   <span />
//                   <small>Kolo is thinking</small>
//                 </div>
//               </div>
//             )}

//             {messages.length <= 1 && !thinking && (
//               <div className="suggestions">
//                 <div className="suggestion-label">TRY ASKING KOLO</div>
//                 <div className="suggestion-grid">
//                   {suggestedQuestions.map((question) => (
//                     <button
//                       key={question}
//                       onClick={() => sendMessage(question)}
//                     >
//                       <span>{suggestionIcon(question)}</span>
//                       {question}
//                       <b>→</b>
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="composer">
//             <div className="composer-box">
//               <input
//                 ref={inputRef}
//                 value={input}
//                 onChange={(event) => setInput(event.target.value)}
//                 onKeyDown={(event) => {
//                   if (event.key === "Enter") sendMessage();
//                 }}
//                 placeholder="Ask Kolo about your savings..."
//                 disabled={thinking}
//               />
//               <button
//                 onClick={() => sendMessage()}
//                 disabled={!input.trim() || thinking}
//                 aria-label="Send message"
//               >
//                 ↑
//               </button>
//             </div>
//             <p>
//               Kolo provides savings insights based on the information available
//               in your account. It does not provide regulated financial advice.
//             </p>
//           </div>
//         </main>
//       </div>

//       <style jsx global>{`
//         * {
//           box-sizing: border-box;
//         }

//         body {
//           background: ${C.page};
//         }

//         .ask-page {
//           min-height: 100%;
//           color: ${C.ink};
//           font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont,
//             "Segoe UI", sans-serif;
//         }

//         button,
//         input {
//           font: inherit;
//         }

//         @media (max-width: 950px) {
//           .workspace {
//             grid-template-columns: 1fr !important;
//           }

//           .context-panel {
//             display: none;
//           }
//         }
//       `}</style>

//       <style jsx>{`
//         .page-head {
//           display: flex;
//           align-items: flex-end;
//           justify-content: space-between;
//           gap: 20px;
//           margin-bottom: 22px;
//         }

//         .eyebrow {
//           display: flex;
//           align-items: center;
//           gap: 7px;
//           color: ${C.green};
//           font-size: 8px;
//           font-weight: 850;
//           letter-spacing: .12em;
//         }

//         .eyebrow span {
//           width: 6px;
//           height: 6px;
//           border-radius: 50%;
//           background: ${C.green};
//         }

//         h1 {
//           margin: 9px 0 5px;
//           color: ${C.ink};
//           font-size: clamp(27px, 3vw, 34px);
//           line-height: 1;
//           letter-spacing: -.05em;
//           font-weight: 800;
//         }

//         .page-head p {
//           margin: 0;
//           color: ${C.text};
//           font-size: 11px;
//         }

//         .back {
//           min-height: 40px;
//           display: inline-flex;
//           align-items: center;
//           padding: 0 13px;
//           border: 1px solid ${C.border};
//           border-radius: 9px;
//           color: ${C.text};
//           background: #fff;
//           font-size: 9px;
//           font-weight: 700;
//           text-decoration: none;
//         }

//         .workspace {
//           min-height: 650px;
//           display: grid;
//           grid-template-columns: 280px minmax(0, 1fr);
//           overflow: hidden;
//           border: 1px solid ${C.border};
//           border-radius: 17px;
//           background: #fff;
//           box-shadow: 0 7px 30px rgba(15, 35, 25, .045);
//         }

//         .context-panel {
//           display: flex;
//           flex-direction: column;
//           padding: 21px;
//           border-right: 1px solid ${C.border};
//           background: #FBFCFB;
//         }

//         .ai-brand {
//           display: flex;
//           align-items: center;
//           gap: 9px;
//         }

//         .ai-mark {
//           width: 37px;
//           height: 37px;
//           display: grid;
//           place-items: center;
//           border-radius: 10px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 16px;
//         }

//         .ai-brand > div:nth-child(2) {
//           display: flex;
//           flex: 1;
//           flex-direction: column;
//           gap: 3px;
//         }

//         .ai-brand span {
//           color: ${C.green};
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: .1em;
//         }

//         .ai-brand strong {
//           color: ${C.ink};
//           font-size: 9px;
//         }

//         .ai-brand > i {
//           width: 6px;
//           height: 6px;
//           border-radius: 50%;
//           background: #64C87F;
//           box-shadow: 0 0 0 4px #E5F5EA;
//         }

//         .context-title {
//           margin-top: 44px;
//         }

//         .context-title span,
//         .chat-head > div:first-child > span {
//           color: ${C.green};
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: .11em;
//         }

//         .context-title h2 {
//           margin: 6px 0 0;
//           color: ${C.ink};
//           font-size: 16px;
//           letter-spacing: -.025em;
//         }

//         .context-list {
//           display: flex;
//           flex-direction: column;
//           margin-top: 17px;
//           border-top: 1px solid ${C.border};
//         }

//         .privacy-note {
//           display: flex;
//           gap: 8px;
//           margin-top: auto;
//           padding: 11px;
//           border: 1px solid #DDEBE1;
//           border-radius: 9px;
//           background: ${C.greenSoft};
//         }

//         .privacy-note > span {
//           color: ${C.green};
//           font-size: 9px;
//           font-weight: 800;
//         }

//         .privacy-note p {
//           margin: 0;
//           color: #5F7266;
//           font-size: 7px;
//           line-height: 1.65;
//         }

//         .side-link {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           margin-top: 13px;
//           padding: 10px 1px 0;
//           color: ${C.green};
//           font-size: 8px;
//           font-weight: 750;
//           text-decoration: none;
//         }

//         .side-link span {
//           font-size: 12px;
//         }

//         .chat-panel {
//           min-width: 0;
//           display: flex;
//           flex-direction: column;
//           min-height: 650px;
//         }

//         .chat-head {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           gap: 15px;
//           padding: 21px 25px;
//           border-bottom: 1px solid ${C.border};
//         }

//         .chat-head h2 {
//           margin: 6px 0 0;
//           color: ${C.ink};
//           font-size: 18px;
//           letter-spacing: -.03em;
//         }

//         .online {
//           display: flex;
//           align-items: center;
//           gap: 6px;
//           padding: 6px 8px;
//           border-radius: 99px;
//           color: ${C.green};
//           background: ${C.greenSoft};
//           font-size: 7px;
//           font-weight: 750;
//         }

//         .online i {
//           width: 5px;
//           height: 5px;
//           border-radius: 50%;
//           background: ${C.green};
//         }

//         .messages {
//           flex: 1;
//           min-height: 430px;
//           overflow-y: auto;
//           padding: 26px 25px;
//         }

//         .suggestions {
//           max-width: 590px;
//           margin: 27px auto 0;
//         }

//         .suggestion-label {
//           margin-bottom: 9px;
//           color: ${C.muted};
//           font-size: 7px;
//           font-weight: 800;
//           letter-spacing: .1em;
//         }

//         .suggestion-grid {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 8px;
//         }

//         .suggestion-grid button {
//           position: relative;
//           display: grid;
//           grid-template-columns: 27px 1fr 12px;
//           align-items: center;
//           gap: 8px;
//           min-height: 55px;
//           padding: 9px 10px;
//           border: 1px solid ${C.border};
//           border-radius: 10px;
//           color: ${C.text};
//           background: #fff;
//           text-align: left;
//           font-size: 8px;
//           line-height: 1.45;
//           cursor: pointer;
//           transition: border-color 150ms, transform 150ms;
//         }

//         .suggestion-grid button:hover {
//           transform: translateY(-1px);
//           border-color: #C6D8CB;
//         }

//         .suggestion-grid button > span {
//           width: 27px;
//           height: 27px;
//           display: grid;
//           place-items: center;
//           border-radius: 7px;
//           color: ${C.green};
//           background: ${C.greenSoft};
//           font-size: 10px;
//         }

//         .suggestion-grid button > b {
//           color: ${C.green};
//           font-size: 11px;
//         }

//         .composer {
//           padding: 17px 25px 20px;
//           border-top: 1px solid ${C.border};
//           background: #fff;
//         }

//         .composer-box {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//           min-height: 50px;
//           padding: 5px 5px 5px 14px;
//           border: 1px solid #CCD9D1;
//           border-radius: 11px;
//           background: #fff;
//           box-shadow: 0 4px 15px rgba(15, 35, 25, .025);
//         }

//         .composer-box:focus-within {
//           border-color: #9DC3A9;
//           box-shadow: 0 0 0 3px ${C.greenSoft};
//         }

//         .composer-box input {
//           min-width: 0;
//           flex: 1;
//           height: 38px;
//           border: 0;
//           outline: 0;
//           color: ${C.ink};
//           background: transparent;
//           font-size: 10px;
//         }

//         .composer-box input::placeholder {
//           color: #9AA4AE;
//         }

//         .composer-box button {
//           width: 38px;
//           height: 38px;
//           border: 0;
//           border-radius: 8px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 16px;
//           cursor: pointer;
//         }

//         .composer-box button:disabled {
//           opacity: .4;
//           cursor: default;
//         }

//         .composer > p {
//           margin: 8px 2px 0;
//           color: ${C.muted};
//           font-size: 7px;
//           line-height: 1.5;
//         }

//         @media (max-width: 600px) {
//           .page-head {
//             align-items: flex-start;
//             flex-direction: column;
//           }

//           .workspace,
//           .chat-panel {
//             min-height: 600px;
//           }

//           .suggestion-grid {
//             grid-template-columns: 1fr;
//           }

//           .chat-head,
//           .messages,
//           .composer {
//             padding-left: 16px;
//             padding-right: 16px;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// function ContextItem({
//   icon,
//   label,
//   value,
// }: {
//   icon: string;
//   label: string;
//   value: string;
// }) {
//   return (
//     <div className="context-item">
//       <i>{icon}</i>
//       <span>
//         <small>{label}</small>
//         <b>{value}</b>
//       </span>

//       <style jsx>{`
//         .context-item {
//           display: flex;
//           align-items: center;
//           gap: 9px;
//           padding: 12px 0;
//           border-bottom: 1px solid ${C.border};
//         }

//         .context-item > i {
//           width: 30px;
//           height: 30px;
//           display: grid;
//           place-items: center;
//           border-radius: 8px;
//           color: ${C.green};
//           background: ${C.greenSoft};
//           font-style: normal;
//           font-size: 9px;
//           font-weight: 800;
//         }

//         .context-item > span {
//           display: flex;
//           flex-direction: column;
//           gap: 3px;
//         }

//         .context-item small {
//           color: ${C.muted};
//           font-size: 7px;
//         }

//         .context-item b {
//           color: ${C.ink};
//           font-size: 10px;
//         }
//       `}</style>
//     </div>
//   );
// }

// function MessageBubble({ message }: { message: Message }) {
//   const isKolo = message.role === "kolo";

//   return (
//     <div className={`message-row ${isKolo ? "kolo" : "user"}`}>
//       {isKolo && <div className="message-avatar">✦</div>}

//       <div className="message-content">
//         <div className="message-meta">
//           <b>{isKolo ? "Kolo" : "You"}</b>
//           <span>{message.time}</span>
//         </div>
//         <div className="message-bubble">{message.text}</div>
//       </div>

//       <style jsx>{`
//         .message-row {
//           display: flex;
//           gap: 9px;
//           margin-bottom: 20px;
//         }

//         .message-row.user {
//           justify-content: flex-end;
//         }

//         .message-avatar {
//           width: 29px;
//           height: 29px;
//           display: grid;
//           place-items: center;
//           flex: 0 0 auto;
//           border-radius: 8px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 12px;
//         }

//         .message-content {
//           max-width: min(680px, 84%);
//         }

//         .user .message-content {
//           max-width: min(560px, 84%);
//         }

//         .message-meta {
//           display: flex;
//           align-items: center;
//           gap: 7px;
//           margin-bottom: 5px;
//         }

//         .user .message-meta {
//           justify-content: flex-end;
//         }

//         .message-meta b {
//           color: ${C.ink};
//           font-size: 8px;
//         }

//         .message-meta span {
//           color: ${C.muted};
//           font-size: 7px;
//         }

//         .message-bubble {
//           padding: 12px 14px;
//           border: 1px solid ${C.border};
//           border-radius: 4px 12px 12px 12px;
//           color: ${C.text};
//           background: #FBFCFB;
//           font-size: 9px;
//           line-height: 1.75;
//           white-space: pre-line;
//         }

//         .user .message-bubble {
//           border: 0;
//           border-radius: 12px 4px 12px 12px;
//           color: #fff;
//           background: ${C.ink};
//         }
//       `}</style>
//     </div>
//   );
// }

// function buildInsight(question: string, data: UserContext) {
//   const q = question.toLowerCase();

//   if (
//     q.includes("goal") &&
//     (q.includes("track") ||
//       q.includes("on track") ||
//       q.includes("reach") ||
//       q.includes("achieve"))
//   ) {
//     if (!data.goals.length) {
//       return "You don't have a savings goal set up yet. Create one in Goals with a target amount and date. Once it has context, Kolo can assess your progress against it.";
//     }

//     const goal = [...data.goals].sort(
//       (a, b) => b.saved / Math.max(b.target, 1) - a.saved / Math.max(a.target, 1)
//     )[0];

//     const progress = Math.min(
//       Math.round((goal.saved / Math.max(goal.target, 1)) * 100),
//       100
//     );
//     const remaining = Math.max(goal.target - goal.saved, 0);
//     const days = daysUntil(goal.targetDate);

//     if (remaining === 0) {
//       return `You're there. Your ${goal.name} goal has reached ${formatNaira(
//         goal.target
//       )}. That's ${progress}% of the target. Consider setting your next milestone rather than letting the savings momentum stop here.`;
//     }

//     if (days <= 0) {
//       return `Your ${goal.name} goal is ${progress}% complete, with ${formatNaira(
//         remaining
//       )} remaining. The target date has passed, so I'd review the date and reset it to something realistic rather than treating the original deadline as a failure.`;
//     }

//     const daily = remaining / days;
//     const monthly = daily * 30;

//     return `Your ${goal.name} goal is ${progress}% complete. You have ${formatNaira(
//       remaining
//     )} left and about ${days} days until ${formatDate(
//       goal.targetDate
//     )}.\n\nTo close the remaining gap at a steady pace, the simple planning benchmark is about ${formatNaira(
//       monthly
//     )} per 30 days. That is a planning estimate, not financial advice.`;
//   }

//   if (
//     q.includes("how much") ||
//     q.includes("save") ||
//     q.includes("contribute") ||
//     q.includes("monthly")
//   ) {
//     if (!data.goals.length) {
//       return `You've recorded ${formatNaira(
//         data.totalSaved
//       )} in completed savings activity. To calculate a meaningful target contribution, create a savings goal with an amount and date first.`;
//     }

//     const goal = data.goals[0];
//     const remaining = Math.max(goal.target - goal.saved, 0);
//     const days = Math.max(daysUntil(goal.targetDate), 1);
//     const monthly = (remaining / days) * 30;

//     return `For ${goal.name}, you have ${formatNaira(
//       remaining
//     )} remaining over roughly ${days} days. A simple pace benchmark is around ${formatNaira(
//       monthly
//     )} every 30 days.\n\nIf that pace doesn't fit your real contribution pattern, we should adjust the goal date or target rather than forcing an unrealistic plan.`;
//   }

//   if (
//     q.includes("notice") ||
//     q.includes("pattern") ||
//     q.includes("consistent") ||
//     q.includes("progress")
//   ) {
//     const completed = data.contributions.filter(
//       (c) => c.status === "completed"
//     );
//     const pending = data.contributions.filter(
//       (c) => c.status !== "completed"
//     );

//     if (!data.contributions.length) {
//       return "I don't have enough contribution history yet to identify a meaningful pattern. Once your activity builds up, Kolo can compare contribution frequency, completed records and goal progress.";
//     }

//     return `Here's what I can see right now:\n\n• ${formatNaira(
//       data.totalSaved
//     )} in completed savings activity\n• ${completed.length} completed contribution${
//       completed.length === 1 ? "" : "s"
//     }\n• ${pending.length} contribution${
//       pending.length === 1 ? "" : "s"
//     } not currently marked completed\n• ${data.groups.length} savings group${
//       data.groups.length === 1 ? "" : "s"
//     }\n\nThe strongest next step is consistency: keep your contribution records accurate so Kolo can identify real trends instead of guessing from incomplete data.`;
//   }

//   if (
//     q.includes("group") ||
//     q.includes("community") ||
//     q.includes("member")
//   ) {
//     if (!data.groups.length) {
//       return "You're not currently connected to a savings group in the data I can see. Once you join a group, Kolo can use group activity to surface useful community-level insights.";
//     }

//     const group = data.groups[0];

//     return `You currently have ${data.groups.length} active savings group${
//       data.groups.length === 1 ? "" : "s"
//     }. Your first group is ${group.name || "your savings group"}${
//       group.member_count ? ` with ${group.member_count} members` : ""
//     }.\n\nFor deeper group intelligence, Kolo will eventually compare expected contributions, completed contributions, participation and group-cycle patterns.`;
//   }

//   return `I can help you reason about your savings, ${data.goals.length} active goal${
//     data.goals.length === 1 ? "" : "s"
//   }, ${data.groups.length} savings group${
//     data.groups.length === 1 ? "" : "s"
//   } and contribution activity.\n\nTry asking:\n• “Am I on track with my savings goals?”\n• “How much should I save to reach my goal?”\n• “What do you notice about my savings?”`;
// }

// function suggestionIcon(question: string) {
//   if (question.includes("group")) return "◎";
//   if (question.includes("goal")) return "◇";
//   if (question.includes("notice")) return "✦";
//   return "₦";
// }

// function formatNaira(value: number) {
//   return `₦${Number(value || 0).toLocaleString("en-NG", {
//     maximumFractionDigits: 0,
//   })}`;
// }

// function formatDate(value: string) {
//   const date = new Date(`${value}T00:00:00`);
//   if (Number.isNaN(date.getTime())) return "your target date";
//   return date.toLocaleDateString("en-NG", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }

// function daysUntil(value: string) {
//   const target = new Date(`${value}T23:59:59`);
//   return Math.ceil((target.getTime() - Date.now()) / 86400000);
// }

// function currentTime() {
//   return new Date().toLocaleTimeString("en-NG", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function Loading() {
//   return (
//     <div
//       style={{
//         minHeight: "60vh",
//         display: "grid",
//         placeItems: "center",
//         color: C.muted,
//         fontFamily: "Inter, sans-serif",
//       }}
//     >
//       <div style={{ textAlign: "center" }}>
//         <div
//           style={{
//             width: 40,
//             height: 40,
//             margin: "0 auto 10px",
//             display: "grid",
//             placeItems: "center",
//             borderRadius: 11,
//             color: "#fff",
//             background: C.green,
//             fontWeight: 800,
//           }}
//         >
//           ✦
//         </div>
//         <span style={{ fontSize: 9 }}>Preparing Kolo Intelligence...</span>
//       </div>
//     </div>
//   );
// }

// const authStyles = `
//   .auth-empty {
//     min-height: 55vh;
//     display: grid;
//     place-content: center;
//     text-align: center;
//     font-family: Inter, sans-serif;
//   }
//   .auth-empty h2 {
//     color: ${C.ink};
//     font-size: 20px;
//     margin: 0 0 6px;
//   }
//   .auth-empty p {
//     color: ${C.text};
//     font-size: 10px;
//     margin: 0 0 14px;
//   }
//   .auth-empty a {
//     color: ${C.green};
//     font-size: 10px;
//     font-weight: 750;
//     text-decoration: none;
//   }
// `;
