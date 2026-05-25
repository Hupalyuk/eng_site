import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase } from "../lib/apiBase.js";
import { useAuth } from "../context/AuthContext.jsx";

const CLASS_FALLBACK = {
  title: "",
  teacher: "Sarah Johnson",
  teacherAvatar: "https://i.pravatar.cc/80?img=47",
  meetLink: "https://meet.google.com/",
  startDate: "2026-05-20T18:00:00+03:00",
  endDate: "2026-05-20T19:00:00+03:00",
};


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

// function createGoogleCalendarEventUrl(startDate, endDate, title, teacher, meetLink) {
//   const start = new Date(startDate);
//   const end = new Date(endDate);

//   const toGCal = (date) =>
//     `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
//       date.getUTCHours()
//     )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

//   const dates = `${toGCal(start)}/${toGCal(end)}`;
//   const text = encodeURIComponent(title);
//   const details = encodeURIComponent(`Викладач: ${teacher}\nGoogle Meet: ${meetLink}`);
//   const location = encodeURIComponent(meetLink);
//   return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
// }

function toDateTimeLocalValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toLocalDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeEventTitle(value, fallback = "Speaking lesson") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const cleaned = raw.replace(/[?\s]+/g, "");
  if (!cleaned) return fallback;
  return raw;
}

function buildMonthMatrix(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function ClassPage() {
  const { user } = useAuth();
  const apiBase = getApiBase();
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [meetInput, setMeetInput] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [customEvents, setCustomEvents] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    meetLink: "",
    startAt: "",
    endAt: "",
  });
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFile, setMaterialFile] = useState(null);
  const [materialUploading, setMaterialUploading] = useState(false);
  const [materialDragOver, setMaterialDragOver] = useState(false);
  const materialFileInputRef = useRef(null);
  const [homeworks, setHomeworks] = useState([]);
  const [homeworksLoading, setHomeworksLoading] = useState(false);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkDue, setHomeworkDue] = useState("");
  const [homeworkFile, setHomeworkFile] = useState(null);
  const [homeworkUploading, setHomeworkUploading] = useState(false);
  const [homeworkDragOver, setHomeworkDragOver] = useState(false);
  const homeworkFileInputRef = useRef(null);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadGroups = async () => {
      try {
        const response = await fetch(`${apiBase}/api/class/groups`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const list = Array.isArray(payload?.groups) ? payload.groups : [];
        setTeacherGroups(list);
        if (!selectedGroupId && list.length > 0) {
          setSelectedGroupId(String(list[0].id));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadGroups();
  }, [apiBase, user, selectedGroupId]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setError("");
        const groupQuery = isTeacher && selectedGroupId ? `?groupId=${encodeURIComponent(selectedGroupId)}` : "";
        const response = await fetch(`${apiBase}/api/class/next${groupQuery}`, { credentials: "include" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Не вдалося завантажити дані заняття.");
        }
        setClassData(payload);
        setMeetInput(payload?.meetLink && payload.meetLink !== "https://meet.google.com/" ? payload.meetLink : "");
      } catch (err) {
        setError(err.message || "Не вдалося завантажити дані заняття.");
      }
    };
    load();
  }, [apiBase, user, isTeacher, selectedGroupId]);

  useEffect(() => {
    if (!user) return;
    const loadHomeworks = async () => {
      try {
        setHomeworksLoading(true);
        const response = await fetch(`${apiBase}/api/class/homeworks`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Не вдалося завантажити домашні завдання.");
        setHomeworks(Array.isArray(payload?.homeworks) ? payload.homeworks : []);
      } catch (err) {
        setError((prev) => prev || err?.message || "Не вдалося завантажити домашні завдання.");
      } finally {
        setHomeworksLoading(false);
      }
    };
    loadHomeworks();
  }, [apiBase, user]);

  useEffect(() => {
    if (!user) return;
    const loadMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const response = await fetch(`${apiBase}/api/class/materials`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Не вдалося завантажити матеріали.");
        setMaterials(Array.isArray(payload?.materials) ? payload.materials : []);
      } catch (err) {
        setError((prev) => prev || err?.message || "Не вдалося завантажити матеріали.");
      } finally {
        setMaterialsLoading(false);
      }
    };
    loadMaterials();
  }, [apiBase, user]);

  useEffect(() => {
    if (!user) return;
    const loadGoogleStatus = async () => {
      try {
        const response = await fetch(`${apiBase}/api/google/status`, { credentials: "include" });
        if (!response.ok) return;
        const payload = await response.json();
        setGoogleConnected(Boolean(payload?.connected));
      } catch (err) {
        console.error(err);
      }
    };
    loadGoogleStatus();
  }, [apiBase, user]);

  useEffect(() => {
    if (!user || !googleConnected) return;
    const loadCalendar = async () => {
      try {
        setCalendarLoading(true);
        const response = await fetch(`${apiBase}/api/class/calendar`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (payload?.needsGoogleConnect) setGoogleConnected(false);
          throw new Error(payload?.error || "Не вдалося завантажити календар.");
        }
        setCalendarEvents(Array.isArray(payload?.events) ? payload.events : []);
      } catch (err) {
        setError((prev) => prev || err.message || "Не вдалося завантажити календар.");
      } finally {
        setCalendarLoading(false);
      }
    };
    loadCalendar();
  }, [apiBase, googleConnected, user]);

  useEffect(() => {
    if (!user) return;
    const loadCustomEvents = async () => {
      try {
        const response = await fetch(`${apiBase}/api/class/events`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load local events.");
        }
        setCustomEvents(Array.isArray(payload?.events) ? payload.events : []);
      } catch (err) {
        setError((prev) => prev || err.message || "Failed to load local events.");
      }
    };
    loadCustomEvents();
  }, [apiBase, user]);

  const groupName = classData?.groupName || "Групу ще не призначено";
  const lessonStart = classData?.lesson?.startAt || CLASS_FALLBACK.startDate;
  const lessonEnd = classData?.lesson?.endAt || CLASS_FALLBACK.endDate;
  const lessonTitle = classData?.lesson?.title || CLASS_FALLBACK.title;
  const meetLink = classData?.meetLink || CLASS_FALLBACK.meetLink;
  const hasRealMeetLink = Boolean(meetLink && meetLink.startsWith("https://meet.google.com/") && meetLink.length > 24);

  const handleJoinMeet = () => {
    if (!hasRealMeetLink) {
      setError("Викладач ще не додав посилання на Google Meet.");
      return;
    }
    window.open(meetLink, "_blank", "noopener,noreferrer");
  };

  const handleSaveMeetLink = async () => {
    try {
      setError("");
      setSaveLoading(true);
      const response = await fetch(`${apiBase}/api/class/meet-link`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meetLink: meetInput, groupName, groupId: selectedGroupId ? Number(selectedGroupId) : undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Не вдалося зберегти посилання Google Meet.");

      setClassData((prev) => ({
        ...(prev || {}),
        meetLink: payload.meetLink,
        groupName: payload.groupName || groupName,
      }));
    } catch (err) {
      setError(err?.message || "Не вдалося зберегти посилання Google Meet.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      const response = await fetch(`${apiBase}/api/google/connect`, { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Не вдалося підключити Google Calendar.");
      window.location.href = payload.url;
    } catch (err) {
      setError(err?.message || "Не вдалося підключити Google Calendar.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEventInput = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const reloadCustomEvents = async () => {
    const response = await fetch(`${apiBase}/api/class/events`, { credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to refresh local events.");
    }
    setCustomEvents(Array.isArray(payload?.events) ? payload.events : []);
  };

  const handleCreateEvent = async ({ syncAndOpen = false } = {}) => {
    try {
      setError("");
      setCreateLoading(true);
      const response = await fetch(`${apiBase}/api/class/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: normalizeEventTitle(eventForm.title, normalizeEventTitle(lessonTitle)),
          description: eventForm.description,
          location: eventForm.location,
          meetLink: eventForm.meetLink,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : "",
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create event.");
      }

      const createdEvent = payload.event;
      setCustomEvents((prev) => [...prev, createdEvent].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));

      if (syncAndOpen) {
        if (!googleConnected) {
          throw new Error("Спочатку підключіть Google Calendar.");
        }

        const syncResponse = await fetch(`${apiBase}/api/class/events/${createdEvent.id}/sync`, {
          method: "POST",
          credentials: "include",
        });
        const syncPayload = await syncResponse.json().catch(() => ({}));
        if (!syncResponse.ok) {
          if (syncPayload?.needsGoogleConnect) setGoogleConnected(false);
          throw new Error(syncPayload?.error || "Failed to sync event.");
        }

        await reloadCustomEvents();
        const openLink = syncPayload?.htmlLink || "https://calendar.google.com/";
        window.open(openLink, "_blank", "noopener,noreferrer");
      }

      setEventForm({
        title: "",
        description: "",
        location: "",
        meetLink: meetLink && meetLink.startsWith("https://meet.google.com/") ? meetLink : "",
        startAt: "",
        endAt: "",
      });
    } catch (err) {
      setError(err?.message || "Failed to create event.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenDayModal = (dateObj) => {
    if (!dateObj) return;
    const start = new Date(dateObj);
    start.setHours(18, 0, 0, 0);
    const end = new Date(dateObj);
    end.setHours(19, 0, 0, 0);
    setSelectedDay(dateObj);
    setEventForm((prev) => ({
      ...prev,
      startAt: toDateTimeLocalValue(start.toISOString()),
      endAt: toDateTimeLocalValue(end.toISOString()),
    }));
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setError("");
      const response = await fetch(`${apiBase}/api/class/events/${eventId}?deleteGoogle=true`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.needsGoogleConnect) setGoogleConnected(false);
        throw new Error(payload?.error || "Не вдалося видалити подію.");
      }

      setCustomEvents((prev) => prev.filter((item) => Number(item.id) !== Number(eventId)));
      if (googleConnected) {
        const calResponse = await fetch(`${apiBase}/api/class/calendar`, { credentials: "include" });
        const calPayload = await calResponse.json().catch(() => ({}));
        if (calResponse.ok) {
          setCalendarEvents(Array.isArray(calPayload?.events) ? calPayload.events : []);
        }
      }
    } catch (err) {
      setError(err?.message || "Не вдалося видалити подію.");
    }
  };

  const handleUploadMaterial = async () => {
    try {
      setError("");
      if (!materialTitle.trim()) throw new Error("Вкажіть назву матеріалу.");
      if (!materialFile) throw new Error("Оберіть файл.");

      setMaterialUploading(true);
      const form = new FormData();
      form.append("title", materialTitle.trim());
      form.append("file", materialFile);

      const response = await fetch(`${apiBase}/api/class/materials`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Не вдалося завантажити файл.");

      setMaterials((prev) => [payload.material, ...prev]);
      setMaterialTitle("");
      setMaterialFile(null);
    } catch (err) {
      setError(err?.message || "Не вдалося завантажити файл.");
    } finally {
      setMaterialUploading(false);
    }
  };

  const handleMaterialFileChange = (file) => {
    setMaterialFile(file || null);
  };

  const handleDeleteMaterial = async (materialId) => {
    try {
      setError("");
      const response = await fetch(`${apiBase}/api/class/materials/${materialId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Не вдалося видалити матеріал.");
      setMaterials((prev) => prev.filter((item) => Number(item.id) !== Number(materialId)));
    } catch (err) {
      setError(err?.message || "Не вдалося видалити матеріал.");
    }
  };

  const handleHomeworkFileChange = (file) => {
    setHomeworkFile(file || null);
  };

  const handleUploadHomework = async () => {
    try {
      setError("");
      if (!homeworkTitle.trim()) throw new Error("Вкажіть назву домашнього завдання.");
      if (!homeworkFile) throw new Error("Оберіть файл домашнього завдання.");

      setHomeworkUploading(true);
      const form = new FormData();
      form.append("title", homeworkTitle.trim());
      form.append("dueText", homeworkDue.trim());
      form.append("file", homeworkFile);

      const response = await fetch(`${apiBase}/api/class/homeworks`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Не вдалося завантажити домашнє завдання.");

      setHomeworks((prev) => [payload.homework, ...prev]);
      setHomeworkTitle("");
      setHomeworkDue("");
      setHomeworkFile(null);
    } catch (err) {
      setError(err?.message || "Не вдалося завантажити домашнє завдання.");
    } finally {
      setHomeworkUploading(false);
    }
  };

  const handleDeleteHomework = async (homeworkId) => {
    try {
      setError("");
      const response = await fetch(`${apiBase}/api/class/homeworks/${homeworkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Не вдалося видалити домашнє завдання.");
      setHomeworks((prev) => prev.filter((item) => Number(item.id) !== Number(homeworkId)));
    } catch (err) {
      setError(err?.message || "Не вдалося видалити домашнє завдання.");
    }
  };

  const eventDate = useMemo(() => formatDateHuman(lessonStart), [lessonStart]);
  const eventTime = useMemo(() => formatTimeRange(lessonStart, lessonEnd), [lessonStart, lessonEnd]);
  // const calendarEventUrl = useMemo(
  //   () => createGoogleCalendarEventUrl(lessonStart, lessonEnd, lessonTitle, CLASS_FALLBACK.teacher, meetLink),
  //   [lessonStart, lessonEnd, lessonTitle, meetLink]
  // );

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

  const monthName = useMemo(
    () => calendarMonth.toLocaleDateString("uk-UA", { month: "long", year: "numeric" }),
    [calendarMonth]
  );
  const monthWeeks = useMemo(() => buildMonthMatrix(calendarMonth), [calendarMonth]);
  const localEventsByDay = useMemo(() => {
    const map = new Map();
    customEvents.forEach((event) => {
      if (!event?.startAt) return;
      const dayKey = toLocalDayKey(event.startAt);
      map.set(dayKey, (map.get(dayKey) || 0) + 1);
    });
    return map;
  }, [customEvents]);
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = toLocalDayKey(selectedDay);
    return customEvents.filter((event) => toLocalDayKey(event.startAt) === key);
  }, [customEvents, selectedDay]);
  const materialsByDay = useMemo(() => {
    const groups = new Map();
    materials.forEach((item) => {
      const key = toLocalDayKey(item.createdAt);
      const label = new Date(item.createdAt).toLocaleDateString("uk-UA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups.has(key)) groups.set(key, { label, items: [] });
      groups.get(key).items.push(item);
    });
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([, value]) => value);
  }, [materials]);

  useEffect(() => {
    setEventForm((prev) => {
      if (prev.startAt || prev.endAt || prev.title) return prev;
      const startLocal = toDateTimeLocalValue(lessonStart);
      const endLocal = toDateTimeLocalValue(lessonEnd);
      return {
        ...prev,
        title: normalizeEventTitle(lessonTitle),
        meetLink: meetLink && meetLink.startsWith("https://meet.google.com/") ? meetLink : "",
        startAt: startLocal,
        endAt: endLocal,
      };
    });
  }, [lessonStart, lessonEnd, lessonTitle, meetLink]);

  return (
    <main className="class-page">
      <section className="class-wrap">
        <article className="class-hero-card">
          <div className="class-lesson-info">
            <p className="class-kicker">ГРУПА</p>
            <h1>{groupName}</h1>
            {isTeacher && teacherGroups.length > 0 && (
              <div className="class-meet-editor">
                <label htmlFor="teacher-group-select">Група викладача</label>
                <select
                  id="teacher-group-select"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {teacherGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.courseCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
            <img src="/images/class/headphone.png" alt="headphone" />
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
              {isTeacher && (
                <div className="class-meet-editor">
                  <label htmlFor="meet-link-input">Посилання Google Meet для групи</label>
                  <input
                    id="meet-link-input"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetInput}
                    onChange={(event) => setMeetInput(event.target.value)}
                  />
                  <button className="class-secondary-btn" type="button" onClick={handleSaveMeetLink} disabled={saveLoading}>
                    {saveLoading ? "Зберігаємо..." : "Зберегти посилання"}
                  </button>
                </div>
              )}
              <button className="class-meet-btn" type="button" onClick={handleJoinMeet}>
                Приєднатися
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
            </div>
            <div className="class-calendar-actions">
              <a className="class-open-gcal" href="https://calendar.google.com/" target="_blank" rel="noreferrer">
                Відкрити Google Calendar
              </a>
            </div>

            <div className="class-month-calendar">
              <div className="class-month-head">
                <button type="button" className="class-secondary-btn" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                  ‹
                </button>
                <strong>{monthName}</strong>
                <button type="button" className="class-secondary-btn" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                  ›
                </button>
              </div>
              <div className="class-month-grid class-month-grid-head">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {monthWeeks.map((week, idx) => (
                <div key={idx} className="class-month-grid">
                  {week.map((day, dIdx) => {
                    if (!day) return <span key={`${idx}-${dIdx}`} className="class-day-empty"></span>;
                    const key = toLocalDayKey(day);
                    const count = localEventsByDay.get(key) || 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`class-day-btn ${count > 0 ? "class-day-has-event" : ""}`}
                        onClick={() => handleOpenDayModal(day)}
                      >
                        <span>{day.getDate()}</span>
                        {count > 0 ? (
                          <>
                            <i className="class-day-dot" aria-hidden="true"></i>
                            <small>{count}</small>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="class-calendar-oauth">
              {!googleConnected ? (
                <button type="button" className="class-secondary-btn" onClick={handleConnectGoogleCalendar} disabled={googleLoading}>
                  {googleLoading ? "Підключаємо..." : "Підключити Google Calendar"}
                </button>
              ) : (
                <p className="class-link-line">Google Calendar підключено</p>
              )}
            </div>
          </article>
          <article className="class-card class-card-blank">
            <div className="class-card-head">
              <span>Google Calendar</span>
            </div>
            {!googleConnected ? (
              <p>?????????? Google Calendar, ??? ?????? ?????.</p>
            ) : (
              <div className="class-events-list class-events-scroll">
                {calendarLoading ? (
                  <p>????????????...</p>
                ) : calendarEvents.length === 0 ? (
                  <p></p>
                ) : (
                  <ul className="class-list">
                    {calendarEvents.map((event) => (
                      <li key={event.id}>
                        <span className="class-home-icon">GC</span>
                        <div>
                          <strong>{event.title}</strong>
                          <p>
                            {event.startAt ? new Date(event.startAt).toLocaleString("uk-UA") : "??? ?? ???????"}
                            {event.meetLink ? ` � Meet: ${event.meetLink}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </article>
        </section>

        <section className="class-grid-bottom">
          <article className="class-card">
            <div className="class-card-head">
              <h2>Матеріали</h2>
              <Link to="/blog">Усі</Link>
            </div>
            {isTeacher && (
              <div className="class-meet-editor">
                <label htmlFor="material-title">Назва файлу</label>
                <input id="material-title" type="text" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                <label htmlFor="material-file">Файл</label>
                <input
                  ref={materialFileInputRef}
                  id="material-file"
                  type="file"
                  className="class-file-hidden"
                  onChange={(e) => handleMaterialFileChange(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className={`class-upload-dropzone ${materialDragOver ? "is-dragover" : ""}`}
                  onClick={() => materialFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setMaterialDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setMaterialDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setMaterialDragOver(false);
                    handleMaterialFileChange(e.dataTransfer?.files?.[0] || null);
                  }}
                >
                  <span className="class-upload-icon" aria-hidden="true">↑</span>
                  <span className="class-upload-copy">
                    <strong>Перетягніть файл сюди</strong>
                    <span>або натисніть, щоб обрати (PDF/DOCX/XLSX/MP3/ZIP)</span>
                    {materialFile ? <em>Обрано: {materialFile.name}</em> : null}
                  </span>
                </button>
                <button type="button" className="class-secondary-btn" onClick={handleUploadMaterial} disabled={materialUploading}>
                  {materialUploading ? "Завантажуємо..." : "Додати матеріал"}
                </button>
              </div>
            )}
            {materialsLoading ? (
              <p>Завантаження...</p>
            ) : materialsByDay.length === 0 ? (
              <p>Поки що матеріалів немає.</p>
            ) : (
              <div className="class-material-groups">
                {materialsByDay.map((group) => (
                  <section key={group.label} className="class-material-day">
                    <h3>{group.label}</h3>
                    <ul className="class-list">
                      {group.items.map((item) => {
                        const ext = String(item.fileName || "").split(".").pop()?.toUpperCase() || "FILE";
                        return (
                          <li key={item.id}>
                            <span className="class-file-tag">{ext.slice(0, 4)}</span>
                            <div>
                              <strong>
                                <a href={`${apiBase}${item.fileUrl}`} target="_blank" rel="noreferrer">
                                  {item.title}
                                </a>
                              </strong>
                              <p>{item.fileName} • {formatFileSize(item.fileSize)}</p>
                              {isTeacher && (
                                <button
                                  type="button"
                                  className="class-secondary-btn"
                                  onClick={() => handleDeleteMaterial(item.id)}
                                >
                                  Видалити
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </article>
          <article className="class-card">
            <div className="class-card-head">
              <h2>Домашнє завдання</h2>
            </div>
            {isTeacher && (
              <div className="class-meet-editor">
                <label htmlFor="homework-title">Назва завдання</label>
                <input id="homework-title" type="text" value={homeworkTitle} onChange={(e) => setHomeworkTitle(e.target.value)} />
                <label htmlFor="homework-file">Файл</label>
                <input
                  ref={homeworkFileInputRef}
                  id="homework-file"
                  type="file"
                  className="class-file-hidden"
                  onChange={(e) => handleHomeworkFileChange(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className={`class-upload-dropzone ${homeworkDragOver ? "is-dragover" : ""}`}
                  onClick={() => homeworkFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHomeworkDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setHomeworkDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHomeworkDragOver(false);
                    handleHomeworkFileChange(e.dataTransfer?.files?.[0] || null);
                  }}
                >
                  <span className="class-upload-icon" aria-hidden="true">↑</span>
                  <span className="class-upload-copy">
                    <strong>Перетягніть файл ДЗ сюди</strong>
                    <span>або натисніть, щоб обрати</span>
                    {homeworkFile ? <em>Обрано: {homeworkFile.name}</em> : null}
                  </span>
                </button>
                <button type="button" className="class-secondary-btn" onClick={handleUploadHomework} disabled={homeworkUploading}>
                  {homeworkUploading ? "Завантажуємо..." : "Додати домашнє завдання"}
                </button>
              </div>
            )}
            {homeworksLoading ? (
              <p>Завантаження...</p>
            ) : homeworks.length === 0 ? (
              <p>Поки що домашніх завдань немає.</p>
            ) : (
              <ul className="class-list">
                {homeworks.map((item) => (
                  <li key={item.id}>
                    <span className="class-home-icon">ЗВ</span>
                    <div>
                      <strong>
                        <a href={`${apiBase}${item.fileUrl}`} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      </strong>
                      <p>{item.dueText || "Дедлайн не вказано"}</p>
                      <p>{item.fileName} • {formatFileSize(item.fileSize)}</p>
                      {isTeacher && (
                        <button type="button" className="class-secondary-btn" onClick={() => handleDeleteHomework(item.id)}>
                          Видалити
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </section>
      {selectedDay ? (
        <div className="class-modal-backdrop" onClick={() => setSelectedDay(null)}>
          <div className="class-modal" onClick={(e) => e.stopPropagation()}>
            <div className="class-card-head">
              <h3>Нова подія</h3>
              <button type="button" className="class-secondary-btn" onClick={() => setSelectedDay(null)}>
                Закрити
              </button>
            </div>
            <p>{selectedDay.toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <div className="class-meet-editor">
              <label htmlFor="event-title-modal">Title</label>
              <input id="event-title-modal" type="text" value={eventForm.title} onChange={(e) => handleEventInput("title", e.target.value)} />
              <label htmlFor="event-start-modal">Start</label>
              <input id="event-start-modal" type="datetime-local" value={eventForm.startAt} onChange={(e) => handleEventInput("startAt", e.target.value)} />
              <label htmlFor="event-end-modal">End</label>
              <input id="event-end-modal" type="datetime-local" value={eventForm.endAt} onChange={(e) => handleEventInput("endAt", e.target.value)} />
              <label htmlFor="event-location-modal">Location</label>
              <input id="event-location-modal" type="text" value={eventForm.location} onChange={(e) => handleEventInput("location", e.target.value)} />
              <label htmlFor="event-meet-modal">Meet Link</label>
              <input id="event-meet-modal" type="url" value={eventForm.meetLink} onChange={(e) => handleEventInput("meetLink", e.target.value)} />
              <label htmlFor="event-description-modal">Description</label>
              <input
                id="event-description-modal"
                type="text"
                value={eventForm.description}
                onChange={(e) => handleEventInput("description", e.target.value)}
              />
              <button type="button" className="class-meet-btn" onClick={async () => {
                await handleCreateEvent({ syncAndOpen: true });
                setSelectedDay(null);
              }} disabled={createLoading}>
                {createLoading ? "Saving..." : "Save and open in Google Calendar"}
              </button>
            </div>
            <div className="class-events-list">
              <h3>Події цього дня</h3>
              {selectedDayEvents.length === 0 ? (
                <p>Немає подій.</p>
              ) : (
                <ul className="class-list">
                  {selectedDayEvents.map((event) => (
                    <li key={event.id}>
                      <span className="class-home-icon">EV</span>
                      <div>
                        <strong>{event.title}</strong>
                        <p>{event.startAt ? new Date(event.startAt).toLocaleString("uk-UA") : "Час не вказано"}</p>
                        <button
                          type="button"
                          className="class-secondary-btn"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          Видалити подію
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default ClassPage;

