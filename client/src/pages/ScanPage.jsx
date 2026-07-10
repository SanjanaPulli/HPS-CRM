import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BASE_URL from "../config";

export default function ScanPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [role, setRole] = useState(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetch(`${BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Failed to load settings", err));
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d) =>
    d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleRoleSelect = (r) => {
    setRole(r);
    setError("");
    setIdentifier("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (role === "admin") {
        const res = await fetch(`${BASE_URL}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier.trim(), password: password.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          const derivedRole = data.role || (data.name === "Manager" ? "manager" : "admin");
          localStorage.setItem("adminAuth", "true");
          localStorage.setItem("adminName", data.name || "Admin");
          localStorage.setItem("role", derivedRole);
          localStorage.setItem("adminToken", data.token); // Save JWT token
          navigate("/admin/dashboard");
          return;
        }
        setError(data.message || "Invalid admin credentials");
      } else {
        const res = await fetch(`${BASE_URL}/api/employees/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empId: identifier.trim().toUpperCase(), password: password.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("employeeAuth", JSON.stringify(data.employee));
          localStorage.setItem("employeeToken", data.token);
          navigate("/employee/dashboard");
          return;
        }
        setError(data.error || data.message || "Invalid credentials");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .scan-root {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          background: #EEF3F8;
          font-family: 'Segoe UI', system-ui, sans-serif;
          position: relative;
        }

        .dot-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: radial-gradient(circle, #1AABDB1A 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* ── Navbar ── */
        .scan-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 clamp(1rem, 5vw, 2rem);
          height: 60px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(26,171,219,0.12);
        }

        .scan-nav img {
          height: 36px;
          object-fit: contain;
        }

        .scan-nav-time {
          text-align: right;
        }
        .scan-nav-time .time {
          font-size: clamp(13px, 2vw, 15px);
          font-weight: 600;
          color: #1AABDB;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.03em;
        }
        .scan-nav-time .date {
          font-size: clamp(10px, 1.5vw, 12px);
          color: #94A3B8;
          margin-top: 1px;
        }

        /* ── Main ── */
        .scan-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(2rem, 6vw, 4rem) 1.25rem;
        }

        /* Badge */
        .scan-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 18px;
          border-radius: 999px;
          background: rgba(26,171,219,0.08);
          border: 1px solid rgba(26,171,219,0.2);
          color: #1AABDB;
          font-size: clamp(9px, 1.5vw, 11px);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: clamp(1rem, 3vw, 1.5rem);
        }

        /* Heading */
        .scan-heading {
          font-size: clamp(28px, 6vw, 52px);
          font-weight: 800;
          color: #0F172A;
          text-align: center;
          line-height: 1.15;
          margin-bottom: 0.5rem;
        }
        .scan-heading span { color: #1AABDB; }

        .scan-subtext {
          font-size: clamp(12px, 2vw, 14px);
          color: #64748B;
          text-align: center;
          line-height: 1.6;
          max-width: 380px;
          margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
        }

        /* Card container */
        .scan-card-wrap {
          width: 100%;
          max-width: 400px;
        }

        /* Role tabs */
        .scan-tabs {
          display: flex;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(26,171,219,0.14);
          border-radius: 18px;
          padding: 5px;
          margin-bottom: 1.25rem;
          gap: 4px;
        }

        .scan-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 8px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          font-size: clamp(12px, 2vw, 14px);
          font-weight: 600;
          transition: background 0.18s, color 0.18s, box-shadow 0.18s;
          background: transparent;
          color: #94A3B8;
        }
        .scan-tab.active {
          background: #1AABDB;
          color: #fff;
          box-shadow: 0 2px 14px rgba(26,171,219,0.32);
        }

        /* Form card */
        .scan-form-card {
          background: rgba(255,255,255,0.97);
          border: 1px solid rgba(26,171,219,0.13);
          border-radius: 20px;
          padding: clamp(1.25rem, 4vw, 1.75rem);
          box-shadow: 0 8px 36px rgba(0,0,0,0.07);
          animation: slideUp 0.22s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .scan-form-hint {
          font-size: 12px;
          color: #94A3B8;
          text-align: center;
          margin-bottom: 1.1rem;
        }

        /* Error */
        .scan-error {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 12px;
          background: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FECACA;
          font-size: 12px;
          margin-bottom: 1rem;
        }

        /* Form fields */
        .scan-field { margin-bottom: 1rem; }
        .scan-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .scan-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 13px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #0F172A;
          font-size: clamp(13px, 2vw, 14px);
          outline: none;
          transition: border 0.15s, background 0.15s;
          font-family: inherit;
        }
        .scan-input:focus {
          border-color: #1AABDB;
          background: rgba(26,171,219,0.03);
        }
        .scan-input::placeholder { color: #CBD5E1; }

        .scan-pw-wrap {
          position: relative;
        }
        .scan-pw-wrap .scan-input {
          padding-right: 44px;
        }
        .scan-eye {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .scan-pw-default {
          font-size: 11px;
          color: #CBD5E1;
          margin-top: 5px;
        }

        /* Submit */
        .scan-submit {
          width: 100%;
          padding: 13px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          font-size: clamp(13px, 2vw, 14px);
          font-weight: 700;
          color: #fff;
          background: #1AABDB;
          box-shadow: 0 4px 18px rgba(26,171,219,0.3);
          transition: background 0.15s, box-shadow 0.15s, opacity 0.15s;
          margin-top: 0.25rem;
          font-family: inherit;
          letter-spacing: 0.02em;
        }
        .scan-submit:hover:not(:disabled) {
          background: #0e8ab5;
          box-shadow: 0 4px 24px rgba(26,171,219,0.42);
        }
        .scan-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Placeholder */
        .scan-placeholder {
          text-align: center;
          padding: 1.5rem 0;
          font-size: 13px;
          color: #CBD5E1;
        }

        /* Footer */
        .scan-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 1rem;
          border-top: 1px solid rgba(26,171,219,0.09);
          font-size: 11px;
          color: #CBD5E1;
        }

        /* ── Mobile tweaks ── */
        @media (max-width: 480px) {
          .scan-main { justify-content: flex-start; padding-top: 2rem; }
          .scan-card-wrap { max-width: 100%; }
          .scan-form-card { border-radius: 16px; }
          .scan-tabs { border-radius: 14px; }
          .scan-heading { font-size: 30px; }
        }
      `}</style>

      <div className="scan-root">
        <div className="dot-grid" />

        {/* Navbar */}
        <nav className="scan-nav">
          <img src="/hps_new_logo.png" alt="HPS Logo" />
          <div className="scan-nav-time">
            <p className="time">{formatTime(time)}</p>
            <p className="date">{formatDate(time)}</p>
          </div>
        </nav>

        {/* Main */}
        <main className="scan-main">
          {/* Badge */}
          <div className="scan-badge">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            Corporate Workspace
          </div>

          {/* Heading */}
          <h1 className="scan-heading">
            Welcome to <span>HPS Portal</span>
          </h1>
          <p className="scan-subtext" style={{ marginBottom: settings?.officeAddress ? 12 : 20 }}>
            Harsha Perfect Solutions Management Portal.<br />
            Sign in with your credentials to access your dashboard.
          </p>

          {settings?.officeAddress && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(26,171,219,0.08)",
              border: "1px solid rgba(26,171,219,0.18)",
              color: "#0e8ab5",
              padding: "6px 14px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
              lineHeight: 1.2
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{settings.officeAddress}</span>
            </div>
          )}

          <div className="scan-card-wrap">
            {/* Role tabs */}
            <div className="scan-tabs">
              {[
                {
                  key: "admin",
                  label: "Admin",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  ),
                },
                {
                  key: "employee",
                  label: "Employee",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ),
                },
              ].map((r) => (
                <button
                  key={r.key}
                  className={`scan-tab${role === r.key ? " active" : ""}`}
                  onClick={() => handleRoleSelect(r.key)}
                >
                  {r.icon}
                  {r.label}
                </button>
              ))}
            </div>

            {/* Login form */}
            {role && (
              <div className="scan-form-card">
                <p className="scan-form-hint">
                  {role === "admin"
                    ? "Sign in to access the admin panel"
                    : "Sign in with your Employee ID"}
                </p>

                {error && (
                  <div className="scan-error">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="scan-field">
                    <label className="scan-label">
                      {role === "admin" ? "Username" : "Employee ID"}
                    </label>
                    <input
                      type="text"
                      className="scan-input"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={role === "admin" ? "admin" : "e.g. HPS260037"}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="scan-field">
                    <label className="scan-label">Password</label>
                    <div className="scan-pw-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="scan-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="scan-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {role === "employee" && (
                      <p className="scan-pw-default">Default: hps@1234</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="scan-submit"
                    disabled={loading}
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                </form>
              </div>
            )}

            {!role && (
              <div className="scan-placeholder">
                Select a role above to sign in
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="scan-footer" style={{ padding: "1.5rem 1rem", lineHeight: 1.5 }}>
          <p>© {new Date().getFullYear()} {settings?.officeName || "Harsha Perfect Solutions Pvt. Ltd."} · Internal Use Only</p>
          {settings?.officeAddress && (
            <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{settings.officeAddress}</p>
          )}
        </footer>
      </div>
    </>
  );
}