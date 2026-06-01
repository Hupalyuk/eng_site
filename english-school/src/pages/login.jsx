import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBase = getApiBase();

  const readJsonSafe = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: text || `HTTP ${response.status}` };
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError(t("auth.errors.loginRequired"));
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

      const payload = await readJsonSafe(response);
      if (!response.ok) {
        setError(payload?.error || t("auth.errors.loginFailed"));
        return;
      }

      setUser(payload);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="shell" aria-label={t("auth.login")}>
        
        <div className="hero" aria-hidden="true">
          <img
            className="hero-img"
            src={"/images/login/login.png"}
            alt="Hero image"
          />
        </div>

        <div className="card" aria-label={t("auth.login")}>
          <h1>{t("auth.loginTitle")}</h1>

          <div
            className="pill-switch"
            role="tablist"
            aria-label={t("auth.switchAria")}
          >
            <Link
              className="pill is-active"
              role="tab"
              aria-selected="true"
              to="/login"
            >
              {t("auth.login")}
            </Link>

            <Link
              className="pill"
              role="tab"
              aria-selected="false"
              to="/register"
            >
              {t("auth.register")}
            </Link>
          </div>

          <p className="intro">
            {t("auth.loginIntro")}
          </p>

          <form className="form" autoComplete="on" onSubmit={handleSubmit}>
            
            <label className="field">
              <span>{t("common.email")}</span>
              <input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>{t("common.password")}</span>

              <div className="input-with-icon">
                <input
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  className="icon-btn"
                  type="button"
                  aria-label={t("auth.showPassword")}
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
                <span>{t("auth.remember")}</span>
              </label>

              <a className="link" href="#">
                {t("auth.forgot")}
              </a>
            </div>

            <button className="primary" type="submit" disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.login")}
            </button>

            {error && <p className="form-error">{error}</p>}
          </form>
        </div>
      </section>
    </main>
  );
};

export default Login;
