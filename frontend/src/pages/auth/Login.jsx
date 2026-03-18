import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem("blackrock_email");
    const savedRemember = localStorage.getItem("blackrock_remember") === "true";

    if (savedRemember && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (rememberMe) {
      localStorage.setItem("blackrock_email", email);
      localStorage.setItem("blackrock_remember", "true");
    } else {
      localStorage.removeItem("blackrock_email");
      localStorage.removeItem("blackrock_remember");
    }

    try {
      const result = await login(email.trim(), password.trim());

      if (result.success) {
        const role = result.role;

        if (role === "admin") navigate("/admin");
        else if (role === "manager") navigate("/manager");
        else navigate("/employee");
      } else {
        setError(result.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="blackrock-login">
      {/* Background Pattern */}
      <div className="grid-pattern"></div>
      <div className="glow-orb orb1"></div>
      <div className="glow-orb orb2"></div>

      <div className="login-container">
        {/* Left Panel - Brand */}
        <div className="brand-panel">
          <div className="brand-content">
            <div className="logo">
              <span className="logo-bracket">[</span>
              <span className="logo-text">HRMS</span>
              <span className="logo-bracket">]</span>
            </div>

            <h1 className="brand-title">Enterprise Platform</h1>
            <p className="brand-subtitle">
              Institutional-grade workforce management
            </p>

          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="form-panel">
          <div className="form-card">
            <div className="form-header">
              <h2>Access Platform</h2>
              <p>Secure authentication required</p>
            </div>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this device</span>
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Reset credentials
                </Link>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <LogIn size={18} />
                    Authenticate
                  </>
                )}
              </button>
            </form>

            <div className="security-badge">
              <div className="badge-item">
                <span className="badge-dot"></span>
                <span>256-bit encryption</span>
              </div>
              <div className="badge-item">
                <span className="badge-dot"></span>
                <span>SOC2 Type II</span>
              </div>
              <div className="badge-item">
                <span className="badge-dot"></span>
                <span>GDPR compliant</span>
              </div>
            </div>

            <div className="demo-credentials">
              <p className="demo-label">Test credentials</p>
              <div className="credential-grid">
                <div className="cred-row">
                  <span className="cred-role">Admin</span>
                  <code>admin@gmail.com</code>
                </div>
                <div className="cred-row">
                  <span className="cred-role">Manager</span>
                  <code>manager@gmail.com</code>
                </div>
                <div className="cred-row">
                  <span className="cred-role">Employee</span>
                  <code>employee@gmail.com</code>
                </div>
              </div>
              <p className="password-note">Password: Test@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
