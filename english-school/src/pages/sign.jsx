import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
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
      setError("Name, email, and password are required.");
      return;
    }

    if (isTeacher && documents.length === 0) {
      setError("Upload at least one document for teacher registration.");
      return;
    }

    try {
      setLoading(true);

      let response;
      if (isTeacher) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
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
          body: JSON.stringify({ name, email, password }),
        });
      }

      const payload = await readJsonSafe(response);
      if (!response.ok) {
        setError(payload?.error || "Registration failed.");
        return;
      }

      setUser(payload);
      if (isTeacher) {
        setSuccess("?????? ??????? ????????. ???????? ??????? ??????????????.");
      }
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
      <section className="shell" aria-label="Registration layout">
        <div className="hero" aria-hidden="true">
          <img className="hero-img" src="/images/login/sign.png" alt="Hero image" />
        </div>

        <div className="card" aria-label="Registration form">
          <h1>Welcome to lorem !..</h1>

          <div className="pill-switch" role="tablist" aria-label="Auth switch">
            <Link className="pill" role="tab" aria-selected="false" to="/login">
              Login
            </Link>
            <Link className="pill is-active" role="tab" aria-selected="true" to="/register">
              Register
            </Link>
          </div>

          <p className="intro">Choose account type and complete your registration.</p>

          <form className="form" autoComplete="on" onSubmit={handleSubmit}>
            <label className="field">
              <span>Account type</span>
              <div className="register-select-wrap">
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </label>

            <label className="field">
              <span>Email Address</span>
              <input type="email" placeholder="Enter your Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="field">
              <span>User name</span>
              <input type="text" placeholder="Enter your User name" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <label className="field">
              <span>Password</span>
              <input type="password" placeholder="Enter your Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            {isTeacher && (
              <>
                <div className="field">
                  <span>Documents (pdf, image, doc)</span>
                  <input id="teacher-documents" type="file" multiple className="register-file-input" onChange={(e) => setDocuments(Array.from(e.target.files || []))} />
                  <label htmlFor="teacher-documents" className="register-upload-box">
                    <span className="register-upload-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 15V5M12 5l-4 4M12 5l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 15v1a3 3 0 003 3h8a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="register-upload-copy">
                      <strong>Drop your files here</strong>
                      <span>or click to browse (PNG/JPG/WEBP/PDF)</span>
                    </span>
                  </label>
                </div>
                <ul className="register-doc-rules">
                  <li>Додайте документи, що підтверджують кваліфікацію.</li>
                  <li>До 5 файлів, бажано у форматі PDF/JPG/PNG.</li>
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
              {loading ? "Creating account..." : "Register"}
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
