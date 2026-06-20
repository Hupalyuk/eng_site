import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_INVALID_MESSAGE = "Enter a full email address, for example name@gmail.com.";

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { t } = useTranslation();
  const [formType, setFormType] = useState("student");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBase = getApiBase();
  const isTeacher = useMemo(() => formType === "teacher", [formType]);

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
    setSuccess("");

    if (!name || !email || !password) {
      setError(t("auth.errors.registerRequired"));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(t("auth.errors.emailInvalid", { defaultValue: EMAIL_INVALID_MESSAGE }));
      return;
    }

    if (isTeacher && documents.length === 0) {
      setError(t("auth.errors.docsRequired"));
      return;
    }

    try {
      setLoading(true);

      let response;
      if (isTeacher) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", normalizedEmail);
        formData.append("password", password);
        documents.forEach((file) => formData.append("documents", file));

        response = await fetch(`${apiBase}/api/auth/register-teacher`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      } else {
        response = await fetch(`${apiBase}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email: normalizedEmail, password }),
        });
      }

      const payload = await readJsonSafe(response);
      if (!response.ok) {
        setError(payload?.error || t("auth.errors.registerFailed"));
        return;
      }

      setUser(payload);
      if (isTeacher) {
        setSuccess(t("auth.teacherSuccess"));
      }
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
      <section className="shell" aria-label={t("auth.register")}>
        <div className="hero" aria-hidden="true">
          <img className="hero-img" src="/images/login/sign.png" alt="Hero image" />
        </div>

        <div className="card" aria-label={t("auth.register")}>
          <h1>{t("auth.registerTitle")}</h1>

          <div className="pill-switch" role="tablist" aria-label={t("auth.switchAria")}>
            <Link className="pill" role="tab" aria-selected="false" to="/login">
              {t("auth.login")}
            </Link>
            <Link className="pill is-active" role="tab" aria-selected="true" to="/register">
              {t("auth.register")}
            </Link>
          </div>

          <p className="intro">{t("auth.registerIntro")}</p>

          <form className="form" autoComplete="on" onSubmit={handleSubmit}>
            <label className="field">
              <span>{t("auth.accountType")}</span>
              <div className="register-select-wrap">
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="student">{t("auth.student")}</option>
                  <option value="teacher">{t("auth.teacher")}</option>
                </select>
              </div>
            </label>

            <label className="field">
              <span>{t("auth.emailAddress")}</span>
              <input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                title={t("auth.errors.emailInvalid", { defaultValue: EMAIL_INVALID_MESSAGE })}
                required
              />
            </label>

            <label className="field">
              <span>{t("auth.username")}</span>
              <input type="text" placeholder={t("auth.usernamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label className="field">
              <span>{t("common.password")}</span>
              <input type="password" placeholder={t("auth.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            {isTeacher && (
              <>
                <div className="field">
                  <span>{t("auth.docs")}</span>
                  <input id="teacher-documents" type="file" multiple className="register-file-input" onChange={(e) => setDocuments(Array.from(e.target.files || []))} />
                  <label htmlFor="teacher-documents" className="register-upload-box">
                    <span className="register-upload-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 15V5M12 5l-4 4M12 5l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 15v1a3 3 0 003 3h8a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="register-upload-copy">
                      <strong>{t("auth.dropFiles")}</strong>
                      <span>{t("auth.browseFiles")}</span>
                    </span>
                  </label>
                </div>
                <ul className="register-doc-rules">
                  <li>{t("auth.docRule1")}</li>
                  <li>{t("auth.docRule2")}</li>
                </ul>
                {documents.length > 0 && (
                  <ul className="register-doc-list">
                    {documents.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        <strong>{file.name}</strong>
                        <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <button className="primary" type="submit" disabled={loading}>
              {loading ? t("auth.creating") : t("auth.register")}
            </button>

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
          </form>
        </div>
      </section>
    </main>
  );
};

export default Register;
