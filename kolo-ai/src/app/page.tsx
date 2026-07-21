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
          alt="SaveCircle AI Logo"
          style={{ height: "40px", width: "40px", objectFit: "contain" }}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBenGgHNGJ4xREfAJpIfbGR6URIorlBRwL7KGDAtwvTb2hy9i2ptDssMV0HKSAnj6C6tmceuzdNmB3mZ9esLfrqisRF_mcXOIeG8TZI5Yh0NAGKkX1yas0JPu-G2a0i7iVoTHO3MAo17IWB2rg9evShTtjTq3XEICNrytqOxjKGDL1GtxVwvi1sbz4eZT1epkNc4H70uGvByI35Bzw7by3ztlLW4MJ3i7ptT4y8RVeH0XzG_E17TMoAfIAUKRBtPNv40Y1Sqkvxsydd"
        />
        <span
          style={{
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.01em",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            color: "#0b1c30",
          }}
        >
          SaveCircle AI
        </span>
      </div>
      <div className="hidden md:flex items-center" style={{ gap: "40px" }}>
        <a
          href="#"
          style={{
            color: "#006b2c",
            fontWeight: 700,
            borderBottom: "2px solid #006b2c",
            paddingBottom: "4px",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontFamily: "'Geist', sans-serif",
          }}
        >
          Platform
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{
            color: "#3e4a3d",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            fontFamily: "'Geist', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#006b2c")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3e4a3d")}
        >
          Groups
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{
            color: "#3e4a3d",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            fontFamily: "'Geist', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#006b2c")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3e4a3d")}
        >
          Solutions
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{
            color: "#3e4a3d",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            fontFamily: "'Geist', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#006b2c")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3e4a3d")}
        >
          Security
        </a>
      </div>
      <div className="flex items-center" style={{ gap: "24px" }}>
        <Link
          href="/login"
          className="hidden sm:block transition-all"
          style={{
            color: "#0b1c30",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            fontFamily: "'Geist', sans-serif",
            padding: "8px 16px",
            borderRadius: "8px",
          }}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="transition-all"
          style={{
            backgroundColor: "#006b2c",
            color: "#ffffff",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 700,
            fontFamily: "'Geist', sans-serif",
            padding: "10px 24px",
            borderRadius: "8px",
            boxShadow: "0 0 15px rgba(0, 107, 44, 0.1)",
          }}
        >
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
    <header
      className="relative overflow-hidden"
      style={{ padding: "128px 24px 80px 24px" }}
    >
      <div
        className="mx-auto grid lg:grid-cols-2 items-center"
        style={{ maxWidth: "1280px", gap: "64px" }}
      >
        <div style={{ zIndex: 10 }}>
          <div
            className="inline-flex items-center mb-6"
            style={{
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: "rgba(0, 107, 44, 0.1)",
              border: "1px solid rgba(0, 107, 44, 0.2)",
              color: "#006b2c",
              fontSize: "12px",
              lineHeight: "16px",
              letterSpacing: "0.03em",
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              auto_awesome
            </span>
            Introducing AI-Powered Community Wealth
          </div>

          <h1
            className="mb-6 tracking-tight"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "48px",
              lineHeight: "52.8px",
              letterSpacing: "-0.02em",
              fontWeight: 700,
              color: "#0b1c30",
            }}
          >
            The Future of <br />
            <span style={{ color: "#006b2c" }}>Community Finance</span>
          </h1>

          <p
            className="mb-10"
            style={{
              fontSize: "18px",
              lineHeight: "28px",
              fontWeight: 400,
              color: "#3e4a3d",
              maxWidth: "576px",
            }}
          >
            Automate your cooperative, contribution circle, or savings group
            with AI-driven treasury tools. Eliminate paperwork and human error
            with Nigeria&apos;s most secure fintech platform.
          </p>

          <div className="flex flex-wrap" style={{ gap: "24px" }}>
            <Link
              href="/register"
              className="flex items-center transition-all"
              style={{
                backgroundColor: "#006b2c",
                color: "#ffffff",
                padding: "16px 32px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "16px",
                lineHeight: "24px",
                gap: "8px",
              }}
            >
              Start Saving
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <button
              className="flex items-center transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
                padding: "16px 32px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "16px",
                lineHeight: "24px",
                gap: "8px",
              }}
            >
              <span className="material-symbols-outlined">play_circle</span>
              Watch Demo
            </button>
          </div>

          <div
            className="flex items-center mt-12"
            style={{ gap: "16px" }}
          >
            <div className="flex" style={{ marginRight: "-12px" }}>
              <img
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #f8f9ff",
                  objectFit: "cover",
                  marginRight: "-12px",
                }}
                alt="Portrait"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAidZx08Ry-jK3OeiFP7Aka5YOexezNW8kKxZ8RMuoUcfFdvMsB2ptrdLlzOWzL4CJRG3j_rQfOjDoqoZ3xWuIBPOaWTU4XLxk7fDL52z7ybuqP0jEsbeaiHNWg0sH3TF-TXEVqOGCcbdt9O9B6CJaDgk_XAQp5EpH93f0vsTF1U2tdP9X7vfl0He6XX0dxBBZWv3kY1kx5mTQTlIT3zGfpU3lMGS2abOWe4EYrhseQyZvRoh0Zc33_A66yFjMh-oqhh3G1juf5yq30"
              />
              <img
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #f8f9ff",
                  objectFit: "cover",
                  marginRight: "-12px",
                }}
                alt="Portrait"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgssylN-Gly_a3ZPhBo7AloICtEaDak2oYz9pH_JDzYo4VsQFqjjbGDmYd2HhuXL7KjRVPx4HxT0jI-1P63WWzNemMAsfQQqc0vT7MGUvS_l8cjHlnlKfrPgt1x1Dbhzx4iY8Yt-beWLMyKgSBW1iY3EhoXbRLkuAPimZPx7tSnNtAjpIe_9khwErZj400E-y4KjHUQUtUctkt4r8IWNBAPsnfHIKTu_tTwb_Tu2u_qDHrL4salvXVWGWKtRa5Sf4N8IqY6QSwHEd1"
              />
              <img
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #f8f9ff",
                  objectFit: "cover",
                }}
                alt="Portrait"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8kmbky2X4_D6v8AsVQWAqC-_AkaHiTfw8y2kw5MKihsCiDfRHgHYTK9SMpy9qJsYadxqjkRYYP0iGO9zWuqHYsFCsdEHwcjFGg9C4-1iqZJCzs7FBH7gXQGn4jDEjbH18kSJFjx1yVzqJfPTV6FMAFBioC5KHz8iS-1Diw50M1YTAWInvcOWkqhYSRkx9EqID0ZTlRZUyEQKf-1-QToWxcLnxdbsPmALuwzfYHhZqN_7IQXkQSANHpma3R0olBE1TcAPc09mUh--U"
              />
            </div>
            <p
              style={{
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0.01em",
                fontWeight: 500,
                color: "#3e4a3d",
              }}
            >
              Trusted by{" "}
              <span style={{ fontWeight: 700, color: "#0b1c30" }}>
                50,000+ members
              </span>{" "}
              across Nigeria
            </p>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: "500px",
              height: "500px",
              backgroundColor: "rgba(0, 107, 44, 0.05)",
              borderRadius: "50%",
              filter: "blur(100px)",
            }}
          />
          <div
            style={{
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
              padding: "24px",
              borderRadius: "16px",
              position: "relative",
              zIndex: 10,
              animation: "floating 3s ease-in-out infinite",
            }}
          >
            <img
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "12px",
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              alt="Dashboard"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw_vflSnoA03VrOWIx4BO5bcMzOh8593ZCDDS7F614T44pr9YDf8mYuncakPcMUMWwbX6SmuNcgjoqPNuBNcZXhohapvwA03EK_kZ2R0lMr7sTIKduC1AW3vNE5JiQ3aYt51y2ARLLEmR1Tvh3-P6u0tcca25Ak7MeSUYrPyRsvlJxCyRbSFbIZ32TkvqrIElOs3BGBgUWnL8TDMfbIuBGWy-OmB3pl1hBirsNJgc7k-Ctxc1mps9dQInyEBLMl6pn3AnmL-q0iP7H"
            />
            <div
              style={{
                position: "absolute",
                bottom: "-24px",
                left: "-24px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                padding: "16px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                maxWidth: "200px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 107, 44, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#006b2c",
                }}
              >
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.03em",
                    fontWeight: 600,
                    color: "#3e4a3d",
                  }}
                >
                  Avg. Growth
                </p>
                <p style={{ fontWeight: 700, color: "#0b1c30" }}>+24.8%</p>
              </div>
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
  const stats = [
    { value: "₦2.4B", label: "Contributions Managed" },
    { value: "5,000+", label: "Communities" },
    { value: "50,000+", label: "Active Members" },
    { value: "99.9%", label: "Ledger Accuracy" },
  ];

  return (
    <section
      style={{
        padding: "80px 0",
        backgroundColor: "#213145",
        color: "#ffffff",
      }}
    >
      <div
        className="mx-auto grid grid-cols-2 md:grid-cols-4 text-center"
        style={{ maxWidth: "1280px", padding: "0 24px", gap: "40px" }}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <h3
              className="mb-2"
              style={{
                fontSize: "32px",
                lineHeight: "40px",
                letterSpacing: "-0.02em",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                color: "#62df7d",
              }}
            >
              {stat.value}
            </h3>
            <p
              style={{
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0.01em",
                fontWeight: 500,
                fontFamily: "'Geist', sans-serif",
                color: "#d3e4fe",
              }}
            >
              {stat.label}
            </p>
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
    <section
      style={{ padding: "64px 24px", maxWidth: "1280px", margin: "0 auto" }}
    >
      <div className="text-center" style={{ marginBottom: "64px" }}>
        <h2
          className="mb-4"
          style={{
            fontSize: "32px",
            lineHeight: "40px",
            letterSpacing: "-0.02em",
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Evolution of Savings
        </h2>
        <p
          className="mx-auto"
          style={{
            color: "#3e4a3d",
            maxWidth: "672px",
          }}
        >
          See how we transform chaotic manual processes into seamless digital
          intelligence.
        </p>
      </div>

      <div className="grid md:grid-cols-2" style={{ gap: "24px" }}>
        {/* Traditional */}
        <div
          className="flex flex-col"
          style={{
            padding: "40px",
            borderRadius: "16px",
            border: "1px solid rgba(189, 202, 186, 0.3)",
            backgroundColor: "#eff4ff",
            gap: "24px",
            opacity: 0.8,
          }}
        >
          <div
            className="flex items-center"
            style={{ gap: "12px", color: "#3e4a3d" }}
          >
            <span className="material-symbols-outlined">history</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "20px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Traditional Cooperative
            </span>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <li
              className="flex items-center"
              style={{ gap: "12px", color: "#3e4a3d" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "#ba1a1a" }}
              >
                close
              </span>
              Manual paperwork &amp; paper receipts
            </li>
            <li
              className="flex items-center"
              style={{ gap: "12px", color: "#3e4a3d" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "#ba1a1a" }}
              >
                close
              </span>
              Endless Excel sheets prone to error
            </li>
            <li
              className="flex items-center"
              style={{ gap: "12px", color: "#3e4a3d" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "#ba1a1a" }}
              >
                close
              </span>
              Chasing members for payment updates
            </li>
            <li
              className="flex items-center"
              style={{ gap: "12px", color: "#3e4a3d" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "#ba1a1a" }}
              >
                close
              </span>
              No visibility into loan risks
            </li>
          </ul>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid rgba(189, 202, 186, 0.5)",
              fontStyle: "italic",
              color: "rgba(62, 74, 61, 0.7)",
              fontSize: "16px",
              lineHeight: "24px",
            }}
          >
            &quot;The treasurer spent 15 hours a week just verifying bank
            alerts.&quot;
          </div>
        </div>

        {/* SaveCircle AI */}
        <div
          className="flex flex-col relative overflow-hidden"
          style={{
            padding: "40px",
            borderRadius: "16px",
            backgroundColor: "#0b1c30",
            color: "#ffffff",
            gap: "24px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "128px",
              height: "128px",
              backgroundColor: "rgba(0, 107, 44, 0.2)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="flex items-center"
            style={{ gap: "12px", color: "#7ffc97" }}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "20px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              SaveCircle AI
            </span>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <li className="flex items-center" style={{ gap: "12px" }}>
              <span
                className="material-symbols-outlined"
                style={{ color: "#7ffc97" }}
              >
                check_circle
              </span>
              AI Treasurer: Instant ledger balancing
            </li>
            <li className="flex items-center" style={{ gap: "12px" }}>
              <span
                className="material-symbols-outlined"
                style={{ color: "#7ffc97" }}
              >
                check_circle
              </span>
              Monnify Automation: Auto-verify deposits
            </li>
            <li className="flex items-center" style={{ gap: "12px" }}>
              <span
                className="material-symbols-outlined"
                style={{ color: "#7ffc97" }}
              >
                check_circle
              </span>
              Predictive Analytics for loan defaults
            </li>
            <li className="flex items-center" style={{ gap: "12px" }}>
              <span
                className="material-symbols-outlined"
                style={{ color: "#7ffc97" }}
              >
                check_circle
              </span>
              Transparent member dashboard access
            </li>
          </ul>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.2)",
              fontStyle: "italic",
              color: "rgba(127, 252, 151, 0.8)",
              fontSize: "16px",
              lineHeight: "24px",
            }}
          >
            &quot;Now managed in 15 minutes a week with 100% data
            integrity.&quot;
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
    <section
      style={{
        padding: "64px 24px",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ marginBottom: "48px" }}>
          <h2
            className="mb-4"
            style={{
              fontSize: "48px",
              lineHeight: "56px",
              letterSpacing: "-0.02em",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Powerful Intelligent Features
          </h2>
          <p style={{ color: "#3e4a3d", maxWidth: "672px" }}>
            Everything you need to scale community wealth, powered by
            enterprise-grade AI.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "24px",
          }}
        >
          {/* AI Treasurer */}
          <div
            className="relative overflow-hidden"
            style={{
              gridColumn: "span 12",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
              padding: "24px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "40px",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(0, 107, 44, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#006b2c",
                    marginBottom: "24px",
                  }}
                >
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "24px",
                    lineHeight: "32px",
                    letterSpacing: "-0.01em",
                    fontWeight: 600,
                  }}
                >
                  AI Treasurer
                </h3>
                <p
                  className="mb-6"
                  style={{
                    color: "#3e4a3d",
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                >
                  Our proprietary AI handles the heavy lifting—reconciling
                  accounts, managing disbursements, and providing real-time
                  financial health reports for your group.
                </p>
                <a
                  href="#"
                  className="flex items-center font-bold"
                  style={{
                    color: "#006b2c",
                    gap: "8px",
                  }}
                >
                  Learn more
                  <span className="material-symbols-outlined">
                    arrow_right_alt
                  </span>
                </a>
              </div>
              <div style={{ width: "50%" }}>
                <img
                  style={{ borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  alt="AI Dashboard"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2UgGRGP1yeULL4PlEvGBGwfOPDi4A3AQyF6v-ezJVPQe8Y3dkz9mjWxJuMpbWEBGwP6qb-Nep5XRdUhgLfrT6TiNgloLGKy1Pz0qpVcS8C6f9In-z-VY7qV3Zp2nzTs9ip9tBwk0wO2I3nSXLiUnW3YhzesEcAsOrmxrWwOkbmnoq0oO-x6qVkW1bTwzxDOzF8hsXocDAm6TFBOclc91HtaEH7ITYBVGOqShAzA_n8pN1NmcDyrXHqk9eoeiaO47WLVvOhB_0Yu2b"
                />
              </div>
            </div>
          </div>

          {/* Monnify Payments */}
          <div
            className="flex flex-col"
            style={{
              gridColumn: "span 4",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
              padding: "24px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "rgba(0, 107, 44, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#006b2c",
                marginBottom: "24px",
              }}
            >
              <span className="material-symbols-outlined">
                account_balance_wallet
              </span>
            </div>
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "-0.01em",
                fontWeight: 600,
              }}
            >
              Monnify Integration
            </h3>
            <p
              className="mb-6"
              style={{
                color: "#3e4a3d",
                fontSize: "16px",
                lineHeight: "24px",
              }}
            >
              Seamless payment collection with automated virtual accounts for
              every member. Zero stress reconciliation.
            </p>
            <div style={{ marginTop: "auto" }}>
              <div
                className="flex items-center"
                style={{
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#dce9ff",
                  border: "1px solid rgba(189, 202, 186, 0.3)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#006b2c",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.03em",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Real-time Verification
                </span>
              </div>
            </div>
          </div>

          {/* Group Savings */}
          <div
            style={{
              gridColumn: "span 4",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
              padding: "24px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "rgba(130, 81, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#825100",
                marginBottom: "24px",
              }}
            >
              <span className="material-symbols-outlined">groups</span>
            </div>
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "-0.01em",
                fontWeight: 600,
              }}
            >
              Dynamic Group Savings
            </h3>
            <p
              style={{
                color: "#3e4a3d",
                fontSize: "16px",
                lineHeight: "24px",
              }}
            >
              Create custom savings rules, rotation schedules (Ajo/Esusu), and
              automated reminders for your specific community needs.
            </p>
          </div>

          {/* Loan Management */}
          <div
            className="relative overflow-hidden"
            style={{
              gridColumn: "span 8",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
              padding: "24px",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row-reverse",
                gap: "40px",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(86, 94, 116, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#565e74",
                    marginBottom: "24px",
                  }}
                >
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <h3
                  className="font-bold mb-4"
                  style={{
                    fontSize: "24px",
                    lineHeight: "32px",
                    letterSpacing: "-0.01em",
                    fontWeight: 600,
                  }}
                >
                  Smart Loan Management
                </h3>
                <p
                  style={{
                    color: "#3e4a3d",
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                >
                  Issue loans to members with interest tracking and collateral
                  management. Our system predicts creditworthiness based on
                  saving habits.
                </p>
                <ul style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <li
                    className="flex items-center"
                    style={{ gap: "8px", fontSize: "14px", lineHeight: "20px" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "#006b2c", fontSize: "18px" }}
                    >
                      verified
                    </span>{" "}
                    Automated Interest Calculation
                  </li>
                  <li
                    className="flex items-center"
                    style={{ gap: "8px", fontSize: "14px", lineHeight: "20px" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "#006b2c", fontSize: "18px" }}
                    >
                      verified
                    </span>{" "}
                    Repayment Reminders
                  </li>
                </ul>
              </div>
              <div style={{ width: "50%" }}>
                <img
                  style={{
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    border: "1px solid rgba(189, 202, 186, 0.3)",
                  }}
                  alt="Loan Interface"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBikDDgT15X-GXengvRcvyn797yv2EX8qQWqTuGSBW2WUKK9B_bjDgzpQCPsyq_l9xGGgHizDxCIRh7FbdLeecTmzjt2syUZ6NFoxnYcd8sxN5lR1otJpBplPQQjr8NM9l8bjQhlKyNthmDnos0en4zY-O3E92dSPgb1ThLPohw5URyv5u4BXr8EMDc2AB6oWI8q-XduH6Bl5PSjdonT3mVYEkjQH_GXbJ6VdzLfPZPfiFpcle4t_QI-isNqxn8pCi9nTnFO6J0viIm"
                />
              </div>
            </div>
          </div>
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
      <div
        className="mx-auto text-center relative overflow-hidden"
        style={{
          maxWidth: "1280px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.04)",
          padding: "64px",
          borderRadius: "40px",
          backgroundColor: "#0b1c30",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "256px",
            height: "256px",
            backgroundColor: "rgba(0, 107, 44, 0.1)",
            filter: "blur(80px)",
          }}
        />
        <div style={{ position: "relative", zIndex: 10 }}>
          <h2
            className="mb-6"
            style={{
              fontSize: "32px",
              lineHeight: "40px",
              letterSpacing: "-0.02em",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Ready to upgrade your community?
          </h2>
          <p
            className="mx-auto mb-10"
            style={{
              color: "#d3e4fe",
              fontSize: "18px",
              lineHeight: "28px",
              maxWidth: "672px",
            }}
          >
            Join thousands of cooperatives already using SaveCircle AI to grow
            their wealth smarter and faster.
          </p>
          <div
            className="flex justify-center"
            style={{ gap: "24px", flexWrap: "wrap" }}
          >
            <Link
              href="/register"
              style={{
                backgroundColor: "#006b2c",
                color: "#ffffff",
                padding: "20px 40px",
                borderRadius: "16px",
                fontWeight: 700,
                fontSize: "18px",
                lineHeight: "28px",
                boxShadow: "0 20px 25px -5px rgba(0, 107, 44, 0.2)",
              }}
            >
              Get Started Now
            </Link>
            <button
              style={{
                backgroundColor: "rgba(211, 228, 254, 0.1)",
                border: "1px solid rgba(211, 228, 254, 0.2)",
                padding: "20px 40px",
                borderRadius: "16px",
                fontWeight: 700,
                fontSize: "18px",
                lineHeight: "28px",
              }}
            >
              Schedule a Demo
            </button>
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
    <footer
      style={{
        backgroundColor: "#eff4ff",
        paddingTop: "80px",
        paddingBottom: "40px",
        paddingLeft: "24px",
        paddingRight: "24px",
        borderTop: "1px solid rgba(189, 202, 186, 0.3)",
      }}
    >
      <div
        className="mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-16"
        style={{ maxWidth: "1280px", gap: "64px" }}
      >
        <div>
          <div
            className="flex items-center mb-6"
            style={{ gap: "8px" }}
          >
            <img
              alt="SaveCircle AI Logo"
              style={{ height: "32px", width: "32px" }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBenGgHNGJ4xREfAJpIfbGR6URIorlBRwL7KGDAtwvTb2hy9i2ptDssMV0HKSAnj6C6tmceuzdNmB3mZ9esLfrqisRF_mcXOIeG8TZI5Yh0NAGKkX1yas0JPu-G2a0i7iVoTHO3MAo17IWB2rg9evShTtjTq3XEICNrytqOxjKGDL1GtxVwvi1sbz4eZT1epkNc4H70uGvByI35Bzw7by3ztlLW4MJ3i7ptT4y8RVeH0XzG_E17TMoAfIAUKRBtPNv40Y1Sqkvxsydd"
            />
            <span
              style={{
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "-0.01em",
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: "#0b1c30",
              }}
            >
              SaveCircle AI
            </span>
          </div>
          <p
            className="mb-6"
            style={{
              color: "#3e4a3d",
              fontSize: "16px",
              lineHeight: "24px",
            }}
          >
            Empowering communities through intelligent finance and automated
            community wealth management.
          </p>
          <div className="flex" style={{ gap: "24px" }}>
            <a
              href="#"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#e5eeff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined">public</span>
            </a>
            <a
              href="#"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#e5eeff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined">share</span>
            </a>
            <a
              href="#"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#e5eeff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined">alternate_email</span>
            </a>
          </div>
        </div>

        {/* Platform */}
        <div>
          <h4
            className="mb-6"
            style={{
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#0b1c30",
            }}
          >
            Platform
          </h4>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#3e4a3d",
            }}
          >
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                AI Treasurer
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Group Savings
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Loan Management
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Monnify Gateway
              </a>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4
            className="mb-6"
            style={{
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#0b1c30",
            }}
          >
            Resources
          </h4>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#3e4a3d",
            }}
          >
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                API Docs
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Trust Center
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Blog
              </a>
            </li>
            <li>
              <a href="#" style={{ transition: "color 0.2s" }}>
                Help Center
              </a>
            </li>
          </ul>
        </div>

        {/* Trust */}
        <div>
          <h4
            className="mb-6"
            style={{
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#0b1c30",
            }}
          >
            Institutional Trust
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="flex items-center" style={{ gap: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#e5eeff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: "#006b2c",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  security
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.03em",
                    fontWeight: 600,
                  }}
                >
                  PCI-DSS Certified
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#3e4a3d",
                  }}
                >
                  Bank-level encryption
                </p>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#e5eeff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: "#006b2c",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  policy
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "0.03em",
                    fontWeight: 600,
                  }}
                >
                  CBN Licensed
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#3e4a3d",
                  }}
                >
                  Regulated Compliance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="mx-auto flex flex-col md:flex-row justify-between items-center pt-10"
        style={{
          maxWidth: "1280px",
          borderTop: "1px solid rgba(189, 202, 186, 0.3)",
          gap: "24px",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            color: "#3e4a3d",
          }}
        >
          &copy; 2024 SaveCircle AI. All rights reserved.
        </p>
        <div
          style={{
            display: "flex",
            gap: "40px",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.01em",
            fontWeight: 500,
            color: "#3e4a3d",
          }}
        >
          <a href="#" style={{ transition: "color 0.2s" }}>
            Privacy Policy
          </a>
          <a href="#" style={{ transition: "color 0.2s" }}>
            Terms of Service
          </a>
          <a href="#" style={{ transition: "color 0.2s" }}>
            Cookie Settings
          </a>
        </div>
      </div>
    </footer>
  );
}
