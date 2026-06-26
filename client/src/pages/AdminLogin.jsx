import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BASE_URL from "../config";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        const role = data.role || (data.name === "Manager" ? "manager" : "admin");

        localStorage.setItem("adminAuth", "true");
        localStorage.setItem("adminName", data.name);
        localStorage.setItem("role", role);
        localStorage.setItem("adminToken", data.token);

        if (data.empId) {
          try {
            const empRes = await fetch(`${BASE_URL}/api/employees/${data.empId}`);
            if (empRes.ok) {
              const empData = await empRes.json();
              localStorage.setItem("employeeAuth", JSON.stringify(empData));
            }
          } catch (e) {
            console.error("Failed to pre-fetch employee details", e);
          }
        }

        navigate("/admin/dashboard");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f0f4f8 0%, #e8f0f7 50%, #f0f4f8 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif"
      }}>

      {/* Subtle dot grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, #1AABDB18 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      {/* Blue glow top */}
      <div style={{
        position: "absolute", top: "-150px", right: "-100px",
        width: "400px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(26,171,219,0.1) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/hps_new_logo.png" alt="HPS" style={{ height: "48px", display: "block", marginBottom: "16px" }} />
          <div className="px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{ background: "rgba(26,171,219,0.08)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.2)" }}>
            Admin Portal
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(26,171,219,0.12)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8)"
        }}>
          <p className="text-sm text-center mb-6" style={{ color: "#94A3B8" }}>
            Sign in to access the admin panel
          </p>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4"
              style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "#475569" }}>
                Username
              </label>
              <input type="text" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin" required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                onFocus={(e) => { e.target.style.border = "1px solid #1AABDB"; e.target.style.background = "rgba(26,171,219,0.03)" }}
                onBlur={(e) => { e.target.style.border = "1px solid #E2E8F0"; e.target.style.background = "#F8FAFC" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "#475569" }}>
                Password
              </label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pr-11"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#0F172A" }}
                  onFocus={(e) => { e.target.style.border = "1px solid #1AABDB"; e.target.style.background = "rgba(26,171,219,0.03)" }}
                  onBlur={(e) => { e.target.style.border = "1px solid #E2E8F0"; e.target.style.background = "#F8FAFC" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1 transition-all duration-200"
              style={{
                background: loading ? "rgba(26,171,219,0.5)" : "#1AABDB",
                boxShadow: loading ? "none" : "0 4px 16px rgba(26,171,219,0.3)"
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = "#0e8ab5"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(26,171,219,0.4)"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = "#1AABDB"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,171,219,0.3)"; } }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="flex justify-center mt-6">
          <Link to="/" className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1AABDB")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}