import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase } from "../lib/apiBase.js";
import { useAuth } from "../context/AuthContext.jsx";

const CLASS_FALLBACK = {
  title: "Розмовна англійська B1",
  teacher: "Sarah Johnson",
  teacherAvatar: "https://i.pravatar.cc/80?img=47",
  meetLink: "https://meet.google.com/",
  startDate: "2026-05-20T18:00:00+03:00",
  endDate: "2026-05-20T19:00:00+03:00",
};

const WEEK_EVENTS = [
  { id: "speak", title: "Speaking B1", day: "Mon", time: "18:00 - 19:00", color: "violet" },
  { id: "listen", title: "Listening", day: "Tue", time: "19:30 - 20:30", color: "green" },
  { id: "grammar", title: "Grammar", day: "Thu", time: "18:00 - 19:00", color: "violet" },
];

const MATERIALS = [
  { id: 1, icon: "PDF", title: "Урок 12 - Speaking.pdf", meta: "PDF • 2.4 MB" },
  { id: 2, icon: "XLSX", title: "Список слів - Unit 8.xlsx", meta: "XLSX • 18 KB" },
  { id: 3, icon: "MP3", title: "Listening Practice Audio.mp3", meta: "MP3 • 4.6 MB" },
];

const HOMEWORK = [
  { id: 1, title: "Домашня робота - Unit 8", due: "Дедлайн: 22 травня, 23:59" },
  { id: 2, title: "Письмове завдання", due: "Дедлайн: 25 травня, 23:59" },
  { id: 3, title: "Тест на словник", due: "Дедлайн: 28 травня, 23:59" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (value) => String(value).padStart(2, "0");

function formatDateHuman(value) {
  const date = new Date(value);
  return date.toLocaleDateString("uk-UA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  });
}

function formatTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${startTime} - ${endTime} (1 год)`;
}

function createGoogleCalendarEventUrl(startDate, endDate, title, teacher, meetLink) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const toGCal = (date) =>
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
      date.getUTCHours()
    )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

  const dates = `${toGCal(start)}/${toGCal(end)}`;
  const text = encodeURIComponent(title);
  const details = encodeURIComponent(`Викладач: ${teacher}\nGoogle Meet: ${meetLink}`);
  const location = encodeURIComponent(meetLink);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

function ClassPage() {
  const { user } = useAuth();
  const apiBase = getApiBase();
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setError("");
        const response = await fetch(`${apiBase}/api/class/next`, { credentials: "include" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Не вдалося завантажити дані заняття.");
        }
        setClassData(payload);
      } catch (err) {
        setError(err.message || "Не вдалося завантажити дані заняття.");
      }
    };
    load();
  }, [apiBase, user]);

  const groupName = classData?.groupName || "Групу ще не призначено";
  const lessonStart = classData?.lesson?.startAt || CLASS_FALLBACK.startDate;
  const lessonEnd = classData?.lesson?.endAt || CLASS_FALLBACK.endDate;
  const lessonTitle = classData?.lesson?.title || CLASS_FALLBACK.title;
  const meetLink = classData?.meetLink || CLASS_FALLBACK.meetLink;

  const handleJoinMeet = async () => {
    try {
      setError("");
      setJoinLoading(true);
      const response = await fetch(`${apiBase}/api/class/meet-link`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Не вдалося підготувати посилання Google Meet.");
      }

      const linkToOpen = payload?.meetLink || meetLink;
      setClassData((prev) => ({
        ...(prev || {}),
        meetLink: linkToOpen,
      }));

      if (linkToOpen) {
        window.open(linkToOpen, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err?.message || "Не вдалося підготувати посилання Google Meet.");
    } finally {
      setJoinLoading(false);
    }
  };

  const eventDate = useMemo(() => formatDateHuman(lessonStart), [lessonStart]);
  const eventTime = useMemo(() => formatTimeRange(lessonStart, lessonEnd), [lessonStart, lessonEnd]);
  const calendarEventUrl = useMemo(
    () => createGoogleCalendarEventUrl(lessonStart, lessonEnd, lessonTitle, CLASS_FALLBACK.teacher, meetLink),
    [lessonStart, lessonEnd, lessonTitle, meetLink]
  );

  const countdown = useMemo(() => {
    const target = new Date(lessonStart).getTime();
    const diff = Math.max(target - now, 0);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return [
      { label: "ДНІ", value: pad(days) },
      { label: "ГОД", value: pad(hours) },
      { label: "ХВ", value: pad(minutes) },
      { label: "СЕК", value: pad(seconds) },
    ];
  }, [lessonStart, now]);

  return (
    <main className="class-page">
      <section className="class-wrap">
        <article className="class-hero-card">
          <div className="class-lesson-info">
            <p className="class-kicker">ГРУПА</p>
            <h1>{groupName}</h1>
            <p className="class-group-line">Наступний урок: {lessonTitle}</p>
            <p>{eventDate}</p>
            <p>{eventTime}</p>
            <div className="class-teacher">
              <img src={CLASS_FALLBACK.teacherAvatar} alt={CLASS_FALLBACK.teacher} />
              <div>
                <span>Викладач</span>
                <strong>{CLASS_FALLBACK.teacher}</strong>
              </div>
            </div>
          </div>

          <div className="class-hero-art" aria-hidden="true">
            <div className="class-ring"></div>
            <div className="class-bubble"></div>
            <div className="class-bubble class-bubble-two"></div>
          </div>

          <div className="class-join-area">
            <p className="class-kicker">ПОЧАТОК ЧЕРЕЗ</p>
            <div className="class-countdown-grid">
              {countdown.map((item) => (
                <div key={item.label} className="class-countdown-cell">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="class-join-box">
              <h3>Готові приєднатися?</h3>
              <p>Поки нікого немає</p>
              <div className="class-note-tip">
                <strong>Gemini може вести нотатки</strong>
                <span>Поділитися нотатками і розшифровкою</span>
              </div>
              <button className="class-meet-btn" type="button" onClick={handleJoinMeet} disabled={joinLoading}>
                {joinLoading ? "Підключаємо..." : "Приєднатися"}
              </button>
              <button className="class-secondary-btn" type="button">
                Інші способи приєднатися
              </button>
            </div>

            <p className="class-link-line">Посилання Meet: {meetLink}</p>
            {error && <p className="form-error">{error}</p>}
          </div>
        </article>

        <section className="class-grid-main">
          <article className="class-card class-card-calendar">
            <div className="class-card-head">
              <h2>Календар</h2>
              <span>Цей тиждень</span>
            </div>
            <div className="class-calendar">
              <div className="class-calendar-days">
                {WEEK_DAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="class-calendar-events">
                {WEEK_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className={`class-event-pill class-${event.color}`}
                    style={{ gridColumn: WEEK_DAYS.indexOf(event.day) + 1 }}
                  >
                    <strong>{event.title}</strong>
                    <span>{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <a className="class-open-gcal" href={calendarEventUrl} target="_blank" rel="noreferrer">
              Відкрити в Google Calendar
            </a>
          </article>
          <article className="class-card class-card-blank"></article>
        </section>

        <section className="class-grid-bottom">
          <article className="class-card">
            <div className="class-card-head">
              <h2>Матеріали</h2>
              <Link to="/blog">Усі</Link>
            </div>
            <ul className="class-list">
              {MATERIALS.map((item) => (
                <li key={item.id}>
                  <span className="class-file-tag">{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
          <article className="class-card">
            <div className="class-card-head">
              <h2>Домашнє завдання</h2>
            </div>
            <ul className="class-list">
              {HOMEWORK.map((item) => (
                <li key={item.id}>
                  <span className="class-home-icon">ЗВ</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.due}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}

export default ClassPage;
