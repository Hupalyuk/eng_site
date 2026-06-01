import React, { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCourseById } from "../data/courses.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";

const DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIMES = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];

const normalizePhone = (value) => value.replace(/[^\d+]/g, "").slice(0, 16);

function loadDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function CourseEnroll() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user, loading } = useAuth();
  const { t, i18n } = useTranslation();

  const course = useMemo(() => getCourseById(courseId, t), [courseId, t, i18n.language]);
  const daysOptions = useMemo(
    () => DAY_IDS.map((id) => ({ id, label: t(`enroll.days.${id}`) })),
    [t, i18n.language]
  );
  const storageKey = useMemo(() => `enrollDraft:${courseId || ""}`, [courseId]);

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(() => new Set());
  const [times, setTimes] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [groupName, setGroupName] = useState("");

  const apiBase = getApiBase();

  useEffect(() => {
    const draft = loadDraft(storageKey);
    if (!draft) return;

    if (typeof draft.fullName === "string") setFullName(draft.fullName);
    if (typeof draft.phone === "string") setPhone(draft.phone);
    if (typeof draft.email === "string") setEmail(draft.email);
    if (Array.isArray(draft.days)) setDays(new Set(draft.days.slice(0, 2)));
    if (Array.isArray(draft.times)) setTimes(new Set(draft.times.slice(0, 1)));
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          fullName,
          phone,
          email,
          days: Array.from(days),
          times: Array.from(times),
        })
      );
    } catch {
      // ignore
    }
  }, [storageKey, fullName, phone, email, days, times]);

  const toggleDay = (dayId) => {
    setError("");
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
        return next;
      }
      if (next.size >= 2) {
        setError(t("enroll.errors.maxDays"));
        return prev;
      }
      next.add(dayId);
      return next;
    });
  };

  const toggleTime = (timeValue) => {
    setError("");
    setTimes((prev) => {
      if (prev.has(timeValue)) return new Set();
      return new Set([timeValue]);
    });
  };

  const resetForm = () => {
    setDone(false);
    setGroupName("");
    setFullName("");
    setPhone("");
    setEmail("");
    setDays(new Set());
    setTimes(new Set());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t("enroll.errors.loginRequired"));
      return;
    }

    if (!course) {
      setError(t("enroll.errors.notFound"));
      return;
    }

    if (!fullName.trim()) {
      setError(t("enroll.errors.fullName"));
      return;
    }

    if (!phone.trim()) {
      setError(t("enroll.errors.phone"));
      return;
    }

    if (!email.trim()) {
      setError(t("enroll.errors.email"));
      return;
    }

    if (days.size !== 2) {
      setError(t("enroll.errors.days"));
      return;
    }

    if (times.size !== 1) {
      setError(t("enroll.errors.time"));
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${apiBase}/api/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          courseId: course.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          days: Array.from(days),
          times: Array.from(times),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || t("enroll.errors.submit"));
      }

      setGroupName(payload?.group?.name || "");
      setDone(true);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err?.message || t("enroll.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!course) {
    return (
      <main className="page">
        <section className="blog-feed">
          <div className="blog-feed-header">
            <h2>{t("enroll.notFoundTitle")}</h2>
            <Link className="btn btn-light" to="/courses">
              {t("enroll.backToCourses")}
            </Link>
          </div>
          <p className="post-hint">{t("enroll.notFoundHint")}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <section className="blog-feed">
          <div className="blog-feed-header">
            <h2>{t("enroll.title")}</h2>
            <Link className="btn btn-light" to="/login">
              {t("enroll.login")}
            </Link>
          </div>
          {loading ? (
            <p className="post-hint">{t("enroll.checking")}</p>
          ) : (
            <p className="post-hint">{t("enroll.errors.loginRequired")}</p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="enroll-page">
      <section className="enroll-hero">
        <div className="enroll-hero-inner">
          <div className="enroll-breadcrumbs">
            <Link className="enroll-link" to="/courses">
              {t("enroll.courses")}
            </Link>
            <span aria-hidden="true">/</span>
            <span>{course.title}</span>
          </div>

          <div className="enroll-hero-grid">
            <div>
              <p className="enroll-eyebrow">{t("enroll.eyebrow")}</p>
              <h1 className="enroll-title">{course.title}</h1>
              <p className="enroll-subtitle">{course.description}</p>

              <div className="enroll-badges" aria-label={t("enroll.detailsAria")}>
                <span className="enroll-badge">{t("enroll.duration", { value: course.duration })}</span>
                <span className="enroll-badge">{t("enroll.lessons", { value: course.lessons })}</span>
                <span className="enroll-badge">{t("enroll.format", { value: course.format })}</span>
                <span className="enroll-badge is-strong">{course.price}</span>
              </div>
            </div>

            <div className="enroll-card">
              {done ? (
                <div className="enroll-done">
                  <h2>{t("enroll.doneTitle")}</h2>
                  <p>
                    {t("enroll.doneText")}
                    {groupName ? (
                      <>
                        {" "}
                        <strong className="enroll-group-name">
                          {t("enroll.group", { group: groupName })}
                        </strong>
                      </>
                    ) : null}
                  </p>
                  <div className="enroll-done-actions">
                    <button className="btn btn-accent" type="button" onClick={() => navigate("/courses")}>
                      {t("enroll.return")}
                    </button>
                    <button className="btn btn-outline" type="button" onClick={resetForm}>
                      {t("enroll.newRequest")}
                    </button>
                  </div>
                </div>
              ) : (
                <form className="enroll-form" onSubmit={handleSubmit}>
                  <h2 className="enroll-form-title">{t("enroll.formTitle")}</h2>

                  <label className="field" htmlFor={nameId}>
                    <span>{t("enroll.fullName")}</span>
                    <input
                      id={nameId}
                      type="text"
                      placeholder={t("enroll.fullNamePlaceholder")}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                    />
                  </label>

                  <label className="field" htmlFor={phoneId}>
                    <span>{t("enroll.phone")}</span>
                    <input
                      id={phoneId}
                      type="tel"
                      placeholder="+380..."
                      value={phone}
                      onChange={(event) => setPhone(normalizePhone(event.target.value))}
                      required
                    />
                  </label>

                  <label className="field" htmlFor={emailId}>
                    <span>{t("common.email")}</span>
                    <input
                      id={emailId}
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>

                  <div className="enroll-picker">
                    <span className="enroll-label">{t("enroll.chooseDays")}</span>
                    <div className="enroll-chips" role="group" aria-label={t("enroll.daysAria")}>
                      {daysOptions.map((day) => (
                        <button
                          key={day.id}
                          className={`enroll-chip${days.has(day.id) ? " is-active" : ""}`}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="enroll-picker">
                    <span className="enroll-label">{t("enroll.chooseTime")}</span>
                    <div className="enroll-chips" role="group" aria-label={t("enroll.timesAria")}>
                      {TIMES.map((time) => (
                        <button
                          key={time}
                          className={`enroll-chip enroll-chip-time${times.has(time) ? " is-active" : ""}`}
                          type="button"
                          onClick={() => toggleTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <p className="enroll-help">{t("enroll.timeHelp")}</p>
                  </div>

                  {error && <p className="form-error">{error}</p>}

                  <button className="primary" type="submit" disabled={submitting}>
                    {submitting ? t("enroll.sending") : t("enroll.submit")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CourseEnroll;
