import React, { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../data/courses.js";
import { useAuth } from "../context/AuthContext.jsx";

const DAYS = [
  { id: "mon", label: "Пн" },
  { id: "tue", label: "Вт" },
  { id: "wed", label: "Ср" },
  { id: "thu", label: "Чт" },
  { id: "fri", label: "Пт" },
  { id: "sat", label: "Сб" },
  { id: "sun", label: "Нд" },
];

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

  const course = useMemo(() => getCourseById(courseId), [courseId]);
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

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";

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
        setError("Можна обрати тільки 2 дні.");
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Щоб подати заявку на курс, потрібно увійти в акаунт.");
      return;
    }

    if (!course) {
      setError("Course not found.");
      return;
    }

    if (!fullName.trim()) {
      setError("Вкажіть прізвище та ім'я.");
      return;
    }

    if (!phone.trim()) {
      setError("Вкажіть номер телефону.");
      return;
    }

    if (!email.trim()) {
      setError("Вкажіть Email.");
      return;
    }

    if (days.size !== 2) {
      setError("Оберіть рівно 2 дні занять.");
      return;
    }

    if (times.size !== 1) {
      setError("Оберіть один вільний час.");
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
        throw new Error(payload?.error || "Не вдалося відправити заявку. Спробуйте ще раз.");
      }

      setGroupName(payload?.group?.name || "");
      setDone(true);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err?.message || "Не вдалося відправити заявку. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!course) {
    return (
      <main className="page">
        <section className="blog-feed">
          <div className="blog-feed-header">
            <h2>Курс не знайдено</h2>
            <Link className="btn btn-light" to="/courses">
              До курсів
            </Link>
          </div>
          <p className="post-hint">Спробуйте повернутися на сторінку курсів.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <section className="blog-feed">
          <div className="blog-feed-header">
            <h2>Реєстрація на курс</h2>
            <Link className="btn btn-light" to="/login">
              Увійти
            </Link>
          </div>
          {loading ? (
            <p className="post-hint">Перевіряємо акаунт...</p>
          ) : (
            <p className="post-hint">Щоб подати заявку на курс, потрібно увійти в акаунт.</p>
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
              Курси
            </Link>
            <span aria-hidden="true">/</span>
            <span>{course.title}</span>
          </div>

          <div className="enroll-hero-grid">
            <div>
              <p className="enroll-eyebrow">РЕЄСТРАЦІЯ НА КУРС</p>
              <h1 className="enroll-title">{course.title}</h1>
              <p className="enroll-subtitle">{course.description}</p>

              <div className="enroll-badges" aria-label="Course details">
                <span className="enroll-badge">Тривалість: {course.duration}</span>
                <span className="enroll-badge">Заняття: {course.lessons}</span>
                <span className="enroll-badge">Формат: {course.format}</span>
                <span className="enroll-badge is-strong">{course.price}</span>
              </div>
            </div>

            <div className="enroll-card">
              {done ? (
                <div className="enroll-done">
                  <h2>Заявка відправлена</h2>
                  <p>
                    Ми зв'яжемося з вами найближчим часом, щоб підтвердити деталі.
                    {groupName ? (
                      <>
                        {" "}
                        Ваша група: <strong className="enroll-group-name">{groupName}</strong>.
                      </>
                    ) : null}
                  </p>
                  <div className="enroll-done-actions">
                    <button className="btn btn-accent" type="button" onClick={() => navigate("/courses")}>
                      Повернутися до курсів
                    </button>
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => {
                        setDone(false);
                        setGroupName("");
                        setFullName("");
                        setPhone("");
                        setEmail("");
                        setDays(new Set());
                        setTimes(new Set());
                      }}
                    >
                      Нова заявка
                    </button>
                  </div>
                </div>
              ) : (
                <form className="enroll-form" onSubmit={handleSubmit}>
                  <h2 className="enroll-form-title">Запис на курс</h2>

                  <label className="field" htmlFor={nameId}>
                    <span>Прізвище ім'я</span>
                    <input
                      id={nameId}
                      type="text"
                      placeholder="Напр. Іваненко Іван"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                    />
                  </label>

                  <label className="field" htmlFor={phoneId}>
                    <span>Номер телефону</span>
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
                    <span>Email</span>
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
                    <span className="enroll-label">Оберіть 2 дні (Пн–Нд)</span>
                    <div className="enroll-chips" role="group" aria-label="Days picker">
                      {DAYS.map((day) => (
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
                    <span className="enroll-label">Оберіть 1 вільний час</span>
                    <div className="enroll-chips" role="group" aria-label="Times picker">
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
                    <p className="enroll-help">Час можна обрати лише один — ми підтвердимо запис.</p>
                  </div>

                  {error && <p className="form-error">{error}</p>}

                  <button className="primary" type="submit" disabled={submitting}>
                    {submitting ? "Відправляємо..." : "Надіслати заявку"}
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

