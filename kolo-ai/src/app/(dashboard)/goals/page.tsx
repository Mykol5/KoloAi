"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
  category: string;
  createdAt: string;
};

const C = {
  ink: "#0B1C30",
  green: "#087A3E",
  greenDark: "#075F31",
  soft: "#EDF8F1",
  text: "#526171",
  muted: "#87929E",
  border: "#E4EBE6",
  page: "#F7FAF8",
  gradient: "linear-gradient(135deg, #0B1C30 0%, #1a3a5c 100%)",
  shadow: "0 4px 24px rgba(15,35,25,.06)",
  shadowHover: "0 8px 32px rgba(15,35,25,.1)",
};

const STORAGE_KEY = "kolo-ai-savings-goals";

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setGoals(JSON.parse(stored));
    } catch {
      // Keep the screen usable if local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // Ignore storage failures; the UI still works for this session.
    }
  }, [goals, mounted]);

  const totals = useMemo(() => {
    const target = goals.reduce((sum, goal) => sum + goal.target, 0);
    const saved = goals.reduce((sum, goal) => sum + goal.saved, 0);
    return {
      target,
      saved,
      progress: target ? Math.round((saved / target) * 100) : 0,
    };
  }, [goals]);

  const addGoal = (goal: Omit<Goal, "id" | "createdAt">) => {
    const next: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setGoals((current) => [next, ...current]);
    setShowCreate(false);
  };

  const updateSaved = (id: string, amount: number) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id
          ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) }
          : goal
      )
    );
    setSelectedGoal(null);
  };

  const deleteGoal = (id: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== id));
    setSelectedGoal(null);
  };

  return (
    <div className="goals-page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <span />
            SAVINGS GOALS
          </div>
          <h1>Give your savings a destination.</h1>
          <p>
            Set a target, choose a date, and let Kolo help you understand the
            path to getting there.
          </p>
        </div>

        <div className="head-actions">
          <Link href="/dashboard" className="back-link">
            ← Dashboard
          </Link>
          <button className="create-button" onClick={() => setShowCreate(true)}>
            <span>+</span>
            New goal
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <div className="overview-card primary-card">
          <div className="card-top">
            <div className="card-label">TOTAL SAVINGS TARGET</div>
            <div className="card-badge">{goals.length} goals</div>
          </div>
          <div className="overview-number">{formatNaira(totals.target)}</div>
          <div className="overview-bottom">
            <span>Overall progress</span>
            <strong>{totals.progress}%</strong>
          </div>
          <div className="large-track">
            <span style={{ width: `${Math.min(totals.progress, 100)}%` }} />
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon green">₦</div>
          <div className="card-label">SAVED TOWARD GOALS</div>
          <div className="small-number">{formatNaira(totals.saved)}</div>
          <p>Recorded against your active targets.</p>
        </div>

        <div className="overview-card">
          <div className="card-icon navy">✦</div>
          <div className="card-label">KOLO FOCUS</div>
          <div className="focus-title">
            {goals.length ? "Keep your targets visible." : "Start with one clear target."}
          </div>
          <p>
            {goals.length
              ? "Consistent progress is easier to see when every goal has a clear destination."
              : "A goal gives Kolo context for future savings guidance."}
          </p>
        </div>
      </section>

      <div className="content-layout">
        <main>
          <div className="section-head">
            <div>
              <span className="section-tag">YOUR TARGETS</span>
              <h2>My savings goals</h2>
            </div>
            {goals.length > 0 && (
              <span className="goal-count">
                {goals.length} active
              </span>
            )}
          </div>

          {goals.length === 0 ? (
            <EmptyGoals onCreate={() => setShowCreate(true)} />
          ) : (
            <div className="goal-list">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onOpen={() => setSelectedGoal(goal)}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="side-column">
          <KoloPlanner goals={goals} />
          <HowItWorks />
        </aside>
      </div>

      {showCreate && (
        <CreateGoalModal
          onClose={() => setShowCreate(false)}
          onCreate={addGoal}
        />
      )}

      {selectedGoal && (
        <GoalDetailsModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onAdd={(amount) => updateSaved(selectedGoal.id, amount)}
          onDelete={() => deleteGoal(selectedGoal.id)}
        />
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          background: ${C.page};
        }

        .goals-page {
          min-height: 100%;
          color: ${C.ink};
          font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .overview-card,
        .goal-card,
        .empty-card,
        .side-card {
          border: 1px solid ${C.border};
          background: #fff;
          border-radius: 20px;
          box-shadow: ${C.shadow};
        }

        .content-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
          margin-top: 28px;
        }

        @media (max-width: 1050px) {
          .content-layout {
            grid-template-columns: 1fr;
          }

          .side-column {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .side-column {
            display: flex;
            flex-direction: column;
          }
        }
      `}</style>

      <style jsx>{`
        .page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
          padding: 32px;
          background: #fff;
          border-radius: 24px;
          border: 1px solid ${C.border};
          box-shadow: ${C.shadow};
        }

        .eyebrow,
        .section-tag {
          display: flex;
          align-items: center;
          gap: 7px;
          color: ${C.green};
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
        }

        .eyebrow span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${C.green};
          box-shadow: 0 0 0 4px ${C.soft};
        }

        h1 {
          margin: 12px 0 8px;
          max-width: 720px;
          color: ${C.ink};
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.1;
          letter-spacing: -0.045em;
          font-weight: 780;
        }

        .page-head p {
          max-width: 620px;
          margin: 0;
          color: ${C.text};
          font-size: 13px;
          line-height: 1.65;
        }

        .head-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .back-link,
        .create-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 750;
          text-decoration: none;
          transition: all 0.2s;
        }

        .back-link {
          color: ${C.text};
          border: 1.5px solid ${C.border};
          background: #fff;
        }

        .back-link:hover {
          border-color: ${C.green};
          color: ${C.green};
        }

        .create-button {
          border: 0;
          color: #fff;
          background: ${C.green};
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(8, 122, 62, 0.2);
        }

        .create-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(8, 122, 62, 0.3);
        }

        .create-button span {
          margin-right: 6px;
          font-size: 18px;
          font-weight: 500;
          line-height: 1;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 16px;
        }

        .overview-card {
          min-height: 170px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }

        .overview-card:hover {
          box-shadow: ${C.shadowHover};
          transform: translateY(-2px);
        }

        .primary-card {
          background: ${C.gradient};
          border-color: ${C.ink};
          color: #fff;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-label {
          color: ${C.muted};
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.11em;
        }

        .primary-card .card-label {
          color: #8D9AA6;
        }

        .card-badge {
          padding: 4px 10px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.1);
          color: #8DE0A8;
          font-size: 9px;
          font-weight: 650;
        }

        .overview-number {
          margin-top: 16px;
          color: #fff;
          font-size: 32px;
          line-height: 1;
          letter-spacing: -0.045em;
          font-weight: 780;
        }

        .overview-bottom {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 24px;
          color: #8D9AA6;
          font-size: 9px;
        }

        .overview-bottom strong {
          color: #9BE4B2;
          font-weight: 700;
        }

        .large-track {
          height: 6px;
          overflow: hidden;
          margin-top: 10px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.1);
        }

        .large-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #6ED28D, #8DE0A8);
        }

        .card-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 800;
        }

        .card-icon.green {
          color: ${C.green};
          background: ${C.soft};
        }

        .card-icon.navy {
          color: #fff;
          background: ${C.gradient};
          box-shadow: 0 4px 12px rgba(11, 28, 48, 0.2);
        }

        .small-number {
          margin-top: 12px;
          color: ${C.ink};
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 780;
        }

        .overview-card p {
          margin: 12px 0 0;
          color: ${C.muted};
          font-size: 10px;
          line-height: 1.55;
        }

        .focus-title {
          margin-top: 12px;
          color: ${C.ink};
          font-size: 18px;
          line-height: 1.25;
          letter-spacing: -0.025em;
          font-weight: 750;
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .section-tag {
          font-size: 8px;
        }

        .section-head h2 {
          margin: 6px 0 0;
          color: ${C.ink};
          font-size: 20px;
          letter-spacing: -0.025em;
        }

        .goal-count {
          padding: 6px 12px;
          border-radius: 99px;
          background: ${C.soft};
          color: ${C.green};
          font-size: 9px;
          font-weight: 650;
        }

        .goal-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 760px) {
          .page-head {
            align-items: flex-start;
            flex-direction: column;
            padding: 20px;
          }

          .head-actions {
            width: 100%;
          }

          .head-actions a,
          .head-actions button {
            flex: 1;
          }

          .overview-grid,
          .goal-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .overview-grid {
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function GoalCard({
  goal,
  onOpen,
}: {
  goal: Goal;
  onOpen: () => void;
}) {
  const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
  const remaining = Math.max(goal.target - goal.saved, 0);
  const days = daysUntil(goal.targetDate);

  return (
    <button className="goal-card" onClick={onOpen}>
      <div className="goal-top">
        <div className={`goal-icon ${categoryClass(goal.category)}`}>
          {categoryIcon(goal.category)}
        </div>

        <div className="goal-title">
          <span>{goal.category}</span>
          <strong>{goal.name}</strong>
        </div>

        <span className="goal-arrow">→</span>
      </div>

      <div className="goal-money">
        <div>
          <span>Saved</span>
          <strong>{formatNaira(goal.saved)}</strong>
        </div>
        <div className="target">
          <span>Target</span>
          <strong>{formatNaira(goal.target)}</strong>
        </div>
      </div>

      <div className="goal-progress">
        <div className="progress-head">
          <span>{progress}% complete</span>
          <span>{formatNaira(remaining)} remaining</span>
        </div>
        <div className="progress-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="goal-foot">
        <span>
          <b>Target date</b>
          {formatDate(goal.targetDate)}
        </span>
        <span>
          <b>{days < 0 ? "Past target" : days === 0 ? "Due today" : `${days} days left`}</b>
          {days >= 0 ? "Keep going" : "Review your plan"}
        </span>
      </div>

      <style jsx>{`
        .goal-card {
          width: 100%;
          padding: 24px;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .goal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${C.gradient};
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: 20px 20px 0 0;
        }

        .goal-card:hover {
          transform: translateY(-3px);
          border-color: #CBDCCF;
          box-shadow: ${C.shadowHover};
        }

        .goal-card:hover::before {
          opacity: 1;
        }

        .goal-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .goal-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 800;
          transition: transform 0.2s;
        }

        .goal-card:hover .goal-icon {
          transform: scale(1.05);
        }

        .business {
          color: #087A3E;
          background: #EDF8F1;
        }

        .emergency {
          color: #425B79;
          background: #F0F5FA;
        }

        .home {
          color: #6B587C;
          background: #F5F1F8;
        }

        .education {
          color: #7B641E;
          background: #FBF7E8;
        }

        .other {
          color: ${C.ink};
          background: #F0F2F3;
        }

        .goal-title {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .goal-title span {
          color: ${C.muted};
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .goal-title strong {
          overflow: hidden;
          color: ${C.ink};
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .goal-arrow {
          color: #9AA4AE;
          font-size: 16px;
          transition: transform 0.2s;
        }

        .goal-card:hover .goal-arrow {
          transform: translateX(4px);
        }

        .goal-money {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin-top: 28px;
        }

        .goal-money div {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .goal-money span {
          color: ${C.muted};
          font-size: 8px;
        }

        .goal-money strong {
          color: ${C.ink};
          font-size: 20px;
          letter-spacing: -0.025em;
        }

        .goal-money .target {
          text-align: right;
        }

        .goal-progress {
          margin-top: 20px;
        }

        .progress-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: ${C.text};
          font-size: 8px;
          font-weight: 700;
        }

        .progress-head span:last-child {
          color: ${C.muted};
          font-weight: 500;
        }

        .progress-track {
          height: 7px;
          overflow: hidden;
          margin-top: 8px;
          border-radius: 99px;
          background: #EDF1EE;
        }

        .progress-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, ${C.green}, #0A9A4F);
        }

        .goal-foot {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #EEF2EF;
        }

        .goal-foot span {
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: ${C.muted};
          font-size: 8px;
        }

        .goal-foot span:last-child {
          text-align: right;
        }

        .goal-foot b {
          color: ${C.text};
          font-size: 9px;
          font-weight: 700;
        }
      `}</style>
    </button>
  );
}

function EmptyGoals({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="empty-card">
      <div className="empty-visual">
        <div className="ring">
          <span>₦</span>
        </div>
        <div className="mini-dot dot-one" />
        <div className="mini-dot dot-two" />
      </div>

      <div className="empty-copy">
        <span>YOUR FIRST TARGET</span>
        <h3>What are you saving for?</h3>
        <p>
          Set a clear amount and target date. Kolo can use that context to help
          you understand your savings pace.
        </p>
        <button onClick={onCreate}>Create your first goal →</button>
      </div>

      <style jsx>{`
        .empty-card {
          min-height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 60px;
          padding: 40px;
          overflow: hidden;
          position: relative;
        }

        .empty-visual {
          position: relative;
          width: 170px;
          height: 170px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
        }

        .ring {
          width: 130px;
          height: 130px;
          display: grid;
          place-items: center;
          border: 2px solid #C9DCCE;
          border-radius: 50%;
          background: ${C.soft};
          position: relative;
        }

        .ring::before {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          border: 1.5px dashed #B8CFBF;
          border-radius: 50%;
        }

        .ring span {
          position: relative;
          z-index: 1;
          color: ${C.green};
          font-size: 34px;
          font-weight: 750;
        }

        .mini-dot {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${C.green};
          box-shadow: 0 0 0 4px ${C.soft};
        }

        .dot-one {
          top: 15px;
          right: 22px;
        }

        .dot-two {
          bottom: 20px;
          left: 16px;
          background: #B8CFBF;
        }

        .empty-copy {
          max-width: 440px;
        }

        .empty-copy > span {
          color: ${C.green};
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.11em;
        }

        .empty-copy h3 {
          margin: 10px 0;
          color: ${C.ink};
          font-size: 26px;
          letter-spacing: -0.035em;
        }

        .empty-copy p {
          margin: 0;
          color: ${C.text};
          font-size: 11px;
          line-height: 1.7;
        }

        .empty-copy button {
          margin-top: 20px;
          border: 0;
          padding: 12px 18px;
          border-radius: 12px;
          color: #fff;
          background: ${C.green};
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(8, 122, 62, 0.2);
          transition: all 0.2s;
        }

        .empty-copy button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(8, 122, 62, 0.3);
        }

        @media (max-width: 650px) {
          .empty-card {
            flex-direction: column;
            gap: 24px;
            text-align: center;
          }

          .empty-copy {
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}

function KoloPlanner({ goals }: { goals: Goal[] }) {
  const bestGoal = [...goals].sort((a, b) => {
    const ap = a.target ? a.saved / a.target : 0;
    const bp = b.target ? b.saved / b.target : 0;
    return bp - ap;
  })[0];

  return (
    <section className="side-card planner">
      <div className="planner-top">
        <div className="planner-mark">✦</div>
        <div>
          <span>KOLO AI</span>
          <strong>Savings planner</strong>
        </div>
      </div>

      <div className="planner-line">READY TO LEARN FROM YOUR GOALS</div>

      {bestGoal ? (
        <>
          <h3>{bestGoal.name}</h3>
          <p>
            You&apos;ve reached{" "}
            <b>{Math.min(Math.round((bestGoal.saved / bestGoal.target) * 100), 100)}%</b>{" "}
            of this target. Keep the goal visible and Kolo can use your progress
            when giving future savings guidance.
          </p>
          <div className="planner-progress">
            <i
              style={{
                width: `${Math.min(
                  Math.round((bestGoal.saved / bestGoal.target) * 100),
                  100
                )}%`,
              }}
            />
          </div>
        </>
      ) : (
        <>
          <h3>Your goals give Kolo context.</h3>
          <p>
            Add a savings target and date. That creates the foundation for
            personalized planning and progress insights.
          </p>
        </>
      )}

      <Link href="/ask-kolo">
        Ask Kolo about my savings <span>→</span>
      </Link>

      <style jsx>{`
        .planner {
          padding: 24px;
          color: #fff;
          background: ${C.gradient};
          border-color: ${C.ink};
          box-shadow: 0 16px 40px rgba(11, 28, 48, 0.2);
          position: relative;
          overflow: hidden;
        }

        .planner::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .planner-top {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .planner-mark {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #fff;
          background: ${C.green};
          font-size: 18px;
          box-shadow: 0 8px 20px rgba(8, 122, 62, 0.4);
        }

        .planner-top div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .planner-top span {
          color: #8DE0A8;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .planner-top strong {
          color: #fff;
          font-size: 14px;
        }

        .planner-line {
          margin-top: 28px;
          color: #7D8B99;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.1em;
          position: relative;
          z-index: 1;
        }

        .planner h3 {
          margin: 10px 0;
          color: #fff;
          font-size: 20px;
          line-height: 1.2;
          letter-spacing: -0.03em;
          position: relative;
          z-index: 1;
        }

        .planner p {
          margin: 0;
          color: #C5D0D9;
          font-size: 10px;
          line-height: 1.75;
          position: relative;
          z-index: 1;
        }

        .planner p b {
          color: #9BE4B2;
        }

        .planner-progress {
          height: 6px;
          overflow: hidden;
          margin-top: 18px;
          border-radius: 99px;
          background: rgba(255,255,255,.1);
          position: relative;
          z-index: 1;
        }

        .planner-progress i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #6ED28D, #8DE0A8);
        }

        .planner > a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.12);
          color: #fff;
          font-size: 9px;
          font-weight: 750;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
          z-index: 1;
        }

        .planner > a:hover {
          color: #8DE0A8;
        }

        .planner > a span {
          color: #8DE0A8;
          font-size: 14px;
          transition: transform 0.2s;
        }

        .planner > a:hover span {
          transform: translateX(4px);
        }
      `}</style>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["01", "Set a target", "Choose what you want to achieve and how much you need."],
    ["02", "Choose a date", "Give the goal a realistic destination."],
    ["03", "Build the pace", "Kolo can later use your activity to guide your progress."],
  ];

  return (
    <section className="side-card how">
      <div className="how-title">
        <span>HOW IT WORKS</span>
        <h3>From intention to progress.</h3>
      </div>

      <div className="steps">
        {steps.map(([number, title, text]) => (
          <div className="step" key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .how {
          padding: 24px;
        }

        .how-title > span {
          color: ${C.green};
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .11em;
        }

        .how-title h3 {
          margin: 8px 0 20px;
          color: ${C.ink};
          font-size: 18px;
          letter-spacing: -.025em;
        }

        .step {
          display: flex;
          gap: 12px;
          padding: 14px 0;
          border-top: 1px solid #EEF2EF;
          transition: all 0.2s;
        }

        .step:hover {
          padding-left: 8px;
        }

        .step > span {
          color: ${C.green};
          font-size: 8px;
          font-weight: 850;
          flex-shrink: 0;
        }

        .step strong {
          color: ${C.ink};
          font-size: 10px;
        }

        .step p {
          margin: 5px 0 0;
          color: ${C.muted};
          font-size: 9px;
          line-height: 1.6;
        }
      `}</style>
    </section>
  );
}

function CreateGoalModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (goal: Omit<Goal, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Business");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetValue = Number(target.replace(/,/g, ""));
    const savedValue = Number(saved.replace(/,/g, "")) || 0;

    if (!name.trim() || !targetValue || targetValue <= 0 || !date) return;

    onCreate({
      name: name.trim(),
      target: targetValue,
      saved: Math.min(Math.max(savedValue, 0), targetValue),
      targetDate: date,
      category,
    });
  };

  return (
    <Modal title="Create a savings goal" onClose={onClose}>
      <form onSubmit={submit} className="goal-form">
        <div className="form-intro">
          <span>✦</span>
          <p>
            Give Kolo a clear target. You can connect real contribution activity
            to this goal as we build the next layer.
          </p>
        </div>

        <label>
          Goal name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business Capital"
            autoFocus
          />
        </label>

        <div className="two">
          <label>
            Target amount
            <div className="amount-input">
              <span>₦</span>
              <input
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="500000"
              />
            </div>
          </label>

          <label>
            Already saved
            <div className="amount-input">
              <span>₦</span>
              <input
                inputMode="numeric"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
                placeholder="0"
              />
            </div>
          </label>
        </div>

        <div className="two">
          <label>
            Target date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Business</option>
              <option>Emergency</option>
              <option>Home</option>
              <option>Education</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="submit">
            Create goal
          </button>
        </div>
      </form>

      <style jsx>{`
        .goal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-intro {
          display: flex;
          gap: 10px;
          padding: 14px;
          border-radius: 12px;
          background: ${C.soft};
        }

        .form-intro span {
          color: ${C.green};
          font-size: 16px;
        }

        .form-intro p {
          margin: 0;
          color: ${C.text};
          font-size: 9px;
          line-height: 1.6;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: ${C.text};
          font-size: 9px;
          font-weight: 700;
        }

        input,
        select {
          width: 100%;
          height: 42px;
          border: 1px solid ${C.border};
          outline: 0;
          border-radius: 10px;
          padding: 0 12px;
          color: ${C.ink};
          background: #fff;
          font-size: 11px;
          transition: all 0.2s;
        }

        input:focus,
        select:focus {
          border-color: #9BC6A9;
          box-shadow: 0 0 0 3px ${C.soft};
        }

        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .amount-input {
          display: flex;
          align-items: center;
          height: 42px;
          border: 1px solid ${C.border};
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .amount-input:focus-within {
          border-color: #9BC6A9;
          box-shadow: 0 0 0 3px ${C.soft};
        }

        .amount-input span {
          padding-left: 12px;
          color: ${C.green};
          font-size: 12px;
          font-weight: 750;
        }

        .amount-input input {
          height: 100%;
          border: 0;
          box-shadow: none;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid #EEF2EF;
        }

        .form-actions button {
          min-height: 40px;
          padding: 0 16px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel {
          color: ${C.text};
          border: 1px solid ${C.border};
          background: #fff;
        }

        .cancel:hover {
          border-color: ${C.ink};
        }

        .submit {
          color: #fff;
          border: 1px solid ${C.green};
          background: ${C.green};
          box-shadow: 0 4px 12px rgba(8, 122, 62, 0.2);
        }

        .submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(8, 122, 62, 0.3);
        }

        @media (max-width: 480px) {
          .two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Modal>
  );
}

function GoalDetailsModal({
  goal,
  onClose,
  onAdd,
  onDelete,
}: {
  goal: Goal;
  onClose: () => void;
  onAdd: (amount: number) => void;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState("");

  const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
  const remaining = Math.max(goal.target - goal.saved, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount.replace(/,/g, ""));
    if (value > 0) onAdd(value);
  };

  return (
    <Modal title={goal.name} onClose={onClose}>
      <div className="details">
        <div className="detail-summary">
          <span>{goal.category}</span>
          <strong>{progress}%</strong>
          <small>of your target reached</small>
        </div>

        <div className="detail-track">
          <i style={{ width: `${progress}%` }} />
        </div>

        <div className="detail-grid">
          <div><span>Saved</span><b>{formatNaira(goal.saved)}</b></div>
          <div><span>Target</span><b>{formatNaira(goal.target)}</b></div>
          <div><span>Remaining</span><b>{formatNaira(remaining)}</b></div>
          <div><span>Target date</span><b>{formatDate(goal.targetDate)}</b></div>
        </div>

        <form className="add-form" onSubmit={submit}>
          <label>Add recorded progress</label>
          <div className="add-row">
            <div>
              <span>₦</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 20000"
              />
            </div>
            <button type="submit">Add progress</button>
          </div>
          <p>
            This screen currently stores goal progress locally. We&apos;ll connect
            it to your real contribution records in the next backend step.
          </p>
        </form>

        <div className="danger-zone">
          <button onClick={onDelete}>Delete goal</button>
        </div>
      </div>

      <style jsx>{`
        .details {
          display: flex;
          flex-direction: column;
        }

        .detail-summary {
          padding: 20px;
          border-radius: 12px;
          background: ${C.gradient};
        }

        .detail-summary span {
          display: block;
          color: #8DE0A8;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .1em;
        }

        .detail-summary strong {
          display: inline-block;
          margin-top: 8px;
          color: #fff;
          font-size: 32px;
          letter-spacing: -.04em;
        }

        .detail-summary small {
          margin-left: 10px;
          color: #9AA8B4;
          font-size: 9px;
        }

        .detail-track {
          height: 7px;
          overflow: hidden;
          margin-top: 16px;
          border-radius: 99px;
          background: #EDF1EE;
        }

        .detail-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, ${C.green}, #0A9A4F);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          margin-top: 20px;
          overflow: hidden;
          border: 1px solid ${C.border};
          border-radius: 12px;
          background: ${C.border};
        }

        .detail-grid div {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px;
          background: #fff;
        }

        .detail-grid span {
          color: ${C.muted};
          font-size: 8px;
        }

        .detail-grid b {
          color: ${C.ink};
          font-size: 12px;
        }

        .add-form {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #EEF2EF;
        }

        .add-form > label {
          display: block;
          color: ${C.ink};
          font-size: 10px;
          font-weight: 750;
        }

        .add-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          margin-top: 8px;
        }

        .add-row > div {
          height: 40px;
          display: flex;
          align-items: center;
          border: 1px solid ${C.border};
          border-radius: 10px;
          overflow: hidden;
        }

        .add-row > div span {
          padding-left: 12px;
          color: ${C.green};
          font-weight: 750;
        }

        .add-row input {
          width: 100%;
          height: 100%;
          padding: 0 10px;
          border: 0;
          outline: 0;
          color: ${C.ink};
          font-size: 10px;
        }

        .add-row button {
          padding: 0 14px;
          border: 0;
          border-radius: 10px;
          color: #fff;
          background: ${C.green};
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-row button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(8, 122, 62, 0.3);
        }

        .add-form p {
          margin: 8px 0 0;
          color: ${C.muted};
          font-size: 8px;
          line-height: 1.55;
        }

        .danger-zone {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid #EEF2EF;
        }

        .danger-zone button {
          border: 0;
          color: #9A4A4A;
          background: transparent;
          font-size: 9px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .danger-zone button:hover {
          color: #C53030;
        }

        @media (max-width: 480px) {
          .add-row {
            grid-template-columns: 1fr;
          }

          .add-row button {
            height: 40px;
          }
        }
      `}</style>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          z-index: 100;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(5, 15, 24, 0.48);
          backdrop-filter: blur(4px);
        }

        .modal {
          width: min(100%, 510px);
          max-height: calc(100vh - 40px);
          overflow: auto;
          padding: 24px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2);
        }

        .modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .modal-head h2 {
          margin: 0;
          color: ${C.ink};
          font-size: 20px;
          letter-spacing: -0.025em;
        }

        .modal-head button {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid ${C.border};
          border-radius: 10px;
          color: ${C.text};
          background: #fff;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-head button:hover {
          background: #F5F5F5;
        }
      `}</style>
    </div>
  );
}

function formatNaira(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string) {
  const target = new Date(`${value}T23:59:59`);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function categoryIcon(category: string) {
  switch (category) {
    case "Business":
      return "↗";
    case "Emergency":
      return "◈";
    case "Home":
      return "⌂";
    case "Education":
      return "◇";
    default:
      return "◎";
  }
}

function categoryClass(category: string) {
  switch (category) {
    case "Business":
      return "business";
    case "Emergency":
      return "emergency";
    case "Home":
      return "home";
    case "Education":
      return "education";
    default:
      return "other";
  }
}




// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Link from "next/link";

// type Goal = {
//   id: string;
//   name: string;
//   target: number;
//   saved: number;
//   targetDate: string;
//   category: string;
//   createdAt: string;
// };

// const C = {
//   ink: "#0B1C30",
//   green: "#087A3E",
//   greenDark: "#075F31",
//   soft: "#EDF8F1",
//   text: "#526171",
//   muted: "#87929E",
//   border: "#E4EBE6",
//   page: "#F7FAF8",
// };

// const STORAGE_KEY = "kolo-ai-savings-goals";

// export default function SavingsGoalsPage() {
//   const [goals, setGoals] = useState<Goal[]>([]);
//   const [showCreate, setShowCreate] = useState(false);
//   const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//     try {
//       const stored = window.localStorage.getItem(STORAGE_KEY);
//       if (stored) setGoals(JSON.parse(stored));
//     } catch {
//       // Keep the screen usable if local storage is unavailable.
//     }
//   }, []);

//   useEffect(() => {
//     if (!mounted) return;
//     try {
//       window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
//     } catch {
//       // Ignore storage failures; the UI still works for this session.
//     }
//   }, [goals, mounted]);

//   const totals = useMemo(() => {
//     const target = goals.reduce((sum, goal) => sum + goal.target, 0);
//     const saved = goals.reduce((sum, goal) => sum + goal.saved, 0);
//     return {
//       target,
//       saved,
//       progress: target ? Math.round((saved / target) * 100) : 0,
//     };
//   }, [goals]);

//   const addGoal = (goal: Omit<Goal, "id" | "createdAt">) => {
//     const next: Goal = {
//       ...goal,
//       id: crypto.randomUUID(),
//       createdAt: new Date().toISOString(),
//     };
//     setGoals((current) => [next, ...current]);
//     setShowCreate(false);
//   };

//   const updateSaved = (id: string, amount: number) => {
//     setGoals((current) =>
//       current.map((goal) =>
//         goal.id === id
//           ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) }
//           : goal
//       )
//     );
//     setSelectedGoal(null);
//   };

//   const deleteGoal = (id: string) => {
//     setGoals((current) => current.filter((goal) => goal.id !== id));
//     setSelectedGoal(null);
//   };

//   return (
//     <div className="goals-page">
//       <header className="page-head">
//         <div>
//           <div className="eyebrow">
//             <span />
//             SAVINGS GOALS
//           </div>
//           <h1>Give your savings a destination.</h1>
//           <p>
//             Set a target, choose a date, and let Kolo help you understand the
//             path to getting there.
//           </p>
//         </div>

//         <div className="head-actions">
//           <Link href="/dashboard" className="back-link">
//             ← Dashboard
//           </Link>
//           <button className="create-button" onClick={() => setShowCreate(true)}>
//             <span>+</span>
//             New goal
//           </button>
//         </div>
//       </header>

//       <section className="overview-grid">
//         <div className="overview-card primary-card">
//           <div className="card-label">TOTAL SAVINGS TARGET</div>
//           <div className="overview-number">{formatNaira(totals.target)}</div>
//           <div className="overview-bottom">
//             <span>{goals.length} active goal{goals.length === 1 ? "" : "s"}</span>
//             <strong>{totals.progress}% overall progress</strong>
//           </div>
//           <div className="large-track">
//             <span style={{ width: `${Math.min(totals.progress, 100)}%` }} />
//           </div>
//         </div>

//         <div className="overview-card">
//           <div className="card-icon green">₦</div>
//           <div className="card-label">SAVED TOWARD GOALS</div>
//           <div className="small-number">{formatNaira(totals.saved)}</div>
//           <p>Recorded against your active targets.</p>
//         </div>

//         <div className="overview-card">
//           <div className="card-icon navy">✦</div>
//           <div className="card-label">KOLO FOCUS</div>
//           <div className="focus-title">
//             {goals.length ? "Keep your targets visible." : "Start with one clear target."}
//           </div>
//           <p>
//             {goals.length
//               ? "Consistent progress is easier to see when every goal has a clear destination."
//               : "A goal gives Kolo context for future savings guidance."}
//           </p>
//         </div>
//       </section>

//       <div className="content-layout">
//         <main>
//           <div className="section-head">
//             <div>
//               <span className="section-tag">YOUR TARGETS</span>
//               <h2>My savings goals</h2>
//             </div>
//             {goals.length > 0 && (
//               <span className="goal-count">
//                 {goals.length} active
//               </span>
//             )}
//           </div>

//           {goals.length === 0 ? (
//             <EmptyGoals onCreate={() => setShowCreate(true)} />
//           ) : (
//             <div className="goal-list">
//               {goals.map((goal) => (
//                 <GoalCard
//                   key={goal.id}
//                   goal={goal}
//                   onOpen={() => setSelectedGoal(goal)}
//                 />
//               ))}
//             </div>
//           )}
//         </main>

//         <aside className="side-column">
//           <KoloPlanner goals={goals} />
//           <HowItWorks />
//         </aside>
//       </div>

//       {showCreate && (
//         <CreateGoalModal
//           onClose={() => setShowCreate(false)}
//           onCreate={addGoal}
//         />
//       )}

//       {selectedGoal && (
//         <GoalDetailsModal
//           goal={selectedGoal}
//           onClose={() => setSelectedGoal(null)}
//           onAdd={(amount) => updateSaved(selectedGoal.id, amount)}
//           onDelete={() => deleteGoal(selectedGoal.id)}
//         />
//       )}

//       <style jsx global>{`
//         * {
//           box-sizing: border-box;
//         }

//         body {
//           background: ${C.page};
//         }

//         .goals-page {
//           min-height: 100%;
//           color: ${C.ink};
//           font-family: Inter, Geist, system-ui, -apple-system, BlinkMacSystemFont,
//             "Segoe UI", sans-serif;
//         }

//         button,
//         input,
//         select {
//           font: inherit;
//         }

//         .overview-card,
//         .goal-card,
//         .empty-card,
//         .side-card {
//           border: 1px solid ${C.border};
//           background: #fff;
//           border-radius: 16px;
//           box-shadow: 0 4px 18px rgba(15, 35, 25, 0.035);
//         }

//         .content-layout {
//           display: grid;
//           grid-template-columns: minmax(0, 1fr) 320px;
//           gap: 20px;
//           margin-top: 25px;
//         }

//         @media (max-width: 1050px) {
//           .content-layout {
//             grid-template-columns: 1fr;
//           }

//           .side-column {
//             display: grid;
//             grid-template-columns: repeat(2, minmax(0, 1fr));
//           }
//         }

//         @media (max-width: 700px) {
//           .side-column {
//             display: flex;
//             flex-direction: column;
//           }
//         }
//       `}</style>

//       <style jsx>{`
//         .page-head {
//           display: flex;
//           align-items: flex-end;
//           justify-content: space-between;
//           gap: 24px;
//           margin-bottom: 24px;
//         }

//         .eyebrow,
//         .section-tag {
//           display: flex;
//           align-items: center;
//           gap: 7px;
//           color: ${C.green};
//           font-size: 8px;
//           font-weight: 850;
//           letter-spacing: 0.12em;
//         }

//         .eyebrow span {
//           width: 6px;
//           height: 6px;
//           border-radius: 50%;
//           background: ${C.green};
//         }

//         h1 {
//           margin: 9px 0 6px;
//           max-width: 720px;
//           color: ${C.ink};
//           font-size: clamp(25px, 3vw, 32px);
//           line-height: 1.08;
//           letter-spacing: -0.045em;
//           font-weight: 780;
//         }

//         .page-head p {
//           max-width: 620px;
//           margin: 0;
//           color: ${C.text};
//           font-size: 12px;
//           line-height: 1.65;
//         }

//         .head-actions {
//           display: flex;
//           align-items: center;
//           gap: 9px;
//         }

//         .back-link,
//         .create-button {
//           min-height: 42px;
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;
//           border-radius: 10px;
//           padding: 0 14px;
//           font-size: 10px;
//           font-weight: 750;
//           text-decoration: none;
//         }

//         .back-link {
//           color: ${C.text};
//           border: 1px solid ${C.border};
//           background: #fff;
//         }

//         .create-button {
//           border: 0;
//           color: #fff;
//           background: ${C.green};
//           cursor: pointer;
//           box-shadow: 0 8px 18px rgba(8, 122, 62, 0.14);
//         }

//         .create-button span {
//           margin-right: 5px;
//           font-size: 15px;
//           font-weight: 500;
//         }

//         .overview-grid {
//           display: grid;
//           grid-template-columns: 1.4fr 1fr 1fr;
//           gap: 14px;
//         }

//         .overview-card {
//           min-height: 150px;
//           padding: 20px;
//         }

//         .primary-card {
//           background: ${C.ink};
//           border-color: ${C.ink};
//           color: #fff;
//         }

//         .card-label {
//           color: ${C.muted};
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: 0.11em;
//         }

//         .primary-card .card-label {
//           color: #8D9AA6;
//         }

//         .overview-number {
//           margin-top: 16px;
//           color: #fff;
//           font-size: 29px;
//           line-height: 1;
//           letter-spacing: -0.045em;
//           font-weight: 780;
//         }

//         .overview-bottom {
//           display: flex;
//           justify-content: space-between;
//           gap: 10px;
//           margin-top: 22px;
//           color: #8D9AA6;
//           font-size: 8px;
//         }

//         .overview-bottom strong {
//           color: #9BE4B2;
//           font-weight: 700;
//         }

//         .large-track {
//           height: 5px;
//           overflow: hidden;
//           margin-top: 9px;
//           border-radius: 99px;
//           background: rgba(255, 255, 255, 0.1);
//         }

//         .large-track span {
//           display: block;
//           height: 100%;
//           border-radius: inherit;
//           background: #6ED28D;
//         }

//         .card-icon {
//           width: 34px;
//           height: 34px;
//           display: grid;
//           place-items: center;
//           margin-bottom: 17px;
//           border-radius: 9px;
//           font-size: 13px;
//           font-weight: 800;
//         }

//         .card-icon.green {
//           color: ${C.green};
//           background: ${C.soft};
//         }

//         .card-icon.navy {
//           color: #fff;
//           background: ${C.ink};
//         }

//         .small-number {
//           margin-top: 10px;
//           color: ${C.ink};
//           font-size: 23px;
//           line-height: 1;
//           letter-spacing: -0.035em;
//           font-weight: 780;
//         }

//         .overview-card p {
//           margin: 9px 0 0;
//           color: ${C.muted};
//           font-size: 9px;
//           line-height: 1.55;
//         }

//         .focus-title {
//           margin-top: 10px;
//           color: ${C.ink};
//           font-size: 16px;
//           line-height: 1.25;
//           letter-spacing: -0.025em;
//           font-weight: 750;
//         }

//         .section-head {
//           display: flex;
//           align-items: flex-end;
//           justify-content: space-between;
//           gap: 15px;
//           margin-bottom: 14px;
//         }

//         .section-tag {
//           font-size: 7px;
//         }

//         .section-head h2 {
//           margin: 6px 0 0;
//           color: ${C.ink};
//           font-size: 18px;
//           letter-spacing: -0.025em;
//         }

//         .goal-count {
//           color: ${C.muted};
//           font-size: 8px;
//         }

//         .goal-list {
//           display: grid;
//           grid-template-columns: repeat(2, minmax(0, 1fr));
//           gap: 14px;
//         }

//         @media (max-width: 760px) {
//           .page-head {
//             align-items: flex-start;
//             flex-direction: column;
//           }

//           .head-actions {
//             width: 100%;
//           }

//           .head-actions a,
//           .head-actions button {
//             flex: 1;
//           }

//           .overview-grid,
//           .goal-list {
//             grid-template-columns: 1fr;
//           }
//         }

//         @media (max-width: 500px) {
//           .overview-grid {
//             gap: 10px;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// function GoalCard({
//   goal,
//   onOpen,
// }: {
//   goal: Goal;
//   onOpen: () => void;
// }) {
//   const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
//   const remaining = Math.max(goal.target - goal.saved, 0);
//   const days = daysUntil(goal.targetDate);

//   return (
//     <button className="goal-card" onClick={onOpen}>
//       <div className="goal-top">
//         <div className={`goal-icon ${categoryClass(goal.category)}`}>
//           {categoryIcon(goal.category)}
//         </div>

//         <div className="goal-title">
//           <span>{goal.category}</span>
//           <strong>{goal.name}</strong>
//         </div>

//         <span className="goal-arrow">→</span>
//       </div>

//       <div className="goal-money">
//         <div>
//           <span>Saved</span>
//           <strong>{formatNaira(goal.saved)}</strong>
//         </div>
//         <div className="target">
//           <span>Target</span>
//           <strong>{formatNaira(goal.target)}</strong>
//         </div>
//       </div>

//       <div className="goal-progress">
//         <div className="progress-head">
//           <span>{progress}% complete</span>
//           <span>{formatNaira(remaining)} remaining</span>
//         </div>
//         <div className="progress-track">
//           <i style={{ width: `${progress}%` }} />
//         </div>
//       </div>

//       <div className="goal-foot">
//         <span>
//           <b>Target date</b>
//           {formatDate(goal.targetDate)}
//         </span>
//         <span>
//           <b>{days < 0 ? "Past target" : days === 0 ? "Due today" : `${days} days left`}</b>
//           {days >= 0 ? "Keep going" : "Review your plan"}
//         </span>
//       </div>

//       <style jsx>{`
//         .goal-card {
//           width: 100%;
//           padding: 19px;
//           color: inherit;
//           text-align: left;
//           cursor: pointer;
//           transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
//         }

//         .goal-card:hover {
//           transform: translateY(-2px);
//           border-color: #CBDCCF;
//           box-shadow: 0 12px 28px rgba(15, 35, 25, 0.07);
//         }

//         .goal-top {
//           display: flex;
//           align-items: center;
//           gap: 10px;
//         }

//         .goal-icon {
//           width: 39px;
//           height: 39px;
//           display: grid;
//           place-items: center;
//           flex: 0 0 auto;
//           border-radius: 10px;
//           font-size: 15px;
//           font-weight: 800;
//         }

//         .business {
//           color: #087A3E;
//           background: #EDF8F1;
//         }

//         .emergency {
//           color: #425B79;
//           background: #F0F5FA;
//         }

//         .home {
//           color: #6B587C;
//           background: #F5F1F8;
//         }

//         .education {
//           color: #7B641E;
//           background: #FBF7E8;
//         }

//         .other {
//           color: ${C.ink};
//           background: #F0F2F3;
//         }

//         .goal-title {
//           min-width: 0;
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           gap: 4px;
//         }

//         .goal-title span {
//           color: ${C.muted};
//           font-size: 7px;
//           font-weight: 700;
//           text-transform: uppercase;
//           letter-spacing: 0.08em;
//         }

//         .goal-title strong {
//           overflow: hidden;
//           color: ${C.ink};
//           font-size: 12px;
//           text-overflow: ellipsis;
//           white-space: nowrap;
//         }

//         .goal-arrow {
//           color: #9AA4AE;
//           font-size: 14px;
//         }

//         .goal-money {
//           display: flex;
//           justify-content: space-between;
//           gap: 20px;
//           margin-top: 24px;
//         }

//         .goal-money div {
//           display: flex;
//           flex-direction: column;
//           gap: 5px;
//         }

//         .goal-money span {
//           color: ${C.muted};
//           font-size: 7px;
//         }

//         .goal-money strong {
//           color: ${C.ink};
//           font-size: 17px;
//           letter-spacing: -0.025em;
//         }

//         .goal-money .target {
//           text-align: right;
//         }

//         .goal-progress {
//           margin-top: 17px;
//         }

//         .progress-head {
//           display: flex;
//           justify-content: space-between;
//           gap: 10px;
//           color: ${C.text};
//           font-size: 7px;
//           font-weight: 700;
//         }

//         .progress-head span:last-child {
//           color: ${C.muted};
//           font-weight: 500;
//         }

//         .progress-track {
//           height: 6px;
//           overflow: hidden;
//           margin-top: 7px;
//           border-radius: 99px;
//           background: #EDF1EE;
//         }

//         .progress-track i {
//           display: block;
//           height: 100%;
//           border-radius: inherit;
//           background: ${C.green};
//         }

//         .goal-foot {
//           display: flex;
//           justify-content: space-between;
//           gap: 15px;
//           margin-top: 18px;
//           padding-top: 13px;
//           border-top: 1px solid #EEF2EF;
//         }

//         .goal-foot span {
//           display: flex;
//           flex-direction: column;
//           gap: 4px;
//           color: ${C.muted};
//           font-size: 7px;
//         }

//         .goal-foot span:last-child {
//           text-align: right;
//         }

//         .goal-foot b {
//           color: ${C.text};
//           font-size: 8px;
//           font-weight: 700;
//         }
//       `}</style>
//     </button>
//   );
// }

// function EmptyGoals({ onCreate }: { onCreate: () => void }) {
//   return (
//     <section className="empty-card">
//       <div className="empty-visual">
//         <div className="ring">
//           <span>₦</span>
//         </div>
//         <div className="mini-dot dot-one" />
//         <div className="mini-dot dot-two" />
//       </div>

//       <div className="empty-copy">
//         <span>YOUR FIRST TARGET</span>
//         <h3>What are you saving for?</h3>
//         <p>
//           Set a clear amount and target date. Kolo can use that context to help
//           you understand your savings pace.
//         </p>
//         <button onClick={onCreate}>Create your first goal →</button>
//       </div>

//       <style jsx>{`
//         .empty-card {
//           min-height: 340px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           gap: 55px;
//           padding: 35px;
//           overflow: hidden;
//           position: relative;
//         }

//         .empty-visual {
//           position: relative;
//           width: 160px;
//           height: 160px;
//           flex: 0 0 auto;
//           display: grid;
//           place-items: center;
//         }

//         .ring {
//           width: 122px;
//           height: 122px;
//           display: grid;
//           place-items: center;
//           border: 1px solid #C9DCCE;
//           border-radius: 50%;
//           background: ${C.soft};
//         }

//         .ring::before {
//           content: "";
//           position: absolute;
//           width: 92px;
//           height: 92px;
//           border: 1px dashed #B8CFBF;
//           border-radius: 50%;
//         }

//         .ring span {
//           position: relative;
//           z-index: 1;
//           color: ${C.green};
//           font-size: 30px;
//           font-weight: 750;
//         }

//         .mini-dot {
//           position: absolute;
//           width: 8px;
//           height: 8px;
//           border-radius: 50%;
//           background: ${C.green};
//         }

//         .dot-one {
//           top: 12px;
//           right: 20px;
//         }

//         .dot-two {
//           bottom: 17px;
//           left: 14px;
//           background: #B8CFBF;
//         }

//         .empty-copy {
//           max-width: 420px;
//         }

//         .empty-copy > span {
//           color: ${C.green};
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: 0.11em;
//         }

//         .empty-copy h3 {
//           margin: 7px 0 7px;
//           color: ${C.ink};
//           font-size: 22px;
//           letter-spacing: -0.035em;
//         }

//         .empty-copy p {
//           margin: 0;
//           color: ${C.text};
//           font-size: 10px;
//           line-height: 1.7;
//         }

//         .empty-copy button {
//           margin-top: 18px;
//           border: 0;
//           padding: 11px 14px;
//           border-radius: 9px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 9px;
//           font-weight: 750;
//           cursor: pointer;
//         }

//         @media (max-width: 650px) {
//           .empty-card {
//             flex-direction: column;
//             gap: 20px;
//             text-align: center;
//           }

//           .empty-copy {
//             max-width: 100%;
//           }
//         }
//       `}</style>
//     </section>
//   );
// }

// function KoloPlanner({ goals }: { goals: Goal[] }) {
//   const bestGoal = [...goals].sort((a, b) => {
//     const ap = a.target ? a.saved / a.target : 0;
//     const bp = b.target ? b.saved / b.target : 0;
//     return bp - ap;
//   })[0];

//   return (
//     <section className="side-card planner">
//       <div className="planner-top">
//         <div className="planner-mark">✦</div>
//         <div>
//           <span>KOLO AI</span>
//           <strong>Savings planner</strong>
//         </div>
//       </div>

//       <div className="planner-line">READY TO LEARN FROM YOUR GOALS</div>

//       {bestGoal ? (
//         <>
//           <h3>{bestGoal.name}</h3>
//           <p>
//             You&apos;ve reached{" "}
//             <b>{Math.min(Math.round((bestGoal.saved / bestGoal.target) * 100), 100)}%</b>{" "}
//             of this target. Keep the goal visible and Kolo can use your progress
//             when giving future savings guidance.
//           </p>
//           <div className="planner-progress">
//             <i
//               style={{
//                 width: `${Math.min(
//                   Math.round((bestGoal.saved / bestGoal.target) * 100),
//                   100
//                 )}%`,
//               }}
//             />
//           </div>
//         </>
//       ) : (
//         <>
//           <h3>Your goals give Kolo context.</h3>
//           <p>
//             Add a savings target and date. That creates the foundation for
//             personalized planning and progress insights.
//           </p>
//         </>
//       )}

//       <Link href="/ask-kolo">
//         Ask Kolo about my savings <span>→</span>
//       </Link>

//       <style jsx>{`
//         .planner {
//           padding: 21px;
//           color: #fff;
//           background: ${C.ink};
//           border-color: ${C.ink};
//           box-shadow: 0 15px 32px rgba(11, 28, 48, 0.12);
//         }

//         .planner-top {
//           display: flex;
//           align-items: center;
//           gap: 9px;
//         }

//         .planner-mark {
//           width: 35px;
//           height: 35px;
//           display: grid;
//           place-items: center;
//           border-radius: 10px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 16px;
//         }

//         .planner-top div:last-child {
//           display: flex;
//           flex-direction: column;
//           gap: 3px;
//         }

//         .planner-top span {
//           color: #8DE0A8;
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: 0.1em;
//         }

//         .planner-top strong {
//           color: #fff;
//           font-size: 12px;
//         }

//         .planner-line {
//           margin-top: 27px;
//           color: #7D8B99;
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: 0.1em;
//         }

//         .planner h3 {
//           margin: 8px 0;
//           color: #fff;
//           font-size: 18px;
//           line-height: 1.2;
//           letter-spacing: -0.03em;
//         }

//         .planner p {
//           margin: 0;
//           color: #C5D0D9;
//           font-size: 9px;
//           line-height: 1.75;
//         }

//         .planner p b {
//           color: #9BE4B2;
//         }

//         .planner-progress {
//           height: 5px;
//           overflow: hidden;
//           margin-top: 17px;
//           border-radius: 99px;
//           background: rgba(255,255,255,.1);
//         }

//         .planner-progress i {
//           display: block;
//           height: 100%;
//           border-radius: inherit;
//           background: #6ED28D;
//         }

//         .planner > a {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           margin-top: 17px;
//           padding-top: 13px;
//           border-top: 1px solid rgba(255,255,255,.09);
//           color: #fff;
//           font-size: 8px;
//           font-weight: 750;
//           text-decoration: none;
//         }

//         .planner > a span {
//           color: #8DE0A8;
//           font-size: 13px;
//         }
//       `}</style>
//     </section>
//   );
// }

// function HowItWorks() {
//   const steps = [
//     ["01", "Set a target", "Choose what you want to achieve and how much you need."],
//     ["02", "Choose a date", "Give the goal a realistic destination."],
//     ["03", "Build the pace", "Kolo can later use your activity to guide your progress."],
//   ];

//   return (
//     <section className="side-card how">
//       <div className="how-title">
//         <span>HOW IT WORKS</span>
//         <h3>From intention to progress.</h3>
//       </div>

//       <div className="steps">
//         {steps.map(([number, title, text]) => (
//           <div className="step" key={number}>
//             <span>{number}</span>
//             <div>
//               <strong>{title}</strong>
//               <p>{text}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       <style jsx>{`
//         .how {
//           padding: 20px;
//         }

//         .how-title > span {
//           color: ${C.green};
//           font-size: 7px;
//           font-weight: 850;
//           letter-spacing: .11em;
//         }

//         .how-title h3 {
//           margin: 6px 0 18px;
//           color: ${C.ink};
//           font-size: 16px;
//           letter-spacing: -.025em;
//         }

//         .step {
//           display: flex;
//           gap: 10px;
//           padding: 12px 0;
//           border-top: 1px solid #EEF2EF;
//         }

//         .step > span {
//           color: ${C.green};
//           font-size: 7px;
//           font-weight: 850;
//         }

//         .step strong {
//           color: ${C.ink};
//           font-size: 9px;
//         }

//         .step p {
//           margin: 4px 0 0;
//           color: ${C.muted};
//           font-size: 8px;
//           line-height: 1.6;
//         }
//       `}</style>
//     </section>
//   );
// }

// function CreateGoalModal({
//   onClose,
//   onCreate,
// }: {
//   onClose: () => void;
//   onCreate: (goal: Omit<Goal, "id" | "createdAt">) => void;
// }) {
//   const [name, setName] = useState("");
//   const [target, setTarget] = useState("");
//   const [saved, setSaved] = useState("");
//   const [date, setDate] = useState("");
//   const [category, setCategory] = useState("Business");

//   const submit = (e: React.FormEvent) => {
//     e.preventDefault();

//     const targetValue = Number(target.replace(/,/g, ""));
//     const savedValue = Number(saved.replace(/,/g, "")) || 0;

//     if (!name.trim() || !targetValue || targetValue <= 0 || !date) return;

//     onCreate({
//       name: name.trim(),
//       target: targetValue,
//       saved: Math.min(Math.max(savedValue, 0), targetValue),
//       targetDate: date,
//       category,
//     });
//   };

//   return (
//     <Modal title="Create a savings goal" onClose={onClose}>
//       <form onSubmit={submit} className="goal-form">
//         <div className="form-intro">
//           <span>✦</span>
//           <p>
//             Give Kolo a clear target. You can connect real contribution activity
//             to this goal as we build the next layer.
//           </p>
//         </div>

//         <label>
//           Goal name
//           <input
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="e.g. Business Capital"
//             autoFocus
//           />
//         </label>

//         <div className="two">
//           <label>
//             Target amount
//             <div className="amount-input">
//               <span>₦</span>
//               <input
//                 inputMode="numeric"
//                 value={target}
//                 onChange={(e) => setTarget(e.target.value)}
//                 placeholder="500000"
//               />
//             </div>
//           </label>

//           <label>
//             Already saved
//             <div className="amount-input">
//               <span>₦</span>
//               <input
//                 inputMode="numeric"
//                 value={saved}
//                 onChange={(e) => setSaved(e.target.value)}
//                 placeholder="0"
//               />
//             </div>
//           </label>
//         </div>

//         <div className="two">
//           <label>
//             Target date
//             <input
//               type="date"
//               value={date}
//               onChange={(e) => setDate(e.target.value)}
//             />
//           </label>

//           <label>
//             Category
//             <select value={category} onChange={(e) => setCategory(e.target.value)}>
//               <option>Business</option>
//               <option>Emergency</option>
//               <option>Home</option>
//               <option>Education</option>
//               <option>Other</option>
//             </select>
//           </label>
//         </div>

//         <div className="form-actions">
//           <button type="button" className="cancel" onClick={onClose}>
//             Cancel
//           </button>
//           <button type="submit" className="submit">
//             Create goal
//           </button>
//         </div>
//       </form>

//       <style jsx>{`
//         .goal-form {
//           display: flex;
//           flex-direction: column;
//           gap: 15px;
//         }

//         .form-intro {
//           display: flex;
//           gap: 9px;
//           padding: 11px;
//           border-radius: 9px;
//           background: ${C.soft};
//         }

//         .form-intro span {
//           color: ${C.green};
//           font-size: 14px;
//         }

//         .form-intro p {
//           margin: 0;
//           color: ${C.text};
//           font-size: 8px;
//           line-height: 1.6;
//         }

//         label {
//           display: flex;
//           flex-direction: column;
//           gap: 6px;
//           color: ${C.text};
//           font-size: 8px;
//           font-weight: 700;
//         }

//         input,
//         select {
//           width: 100%;
//           height: 40px;
//           border: 1px solid ${C.border};
//           outline: 0;
//           border-radius: 8px;
//           padding: 0 11px;
//           color: ${C.ink};
//           background: #fff;
//           font-size: 10px;
//         }

//         input:focus,
//         select:focus {
//           border-color: #9BC6A9;
//           box-shadow: 0 0 0 3px ${C.soft};
//         }

//         .two {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 11px;
//         }

//         .amount-input {
//           display: flex;
//           align-items: center;
//           height: 40px;
//           border: 1px solid ${C.border};
//           border-radius: 8px;
//           overflow: hidden;
//         }

//         .amount-input:focus-within {
//           border-color: #9BC6A9;
//           box-shadow: 0 0 0 3px ${C.soft};
//         }

//         .amount-input span {
//           padding-left: 10px;
//           color: ${C.green};
//           font-size: 11px;
//           font-weight: 750;
//         }

//         .amount-input input {
//           height: 100%;
//           border: 0;
//           box-shadow: none;
//         }

//         .form-actions {
//           display: flex;
//           justify-content: flex-end;
//           gap: 8px;
//           margin-top: 5px;
//           padding-top: 14px;
//           border-top: 1px solid #EEF2EF;
//         }

//         .form-actions button {
//           min-height: 39px;
//           padding: 0 14px;
//           border-radius: 8px;
//           font-size: 9px;
//           font-weight: 750;
//           cursor: pointer;
//         }

//         .cancel {
//           color: ${C.text};
//           border: 1px solid ${C.border};
//           background: #fff;
//         }

//         .submit {
//           color: #fff;
//           border: 1px solid ${C.green};
//           background: ${C.green};
//         }

//         @media (max-width: 480px) {
//           .two {
//             grid-template-columns: 1fr;
//           }
//         }
//       `}</style>
//     </Modal>
//   );
// }

// function GoalDetailsModal({
//   goal,
//   onClose,
//   onAdd,
//   onDelete,
// }: {
//   goal: Goal;
//   onClose: () => void;
//   onAdd: (amount: number) => void;
//   onDelete: () => void;
// }) {
//   const [amount, setAmount] = useState("");

//   const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
//   const remaining = Math.max(goal.target - goal.saved, 0);

//   const submit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const value = Number(amount.replace(/,/g, ""));
//     if (value > 0) onAdd(value);
//   };

//   return (
//     <Modal title={goal.name} onClose={onClose}>
//       <div className="details">
//         <div className="detail-summary">
//           <span>{goal.category}</span>
//           <strong>{progress}%</strong>
//           <small>of your target reached</small>
//         </div>

//         <div className="detail-track">
//           <i style={{ width: `${progress}%` }} />
//         </div>

//         <div className="detail-grid">
//           <div><span>Saved</span><b>{formatNaira(goal.saved)}</b></div>
//           <div><span>Target</span><b>{formatNaira(goal.target)}</b></div>
//           <div><span>Remaining</span><b>{formatNaira(remaining)}</b></div>
//           <div><span>Target date</span><b>{formatDate(goal.targetDate)}</b></div>
//         </div>

//         <form className="add-form" onSubmit={submit}>
//           <label>Add recorded progress</label>
//           <div className="add-row">
//             <div>
//               <span>₦</span>
//               <input
//                 inputMode="numeric"
//                 value={amount}
//                 onChange={(e) => setAmount(e.target.value)}
//                 placeholder="e.g. 20000"
//               />
//             </div>
//             <button type="submit">Add progress</button>
//           </div>
//           <p>
//             This screen currently stores goal progress locally. We&apos;ll connect
//             it to your real contribution records in the next backend step.
//           </p>
//         </form>

//         <div className="danger-zone">
//           <button onClick={onDelete}>Delete goal</button>
//         </div>
//       </div>

//       <style jsx>{`
//         .details {
//           display: flex;
//           flex-direction: column;
//         }

//         .detail-summary {
//           padding: 16px;
//           border-radius: 10px;
//           background: ${C.ink};
//         }

//         .detail-summary span {
//           display: block;
//           color: #8DE0A8;
//           font-size: 7px;
//           font-weight: 800;
//           text-transform: uppercase;
//           letter-spacing: .1em;
//         }

//         .detail-summary strong {
//           display: inline-block;
//           margin-top: 7px;
//           color: #fff;
//           font-size: 28px;
//           letter-spacing: -.04em;
//         }

//         .detail-summary small {
//           margin-left: 8px;
//           color: #9AA8B4;
//           font-size: 8px;
//         }

//         .detail-track {
//           height: 6px;
//           overflow: hidden;
//           margin-top: 15px;
//           border-radius: 99px;
//           background: #EDF1EE;
//         }

//         .detail-track i {
//           display: block;
//           height: 100%;
//           border-radius: inherit;
//           background: ${C.green};
//         }

//         .detail-grid {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 1px;
//           margin-top: 16px;
//           overflow: hidden;
//           border: 1px solid ${C.border};
//           border-radius: 10px;
//           background: ${C.border};
//         }

//         .detail-grid div {
//           display: flex;
//           flex-direction: column;
//           gap: 5px;
//           padding: 11px;
//           background: #fff;
//         }

//         .detail-grid span {
//           color: ${C.muted};
//           font-size: 7px;
//         }

//         .detail-grid b {
//           color: ${C.ink};
//           font-size: 10px;
//         }

//         .add-form {
//           margin-top: 17px;
//           padding-top: 16px;
//           border-top: 1px solid #EEF2EF;
//         }

//         .add-form > label {
//           display: block;
//           color: ${C.ink};
//           font-size: 9px;
//           font-weight: 750;
//         }

//         .add-row {
//           display: grid;
//           grid-template-columns: 1fr auto;
//           gap: 7px;
//           margin-top: 7px;
//         }

//         .add-row > div {
//           height: 39px;
//           display: flex;
//           align-items: center;
//           border: 1px solid ${C.border};
//           border-radius: 8px;
//           overflow: hidden;
//         }

//         .add-row > div span {
//           padding-left: 10px;
//           color: ${C.green};
//           font-weight: 750;
//         }

//         .add-row input {
//           width: 100%;
//           height: 100%;
//           padding: 0 9px;
//           border: 0;
//           outline: 0;
//           color: ${C.ink};
//           font-size: 9px;
//         }

//         .add-row button {
//           padding: 0 12px;
//           border: 0;
//           border-radius: 8px;
//           color: #fff;
//           background: ${C.green};
//           font-size: 8px;
//           font-weight: 750;
//           cursor: pointer;
//         }

//         .add-form p {
//           margin: 7px 0 0;
//           color: ${C.muted};
//           font-size: 7px;
//           line-height: 1.55;
//         }

//         .danger-zone {
//           display: flex;
//           justify-content: flex-end;
//           margin-top: 16px;
//           padding-top: 12px;
//           border-top: 1px solid #EEF2EF;
//         }

//         .danger-zone button {
//           border: 0;
//           color: #9A4A4A;
//           background: transparent;
//           font-size: 8px;
//           cursor: pointer;
//         }

//         @media (max-width: 480px) {
//           .add-row {
//             grid-template-columns: 1fr;
//           }

//           .add-row button {
//             height: 39px;
//           }
//         }
//       `}</style>
//     </Modal>
//   );
// }

// function Modal({
//   title,
//   onClose,
//   children,
// }: {
//   title: string;
//   onClose: () => void;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="modal-backdrop" onMouseDown={onClose}>
//       <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
//         <div className="modal-head">
//           <h2>{title}</h2>
//           <button onClick={onClose} aria-label="Close">
//             ×
//           </button>
//         </div>
//         {children}
//       </div>

//       <style jsx>{`
//         .modal-backdrop {
//           position: fixed;
//           z-index: 100;
//           inset: 0;
//           display: grid;
//           place-items: center;
//           padding: 20px;
//           background: rgba(5, 15, 24, 0.48);
//           backdrop-filter: blur(4px);
//         }

//         .modal {
//           width: min(100%, 510px);
//           max-height: calc(100vh - 40px);
//           overflow: auto;
//           padding: 21px;
//           border-radius: 15px;
//           background: #fff;
//           box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2);
//         }

//         .modal-head {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           gap: 15px;
//           margin-bottom: 18px;
//         }

//         .modal-head h2 {
//           margin: 0;
//           color: ${C.ink};
//           font-size: 18px;
//           letter-spacing: -0.025em;
//         }

//         .modal-head button {
//           width: 30px;
//           height: 30px;
//           display: grid;
//           place-items: center;
//           border: 1px solid ${C.border};
//           border-radius: 8px;
//           color: ${C.text};
//           background: #fff;
//           font-size: 19px;
//           line-height: 1;
//           cursor: pointer;
//         }
//       `}</style>
//     </div>
//   );
// }

// function formatNaira(value: number) {
//   return `₦${Number(value || 0).toLocaleString("en-NG", {
//     maximumFractionDigits: 0,
//   })}`;
// }

// function formatDate(value: string) {
//   if (!value) return "No date";
//   const date = new Date(`${value}T00:00:00`);
//   if (Number.isNaN(date.getTime())) return "No date";
//   return date.toLocaleDateString("en-NG", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }

// function daysUntil(value: string) {
//   const target = new Date(`${value}T23:59:59`);
//   const now = new Date();
//   return Math.ceil((target.getTime() - now.getTime()) / 86400000);
// }

// function categoryIcon(category: string) {
//   switch (category) {
//     case "Business":
//       return "↗";
//     case "Emergency":
//       return "◈";
//     case "Home":
//       return "⌂";
//     case "Education":
//       return "◇";
//     default:
//       return "◎";
//   }
// }

// function categoryClass(category: string) {
//   switch (category) {
//     case "Business":
//       return "business";
//     case "Emergency":
//       return "emergency";
//     case "Home":
//       return "home";
//     case "Education":
//       return "education";
//     default:
//       return "other";
//   }
// }
