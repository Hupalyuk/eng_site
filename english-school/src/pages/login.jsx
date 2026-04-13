import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import heroImg from "/D/eng_site/english-school/public/images/login/login.png";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Login failed.");
        return;
      }

      setUser(payload);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="shell" aria-label="Login layout">
        
        <div className="hero" aria-hidden="true">
          <img
            className="hero-img"
            src={heroImg}
            alt="Hero image"
          />
        </div>

        <div className="card" aria-label="????? ??????">
          <h1>Welcome to lorem..!</h1>

          <div
            className="pill-switch"
            role="tablist"
            aria-label="Auth switch"
          >
            <Link
              className="pill is-active"
              role="tab"
              aria-selected="true"
              to="/login"
            >
              Login
            </Link>

            <Link
              className="pill"
              role="tab"
              aria-selected="false"
              to="/register"
            >
              Register
            </Link>
          </div>

          <p className="intro">
            Lorem Ipsum is simply dummy text of the printing and typesetting industry.
          </p>

          <form className="form" autoComplete="on" onSubmit={handleSubmit}>
            
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="Enter your Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>

              <div className="input-with-icon">
                <input
                  type="password"
                  placeholder="Enter your Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  className="icon-btn"
                  type="button"
                  aria-label="Show password"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 5C6.9 5 3.1 8.3 1.5 12c1.6 3.7 5.4 7 10.5 7s8.9-3.3 10.5-7C20.9 8.3 17.1 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    <circle cx="12" cy="12" r="2.1" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="form-row">
              <label className="checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <a className="link" href="#">
                Forgot Password ?
              </a>
            </div>

            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            {error && <p className="form-error">{error}</p>}
          </form>
        </div>
      </section>
    </main>
  );
};

export default Login;
