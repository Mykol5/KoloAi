"use client";

import Link from "next/link";

const green = "#0B7A3B";
const dark = "#0B1C30";
const text = "#435064";
const soft = "#F5F8F6";
const border = "#E5EBE7";

export default function Home() {
  return (
    <main className="kolo-home">
      <TopNavBar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <AISection />
      <SaversSection />
      <GroupsSection />
      <VerificationSection />
      <HowItWorksSection />
      <FinalCTA />
      <Footer />

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #ffffff;
          color: ${dark};
          font-family: Inter, Geist, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        a {
          color: inherit;
        }

        .kolo-home {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 85% 7%, rgba(11, 122, 59, 0.06), transparent 24%),
            #ffffff;
        }

        .container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .section {
          padding: 100px 0;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(11, 122, 59, 0.15);
          border-radius: 999px;
          background: rgba(11, 122, 59, 0.06);
          color: ${green};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${green};
        }

        .section-title {
          margin: 14px 0 14px;
          color: ${dark};
          font-size: clamp(32px, 4vw, 50px);
          line-height: 1.08;
          letter-spacing: -0.045em;
          font-weight: 750;
        }

        .section-copy {
          max-width: 680px;
          margin: 0;
          color: ${text};
          font-size: 17px;
          line-height: 1.75;
        }

        .primary-btn,
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 50px;
          padding: 0 21px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 750;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease,
            background 160ms ease;
        }

        .primary-btn {
          color: #fff;
          background: ${green};
          box-shadow: 0 10px 24px rgba(11, 122, 59, 0.18);
        }

        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(11, 122, 59, 0.24);
        }

        .secondary-btn {
          color: ${dark};
          border: 1px solid ${border};
          background: #fff;
        }

        .secondary-btn:hover {
          background: ${soft};
          transform: translateY(-1px);
        }

        @media (max-width: 760px) {
          .container {
            width: min(100% - 32px, 1180px);
          }

          .section {
            padding: 72px 0;
          }
        }
      `}</style>
    </main>
  );
}

function TopNavBar() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <div className="brand-mark">
              <span>K</span>
            </div>
            <span>Kolo<span className="brand-ai">AI</span></span>
          </Link>

          <div className="nav-links">
            <a href="#solution">Product</a>
            <a href="#savers">For Savers</a>
            <a href="#groups">For Groups</a>
            <a href="#ai">AI</a>
            <a href="#how-it-works">How It Works</a>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="signin">Sign In</Link>
            <Link href="/login" className="nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>

      <style jsx>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          border-bottom: 1px solid rgba(229, 235, 231, 0.86);
          background: rgba(255, 255, 255, 0.91);
          backdrop-filter: blur(18px);
        }

        .nav-inner {
          width: min(1240px, calc(100% - 40px));
          height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: ${dark};
          text-decoration: none;
          font-size: 20px;
          font-weight: 780;
          letter-spacing: -0.035em;
          white-space: nowrap;
        }

        .brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: white;
          background: ${green};
          box-shadow: 0 6px 14px rgba(11, 122, 59, 0.18);
        }

        .brand-mark span {
          font-size: 18px;
          font-weight: 850;
        }

        .brand-ai {
          color: ${green};
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-left: auto;
          margin-right: 12px;
        }

        .nav-links a,
        .signin {
          color: #536070;
          font-size: 13px;
          font-weight: 650;
          text-decoration: none;
          transition: color 150ms ease;
        }

        .nav-links a:hover,
        .signin:hover {
          color: ${green};
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 17px;
          border-radius: 9px;
          color: white;
          background: ${green};
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .nav-links {
            display: none;
          }

          .nav-inner {
            width: min(100% - 32px, 1240px);
          }
        }

        @media (max-width: 480px) {
          .signin {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            AI-powered collective savings
          </div>

          <h1>
            Save together.
            <br />
            <span>Think smarter.</span>
          </h1>

          <p>
            Kolo AI brings intelligent savings planning, community management
            and financial insights to Nigeria&apos;s Ajo, Esusu and cooperative
            savings communities.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="primary-btn">
              Explore Kolo AI
              <span>→</span>
            </Link>
            <a href="#how-it-works" className="secondary-btn">
              See how it works
            </a>
          </div>

          <div className="hero-note">
            <span className="check">✓</span>
            <span>Kolo AI does not hold members&apos; savings.</span>
          </div>
        </div>

        <div className="hero-product">
          <div className="product-window">
            <div className="window-top">
              <div className="window-brand">
                <span className="mini-logo">K</span>
                Kolo AI
              </div>
              <span className="window-status">AI ACTIVE</span>
            </div>

            <div className="dashboard-head">
              <div>
                <span className="muted">Good afternoon</span>
                <strong>Mike 👋</strong>
              </div>
              <div className="avatar">M</div>
            </div>

            <div className="hero-card-row">
              <div className="goal-card">
                <div className="card-label">Savings goal</div>
                <div className="goal-name">Business Capital</div>
                <div className="goal-amount">₦340,000 <small>/ ₦500,000</small></div>
                <div className="progress">
                  <span style={{ width: "68%" }} />
                </div>
                <div className="goal-meta">
                  <span>68% complete</span>
                  <span>₦160k left</span>
                </div>
              </div>

              <div className="insight-card">
                <div className="ai-icon">✦</div>
                <div className="card-label">Kolo insight</div>
                <p>
                  You are on track. An additional ₦10,000 this month can help
                  maintain your target timeline.
                </p>
              </div>
            </div>

            <div className="lower-cards">
              <div className="small-card">
                <span className="small-icon">◎</span>
                <div>
                  <small>Monthly target</small>
                  <strong>₦83,333</strong>
                </div>
              </div>
              <div className="small-card">
                <span className="small-icon">◉</span>
                <div>
                  <small>Active groups</small>
                  <strong>2 groups</strong>
                </div>
              </div>
            </div>

            <div className="ask-kolo">
              <div className="ask-title">
                <span className="ask-dot">✦</span>
                Ask Kolo
              </div>
              <div className="ask-message">
                <span>Am I still on track to reach my goal?</span>
                <b>→</b>
              </div>
            </div>
          </div>

          <div className="floating-badge badge-one">
            <span>✓</span>
            Verified community
          </div>

          <div className="floating-badge badge-two">
            <span>✦</span>
            AI-powered
          </div>
        </div>
      </div>

      <div className="hero-bottom">
        <div className="container hero-bottom-inner">
          <span>BUILT FOR THE WAY NIGERIANS SAVE</span>
          <div>
            <span>AJO</span>
            <i />
            <span>ESUSU</span>
            <i />
            <span>COOPERATIVES</span>
            <i />
            <span>SAVINGS GROUPS</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          padding: 92px 0 0;
          background:
            radial-gradient(circle at 75% 20%, rgba(11, 122, 59, 0.08), transparent 32%),
            linear-gradient(180deg, #fbfdfb 0%, #ffffff 72%);
        }

        .hero-grid {
          min-height: 625px;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          align-items: center;
          gap: 64px;
          padding-bottom: 84px;
        }

        .hero-copy {
          max-width: 570px;
        }

        h1 {
          margin: 22px 0 22px;
          color: ${dark};
          font-size: clamp(46px, 5.8vw, 72px);
          line-height: 0.99;
          letter-spacing: -0.065em;
          font-weight: 800;
        }

        h1 span {
          color: ${green};
        }

        .hero-copy > p {
          max-width: 560px;
          margin: 0;
          color: ${text};
          font-size: 18px;
          line-height: 1.75;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
          flex-wrap: wrap;
        }

        .hero-note {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 25px;
          color: #647184;
          font-size: 12px;
          font-weight: 600;
        }

        .check {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: ${green};
          background: rgba(11, 122, 59, 0.09);
          font-size: 11px;
          font-weight: 800;
        }

        .hero-product {
          position: relative;
          min-width: 0;
        }

        .product-window {
          position: relative;
          padding: 20px;
          border: 1px solid #dfe8e2;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow:
            0 30px 70px rgba(11, 28, 48, 0.10),
            0 5px 18px rgba(11, 28, 48, 0.04);
        }

        .window-top,
        .dashboard-head,
        .goal-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .window-top {
          padding-bottom: 18px;
          border-bottom: 1px solid #edf1ee;
        }

        .window-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .mini-logo {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          color: #fff;
          background: ${green};
          font-size: 12px;
        }

        .window-status {
          padding: 5px 8px;
          border-radius: 6px;
          color: ${green};
          background: #edf8f1;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .dashboard-head {
          padding: 20px 2px;
        }

        .dashboard-head > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .muted {
          color: #87919d;
          font-size: 10px;
        }

        .dashboard-head strong {
          color: ${dark};
          font-size: 18px;
        }

        .avatar {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: ${dark};
          font-size: 11px;
          font-weight: 800;
        }

        .hero-card-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 12px;
        }

        .goal-card,
        .insight-card,
        .small-card,
        .ask-kolo {
          border: 1px solid #e7ece9;
          border-radius: 14px;
          background: #fff;
        }

        .goal-card {
          padding: 18px;
        }

        .card-label {
          color: #7a8592;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .goal-name {
          margin-top: 7px;
          color: ${dark};
          font-size: 14px;
          font-weight: 750;
        }

        .goal-amount {
          margin-top: 20px;
          color: ${dark};
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.035em;
        }

        .goal-amount small {
          color: #8a949f;
          font-size: 11px;
          font-weight: 600;
        }

        .progress {
          height: 8px;
          margin-top: 15px;
          overflow: hidden;
          border-radius: 999px;
          background: #edf1ee;
        }

        .progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: ${green};
        }

        .goal-meta {
          margin-top: 8px;
          color: #7a8592;
          font-size: 9px;
          font-weight: 600;
        }

        .insight-card {
          padding: 18px;
          background: #f6faf7;
          border-color: #dcece1;
        }

        .ai-icon,
        .ask-dot {
          color: ${green};
          font-weight: 900;
        }

        .ai-icon {
          margin-bottom: 12px;
          font-size: 18px;
        }

        .insight-card p {
          margin: 9px 0 0;
          color: #526171;
          font-size: 11px;
          line-height: 1.6;
        }

        .lower-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }

        .small-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 14px;
        }

        .small-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: ${green};
          background: #eef8f1;
        }

        .small-card div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .small-card small {
          color: #8a949f;
          font-size: 8px;
        }

        .small-card strong {
          color: ${dark};
          font-size: 12px;
        }

        .ask-kolo {
          margin-top: 12px;
          padding: 12px;
          background: ${dark};
          border-color: ${dark};
        }

        .ask-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fff;
          font-size: 9px;
          font-weight: 750;
        }

        .ask-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.08);
          color: #eaf0eb;
          font-size: 10px;
        }

        .floating-badge {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid #e3ebe5;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 12px 25px rgba(11, 28, 48, 0.09);
          color: ${dark};
          font-size: 9px;
          font-weight: 750;
        }

        .floating-badge span {
          color: ${green};
        }

        .badge-one {
          left: -26px;
          bottom: 52px;
        }

        .badge-two {
          right: -20px;
          top: 78px;
        }

        .hero-bottom {
          border-top: 1px solid #edf1ee;
          background: #fff;
        }

        .hero-bottom-inner {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          color: #8a949f;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .hero-bottom-inner > div {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hero-bottom-inner i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #cbd4ce;
        }

        @media (max-width: 980px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 56px;
          }

          .hero-copy {
            max-width: 700px;
          }

          .hero-product {
            width: min(680px, 100%);
            margin: 0 auto;
          }

          .hero-bottom-inner {
            flex-direction: column;
            justify-content: center;
            padding: 18px 0;
          }
        }

        @media (max-width: 620px) {
          .hero {
            padding-top: 62px;
          }

          .hero-grid {
            min-height: auto;
            padding-bottom: 60px;
          }

          h1 {
            font-size: 48px;
          }

          .hero-card-row {
            grid-template-columns: 1fr;
          }

          .badge-one {
            left: -5px;
            bottom: -18px;
          }

          .badge-two {
            right: -5px;
            top: -18px;
          }

          .hero-bottom-inner > div {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    ["01", "Fragmented records", "Contributions, member information and payment confirmations are often scattered across notebooks, spreadsheets and chats."],
    ["02", "Manual follow-up", "Treasurers spend time chasing members, checking records and reconciling contribution updates."],
    ["03", "Little financial guidance", "Members can have a savings goal without knowing whether their contribution plan is realistic."],
    ["04", "Hard to evaluate groups", "People need clearer information about a savings community before deciding whether to join."],
  ];

  return (
    <section className="section problem" id="problem">
      <div className="container">
        <div className="problem-head">
          <div>
            <div className="eyebrow">THE PROBLEM</div>
            <h2 className="section-title">
              Collective savings is powerful.
              <br />
              <span>Managing it shouldn&apos;t be complicated.</span>
            </h2>
          </div>
          <p className="section-copy">
            Ajo, Esusu and cooperative savings already work because Nigerians
            understand the power of saving together. The opportunity is to give
            these communities better digital tools and intelligence.
          </p>
        </div>

        <div className="problem-grid">
          {problems.map(([number, title, description]) => (
            <div className="problem-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .problem {
          background: #fff;
        }

        .problem-head {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 70px;
          align-items: end;
          margin-bottom: 52px;
        }

        .section-title span {
          color: ${green};
        }

        .problem-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .problem-card {
          min-height: 245px;
          padding: 26px;
          border: 1px solid ${border};
          border-radius: 16px;
          background: #fff;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .problem-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 35px rgba(11, 28, 48, 0.06);
        }

        .problem-card > span {
          color: #a0a9b4;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .problem-card h3 {
          margin: 50px 0 10px;
          color: ${dark};
          font-size: 18px;
          letter-spacing: -0.025em;
        }

        .problem-card p {
          margin: 0;
          color: ${text};
          font-size: 13px;
          line-height: 1.7;
        }

        @media (max-width: 900px) {
          .problem-head {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .problem-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .problem-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function SolutionSection() {
  const features = [
    {
      icon: "✦",
      title: "AI Savings Planner",
      text: "Turn a savings target into a personalized contribution plan and understand what it takes to reach the goal.",
    },
    {
      icon: "⌕",
      title: "Smart Group Discovery",
      text: "Find savings communities using relevant group information, contribution levels, goals and preferences.",
    },
    {
      icon: "↗",
      title: "Savings Intelligence",
      text: "Understand contribution history, progress and projected outcomes instead of simply looking at raw numbers.",
    },
    {
      icon: "◌",
      title: "Ask Kolo",
      text: "Ask questions about your savings and group activity in natural language and receive context-aware answers.",
    },
  ];

  return (
    <section className="section solution" id="solution">
      <div className="container">
        <div className="solution-intro">
          <div className="eyebrow">THE KOLO AI SOLUTION</div>
          <h2 className="section-title">The intelligence layer for collective savings.</h2>
          <p className="section-copy">
            Kolo AI combines community management, verification and financial
            intelligence around the savings systems Nigerians already use.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <div className={`feature-card ${index === 0 ? "featured" : ""}`} key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <div className="feature-number">0{index + 1}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <div className="feature-arrow">↗</div>
            </div>
          ))}
        </div>

        <div className="management-strip">
          <div className="management-icon">◎</div>
          <div>
            <strong>Group management, without the spreadsheet chaos.</strong>
            <p>
              Members, contribution schedules, cycles, records and group activity
              in one organized workspace.
            </p>
          </div>
          <span>Built into Kolo AI →</span>
        </div>
      </div>

      <style jsx>{`
        .solution {
          background: ${soft};
        }

        .solution-intro {
          max-width: 760px;
          margin-bottom: 48px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .feature-card {
          position: relative;
          min-height: 310px;
          padding: 27px;
          overflow: hidden;
          border: 1px solid #e0e8e2;
          border-radius: 17px;
          background: #fff;
        }

        .feature-card.featured {
          color: #fff;
          background: ${dark};
          border-color: ${dark};
        }

        .feature-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: ${green};
          background: #edf8f1;
          font-size: 20px;
          font-weight: 900;
        }

        .featured .feature-icon {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .feature-number {
          position: absolute;
          top: 27px;
          right: 27px;
          color: #a0a9b4;
          font-size: 10px;
          font-weight: 800;
        }

        .featured .feature-number {
          color: rgba(255, 255, 255, 0.45);
        }

        .feature-card h3 {
          margin: 62px 0 10px;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .feature-card p {
          margin: 0;
          color: ${text};
          font-size: 13px;
          line-height: 1.75;
        }

        .featured p {
          color: #cbd5df;
        }

        .feature-arrow {
          position: absolute;
          right: 26px;
          bottom: 24px;
          color: ${green};
          font-size: 18px;
        }

        .featured .feature-arrow {
          color: #8be1a7;
        }

        .management-strip {
          display: flex;
          align-items: center;
          gap: 17px;
          margin-top: 14px;
          padding: 20px 22px;
          border: 1px solid #dfe8e2;
          border-radius: 15px;
          background: #fff;
        }

        .management-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 11px;
          color: ${green};
          background: #edf8f1;
          font-size: 20px;
        }

        .management-strip strong {
          display: block;
          color: ${dark};
          font-size: 14px;
        }

        .management-strip p {
          margin: 5px 0 0;
          color: #6c7785;
          font-size: 12px;
        }

        .management-strip > span {
          margin-left: auto;
          color: ${green};
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }

          .management-strip {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .management-strip > span {
            margin-left: 59px;
          }
        }
      `}</style>
    </section>
  );
}

function AISection() {
  return (
    <section className="section ai-section" id="ai">
      <div className="container ai-grid">
        <div className="ai-copy">
          <div className="eyebrow">THE AI LAYER</div>
          <h2 className="section-title">
            AI that understands your savings context.
          </h2>
          <p className="section-copy">
            Kolo AI is not a generic chatbot sitting beside a savings app. The
            intelligence layer is designed to work with the user&apos;s goals,
            contribution activity and relevant group data.
          </p>

          <div className="ai-points">
            <div>
              <b>01</b>
              <span>
                <strong>Personalized savings intelligence</strong>
                Analyzes goals and contribution information to create useful recommendations.
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Natural-language assistance</strong>
                Users can ask questions about their own savings instead of navigating reports.
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Group intelligence</strong>
                Turns contribution activity into understandable summaries and signals.
              </span>
            </div>
          </div>
        </div>

        <div className="ai-demo">
          <div className="ai-demo-top">
            <span>KOLO AI</span>
            <span className="live">● LIVE</span>
          </div>

          <div className="chat-area">
            <div className="chat-user">
              I want to save ₦500,000 in six months. I earn ₦180,000 monthly. Can I reach it?
            </div>

            <div className="chat-ai">
              <div className="ai-avatar">✦</div>
              <div>
                <strong>Kolo AI</strong>
                <p>
                  Your target requires approximately <b>₦83,333/month</b>.
                  That is about 46% of the income you provided.
                </p>
                <div className="ai-recommendation">
                  <small>KOLO RECOMMENDATION</small>
                  <span>
                    Consider adjusting your timeline or contribution amount if
                    ₦83,333/month is not sustainable.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ai-input">
            <span>Ask Kolo anything about your savings...</span>
            <b>↑</b>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ai-section {
          background: #fff;
        }

        .ai-grid {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          align-items: center;
          gap: 80px;
        }

        .ai-copy {
          max-width: 560px;
        }

        .ai-points {
          margin-top: 35px;
          border-top: 1px solid ${border};
        }

        .ai-points > div {
          display: grid;
          grid-template-columns: 35px 1fr;
          gap: 14px;
          padding: 18px 0;
          border-bottom: 1px solid ${border};
        }

        .ai-points b {
          color: ${green};
          font-size: 10px;
          padding-top: 3px;
        }

        .ai-points span {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #687585;
          font-size: 12px;
          line-height: 1.65;
        }

        .ai-points strong {
          color: ${dark};
          font-size: 13px;
        }

        .ai-demo {
          overflow: hidden;
          border-radius: 20px;
          background: ${dark};
          box-shadow: 0 30px 70px rgba(11, 28, 48, 0.14);
        }

        .ai-demo-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 19px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .live {
          color: #8be1a7;
          font-size: 8px;
        }

        .chat-area {
          min-height: 355px;
          padding: 28px;
          background:
            radial-gradient(circle at 80% 30%, rgba(11, 122, 59, 0.18), transparent 35%),
            ${dark};
        }

        .chat-user {
          max-width: 76%;
          margin-left: auto;
          padding: 14px 16px;
          border-radius: 14px 14px 3px 14px;
          color: #eef3ef;
          background: rgba(255, 255, 255, 0.08);
          font-size: 13px;
          line-height: 1.65;
        }

        .chat-ai {
          display: flex;
          gap: 13px;
          max-width: 92%;
          margin-top: 26px;
        }

        .ai-avatar {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 9px;
          color: #fff;
          background: ${green};
          font-size: 14px;
        }

        .chat-ai strong {
          color: #fff;
          font-size: 12px;
        }

        .chat-ai p {
          margin: 7px 0 0;
          color: #c8d2dc;
          font-size: 12px;
          line-height: 1.75;
        }

        .ai-recommendation {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 14px;
          padding: 13px;
          border: 1px solid rgba(139, 225, 167, 0.18);
          border-radius: 11px;
          background: rgba(11, 122, 59, 0.13);
        }

        .ai-recommendation small {
          color: #8be1a7;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .ai-recommendation span {
          color: #d8e2dc;
          font-size: 10px;
          line-height: 1.6;
        }

        .ai-input {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 18px 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #788695;
          background: rgba(255, 255, 255, 0.05);
          font-size: 10px;
        }

        .ai-input b {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          color: #fff;
          background: ${green};
        }

        @media (max-width: 900px) {
          .ai-grid {
            grid-template-columns: 1fr;
            gap: 50px;
          }
        }

        @media (max-width: 560px) {
          .chat-area {
            padding: 20px;
          }

          .chat-user {
            max-width: 90%;
          }
        }
      `}</style>
    </section>
  );
}

function SaversSection() {
  return (
    <section className="section savers" id="savers">
      <div className="container savers-grid">
        <div className="savers-copy">
          <div className="eyebrow">FOR SAVERS</div>
          <h2 className="section-title">
            A smarter way to stay on track.
          </h2>
          <p className="section-copy">
            Your savings goal should not be a number you forget about. Kolo AI
            helps turn the goal into a plan, then helps you understand your
            progress as you save.
          </p>

          <div className="saver-list">
            <div><span>✓</span> Create and track savings goals</div>
            <div><span>✓</span> Understand your contribution pace</div>
            <div><span>✓</span> Ask questions using natural language</div>
            <div><span>✓</span> Discover relevant savings communities</div>
          </div>
        </div>

        <div className="mobile-mockup">
          <div className="phone">
            <div className="phone-speaker" />
            <div className="phone-screen">
              <div className="phone-top">
                <span>9:41</span>
                <span>•••</span>
              </div>
              <div className="phone-title">
                <small>MY GOAL</small>
                <strong>Business Capital</strong>
              </div>
              <div className="circle-progress">
                <div>
                  <strong>68%</strong>
                  <span>complete</span>
                </div>
              </div>
              <div className="phone-amount">
                <small>Saved so far</small>
                <strong>₦340,000</strong>
              </div>
              <div className="phone-row">
                <div><small>Target</small><b>₦500,000</b></div>
                <div><small>Monthly</small><b>₦83,333</b></div>
              </div>
              <div className="phone-insight">
                <span>✦</span>
                <div>
                  <b>Kolo insight</b>
                  <p>You&apos;re making steady progress toward your goal.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .savers {
          background: ${soft};
        }

        .savers-grid {
          display: grid;
          grid-template-columns: 1fr 0.8fr;
          align-items: center;
          gap: 80px;
        }

        .savers-copy {
          max-width: 570px;
        }

        .saver-list {
          margin-top: 30px;
          display: grid;
          gap: 12px;
        }

        .saver-list div {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #536171;
          font-size: 13px;
          font-weight: 600;
        }

        .saver-list span {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: ${green};
          background: #eaf7ee;
          font-size: 10px;
          font-weight: 900;
        }

        .mobile-mockup {
          display: flex;
          justify-content: center;
        }

        .phone {
          position: relative;
          width: 285px;
          padding: 9px;
          border-radius: 38px;
          background: ${dark};
          box-shadow: 0 30px 60px rgba(11, 28, 48, 0.18);
        }

        .phone-speaker {
          position: absolute;
          z-index: 2;
          top: 15px;
          left: 50%;
          width: 70px;
          height: 16px;
          border-radius: 999px;
          background: #06111d;
          transform: translateX(-50%);
        }

        .phone-screen {
          min-height: 535px;
          padding: 20px 17px;
          border-radius: 30px;
          background: #f8faf9;
        }

        .phone-top {
          display: flex;
          justify-content: space-between;
          color: #73808e;
          font-size: 8px;
          font-weight: 700;
        }

        .phone-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 30px;
        }

        .phone-title small,
        .phone-amount small,
        .phone-row small {
          color: #87929d;
          font-size: 8px;
          font-weight: 700;
        }

        .phone-title strong {
          color: ${dark};
          font-size: 18px;
        }

        .circle-progress {
          width: 150px;
          height: 150px;
          margin: 30px auto 24px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: conic-gradient(${green} 68%, #dfe9e2 0);
        }

        .circle-progress::before {
          content: "";
          position: absolute;
          width: 119px;
          height: 119px;
          border-radius: 50%;
          background: #f8faf9;
        }

        .circle-progress div {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .circle-progress strong {
          color: ${dark};
          font-size: 27px;
        }

        .circle-progress span {
          color: #85909d;
          font-size: 8px;
        }

        .phone-amount {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .phone-amount strong {
          color: ${dark};
          font-size: 23px;
          letter-spacing: -0.04em;
        }

        .phone-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 17px;
        }

        .phone-row div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 12px;
          border: 1px solid #e3eae5;
          border-radius: 10px;
          background: #fff;
        }

        .phone-row b {
          color: ${dark};
          font-size: 10px;
        }

        .phone-insight {
          display: flex;
          gap: 9px;
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          background: #eaf7ee;
        }

        .phone-insight > span {
          color: ${green};
          font-weight: 900;
        }

        .phone-insight b {
          color: ${dark};
          font-size: 9px;
        }

        .phone-insight p {
          margin: 4px 0 0;
          color: #65727f;
          font-size: 8px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .savers-grid {
            grid-template-columns: 1fr;
            gap: 55px;
          }

          .savers-copy {
            max-width: 700px;
          }
        }
      `}</style>
    </section>
  );
}

function GroupsSection() {
  return (
    <section className="section groups" id="groups">
      <div className="container">
        <div className="groups-head">
          <div>
            <div className="eyebrow">FOR SAVINGS GROUPS</div>
            <h2 className="section-title">
              Give every savings group
              <br />
              <span>better visibility.</span>
            </h2>
          </div>
          <p className="section-copy">
            Organizers get one place to manage members, contribution schedules,
            cycles and records, with Kolo AI turning activity into useful group
            insights.
          </p>
        </div>

        <div className="group-dashboard">
          <div className="group-top">
            <div>
              <small>GROUP OVERVIEW</small>
              <h3>Abeokuta Traders Ajo</h3>
              <span className="verified-mini">✓ Kolo Verified</span>
            </div>
            <div className="group-actions">
              <span>12-month cycle</span>
              <span>25 members</span>
            </div>
          </div>

          <div className="group-stats">
            <div><small>Expected contributions</small><strong>₦500,000</strong></div>
            <div><small>Recorded contributions</small><strong>₦440,000</strong></div>
            <div><small>Outstanding</small><strong>₦60,000</strong></div>
            <div><small>Contribution progress</small><strong>88%</strong></div>
          </div>

          <div className="group-bottom">
            <div className="bar-chart">
              <div className="chart-title">Contribution activity</div>
              <div className="bars">
                {[42, 58, 52, 72, 66, 84, 78, 91, 88, 94].map((height, i) => (
                  <div className="bar-wrap" key={i}>
                    <span style={{ height: `${height}%` }} />
                    <small>{i + 1}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="group-ai">
              <div className="group-ai-title">
                <span>✦</span>
                Kolo AI Group Insight
              </div>
              <p>
                88% of expected contributions have been recorded. Four members
                currently have outstanding contributions ahead of the cycle deadline.
              </p>
              <div className="recommendation">
                <small>RECOMMENDED ACTION</small>
                <strong>Review outstanding contributions and send reminders.</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .groups {
          background: #fff;
        }

        .groups-head {
          display: grid;
          grid-template-columns: 1fr 0.8fr;
          gap: 70px;
          align-items: end;
          margin-bottom: 50px;
        }

        .section-title span {
          color: ${green};
        }

        .group-dashboard {
          padding: 24px;
          border: 1px solid #dfe7e2;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 55px rgba(11, 28, 48, 0.07);
        }

        .group-top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #edf1ee;
        }

        .group-top small {
          color: #89939f;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .group-top h3 {
          margin: 6px 0 7px;
          color: ${dark};
          font-size: 19px;
        }

        .verified-mini {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: ${green};
          font-size: 9px;
          font-weight: 800;
        }

        .group-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .group-actions span {
          padding: 7px 10px;
          border-radius: 7px;
          color: #647180;
          background: #f4f7f5;
          font-size: 8px;
          font-weight: 700;
        }

        .group-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 20px 0;
        }

        .group-stats div {
          padding: 16px;
          border: 1px solid #edf1ee;
          border-radius: 12px;
        }

        .group-stats small {
          display: block;
          color: #89939f;
          font-size: 8px;
          line-height: 1.4;
        }

        .group-stats strong {
          display: block;
          margin-top: 7px;
          color: ${dark};
          font-size: 18px;
          letter-spacing: -0.025em;
        }

        .group-bottom {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 12px;
        }

        .bar-chart {
          min-height: 245px;
          padding: 18px;
          border-radius: 13px;
          background: #f7faf8;
        }

        .chart-title {
          color: ${dark};
          font-size: 10px;
          font-weight: 800;
        }

        .bars {
          height: 170px;
          display: flex;
          align-items: end;
          gap: 9px;
          margin-top: 20px;
          padding: 0 6px;
          border-bottom: 1px solid #dce4df;
        }

        .bar-wrap {
          height: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: end;
          gap: 7px;
        }

        .bar-wrap span {
          width: 100%;
          max-width: 25px;
          border-radius: 5px 5px 0 0;
          background: ${green};
          opacity: 0.88;
        }

        .bar-wrap small {
          color: #9aa4ae;
          font-size: 7px;
        }

        .group-ai {
          padding: 20px;
          border-radius: 13px;
          color: #fff;
          background: ${dark};
        }

        .group-ai-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .group-ai-title span {
          color: #8be1a7;
        }

        .group-ai p {
          margin: 15px 0;
          color: #c6d0da;
          font-size: 11px;
          line-height: 1.7;
        }

        .recommendation {
          padding: 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.07);
        }

        .recommendation small {
          display: block;
          color: #8be1a7;
          font-size: 7px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .recommendation strong {
          display: block;
          margin-top: 5px;
          color: #e4ebe7;
          font-size: 9px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .groups-head {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .group-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .group-bottom {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .group-top {
            flex-direction: column;
          }

          .group-actions {
            flex-wrap: wrap;
          }

          .group-stats {
            grid-template-columns: 1fr;
          }

          .group-dashboard {
            padding: 14px;
          }

          .bars {
            gap: 4px;
          }
        }
      `}</style>
    </section>
  );
}

function VerificationSection() {
  return (
    <section className="section verification">
      <div className="container verification-grid">
        <div className="verification-card">
          <div className="verification-header">
            <span className="shield">✓</span>
            <div>
              <small>COMMUNITY STATUS</small>
              <strong>Kolo Verified</strong>
            </div>
          </div>

          <div className="community-name">
            <div className="community-avatar">AT</div>
            <div>
              <strong>Abeokuta Traders Ajo</strong>
              <span>Ogun State · Savings community</span>
            </div>
          </div>

          <div className="verification-list">
            <div><span>✓</span> Organizer information reviewed</div>
            <div><span>✓</span> Group information submitted</div>
            <div><span>✓</span> Designated group account provided</div>
            <div><span>✓</span> Community profile available</div>
          </div>

          <div className="verification-note">
            <strong>What Kolo Verified means</strong>
            <p>
              The organizer and submitted group information have been reviewed
              against Kolo&apos;s verification requirements.
            </p>
          </div>
        </div>

        <div>
          <div className="eyebrow">VERIFIED COMMUNITIES</div>
          <h2 className="section-title">Know who you&apos;re joining.</h2>
          <p className="section-copy">
            Trust matters when people save together. Kolo AI is designed to
            give communities a structured verification process and give
            prospective members clearer information before they join.
          </p>

          <div className="direct-payment">
            <span>01</span>
            <div>
              <strong>Your savings stay with your group.</strong>
              <p>
                Members contribute directly to their savings group&apos;s
                designated account. Kolo provides the management, verification,
                record-keeping and intelligence layer.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .verification {
          background: ${soft};
        }

        .verification-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          align-items: center;
          gap: 90px;
        }

        .verification-card {
          padding: 25px;
          border: 1px solid #dfe8e2;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 20px 50px rgba(11, 28, 48, 0.07);
        }

        .verification-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 20px;
          border-bottom: 1px solid #edf1ee;
        }

        .shield {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: ${green};
          background: #eaf7ee;
          font-weight: 900;
        }

        .verification-header div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .verification-header small {
          color: #8a949f;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .verification-header strong {
          color: ${green};
          font-size: 15px;
        }

        .community-name {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 21px 0;
        }

        .community-avatar {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #fff;
          background: ${dark};
          font-size: 11px;
          font-weight: 800;
        }

        .community-name div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .community-name strong {
          color: ${dark};
          font-size: 13px;
        }

        .community-name span {
          color: #89939f;
          font-size: 9px;
        }

        .verification-list {
          display: grid;
          gap: 9px;
        }

        .verification-list div {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border-radius: 8px;
          background: #f6f9f7;
          color: #5c6978;
          font-size: 10px;
          font-weight: 600;
        }

        .verification-list span {
          color: ${green};
          font-weight: 900;
        }

        .verification-note {
          margin-top: 16px;
          padding: 13px;
          border-radius: 10px;
          background: #f0f6f2;
        }

        .verification-note strong {
          color: ${dark};
          font-size: 9px;
        }

        .verification-note p {
          margin: 5px 0 0;
          color: #667382;
          font-size: 8px;
          line-height: 1.6;
        }

        .direct-payment {
          display: flex;
          gap: 14px;
          margin-top: 32px;
          padding-top: 22px;
          border-top: 1px solid ${border};
        }

        .direct-payment > span {
          color: ${green};
          font-size: 10px;
          font-weight: 850;
        }

        .direct-payment strong {
          color: ${dark};
          font-size: 13px;
        }

        .direct-payment p {
          max-width: 500px;
          margin: 7px 0 0;
          color: #6a7684;
          font-size: 11px;
          line-height: 1.7;
        }

        @media (max-width: 900px) {
          .verification-grid {
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .verification-card {
            max-width: 600px;
          }
        }
      `}</style>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    ["01", "Create your profile", "Tell Kolo about your savings goals, preferences and contribution capacity."],
    ["02", "Discover or create a group", "Find a suitable savings community or register your own community for verification."],
    ["03", "Save directly with your group", "Members contribute directly to the group’s designated account — Kolo does not hold the savings."],
    ["04", "Let Kolo provide the intelligence", "Track progress, understand activity and get AI-powered insights when you need them."],
  ];

  return (
    <section className="section how" id="how-it-works">
      <div className="container">
        <div className="how-intro">
          <div className="eyebrow">HOW IT WORKS</div>
          <h2 className="section-title">Simple for members. Powerful for communities.</h2>
        </div>

        <div className="steps">
          {steps.map(([number, title, text]) => (
            <div className="step" key={number}>
              <div className="step-number">{number}</div>
              <div className="step-line" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .how {
          background: #fff;
        }

        .how-intro {
          max-width: 720px;
          margin-bottom: 55px;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .step {
          min-height: 255px;
          padding: 25px;
          border-top: 2px solid #dfe8e2;
        }

        .step-number {
          color: ${green};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .step-line {
          width: 30px;
          height: 2px;
          margin-top: 17px;
          background: ${green};
        }

        .step h3 {
          margin: 32px 0 9px;
          color: ${dark};
          font-size: 17px;
          letter-spacing: -0.02em;
        }

        .step p {
          margin: 0;
          color: #687585;
          font-size: 12px;
          line-height: 1.75;
        }

        @media (max-width: 900px) {
          .steps {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 560px) {
          .steps {
            grid-template-columns: 1fr;
          }

          .step {
            min-height: auto;
          }
        }
      `}</style>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="container">
        <div className="cta-card">
          <div className="cta-eyebrow">KOLO AI</div>
          <h2>
            Your community already knows
            <br />
            how to save.
          </h2>
          <strong>We want to make it smarter.</strong>
          <p>
            Bring savings goals, group activity and financial intelligence into
            one modern experience built around the way Nigerians already save.
          </p>
          <div className="cta-actions">
            <Link href="/login" className="primary-btn">
              Get Started <span>→</span>
            </Link>
            <a href="#ai" className="secondary-btn">Explore the AI</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .final-cta {
          padding: 30px 0 100px;
          background: #fff;
        }

        .cta-card {
          position: relative;
          overflow: hidden;
          padding: 82px 40px;
          border-radius: 28px;
          text-align: center;
          background:
            radial-gradient(circle at 82% 20%, rgba(11, 122, 59, 0.18), transparent 27%),
            ${dark};
          color: #fff;
        }

        .cta-eyebrow {
          color: #8be1a7;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.14em;
        }

        .cta-card h2 {
          margin: 20px 0 8px;
          font-size: clamp(35px, 4.5vw, 57px);
          line-height: 1.05;
          letter-spacing: -0.05em;
        }

        .cta-card > strong {
          display: block;
          color: #8be1a7;
          font-size: clamp(25px, 3vw, 38px);
          letter-spacing: -0.04em;
        }

        .cta-card > p {
          max-width: 610px;
          margin: 22px auto 30px;
          color: #c8d2dc;
          font-size: 14px;
          line-height: 1.75;
        }

        .cta-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cta-actions .secondary-btn {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 560px) {
          .cta-card {
            padding: 62px 22px;
            border-radius: 22px;
          }

          .cta-card h2 br {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <div className="brand-mark"><span>K</span></div>
            <span>Kolo<span className="brand-ai">AI</span></span>
          </Link>
          <p>
            AI-powered financial intelligence for Nigeria&apos;s collective
            savings communities.
          </p>
          <small>Save together. Think smarter.</small>
        </div>

        <div>
          <h4>Product</h4>
          <a href="#ai">AI Intelligence</a>
          <a href="#savers">Savings Planner</a>
          <a href="#groups">Group Management</a>
          <a href="#solution">Ask Kolo</a>
        </div>

        <div>
          <h4>Communities</h4>
          <a href="#groups">For Groups</a>
          <a href="#savers">For Savers</a>
          <a href="#solution">Ajo & Esusu</a>
          <a href="#solution">Cooperatives</a>
        </div>

        <div>
          <h4>Company</h4>
          <a href="#problem">Our Mission</a>
          <a href="#how-it-works">How It Works</a>
          <Link href="/login">Sign In</Link>
          <Link href="/login">Get Started</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Kolo AI. All rights reserved.</span>
        <span>Built for smarter collective savings.</span>
      </div>

      <style jsx>{`
        .footer {
          padding: 70px 0 25px;
          border-top: 1px solid ${border};
          background: #f7faf8;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr 1fr 1fr;
          gap: 50px;
          padding-bottom: 60px;
        }

        .footer-brand p {
          max-width: 320px;
          margin: 18px 0 8px;
          color: #687585;
          font-size: 12px;
          line-height: 1.7;
        }

        .footer-brand small {
          color: ${green};
          font-size: 10px;
          font-weight: 800;
        }

        .footer-grid > div:not(.footer-brand) {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .footer-grid h4 {
          margin: 0 0 7px;
          color: ${dark};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .footer-grid a {
          color: #687585;
          font-size: 11px;
          text-decoration: none;
        }

        .footer-grid a:hover {
          color: ${green};
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e9e4;
          color: #8a949f;
          font-size: 9px;
        }

        @media (max-width: 800px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 520px) {
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .footer-bottom {
            flex-direction: column;
          }
        }
      `}</style>
    </footer>
  );
}






// "use client";

// import Link from "next/link";

// export default function Home() {
//   return (
//     <>
//       <TopNavBar />
//       <HeroSection />
//       <StatisticsSection />
//       <EvolutionSection />
//       <FeaturesBentoGrid />
//       <CTASection />
//       <Footer />
//     </>
//   );
// }

// /* ===========================
//    TOP NAVBAR
//    =========================== */
// function TopNavBar() {
//   return (
//     <nav className="landing-nav" style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.5)", padding: "14px 24px", backgroundColor: "rgba(248, 249, 255, 0.7)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
//       <div className="flex items-center" style={{ gap: "8px" }}>
//         <img alt="KoloAI Logo" style={{ height: "36px", width: "auto", objectFit: "contain" }}
//           src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb" />
//         <span className="nav-logo-text" style={{ fontSize: "22px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
//       </div>
//       <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: "36px" }}>
//         {["Platform", "Groups", "Solutions", "Security"].map((item) => (
//           <a key={item} href="#" style={{ color: item === "Platform" ? "#006b2c" : "#3e4a3d", fontWeight: item === "Platform" ? 700 : 500, borderBottom: item === "Platform" ? "2px solid #006b2c" : "none", paddingBottom: item === "Platform" ? "4px" : "0", fontSize: "14px", fontFamily: "'Geist', sans-serif", textDecoration: "none" }}>{item}</a>
//         ))}
//       </div>
//       <div className="flex items-center" style={{ gap: "16px" }}>
//         <Link href="/login" className="nav-signin" style={{ color: "#0b1c30", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", padding: "8px 14px", borderRadius: "8px", textDecoration: "none" }}>Sign In</Link>
//         <Link href="/login" className="nav-cta" style={{ backgroundColor: "#006b2c", color: "#fff", fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", boxShadow: "0 0 15px rgba(0,107,44,0.1)", whiteSpace: "nowrap" }}>Get Started</Link>
//       </div>
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .landing-nav { padding: 10px 16px !important; }
//           .nav-logo-text { font-size: 18px !important; }
//           .nav-links-desktop { display: none !important; }
//           .nav-signin { display: none !important; }
//           .nav-cta { padding: 8px 16px !important; font-size: 13px !important; }
//         }
//       `}</style>
//     </nav>
//   );
// }

// /* ===========================
//    HERO SECTION
//    =========================== */
// function HeroSection() {
//   return (
//     <header className="hero-section" style={{ padding: "128px 24px 80px 24px", position: "relative", overflow: "hidden" }}>
//       <div className="hero-grid" style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center" }}>
//         <div style={{ zIndex: 10 }}>
//           <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "9999px", backgroundColor: "rgba(0, 107, 44, 0.1)", border: "1px solid rgba(0, 107, 44, 0.2)", color: "#006b2c", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", marginBottom: "24px" }}>
//             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>auto_awesome</span> Introducing AI-Powered Community Wealth
//           </div>
//           <h1 className="hero-title" style={{ fontFamily: "'Inter', sans-serif", fontSize: "48px", lineHeight: "1.1", fontWeight: 700, color: "#0b1c30", marginBottom: "24px" }}>
//             The Future of <br /><span style={{ color: "#006b2c" }}>Community Finance</span>
//           </h1>
//           <p className="hero-desc" style={{ fontSize: "18px", lineHeight: "28px", color: "#3e4a3d", maxWidth: "576px", marginBottom: "40px" }}>
//             Automate your cooperative, contribution circle, or savings group with KoloAI's AI-driven treasury tools. Eliminate paperwork and human error with Nigeria's most secure fintech platform.
//           </p>
//           <div className="hero-buttons" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
//             <Link href="/login" className="hero-cta" style={{ backgroundColor: "#006b2c", color: "#fff", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>Start Saving <span className="material-symbols-outlined">arrow_forward</span></Link>
//             <button className="hero-demo" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><span className="material-symbols-outlined">play_circle</span> Watch Demo</button>
//           </div>
//           <div className="hero-social" style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "48px", flexWrap: "wrap" }}>
//             <div className="flex" style={{ marginRight: "-12px" }}>
//               {[1, 2, 3].map((i) => (
//                 <img key={i} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #f8f9ff", objectFit: "cover", marginRight: "-12px" }}
//                   alt="User" src={`https://lh3.googleusercontent.com/aida-public/AB6AXu${i === 1 ? 'AidZx08Ry-jK3OeiFP7Aka5YOexezNW8kKxZ8RMuoUcfFdvMsB2ptrdLlzOWzL4CJRG3j_rQfOjDoqoZ3xWuIBPOaWTU4XLxk7fDL52z7ybuqP0jEsbeaiHNWg0sH3TF-TXEVqOGCcbdt9O9B6CJaDgk_XAQp5EpH93f0vsTF1U2tdP9X7vfl0He6XX0dxBBZWv3kY1kx5mTQTlIT3zGfpU3lMGS2abOWe4EYrhseQyZvRoh0Zc33_A66yFjMh-oqhh3G1juf5yq30' : i === 2 ? 'BgssylN-Gly_a3ZPhBo7AloICtEaDak2oYz9pH_JDzYo4VsQFqjjbGDmYd2HhuXL7KjRVPx4HxT0jI-1P63WWzNemMAsfQQqc0vT7MGUvS_l8cjHlnlKfrPgt1x1Dbhzx4iY8Yt-beWLMyKgSBW1iY3EhoXbRLkuAPimZPx7tSnNtAjpIe_9khwErZj400E-y4KjHUQUtUctkt4r8IWNBAPsnfHIKTu_tTwb_Tu2u_qDHrL4salvXVWGWKtRa5Sf4N8IqY6QSwHEd1' : 'C8kmbky2X4_D6v8AsVQWAqC-_AkaHiTfw8y2kw5MKihsCiDfRHgHYTK9SMpy9qJsYadxqjkRYYP0iGO9zWuqHYsFCsdEHwcjFGg9C4-1iqZJCzs7FBH7gXQGn4jDEjbH18kSJFjx1yVzqJfPTV6FMAFBioC5KHz8iS-1Diw50M1YTAWInvcOWkqhYSRkx9EqID0ZTlRZUyEQKf-1-QToWxcLnxdbsPmALuwzfYHhZqN_7IQXkQSANHpma3R0olBE1TcAPc09mUh--U'}`} />
//               ))}
//             </div>
//             <p style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>Trusted by <span style={{ fontWeight: 700, color: "#0b1c30" }}>50,000+ members</span> across Nigeria</p>
//           </div>
//         </div>
//         <div className="hero-image-wrap" style={{ position: "relative" }}>
//           <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "400px", height: "400px", backgroundColor: "rgba(0,107,44,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
//           <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "20px", borderRadius: "16px", position: "relative", zIndex: 10, animation: "floating 3s ease-in-out infinite" }}>
//             <img style={{ width: "100%", height: "auto", borderRadius: "12px" }} alt="Dashboard" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw_vflSnoA03VrOWIx4BO5bcMzOh8593ZCDDS7F614T44pr9YDf8mYuncakPcMUMWwbX6SmuNcgjoqPNuBNcZXhohapvwA03EK_kZ2R0lMr7sTIKduC1AW3vNE5JiQ3aYt51y2ARLLEmR1Tvh3-P6u0tcca25Ak7MeSUYrPyRsvlJxCyRbSFbIZ32TkvqrIElOs3BGBgUWnL8TDMfbIuBGWy-OmB3pl1hBirsNJgc7k-Ctxc1mps9dQInyEBLMl6pn3AnmL-q0iP7H" />
//             <div className="hero-floating-card" style={{ position: "absolute", bottom: "-20px", left: "-20px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", padding: "14px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
//               <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#006b2c" }}><span className="material-symbols-outlined">trending_up</span></div>
//               <div><p style={{ fontSize: "11px", fontWeight: 600, color: "#3e4a3d" }}>Avg. Growth</p><p style={{ fontWeight: 700, color: "#0b1c30", fontSize: "14px" }}>+24.8%</p></div>
//             </div>
//           </div>
//         </div>
//       </div>
//       <style jsx>{`
//         @media (max-width: 900px) {
//           .hero-section { padding: 100px 20px 60px 20px !important; }
//           .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
//           .hero-title { font-size: 34px !important; }
//           .hero-desc { font-size: 15px !important; }
//           .hero-image-wrap { order: -1; max-width: 400px; margin: 0 auto; }
//           .hero-floating-card { bottom: -12px !important; left: -12px !important; padding: 10px !important; }
//         }
//         @media (max-width: 500px) {
//           .hero-section { padding: 90px 16px 40px 16px !important; }
//           .hero-title { font-size: 28px !important; }
//           .hero-buttons { flex-direction: column !important; }
//           .hero-cta, .hero-demo { width: 100%; justify-content: center; }
//           .hero-badge { font-size: 10px !important; }
//         }
//       `}</style>
//     </header>
//   );
// }

// /* ===========================
//    STATISTICS SECTION
//    =========================== */
// function StatisticsSection() {
//   return (
//     <section className="stats-section" style={{ padding: "80px 0", backgroundColor: "#213145", color: "#ffffff" }}>
//       <div className="stats-grid" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "40px", textAlign: "center" }}>
//         {[
//           { value: "₦2.4B", label: "Contributions Managed" },
//           { value: "5,000+", label: "Communities" },
//           { value: "50,000+", label: "Active Members" },
//           { value: "99.9%", label: "Ledger Accuracy" },
//         ].map((stat) => (
//           <div key={stat.label}>
//             <h3 className="stat-value" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#62df7d", marginBottom: "8px" }}>{stat.value}</h3>
//             <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#d3e4fe" }}>{stat.label}</p>
//           </div>
//         ))}
//       </div>
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }
//           .stat-value { font-size: 24px !important; }
//         }
//         @media (max-width: 400px) {
//           .stats-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
//         }
//       `}</style>
//     </section>
//   );
// }

// /* ===========================
//    EVOLUTION SECTION
//    =========================== */
// function EvolutionSection() {
//   return (
//     <section style={{ padding: "64px 24px", maxWidth: "1280px", margin: "0 auto" }}>
//       <div style={{ textAlign: "center", marginBottom: "48px" }}>
//         <h2 className="evo-title" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: "12px" }}>Evolution of Savings</h2>
//         <p style={{ color: "#3e4a3d", maxWidth: "600px", margin: "0 auto", fontSize: "16px" }}>See how we transform chaotic manual processes into seamless digital intelligence.</p>
//       </div>
//       <div className="evo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
//         <div className="evo-card" style={{ padding: "32px", borderRadius: "16px", border: "1px solid rgba(189,202,186,0.3)", backgroundColor: "#eff4ff" }}>
//           <div className="flex items-center" style={{ gap: "12px", marginBottom: "20px" }}>
//             <span className="material-symbols-outlined">history</span>
//             <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Traditional Cooperative</span>
//           </div>
//           <ul style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//             {["Manual paperwork & paper receipts", "Endless Excel sheets prone to error", "Chasing members for payment updates", "No visibility into loan risks"].map((item) => (
//               <li key={item} className="flex items-center" style={{ gap: "10px", color: "#3e4a3d", fontSize: "14px" }}>
//                 <span className="material-symbols-outlined" style={{ color: "#ba1a1a", fontSize: "18px" }}>close</span> {item}
//               </li>
//             ))}
//           </ul>
//           <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(189,202,186,0.5)", fontStyle: "italic", color: "rgba(62,74,61,0.7)", fontSize: "14px" }}>"The treasurer spent 15 hours a week just verifying bank alerts."</div>
//         </div>
//         <div className="evo-card" style={{ padding: "32px", borderRadius: "16px", backgroundColor: "#0b1c30", color: "#fff", position: "relative", overflow: "hidden" }}>
//           <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", backgroundColor: "rgba(0,107,44,0.2)", filter: "blur(50px)" }} />
//           <div className="flex items-center" style={{ gap: "12px", marginBottom: "20px", color: "#7ffc97" }}>
//             <span className="material-symbols-outlined">auto_awesome</span>
//             <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>KoloAI</span>
//           </div>
//           <ul style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//             {["AI Treasurer: Instant ledger balancing", "Monnify Automation: Auto-verify deposits", "Predictive Analytics for loan defaults", "Transparent member dashboard access"].map((item) => (
//               <li key={item} className="flex items-center" style={{ gap: "10px", fontSize: "14px" }}>
//                 <span className="material-symbols-outlined" style={{ color: "#7ffc97", fontSize: "18px" }}>check_circle</span> {item}
//               </li>
//             ))}
//           </ul>
//           <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.2)", fontStyle: "italic", color: "rgba(127,252,151,0.8)", fontSize: "14px" }}>"Now managed in 15 minutes a week with 100% data integrity."</div>
//         </div>
//       </div>
//       <style jsx>{`
//         @media (max-width: 700px) {
//           .evo-grid { grid-template-columns: 1fr !important; }
//           .evo-title { font-size: 26px !important; }
//           .evo-card { padding: 24px !important; }
//         }
//       `}</style>
//     </section>
//   );
// }

// /* ===========================
//    FEATURES BENTO GRID
//    =========================== */
// function FeaturesBentoGrid() {
//   const cards = [
//     { span: 8, icon: "psychology", title: "AI Treasurer", desc: "Our proprietary AI handles the heavy lifting—reconciling accounts, managing disbursements, and providing real-time financial health reports for your group.", img: true, reverse: false },
//     { span: 4, icon: "account_balance_wallet", title: "Monnify Integration", desc: "Seamless payment collection with automated virtual accounts for every member. Zero stress reconciliation.", badge: "Real-time Verification", img: false },
//     { span: 4, icon: "groups", title: "Dynamic Group Savings", desc: "Create custom savings rules, rotation schedules (Ajo/Esusu), and automated reminders for your specific community needs with KoloAI.", img: false, color: "#825100" },
//     { span: 8, icon: "payments", title: "Smart Loan Management", desc: "Issue loans to members with interest tracking and collateral management. KoloAI predicts creditworthiness based on saving habits.", features: ["Automated Interest Calculation", "Repayment Reminders"], img: true, reverse: true, color: "#565e74" },
//   ];

//   return (
//     <section style={{ padding: "64px 24px", backgroundColor: "#ffffff" }}>
//       <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
//         <div style={{ marginBottom: "48px" }}>
//           <h2 className="features-title" style={{ fontSize: "38px", fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: "12px" }}>Powerful Intelligent Features</h2>
//           <p style={{ color: "#3e4a3d", maxWidth: "672px", fontSize: "16px" }}>Everything you need to scale community wealth, powered by KoloAI's enterprise-grade technology.</p>
//         </div>
//         <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
//           {cards.map((card, i) => (
//             <div key={i} className="feature-card" style={{ gridColumn: `span ${card.span}`, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: card.img ? (card.reverse ? "row-reverse" : "row") : "column", gap: card.img ? "32px" : "0", alignItems: card.img ? "center" : "stretch" }}>
//               <div style={{ flex: card.img ? 1 : "none" }}>
//                 <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: card.color ? `${card.color}15` : "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: card.color || "#006b2c", marginBottom: "20px" }}>
//                   <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>{card.icon}</span>
//                 </div>
//                 <h3 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "12px" }}>{card.title}</h3>
//                 <p style={{ color: "#3e4a3d", fontSize: "15px", lineHeight: "24px", marginBottom: card.badge || card.features ? "20px" : "0" }}>{card.desc}</p>
//                 {card.features && (
//                   <ul style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
//                     {card.features.map((f) => (
//                       <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
//                         <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "16px" }}>verified</span> {f}
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//                 {card.badge && (
//                   <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#dce9ff", border: "1px solid rgba(189,202,186,0.3)" }}>
//                     <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#006b2c" }} />
//                     <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>{card.badge}</span>
//                   </div>
//                 )}
//               </div>
//               {card.img && (
//                 <div style={{ width: "50%" }}>
//                   <img style={{ borderRadius: "12px", width: "100%" }} alt={card.title} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2UgGRGP1yeULL4PlEvGBGwfOPDi4A3AQyF6v-ezJVPQe8Y3dkz9mjWxJuMpbWEBGwP6qb-Nep5XRdUhgLfrT6TiNgloLGKy1Pz0qpVcS8C6f9In-z-VY7qV3Zp2nzTs9ip9tBwk0wO2I3nSXLiUnW3YhzesEcAsOrmxrWwOkbmnoq0oO-x6qVkW1bTwzxDOzF8hsXocDAm6TFBOclc91HtaEH7ITYBVGOqShAzA_n8pN1NmcDyrXHqk9eoeiaO47WLVvOhB_0Yu2b" />
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//       <style jsx>{`
//         @media (max-width: 900px) {
//           .features-grid { grid-template-columns: 1fr !important; }
//           .feature-card { grid-column: span 1 !important; flex-direction: column !important; }
//           .feature-card img { width: 100% !important; }
//           .features-title { font-size: 28px !important; }
//         }
//       `}</style>
//     </section>
//   );
// }

// /* ===========================
//    CTA SECTION
//    =========================== */
// function CTASection() {
//   return (
//     <section className="cta-section" style={{ padding: "64px 24px" }}>
//       <div className="cta-card" style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px", borderRadius: "40px", backgroundColor: "#0b1c30", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden" }}>
//         <div style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", backgroundColor: "rgba(0,107,44,0.1)", filter: "blur(80px)", borderRadius: "50%" }} />
//         <div style={{ position: "relative", zIndex: 10 }}>
//           <h2 className="cta-title" style={{ fontSize: "32px", fontWeight: 700, marginBottom: "16px" }}>Ready to upgrade your community?</h2>
//           <p className="cta-desc" style={{ color: "#d3e4fe", fontSize: "18px", maxWidth: "600px", margin: "0 auto 32px" }}>Join thousands of cooperatives already using KoloAI to grow their wealth smarter and faster.</p>
//           <div className="cta-buttons" style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
//             <Link href="/login" style={{ backgroundColor: "#006b2c", color: "#fff", padding: "18px 36px", borderRadius: "14px", fontWeight: 700, fontSize: "16px", textDecoration: "none", boxShadow: "0 20px 25px -5px rgba(0,107,44,0.2)" }}>Get Started Now</Link>
//             <button style={{ backgroundColor: "rgba(211,228,254,0.1)", border: "1px solid rgba(211,228,254,0.2)", padding: "18px 36px", borderRadius: "14px", fontWeight: 700, fontSize: "16px", color: "#fff", cursor: "pointer" }}>Schedule a Demo</button>
//           </div>
//         </div>
//       </div>
//       <style jsx>{`
//         @media (max-width: 600px) {
//           .cta-section { padding: 40px 16px !important; }
//           .cta-card { padding: 40px 24px !important; border-radius: 24px !important; }
//           .cta-title { font-size: 24px !important; }
//           .cta-desc { font-size: 15px !important; }
//           .cta-buttons { flex-direction: column !important; }
//           .cta-buttons a, .cta-buttons button { width: 100%; text-align: center; justify-content: center; }
//         }
//       `}</style>
//     </section>
//   );
// }

// /* ===========================
//    FOOTER
//    =========================== */
// function Footer() {
//   return (
//     <footer className="footer" style={{ backgroundColor: "#eff4ff", paddingTop: "80px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px", borderTop: "1px solid rgba(189,202,186,0.3)" }}>
//       <div className="footer-grid" style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "48px", marginBottom: "48px" }}>
//         <div>
//           <div className="flex items-center mb-4" style={{ gap: "8px" }}>
//             <img alt="KoloAI Logo" style={{ height: "28px", width: "auto" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb" />
//             <span style={{ fontSize: "20px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
//           </div>
//           <p style={{ color: "#3e4a3d", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>Empowering communities through intelligent finance and automated community wealth management.</p>
//           <div className="flex" style={{ gap: "16px" }}>
//             {["public", "share", "alternate_email"].map((icon) => (
//               <a key={icon} href="#" style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{icon}</span></a>
//             ))}
//           </div>
//         </div>
//         {[
//           { title: "Platform", links: ["AI Treasurer", "Group Savings", "Loan Management", "Monnify Gateway"] },
//           { title: "Resources", links: ["API Docs", "Trust Center", "Blog", "Help Center"] },
//         ].map((col) => (
//           <div key={col.title}>
//             <h4 style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#0b1c30", marginBottom: "20px" }}>{col.title}</h4>
//             <ul style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#3e4a3d", fontSize: "14px", listStyle: "none", padding: 0 }}>
//               {col.links.map((link) => <li key={link}><a href="#" style={{ textDecoration: "none", color: "#3e4a3d" }}>{link}</a></li>)}
//             </ul>
//           </div>
//         ))}
//         <div>
//           <h4 style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#0b1c30", marginBottom: "20px" }}>Institutional Trust</h4>
//           <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
//             {[
//               { icon: "security", title: "PCI-DSS Certified", sub: "Bank-level encryption" },
//               { icon: "policy", title: "CBN Licensed", sub: "Regulated Compliance" },
//             ].map((item) => (
//               <div key={item.icon} className="flex items-center" style={{ gap: "12px" }}>
//                 <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
//                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px", fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
//                 </div>
//                 <div>
//                   <p style={{ fontSize: "12px", fontWeight: 600 }}>{item.title}</p>
//                   <p style={{ fontSize: "11px", color: "#3e4a3d" }}>{item.sub}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//       <div className="footer-bottom" style={{ maxWidth: "1280px", margin: "0 auto", paddingTop: "24px", borderTop: "1px solid rgba(189,202,186,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
//         <p style={{ fontSize: "13px", fontWeight: 500, color: "#3e4a3d" }}>&copy; 2026 KoloAI. All rights reserved. Built for API Conference Lagos 2026.</p>
//         <div style={{ display: "flex", gap: "28px", fontSize: "13px", fontWeight: 500, color: "#3e4a3d", flexWrap: "wrap" }}>
//           {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((link) => <a key={link} href="#" style={{ textDecoration: "none", color: "#3e4a3d" }}>{link}</a>)}
//         </div>
//       </div>
//       <style jsx>{`
//         @media (max-width: 768px) {
//           .footer { padding-top: 50px !important; }
//           .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
//         }
//         @media (max-width: 500px) {
//           .footer-grid { grid-template-columns: 1fr !important; }
//           .footer-bottom { flex-direction: column !important; text-align: center !important; }
//         }
//       `}</style>
//     </footer>
//   );
// }




// // "use client";

// // import Link from "next/link";

// // export default function Home() {
// //   return (
// //     <>
// //       <TopNavBar />
// //       <HeroSection />
// //       <StatisticsSection />
// //       <EvolutionSection />
// //       <FeaturesBentoGrid />
// //       <CTASection />
// //       <Footer />
// //     </>
// //   );
// // }

// // /* ===========================
// //    TOP NAVBAR
// //    =========================== */
// // function TopNavBar() {
// //   return (
// //     <nav
// //       className="fixed top-0 left-0 w-full z-50 flex justify-between items-center backdrop-blur-lg border-b shadow-sm"
// //       style={{
// //         padding: "16px 24px",
// //         backgroundColor: "rgba(248, 249, 255, 0.7)",
// //         borderColor: "rgba(189, 202, 186, 0.5)",
// //       }}
// //     >
// //       <div className="flex items-center" style={{ gap: "8px" }}>
// //         <img
// //           alt="KoloAI Logo"
// //           style={{ height: "40px", width: "auto", objectFit: "contain" }}
// //           src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb"
// //         />
// //         <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
// //       </div>
// //       <div className="hidden md:flex items-center" style={{ gap: "40px" }}>
// //         {["Platform", "Groups", "Solutions", "Security"].map((item) => (
// //           <a
// //             key={item}
// //             href="#"
// //             className="transition-colors"
// //             style={{
// //               color: item === "Platform" ? "#006b2c" : "#3e4a3d",
// //               fontWeight: item === "Platform" ? 700 : 500,
// //               borderBottom: item === "Platform" ? "2px solid #006b2c" : "none",
// //               paddingBottom: item === "Platform" ? "4px" : "0",
// //               fontSize: "14px",
// //               fontFamily: "'Geist', sans-serif",
// //             }}
// //           >
// //             {item}
// //           </a>
// //         ))}
// //       </div>
// //       <div className="flex items-center" style={{ gap: "24px" }}>
// //         <Link href="/login" className="hidden sm:block" style={{ color: "#0b1c30", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", padding: "8px 16px", borderRadius: "8px", textDecoration: "none" }}>
// //           Sign In
// //         </Link>
// //         <Link href="/login" style={{ backgroundColor: "#006b2c", color: "#ffffff", fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", boxShadow: "0 0 15px rgba(0, 107, 44, 0.1)" }}>
// //           Get Started
// //         </Link>
// //       </div>
// //     </nav>
// //   );
// // }

// // /* ===========================
// //    HERO SECTION
// //    =========================== */
// // function HeroSection() {
// //   return (
// //     <header className="relative overflow-hidden" style={{ padding: "128px 24px 80px 24px" }}>
// //       <div className="mx-auto grid lg:grid-cols-2 items-center" style={{ maxWidth: "1280px", gap: "64px" }}>
// //         <div style={{ zIndex: 10 }}>
// //           <div className="inline-flex items-center mb-6" style={{ gap: "8px", padding: "4px 12px", borderRadius: "9999px", backgroundColor: "rgba(0, 107, 44, 0.1)", border: "1px solid rgba(0, 107, 44, 0.2)", color: "#006b2c", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>
// //             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>auto_awesome</span>
// //             Introducing AI-Powered Community Wealth
// //           </div>
// //           <h1 className="mb-6 tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontSize: "48px", lineHeight: "52.8px", fontWeight: 700, color: "#0b1c30" }}>
// //             The Future of <br /><span style={{ color: "#006b2c" }}>Community Finance</span>
// //           </h1>
// //           <p className="mb-10" style={{ fontSize: "18px", lineHeight: "28px", color: "#3e4a3d", maxWidth: "576px" }}>
// //             Automate your cooperative, contribution circle, or savings group with KoloAI's AI-driven treasury tools. Eliminate paperwork and human error with Nigeria's most secure fintech platform.
// //           </p>
// //           <div className="flex flex-wrap" style={{ gap: "24px" }}>
// //             <Link href="/login" className="flex items-center" style={{ backgroundColor: "#006b2c", color: "#ffffff", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", gap: "8px", textDecoration: "none" }}>
// //               Start Saving <span className="material-symbols-outlined">arrow_forward</span>
// //             </Link>
// //             <button className="flex items-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", gap: "8px", cursor: "pointer" }}>
// //               <span className="material-symbols-outlined">play_circle</span> Watch Demo
// //             </button>
// //           </div>
// //           <div className="flex items-center mt-12" style={{ gap: "16px" }}>
// //             <div className="flex" style={{ marginRight: "-12px" }}>
// //               {[1, 2, 3].map((i) => (
// //                 <img key={i} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #f8f9ff", objectFit: "cover", marginRight: "-12px" }}
// //                   alt="User" src={`https://lh3.googleusercontent.com/aida-public/AB6AXu${i === 1 ? 'AidZx08Ry-jK3OeiFP7Aka5YOexezNW8kKxZ8RMuoUcfFdvMsB2ptrdLlzOWzL4CJRG3j_rQfOjDoqoZ3xWuIBPOaWTU4XLxk7fDL52z7ybuqP0jEsbeaiHNWg0sH3TF-TXEVqOGCcbdt9O9B6CJaDgk_XAQp5EpH93f0vsTF1U2tdP9X7vfl0He6XX0dxBBZWv3kY1kx5mTQTlIT3zGfpU3lMGS2abOWe4EYrhseQyZvRoh0Zc33_A66yFjMh-oqhh3G1juf5yq30' : i === 2 ? 'BgssylN-Gly_a3ZPhBo7AloICtEaDak2oYz9pH_JDzYo4VsQFqjjbGDmYd2HhuXL7KjRVPx4HxT0jI-1P63WWzNemMAsfQQqc0vT7MGUvS_l8cjHlnlKfrPgt1x1Dbhzx4iY8Yt-beWLMyKgSBW1iY3EhoXbRLkuAPimZPx7tSnNtAjpIe_9khwErZj400E-y4KjHUQUtUctkt4r8IWNBAPsnfHIKTu_tTwb_Tu2u_qDHrL4salvXVWGWKtRa5Sf4N8IqY6QSwHEd1' : 'C8kmbky2X4_D6v8AsVQWAqC-_AkaHiTfw8y2kw5MKihsCiDfRHgHYTK9SMpy9qJsYadxqjkRYYP0iGO9zWuqHYsFCsdEHwcjFGg9C4-1iqZJCzs7FBH7gXQGn4jDEjbH18kSJFjx1yVzqJfPTV6FMAFBioC5KHz8iS-1Diw50M1YTAWInvcOWkqhYSRkx9EqID0ZTlRZUyEQKf-1-QToWxcLnxdbsPmALuwzfYHhZqN_7IQXkQSANHpma3R0olBE1TcAPc09mUh--U'}`} />
// //               ))}
// //             </div>
// //             <p style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>
// //               Trusted by <span style={{ fontWeight: 700, color: "#0b1c30" }}>50,000+ members</span> across Nigeria
// //             </p>
// //           </div>
// //         </div>
// //         <div style={{ position: "relative" }}>
// //           <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "500px", height: "500px", backgroundColor: "rgba(0,107,44,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
// //           <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "24px", borderRadius: "16px", position: "relative", zIndex: 10, animation: "floating 3s ease-in-out infinite" }}>
// //             <img style={{ width: "100%", height: "auto", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} alt="Dashboard" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw_vflSnoA03VrOWIx4BO5bcMzOh8593ZCDDS7F614T44pr9YDf8mYuncakPcMUMWwbX6SmuNcgjoqPNuBNcZXhohapvwA03EK_kZ2R0lMr7sTIKduC1AW3vNE5JiQ3aYt51y2ARLLEmR1Tvh3-P6u0tcca25Ak7MeSUYrPyRsvlJxCyRbSFbIZ32TkvqrIElOs3BGBgUWnL8TDMfbIuBGWy-OmB3pl1hBirsNJgc7k-Ctxc1mps9dQInyEBLMl6pn3AnmL-q0iP7H" />
// //             <div style={{ position: "absolute", bottom: "-24px", left: "-24px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", padding: "16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", maxWidth: "200px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
// //               <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#006b2c" }}>
// //                 <span className="material-symbols-outlined">trending_up</span>
// //               </div>
// //               <div><p style={{ fontSize: "12px", fontWeight: 600, color: "#3e4a3d" }}>Avg. Growth</p><p style={{ fontWeight: 700, color: "#0b1c30" }}>+24.8%</p></div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }

// // /* ===========================
// //    STATISTICS SECTION
// //    =========================== */
// // function StatisticsSection() {
// //   return (
// //     <section style={{ padding: "80px 0", backgroundColor: "#213145", color: "#ffffff" }}>
// //       <div className="mx-auto grid grid-cols-2 md:grid-cols-4 text-center" style={{ maxWidth: "1280px", padding: "0 24px", gap: "40px" }}>
// //         {[
// //           { value: "₦2.4B", label: "Contributions Managed" },
// //           { value: "5,000+", label: "Communities" },
// //           { value: "50,000+", label: "Active Members" },
// //           { value: "99.9%", label: "Ledger Accuracy" },
// //         ].map((stat) => (
// //           <div key={stat.label}>
// //             <h3 className="mb-2" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#62df7d" }}>{stat.value}</h3>
// //             <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#d3e4fe" }}>{stat.label}</p>
// //           </div>
// //         ))}
// //       </div>
// //     </section>
// //   );
// // }

// // /* ===========================
// //    EVOLUTION SECTION
// //    =========================== */
// // function EvolutionSection() {
// //   return (
// //     <section style={{ padding: "64px 24px", maxWidth: "1280px", margin: "0 auto" }}>
// //       <div className="text-center" style={{ marginBottom: "64px" }}>
// //         <h2 className="mb-4" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Evolution of Savings</h2>
// //         <p style={{ color: "#3e4a3d", maxWidth: "672px", margin: "0 auto" }}>See how we transform chaotic manual processes into seamless digital intelligence.</p>
// //       </div>
// //       <div className="grid md:grid-cols-2" style={{ gap: "24px" }}>
// //         <div style={{ padding: "40px", borderRadius: "16px", border: "1px solid rgba(189,202,186,0.3)", backgroundColor: "#eff4ff", opacity: 0.85 }}>
// //           <div className="flex items-center" style={{ gap: "12px", marginBottom: "24px" }}>
// //             <span className="material-symbols-outlined">history</span>
// //             <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Traditional Cooperative</span>
// //           </div>
// //           <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
// //             {["Manual paperwork & paper receipts", "Endless Excel sheets prone to error", "Chasing members for payment updates", "No visibility into loan risks"].map((item) => (
// //               <li key={item} className="flex items-center" style={{ gap: "12px", color: "#3e4a3d" }}>
// //                 <span className="material-symbols-outlined" style={{ color: "#ba1a1a" }}>close</span> {item}
// //               </li>
// //             ))}
// //           </ul>
// //           <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(189,202,186,0.5)", fontStyle: "italic", color: "rgba(62,74,61,0.7)", fontSize: "16px" }}>
// //             "The treasurer spent 15 hours a week just verifying bank alerts."
// //           </div>
// //         </div>
// //         <div style={{ padding: "40px", borderRadius: "16px", backgroundColor: "#0b1c30", color: "#fff", position: "relative", overflow: "hidden" }}>
// //           <div style={{ position: "absolute", top: 0, right: 0, width: "128px", height: "128px", backgroundColor: "rgba(0,107,44,0.2)", filter: "blur(60px)" }} />
// //           <div className="flex items-center" style={{ gap: "12px", marginBottom: "24px", color: "#7ffc97" }}>
// //             <span className="material-symbols-outlined">auto_awesome</span>
// //             <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>KoloAI</span>
// //           </div>
// //           <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
// //             {["AI Treasurer: Instant ledger balancing", "Monnify Automation: Auto-verify deposits", "Predictive Analytics for loan defaults", "Transparent member dashboard access"].map((item) => (
// //               <li key={item} className="flex items-center" style={{ gap: "12px" }}>
// //                 <span className="material-symbols-outlined" style={{ color: "#7ffc97" }}>check_circle</span> {item}
// //               </li>
// //             ))}
// //           </ul>
// //           <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.2)", fontStyle: "italic", color: "rgba(127,252,151,0.8)", fontSize: "16px" }}>
// //             "Now managed in 15 minutes a week with 100% data integrity."
// //           </div>
// //         </div>
// //       </div>
// //     </section>
// //   );
// // }

// // /* ===========================
// //    FEATURES BENTO GRID
// //    =========================== */
// // function FeaturesBentoGrid() {
// //   return (
// //     <section style={{ padding: "64px 24px", backgroundColor: "#ffffff" }}>
// //       <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
// //         <div style={{ marginBottom: "48px" }}>
// //           <h2 className="mb-4" style={{ fontSize: "40px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Powerful Intelligent Features</h2>
// //           <p style={{ color: "#3e4a3d", maxWidth: "672px" }}>Everything you need to scale community wealth, powered by KoloAI's enterprise-grade technology.</p>
// //         </div>
// //         <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
// //           {[
// //             { span: 8, icon: "psychology", title: "AI Treasurer", desc: "Our proprietary AI handles the heavy lifting—reconciling accounts, managing disbursements, and providing real-time financial health reports for your group.", img: true, reverse: false },
// //             { span: 4, icon: "account_balance_wallet", title: "Monnify Integration", desc: "Seamless payment collection with automated virtual accounts for every member. Zero stress reconciliation.", badge: "Real-time Verification", img: false, reverse: false },
// //             { span: 4, icon: "groups", title: "Dynamic Group Savings", desc: "Create custom savings rules, rotation schedules (Ajo/Esusu), and automated reminders for your specific community needs with KoloAI.", img: false, reverse: false, color: "#825100" },
// //             { span: 8, icon: "payments", title: "Smart Loan Management", desc: "Issue loans to members with interest tracking and collateral management. KoloAI predicts creditworthiness based on saving habits.", features: ["Automated Interest Calculation", "Repayment Reminders"], img: true, reverse: true, color: "#565e74" },
// //           ].map((card, i) => (
// //             <div key={i} style={{ gridColumn: `span ${card.span}`, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: card.img ? (card.reverse ? "row-reverse" : "row") : "column", gap: card.img ? "40px" : "0", alignItems: card.img ? "center" : "stretch" }}>
// //               <div style={{ flex: card.img ? 1 : "none" }}>
// //                 <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: card.color ? `${card.color}15` : "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: card.color || "#006b2c", marginBottom: "24px" }}>
// //                   <span className="material-symbols-outlined">{card.icon}</span>
// //                 </div>
// //                 <h3 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>{card.title}</h3>
// //                 <p style={{ color: "#3e4a3d", fontSize: "16px", lineHeight: "24px", marginBottom: card.badge || card.features ? "24px" : "0" }}>{card.desc}</p>
// //                 {card.features && (
// //                   <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
// //                     {card.features.map((f) => (
// //                       <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
// //                         <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>verified</span> {f}
// //                       </li>
// //                     ))}
// //                   </ul>
// //                 )}
// //                 {card.badge && (
// //                   <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#dce9ff", border: "1px solid rgba(189,202,186,0.3)" }}>
// //                     <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#006b2c" }} />
// //                     <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{card.badge}</span>
// //                   </div>
// //                 )}
// //               </div>
// //               {card.img && (
// //                 <div style={{ width: card.img ? "50%" : "100%" }}>
// //                   <img style={{ borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", width: "100%" }} alt={card.title} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2UgGRGP1yeULL4PlEvGBGwfOPDi4A3AQyF6v-ezJVPQe8Y3dkz9mjWxJuMpbWEBGwP6qb-Nep5XRdUhgLfrT6TiNgloLGKy1Pz0qpVcS8C6f9In-z-VY7qV3Zp2nzTs9ip9tBwk0wO2I3nSXLiUnW3YhzesEcAsOrmxrWwOkbmnoq0oO-x6qVkW1bTwzxDOzF8hsXocDAm6TFBOclc91HtaEH7ITYBVGOqShAzA_n8pN1NmcDyrXHqk9eoeiaO47WLVvOhB_0Yu2b" />
// //                 </div>
// //               )}
// //             </div>
// //           ))}
// //         </div>
// //       </div>
// //     </section>
// //   );
// // }

// // /* ===========================
// //    CTA SECTION
// //    =========================== */
// // function CTASection() {
// //   return (
// //     <section style={{ padding: "64px 24px" }}>
// //       <div className="mx-auto text-center relative overflow-hidden" style={{ maxWidth: "1280px", padding: "64px", borderRadius: "40px", backgroundColor: "#0b1c30", color: "#fff" }}>
// //         <div style={{ position: "absolute", top: 0, right: 0, width: "256px", height: "256px", backgroundColor: "rgba(0,107,44,0.1)", filter: "blur(80px)" }} />
// //         <div style={{ position: "relative", zIndex: 10 }}>
// //           <h2 className="mb-6" style={{ fontSize: "32px", fontWeight: 700 }}>Ready to upgrade your community?</h2>
// //           <p className="mx-auto mb-10" style={{ color: "#d3e4fe", fontSize: "18px", maxWidth: "672px" }}>Join thousands of cooperatives already using KoloAI to grow their wealth smarter and faster.</p>
// //           <div className="flex justify-center" style={{ gap: "24px", flexWrap: "wrap" }}>
// //             <Link href="/login" style={{ backgroundColor: "#006b2c", color: "#fff", padding: "20px 40px", borderRadius: "16px", fontWeight: 700, fontSize: "18px", textDecoration: "none", boxShadow: "0 20px 25px -5px rgba(0,107,44,0.2)" }}>Get Started Now</Link>
// //             <button style={{ backgroundColor: "rgba(211,228,254,0.1)", border: "1px solid rgba(211,228,254,0.2)", padding: "20px 40px", borderRadius: "16px", fontWeight: 700, fontSize: "18px", color: "#fff", cursor: "pointer" }}>Schedule a Demo</button>
// //           </div>
// //         </div>
// //       </div>
// //     </section>
// //   );
// // }

// // /* ===========================
// //    FOOTER
// //    =========================== */
// // function Footer() {
// //   return (
// //     <footer style={{ backgroundColor: "#eff4ff", paddingTop: "80px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px", borderTop: "1px solid rgba(189,202,186,0.3)" }}>
// //       <div className="mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-16" style={{ maxWidth: "1280px", gap: "64px" }}>
// //         <div>
// //           <div className="flex items-center mb-6" style={{ gap: "8px" }}>
// //             <img alt="KoloAI Logo" style={{ height: "32px", width: "auto" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb" />
// //             <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
// //           </div>
// //           <p className="mb-6" style={{ color: "#3e4a3d", fontSize: "16px" }}>Empowering communities through intelligent finance and automated community wealth management.</p>
// //           <div className="flex" style={{ gap: "24px" }}>
// //             {["public", "share", "alternate_email"].map((icon) => (
// //               <a key={icon} href="#" style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //                 <span className="material-symbols-outlined">{icon}</span>
// //               </a>
// //             ))}
// //           </div>
// //         </div>
// //         {[
// //           { title: "Platform", links: ["AI Treasurer", "Group Savings", "Loan Management", "Monnify Gateway"] },
// //           { title: "Resources", links: ["API Docs", "Trust Center", "Blog", "Help Center"] },
// //         ].map((col) => (
// //           <div key={col.title}>
// //             <h4 className="mb-6" style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#0b1c30" }}>{col.title}</h4>
// //             <ul style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#3e4a3d" }}>
// //               {col.links.map((link) => (
// //                 <li key={link}><a href="#" style={{ transition: "color 0.2s" }}>{link}</a></li>
// //               ))}
// //             </ul>
// //           </div>
// //         ))}
// //         <div>
// //           <h4 className="mb-6" style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#0b1c30" }}>Institutional Trust</h4>
// //           <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
// //             {[
// //               { icon: "security", title: "PCI-DSS Certified", sub: "Bank-level encryption" },
// //               { icon: "policy", title: "CBN Licensed", sub: "Regulated Compliance" },
// //             ].map((item) => (
// //               <div key={item.icon} className="flex items-center" style={{ gap: "16px" }}>
// //                 <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
// //                 </div>
// //                 <div>
// //                   <p style={{ fontSize: "12px", fontWeight: 600 }}>{item.title}</p>
// //                   <p style={{ fontSize: "12px", color: "#3e4a3d" }}>{item.sub}</p>
// //                 </div>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       </div>
// //       <div className="mx-auto flex flex-col md:flex-row justify-between items-center pt-10" style={{ maxWidth: "1280px", borderTop: "1px solid rgba(189,202,186,0.3)", gap: "24px" }}>
// //         <p style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>&copy; 2026 KoloAI. All rights reserved. Built for API Conference Lagos 2026.</p>
// //         <div style={{ display: "flex", gap: "40px", fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>
// //           {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((link) => (
// //             <a key={link} href="#" style={{ transition: "color 0.2s" }}>{link}</a>
// //           ))}
// //         </div>
// //       </div>
// //     </footer>
// //   );
// // }
