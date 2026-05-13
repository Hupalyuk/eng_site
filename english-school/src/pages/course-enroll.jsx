import React, { useId, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../data/courses.js";

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

function CourseEnroll() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const course = useMemo(() => getCourseById(courseId), [courseId]);

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

  const toggleSetValue = (setter) => (value) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleDay = toggleSetValue(setDays);
  const toggleTime = toggleSetValue(setTimes);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

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

    if (days.size === 0) {
      setError("Оберіть дні занять.");
      return;
    }

    if (times.size === 0) {
      setError("Оберіть зручний час.");
      return;
    }

    try {
      setSubmitting(true);

      // No backend endpoint yet — simulate success.
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDone(true);
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
                  <p>Ми зв'яжемося з вами найближчим часом, щоб підтвердити деталі.</p>
                  <div className="enroll-done-actions">
                    <button className="btn btn-accent" type="button" onClick={() => navigate("/courses")}>
                      Повернутися до курсів
                    </button>
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => {
                        setDone(false);
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
                    <span className="enroll-label">Оберіть дні (Пн–Нд)</span>
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
                    <span className="enroll-label">Вільні часи</span>
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
                    <p className="enroll-help">Можна обрати кілька варіантів — ми підтвердимо найкращий.</p>
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
