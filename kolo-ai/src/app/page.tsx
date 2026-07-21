"use client";

import Link from "next/link";

export default function Home() {
  return (
    <>
      <TopNavBar />
      <HeroSection />
      <StatisticsSection />
      <EvolutionSection />
      <FeaturesBentoGrid />
      <CTASection />
      <Footer />
    </>
  );
}

/* ===========================
   TOP NAVBAR
   =========================== */
function TopNavBar() {
  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 flex justify-between items-center backdrop-blur-lg border-b shadow-sm"
      style={{
        padding: "16px 24px",
        backgroundColor: "rgba(248, 249, 255, 0.7)",
        borderColor: "rgba(189, 202, 186, 0.5)",
      }}
    >
      <div className="flex items-center" style={{ gap: "8px" }}>
        <img
          alt="KoloAI Logo"
          style={{ height: "40px", width: "auto", objectFit: "contain" }}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb"
        />
        <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
      </div>
      <div className="hidden md:flex items-center" style={{ gap: "40px" }}>
        {["Platform", "Groups", "Solutions", "Security"].map((item) => (
          <a
            key={item}
            href="#"
            className="transition-colors"
            style={{
              color: item === "Platform" ? "#006b2c" : "#3e4a3d",
              fontWeight: item === "Platform" ? 700 : 500,
              borderBottom: item === "Platform" ? "2px solid #006b2c" : "none",
              paddingBottom: item === "Platform" ? "4px" : "0",
              fontSize: "14px",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            {item}
          </a>
        ))}
      </div>
      <div className="flex items-center" style={{ gap: "24px" }}>
        <Link href="/login" className="hidden sm:block" style={{ color: "#0b1c30", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", padding: "8px 16px", borderRadius: "8px", textDecoration: "none" }}>
          Sign In
        </Link>
        <Link href="/login" style={{ backgroundColor: "#006b2c", color: "#ffffff", fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", boxShadow: "0 0 15px rgba(0, 107, 44, 0.1)" }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}

/* ===========================
   HERO SECTION
   =========================== */
function HeroSection() {
  return (
    <header className="relative overflow-hidden" style={{ padding: "128px 24px 80px 24px" }}>
      <div className="mx-auto grid lg:grid-cols-2 items-center" style={{ maxWidth: "1280px", gap: "64px" }}>
        <div style={{ zIndex: 10 }}>
          <div className="inline-flex items-center mb-6" style={{ gap: "8px", padding: "4px 12px", borderRadius: "9999px", backgroundColor: "rgba(0, 107, 44, 0.1)", border: "1px solid rgba(0, 107, 44, 0.2)", color: "#006b2c", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>auto_awesome</span>
            Introducing AI-Powered Community Wealth
          </div>
          <h1 className="mb-6 tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontSize: "48px", lineHeight: "52.8px", fontWeight: 700, color: "#0b1c30" }}>
            The Future of <br /><span style={{ color: "#006b2c" }}>Community Finance</span>
          </h1>
          <p className="mb-10" style={{ fontSize: "18px", lineHeight: "28px", color: "#3e4a3d", maxWidth: "576px" }}>
            Automate your cooperative, contribution circle, or savings group with KoloAI's AI-driven treasury tools. Eliminate paperwork and human error with Nigeria's most secure fintech platform.
          </p>
          <div className="flex flex-wrap" style={{ gap: "24px" }}>
            <Link href="/login" className="flex items-center" style={{ backgroundColor: "#006b2c", color: "#ffffff", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", gap: "8px", textDecoration: "none" }}>
              Start Saving <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <button className="flex items-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "16px 32px", borderRadius: "12px", fontWeight: 700, fontSize: "16px", gap: "8px", cursor: "pointer" }}>
              <span className="material-symbols-outlined">play_circle</span> Watch Demo
            </button>
          </div>
          <div className="flex items-center mt-12" style={{ gap: "16px" }}>
            <div className="flex" style={{ marginRight: "-12px" }}>
              {[1, 2, 3].map((i) => (
                <img key={i} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #f8f9ff", objectFit: "cover", marginRight: "-12px" }}
                  alt="User" src={`https://lh3.googleusercontent.com/aida-public/AB6AXu${i === 1 ? 'AidZx08Ry-jK3OeiFP7Aka5YOexezNW8kKxZ8RMuoUcfFdvMsB2ptrdLlzOWzL4CJRG3j_rQfOjDoqoZ3xWuIBPOaWTU4XLxk7fDL52z7ybuqP0jEsbeaiHNWg0sH3TF-TXEVqOGCcbdt9O9B6CJaDgk_XAQp5EpH93f0vsTF1U2tdP9X7vfl0He6XX0dxBBZWv3kY1kx5mTQTlIT3zGfpU3lMGS2abOWe4EYrhseQyZvRoh0Zc33_A66yFjMh-oqhh3G1juf5yq30' : i === 2 ? 'BgssylN-Gly_a3ZPhBo7AloICtEaDak2oYz9pH_JDzYo4VsQFqjjbGDmYd2HhuXL7KjRVPx4HxT0jI-1P63WWzNemMAsfQQqc0vT7MGUvS_l8cjHlnlKfrPgt1x1Dbhzx4iY8Yt-beWLMyKgSBW1iY3EhoXbRLkuAPimZPx7tSnNtAjpIe_9khwErZj400E-y4KjHUQUtUctkt4r8IWNBAPsnfHIKTu_tTwb_Tu2u_qDHrL4salvXVWGWKtRa5Sf4N8IqY6QSwHEd1' : 'C8kmbky2X4_D6v8AsVQWAqC-_AkaHiTfw8y2kw5MKihsCiDfRHgHYTK9SMpy9qJsYadxqjkRYYP0iGO9zWuqHYsFCsdEHwcjFGg9C4-1iqZJCzs7FBH7gXQGn4jDEjbH18kSJFjx1yVzqJfPTV6FMAFBioC5KHz8iS-1Diw50M1YTAWInvcOWkqhYSRkx9EqID0ZTlRZUyEQKf-1-QToWxcLnxdbsPmALuwzfYHhZqN_7IQXkQSANHpma3R0olBE1TcAPc09mUh--U'}`} />
              ))}
            </div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>
              Trusted by <span style={{ fontWeight: 700, color: "#0b1c30" }}>50,000+ members</span> across Nigeria
            </p>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "500px", height: "500px", backgroundColor: "rgba(0,107,44,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
          <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "24px", borderRadius: "16px", position: "relative", zIndex: 10, animation: "floating 3s ease-in-out infinite" }}>
            <img style={{ width: "100%", height: "auto", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} alt="Dashboard" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw_vflSnoA03VrOWIx4BO5bcMzOh8593ZCDDS7F614T44pr9YDf8mYuncakPcMUMWwbX6SmuNcgjoqPNuBNcZXhohapvwA03EK_kZ2R0lMr7sTIKduC1AW3vNE5JiQ3aYt51y2ARLLEmR1Tvh3-P6u0tcca25Ak7MeSUYrPyRsvlJxCyRbSFbIZ32TkvqrIElOs3BGBgUWnL8TDMfbIuBGWy-OmB3pl1hBirsNJgc7k-Ctxc1mps9dQInyEBLMl6pn3AnmL-q0iP7H" />
            <div style={{ position: "absolute", bottom: "-24px", left: "-24px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", padding: "16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", maxWidth: "200px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#006b2c" }}>
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <div><p style={{ fontSize: "12px", fontWeight: 600, color: "#3e4a3d" }}>Avg. Growth</p><p style={{ fontWeight: 700, color: "#0b1c30" }}>+24.8%</p></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ===========================
   STATISTICS SECTION
   =========================== */
function StatisticsSection() {
  return (
    <section style={{ padding: "80px 0", backgroundColor: "#213145", color: "#ffffff" }}>
      <div className="mx-auto grid grid-cols-2 md:grid-cols-4 text-center" style={{ maxWidth: "1280px", padding: "0 24px", gap: "40px" }}>
        {[
          { value: "₦2.4B", label: "Contributions Managed" },
          { value: "5,000+", label: "Communities" },
          { value: "50,000+", label: "Active Members" },
          { value: "99.9%", label: "Ledger Accuracy" },
        ].map((stat) => (
          <div key={stat.label}>
            <h3 className="mb-2" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif", color: "#62df7d" }}>{stat.value}</h3>
            <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#d3e4fe" }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===========================
   EVOLUTION SECTION
   =========================== */
function EvolutionSection() {
  return (
    <section style={{ padding: "64px 24px", maxWidth: "1280px", margin: "0 auto" }}>
      <div className="text-center" style={{ marginBottom: "64px" }}>
        <h2 className="mb-4" style={{ fontSize: "32px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Evolution of Savings</h2>
        <p style={{ color: "#3e4a3d", maxWidth: "672px", margin: "0 auto" }}>See how we transform chaotic manual processes into seamless digital intelligence.</p>
      </div>
      <div className="grid md:grid-cols-2" style={{ gap: "24px" }}>
        <div style={{ padding: "40px", borderRadius: "16px", border: "1px solid rgba(189,202,186,0.3)", backgroundColor: "#eff4ff", opacity: 0.85 }}>
          <div className="flex items-center" style={{ gap: "12px", marginBottom: "24px" }}>
            <span className="material-symbols-outlined">history</span>
            <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Traditional Cooperative</span>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {["Manual paperwork & paper receipts", "Endless Excel sheets prone to error", "Chasing members for payment updates", "No visibility into loan risks"].map((item) => (
              <li key={item} className="flex items-center" style={{ gap: "12px", color: "#3e4a3d" }}>
                <span className="material-symbols-outlined" style={{ color: "#ba1a1a" }}>close</span> {item}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(189,202,186,0.5)", fontStyle: "italic", color: "rgba(62,74,61,0.7)", fontSize: "16px" }}>
            "The treasurer spent 15 hours a week just verifying bank alerts."
          </div>
        </div>
        <div style={{ padding: "40px", borderRadius: "16px", backgroundColor: "#0b1c30", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "128px", height: "128px", backgroundColor: "rgba(0,107,44,0.2)", filter: "blur(60px)" }} />
          <div className="flex items-center" style={{ gap: "12px", marginBottom: "24px", color: "#7ffc97" }}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>KoloAI</span>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {["AI Treasurer: Instant ledger balancing", "Monnify Automation: Auto-verify deposits", "Predictive Analytics for loan defaults", "Transparent member dashboard access"].map((item) => (
              <li key={item} className="flex items-center" style={{ gap: "12px" }}>
                <span className="material-symbols-outlined" style={{ color: "#7ffc97" }}>check_circle</span> {item}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.2)", fontStyle: "italic", color: "rgba(127,252,151,0.8)", fontSize: "16px" }}>
            "Now managed in 15 minutes a week with 100% data integrity."
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===========================
   FEATURES BENTO GRID
   =========================== */
function FeaturesBentoGrid() {
  return (
    <section style={{ padding: "64px 24px", backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ marginBottom: "48px" }}>
          <h2 className="mb-4" style={{ fontSize: "40px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Powerful Intelligent Features</h2>
          <p style={{ color: "#3e4a3d", maxWidth: "672px" }}>Everything you need to scale community wealth, powered by KoloAI's enterprise-grade technology.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
          {[
            { span: 8, icon: "psychology", title: "AI Treasurer", desc: "Our proprietary AI handles the heavy lifting—reconciling accounts, managing disbursements, and providing real-time financial health reports for your group.", img: true, reverse: false },
            { span: 4, icon: "account_balance_wallet", title: "Monnify Integration", desc: "Seamless payment collection with automated virtual accounts for every member. Zero stress reconciliation.", badge: "Real-time Verification", img: false, reverse: false },
            { span: 4, icon: "groups", title: "Dynamic Group Savings", desc: "Create custom savings rules, rotation schedules (Ajo/Esusu), and automated reminders for your specific community needs with KoloAI.", img: false, reverse: false, color: "#825100" },
            { span: 8, icon: "payments", title: "Smart Loan Management", desc: "Issue loans to members with interest tracking and collateral management. KoloAI predicts creditworthiness based on saving habits.", features: ["Automated Interest Calculation", "Repayment Reminders"], img: true, reverse: true, color: "#565e74" },
          ].map((card, i) => (
            <div key={i} style={{ gridColumn: `span ${card.span}`, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 20px -4px rgba(15,23,42,0.04)", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: card.img ? (card.reverse ? "row-reverse" : "row") : "column", gap: card.img ? "40px" : "0", alignItems: card.img ? "center" : "stretch" }}>
              <div style={{ flex: card.img ? 1 : "none" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: card.color ? `${card.color}15` : "rgba(0,107,44,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: card.color || "#006b2c", marginBottom: "24px" }}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>{card.title}</h3>
                <p style={{ color: "#3e4a3d", fontSize: "16px", lineHeight: "24px", marginBottom: card.badge || card.features ? "24px" : "0" }}>{card.desc}</p>
                {card.features && (
                  <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {card.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                        <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "18px" }}>verified</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                {card.badge && (
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#dce9ff", border: "1px solid rgba(189,202,186,0.3)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#006b2c" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{card.badge}</span>
                  </div>
                )}
              </div>
              {card.img && (
                <div style={{ width: card.img ? "50%" : "100%" }}>
                  <img style={{ borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", width: "100%" }} alt={card.title} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2UgGRGP1yeULL4PlEvGBGwfOPDi4A3AQyF6v-ezJVPQe8Y3dkz9mjWxJuMpbWEBGwP6qb-Nep5XRdUhgLfrT6TiNgloLGKy1Pz0qpVcS8C6f9In-z-VY7qV3Zp2nzTs9ip9tBwk0wO2I3nSXLiUnW3YhzesEcAsOrmxrWwOkbmnoq0oO-x6qVkW1bTwzxDOzF8hsXocDAm6TFBOclc91HtaEH7ITYBVGOqShAzA_n8pN1NmcDyrXHqk9eoeiaO47WLVvOhB_0Yu2b" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================
   CTA SECTION
   =========================== */
function CTASection() {
  return (
    <section style={{ padding: "64px 24px" }}>
      <div className="mx-auto text-center relative overflow-hidden" style={{ maxWidth: "1280px", padding: "64px", borderRadius: "40px", backgroundColor: "#0b1c30", color: "#fff" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: "256px", height: "256px", backgroundColor: "rgba(0,107,44,0.1)", filter: "blur(80px)" }} />
        <div style={{ position: "relative", zIndex: 10 }}>
          <h2 className="mb-6" style={{ fontSize: "32px", fontWeight: 700 }}>Ready to upgrade your community?</h2>
          <p className="mx-auto mb-10" style={{ color: "#d3e4fe", fontSize: "18px", maxWidth: "672px" }}>Join thousands of cooperatives already using KoloAI to grow their wealth smarter and faster.</p>
          <div className="flex justify-center" style={{ gap: "24px", flexWrap: "wrap" }}>
            <Link href="/login" style={{ backgroundColor: "#006b2c", color: "#fff", padding: "20px 40px", borderRadius: "16px", fontWeight: 700, fontSize: "18px", textDecoration: "none", boxShadow: "0 20px 25px -5px rgba(0,107,44,0.2)" }}>Get Started Now</Link>
            <button style={{ backgroundColor: "rgba(211,228,254,0.1)", border: "1px solid rgba(211,228,254,0.2)", padding: "20px 40px", borderRadius: "16px", fontWeight: 700, fontSize: "18px", color: "#fff", cursor: "pointer" }}>Schedule a Demo</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===========================
   FOOTER
   =========================== */
function Footer() {
  return (
    <footer style={{ backgroundColor: "#eff4ff", paddingTop: "80px", paddingBottom: "40px", paddingLeft: "24px", paddingRight: "24px", borderTop: "1px solid rgba(189,202,186,0.3)" }}>
      <div className="mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-16" style={{ maxWidth: "1280px", gap: "64px" }}>
        <div>
          <div className="flex items-center mb-6" style={{ gap: "8px" }}>
            <img alt="KoloAI Logo" style={{ height: "32px", width: "auto" }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyOItiXzMqG1Ithawb7E-JP_Ao_TD4c4IvhUzrQ5UiglRqyEEvF5MunCz8nsC87SFA6ef46wuMtHw5uc6lpGDuFzJMT4rFJBVBnJc_xwWHf4k9v6yCTfzJNGbeteU4LidkaYwmxveNmFSDrcv7ni5lHE8wCHGjPWNyvv9J-cPfWxoz10OmrWCfgUhqkOJ0vLMKcWx0z_TRBoIkX2UNNdHZdqgjuqjaqHvDFJYOhgDMCpAn1pLpNywbrMQ0mMMSLm6ljacprdgITSRb" />
            <span style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>KoloAI</span>
          </div>
          <p className="mb-6" style={{ color: "#3e4a3d", fontSize: "16px" }}>Empowering communities through intelligent finance and automated community wealth management.</p>
          <div className="flex" style={{ gap: "24px" }}>
            {["public", "share", "alternate_email"].map((icon) => (
              <a key={icon} href="#" style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined">{icon}</span>
              </a>
            ))}
          </div>
        </div>
        {[
          { title: "Platform", links: ["AI Treasurer", "Group Savings", "Loan Management", "Monnify Gateway"] },
          { title: "Resources", links: ["API Docs", "Trust Center", "Blog", "Help Center"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="mb-6" style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#0b1c30" }}>{col.title}</h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#3e4a3d" }}>
              {col.links.map((link) => (
                <li key={link}><a href="#" style={{ transition: "color 0.2s" }}>{link}</a></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="mb-6" style={{ fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#0b1c30" }}>Institutional Trust</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {[
              { icon: "security", title: "PCI-DSS Certified", sub: "Bank-level encryption" },
              { icon: "policy", title: "CBN Licensed", sub: "Regulated Compliance" },
            ].map((item) => (
              <div key={item.icon} className="flex items-center" style={{ gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: "#e5eeff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#006b2c", fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600 }}>{item.title}</p>
                  <p style={{ fontSize: "12px", color: "#3e4a3d" }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto flex flex-col md:flex-row justify-between items-center pt-10" style={{ maxWidth: "1280px", borderTop: "1px solid rgba(189,202,186,0.3)", gap: "24px" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>&copy; 2026 KoloAI. All rights reserved. Built for API Conference Lagos 2026.</p>
        <div style={{ display: "flex", gap: "40px", fontSize: "14px", fontWeight: 500, color: "#3e4a3d" }}>
          {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((link) => (
            <a key={link} href="#" style={{ transition: "color 0.2s" }}>{link}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}