import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getApiBase } from "../lib/apiBase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveAssetUrl } from "../lib/assetUrl.js";

const CLASS_FALLBACK = {
  title: "",
  teacher: "Sarah Johnson",
  teacherAvatar: "https://www.pngkey.com/png/detail/114-1149847_avatar-unknown-dp.png",
  meetLink: "https://meet.google.com/",
  startDate: "2026-05-20T18:00:00+03:00",
  endDate: "2026-05-20T19:00:00+03:00",
};

const CLASS_TEXT = {
  ua: {
    loadScheduleError: "Не вдалося завантажити розклад.",
    syncScheduleError: "Не вдалося синхронізувати розклад.",
    syncMessage: "Синхронізовано: {{total}} занять ({{created}} нових, {{updated}} оновлено).",
    syncedSchedule: "Додати розклад у Google Calendar",
    syncingSchedule: "Синхронізуємо...",
    scheduleTitle: "Розклад занять на сайті",
    loadingSchedule: "Завантаження розкладу...",
    emptySchedule: "Поки що немає запланованих занять.",
    googleEmpty: "У Google Calendar поки що немає подій на найближчий період.",
    googleHint: "Підключіть Google Calendar, щоб бачити синхронізовані заняття.",
    selectedFile: "Обрано: {{name}}",
    uploadHint: "або натисніть, щоб обрати",
    homeworkDrop: "Перетягніть файл ДЗ сюди",
    homeworkTag: "ДЗ",
    unsynced: "Не синхронізовано",
    unsyncedTitle: "Ця подія ще не синхронізована з Google Calendar",
  },
  en: {
    loadScheduleError: "Could not load the schedule.",
    syncScheduleError: "Could not sync the schedule.",
    syncMessage: "Synced: {{total}} lessons ({{created}} new, {{updated}} updated).",
    syncedSchedule: "Add schedule to Google Calendar",
    syncingSchedule: "Syncing...",
    scheduleTitle: "Class schedule on the site",
    loadingSchedule: "Loading schedule...",
    emptySchedule: "No scheduled lessons yet.",
    googleEmpty: "Google Calendar has no events for the upcoming period yet.",
    googleHint: "Connect Google Calendar to see synced lessons.",
    selectedFile: "Selected: {{name}}",
    uploadHint: "or click to choose",
    homeworkDrop: "Drop the homework file here",
    homeworkTag: "HW",
    unsynced: "Not synced",
    unsyncedTitle: "This event has not been synced with Google Calendar yet",
  },
};


const pad = (value) => String(value).padStart(2, "0");

function formatDateHuman(value, language) {
  const date = new Date(value);
  return date.toLocaleDateString(language === "ua" ? "uk-UA" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  });
}

function formatTimeRange(startValue, endValue, t) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${startTime} - ${endTime} (${t("classPage.hourShort")})`;
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
  const { t, i18n } = useTranslation();
  const apiBase = getApiBase();
  const resolveFileUrl = (url) => resolveAssetUrl(url, apiBase, "#");
  const [classData, setClassData] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [meetInput, setMeetInput] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [scheduleLessons, setScheduleLessons] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSyncLoading, setScheduleSyncLoading] = useState(false);
  const [scheduleSyncMessage, setScheduleSyncMessage] = useState("");
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

  const canManageClass = user?.role === "teacher" || user?.role === "admin";
  const language = i18n.language === "en" ? "en" : "ua";
  const copy = CLASS_TEXT[language];

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
        const groupQuery = canManageClass && selectedGroupId ? `?groupId=${encodeURIComponent(selectedGroupId)}` : "";
        const response = await fetch(`${apiBase}/api/class/next${groupQuery}`, { credentials: "include" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || t("classPage.errors.loadClass"));
        }
        setClassData(payload);
        setMeetInput(payload?.meetLink && payload.meetLink !== "https://meet.google.com/" ? payload.meetLink : "");
      } catch (err) {
        setError(err.message || t("classPage.errors.loadClass"));
      }
    };
    load();
  }, [apiBase, user, canManageClass, selectedGroupId]);

  useEffect(() => {
    if (!user) return;
    const loadHomeworks = async () => {
      try {
        setHomeworksLoading(true);
        const groupQuery = canManageClass && selectedGroupId ? `?groupId=${encodeURIComponent(selectedGroupId)}` : "";
        const response = await fetch(`${apiBase}/api/class/homeworks${groupQuery}`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || t("classPage.errors.loadHomeworks"));
        setHomeworks(Array.isArray(payload?.homeworks) ? payload.homeworks : []);
      } catch (err) {
        setError((prev) => prev || err?.message || t("classPage.errors.loadHomeworks"));
      } finally {
        setHomeworksLoading(false);
      }
    };
    loadHomeworks();
  }, [apiBase, user, canManageClass, selectedGroupId]);

  useEffect(() => {
    if (!user) return;
    const loadMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const groupQuery = canManageClass && selectedGroupId ? `?groupId=${encodeURIComponent(selectedGroupId)}` : "";
        const response = await fetch(`${apiBase}/api/class/materials${groupQuery}`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || t("classPage.errors.loadMaterials"));
        setMaterials(Array.isArray(payload?.materials) ? payload.materials : []);
      } catch (err) {
        setError((prev) => prev || err?.message || t("classPage.errors.loadMaterials"));
      } finally {
        setMaterialsLoading(false);
      }
    };
    loadMaterials();
  }, [apiBase, user, canManageClass, selectedGroupId]);

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
          throw new Error(payload?.error || t("classPage.errors.loadCalendar"));
        }
        setCalendarEvents(Array.isArray(payload?.events) ? payload.events : []);
      } catch (err) {
        setError((prev) => prev || err.message || t("classPage.errors.loadCalendar"));
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
          throw new Error(payload?.error || t("classPage.errors.loadEvents"));
        }
        setCustomEvents(Array.isArray(payload?.events) ? payload.events : []);
      } catch (err) {
        setError((prev) => prev || err.message || t("classPage.errors.loadEvents"));
      }
    };
    loadCustomEvents();
  }, [apiBase, user]);

  useEffect(() => {
    if (!user) return;
    const loadSchedule = async () => {
      try {
        setScheduleLoading(true);
        const groupQuery = canManageClass && selectedGroupId ? `?groupId=${encodeURIComponent(selectedGroupId)}` : "";
        const response = await fetch(`${apiBase}/api/class/schedule${groupQuery}`, { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 404) {
            setScheduleLessons([]);
            return;
          }
          throw new Error(payload?.error || copy.loadScheduleError);
        }
        setScheduleLessons(Array.isArray(payload?.lessons) ? payload.lessons : []);
      } catch (err) {
        setError((prev) => prev || err.message || copy.loadScheduleError);
      } finally {
        setScheduleLoading(false);
      }
    };
    loadSchedule();
  }, [apiBase, user, canManageClass, selectedGroupId, copy.loadScheduleError]);

  const groupName = classData?.groupName || t("classPage.noGroup");
  const lessonStart = classData?.lesson?.startAt || CLASS_FALLBACK.startDate;
  const lessonEnd = classData?.lesson?.endAt || CLASS_FALLBACK.endDate;
  const lessonTitle = classData?.lesson?.title || CLASS_FALLBACK.title;
  const meetLink = classData?.meetLink || CLASS_FALLBACK.meetLink;
  const teacherName = classData?.teacherName || (language === "ua" ? "Викладача не призначено" : "No teacher assigned");
  const hasRealMeetLink = Boolean(meetLink && meetLink.startsWith("https://meet.google.com/") && meetLink.length > 24);

  const handleJoinMeet = (event) => {
    if (!hasRealMeetLink) {
      event.preventDefault();
      setError(t("classPage.errors.noMeet"));
    }
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
      if (!response.ok) throw new Error(payload?.error || t("classPage.errors.saveMeet"));

      setClassData((prev) => ({
        ...(prev || {}),
        meetLink: payload.meetLink,
        groupName: payload.groupName || groupName,
      }));
    } catch (err) {
      setError(err?.message || t("classPage.errors.saveMeet"));
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
      if (!response.ok || !payload?.url) throw new Error(payload?.error || t("classPage.errors.connectGoogle"));
      window.location.href = payload.url;
    } catch (err) {
      setError(err?.message || t("classPage.errors.connectGoogle"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSyncSchedule = async () => {
    try {
      setError("");
      setScheduleSyncMessage("");
      if (!googleConnected) {
        await handleConnectGoogleCalendar();
        return;
      }

      setScheduleSyncLoading(true);
      const response = await fetch(`${apiBase}/api/class/schedule/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: canManageClass && selectedGroupId ? Number(selectedGroupId) : undefined,
          weeks: 8,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.needsGoogleConnect) setGoogleConnected(false);
        throw new Error(payload?.error || copy.syncScheduleError);
      }

      setScheduleSyncMessage(
        copy.syncMessage
          .replace("{{total}}", payload.total || 0)
          .replace("{{created}}", payload.created || 0)
          .replace("{{updated}}", payload.updated || 0)
      );
      const calendarResponse = await fetch(`${apiBase}/api/class/calendar`, { credentials: "include" });
      const calendarPayload = await calendarResponse.json().catch(() => ({}));
      if (calendarResponse.ok) {
        setCalendarEvents(Array.isArray(calendarPayload?.events) ? calendarPayload.events : []);
      }
    } catch (err) {
      setError(err?.message || copy.syncScheduleError);
    } finally {
      setScheduleSyncLoading(false);
    }
  };

  const handleEventInput = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const reloadCustomEvents = async () => {
    const response = await fetch(`${apiBase}/api/class/events`, { credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || t("classPage.errors.refreshEvents"));
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
          title: normalizeEventTitle(eventForm.title, normalizeEventTitle(lessonTitle, t("classPage.fallbackTitle"))),
          description: eventForm.description,
          location: eventForm.location,
          meetLink: eventForm.meetLink,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : "",
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || t("classPage.errors.createEvent"));
      }

      const createdEvent = payload.event;
      setCustomEvents((prev) => [...prev, createdEvent].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));

      if (syncAndOpen) {
        if (!googleConnected) {
          throw new Error(t("classPage.errors.connectFirst"));
        }

        const syncResponse = await fetch(`${apiBase}/api/class/events/${createdEvent.id}/sync`, {
          method: "POST",
          credentials: "include",
        });
        const syncPayload = await syncResponse.json().catch(() => ({}));
        if (!syncResponse.ok) {
          if (syncPayload?.needsGoogleConnect) setGoogleConnected(false);
          throw new Error(syncPayload?.error || t("classPage.errors.syncEvent"));
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
      setError(err?.message || t("classPage.errors.createEvent"));
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
        throw new Error(payload?.error || t("classPage.errors.deleteEvent"));
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
      setError(err?.message || t("classPage.errors.deleteEvent"));
    }
  };

  const handleDeleteScheduleEvent = async (eventId) => {
    try {
      setError("");
      const response = await fetch(`${apiBase}/api/class/schedule/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.needsGoogleConnect) setGoogleConnected(false);
        throw new Error(payload?.error || t("classPage.errors.deleteEvent"));
      }

      setScheduleLessons((prev) => prev.filter((item) => item.id !== eventId));
      if (googleConnected) {
        const calResponse = await fetch(`${apiBase}/api/class/calendar`, { credentials: "include" });
        const calPayload = await calResponse.json().catch(() => ({}));
        if (calResponse.ok) {
          setCalendarEvents(Array.isArray(calPayload?.events) ? calPayload.events : []);
        }
      }
    } catch (err) {
      setError(err?.message || t("classPage.errors.deleteEvent"));
    }
  };

  const handleUploadMaterial = async () => {
    try {
      setError("");
      if (!materialTitle.trim()) throw new Error(t("classPage.errors.materialTitle"));
      if (!materialFile) throw new Error(t("classPage.errors.materialFile"));

      setMaterialUploading(true);
      const form = new FormData();
      form.append("title", materialTitle.trim());
      form.append("file", materialFile);
      if (canManageClass && selectedGroupId) {
        form.append("groupId", selectedGroupId);
      }

      const response = await fetch(`${apiBase}/api/class/materials`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("classPage.errors.uploadFile"));

      setMaterials((prev) => [payload.material, ...prev]);
      setMaterialTitle("");
      setMaterialFile(null);
    } catch (err) {
      setError(err?.message || t("classPage.errors.uploadFile"));
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
      if (!response.ok) throw new Error(payload?.error || t("classPage.errors.deleteMaterial"));
      setMaterials((prev) => prev.filter((item) => Number(item.id) !== Number(materialId)));
    } catch (err) {
      setError(err?.message || t("classPage.errors.deleteMaterial"));
    }
  };

  const handleHomeworkFileChange = (file) => {
    setHomeworkFile(file || null);
  };

  const handleUploadHomework = async () => {
    try {
      setError("");
      if (!homeworkTitle.trim()) throw new Error(t("classPage.errors.homeworkTitle"));
      if (!homeworkFile) throw new Error(t("classPage.errors.homeworkFile"));

      setHomeworkUploading(true);
      const form = new FormData();
      form.append("title", homeworkTitle.trim());
      form.append("dueText", homeworkDue.trim());
      form.append("file", homeworkFile);
      if (canManageClass && selectedGroupId) {
        form.append("groupId", selectedGroupId);
      }

      const response = await fetch(`${apiBase}/api/class/homeworks`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("classPage.errors.uploadHomework"));

      setHomeworks((prev) => [payload.homework, ...prev]);
      setHomeworkTitle("");
      setHomeworkDue("");
      setHomeworkFile(null);
    } catch (err) {
      setError(err?.message || t("classPage.errors.uploadHomework"));
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
      if (!response.ok) throw new Error(payload?.error || t("classPage.errors.deleteHomework"));
      setHomeworks((prev) => prev.filter((item) => Number(item.id) !== Number(homeworkId)));
    } catch (err) {
      setError(err?.message || t("classPage.errors.deleteHomework"));
    }
  };

  const eventDate = useMemo(() => formatDateHuman(lessonStart, i18n.language), [i18n.language, lessonStart]);
  const eventTime = useMemo(() => formatTimeRange(lessonStart, lessonEnd, t), [lessonStart, lessonEnd, t]);
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
      { label: t("classPage.countdown.days"), value: pad(days) },
      { label: t("classPage.countdown.hours"), value: pad(hours) },
      { label: t("classPage.countdown.minutes"), value: pad(minutes) },
      { label: t("classPage.countdown.seconds"), value: pad(seconds) },
    ];
  }, [lessonStart, now, t]);

  const monthName = useMemo(
    () => calendarMonth.toLocaleDateString(i18n.language === "ua" ? "uk-UA" : "en-US", { month: "long", year: "numeric" }),
    [calendarMonth, i18n.language]
  );
  const monthWeeks = useMemo(() => buildMonthMatrix(calendarMonth), [calendarMonth]);
  const localEventsByDay = useMemo(() => {
    const map = new Map();
    scheduleLessons.forEach((event) => {
      if (!event?.startAt) return;
      const dayKey = toLocalDayKey(event.startAt);
      map.set(dayKey, (map.get(dayKey) || 0) + 1);
    });
    customEvents.forEach((event) => {
      if (!event?.startAt) return;
      const dayKey = toLocalDayKey(event.startAt);
      map.set(dayKey, (map.get(dayKey) || 0) + 1);
    });
    return map;
  }, [customEvents, scheduleLessons]);
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = toLocalDayKey(selectedDay);
    const lessons = scheduleLessons
      .filter((event) => toLocalDayKey(event.startAt) === key)
      .map((event) => ({ ...event, source: "schedule" }));
    const events = customEvents
      .filter((event) => toLocalDayKey(event.startAt) === key)
      .map((event) => ({ ...event, source: "custom" }));
    return [...lessons, ...events].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [customEvents, scheduleLessons, selectedDay]);
  const materialsByDay = useMemo(() => {
    const groups = new Map();
    materials.forEach((item) => {
      const key = toLocalDayKey(item.createdAt);
      const label = new Date(item.createdAt).toLocaleDateString(i18n.language === "ua" ? "uk-UA" : "en-US", {
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
  }, [i18n.language, materials]);

  useEffect(() => {
    setEventForm((prev) => {
      if (prev.startAt || prev.endAt || prev.title) return prev;
      const startLocal = toDateTimeLocalValue(lessonStart);
      const endLocal = toDateTimeLocalValue(lessonEnd);
      return {
        ...prev,
        title: normalizeEventTitle(lessonTitle, t("classPage.fallbackTitle")),
        meetLink: meetLink && meetLink.startsWith("https://meet.google.com/") ? meetLink : "",
        startAt: startLocal,
        endAt: endLocal,
      };
    });
  }, [lessonStart, lessonEnd, lessonTitle, meetLink, t]);

  return (
    <main className="class-page">
      <section className="class-wrap">
        <article className="class-hero-card">
          <div className="class-lesson-info">
            <p className="class-kicker">{t("classPage.group")}</p>
            <h1>{groupName}</h1>
            {canManageClass && teacherGroups.length > 0 && (
              <div className="class-meet-editor">
                <label htmlFor="teacher-group-select">{t("classPage.teacherGroup")}</label>
                <select
                  id="teacher-group-select"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {teacherGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.courseCode}){group.teacherName ? ` - ${group.teacherName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="class-group-line">{t("classPage.nextLesson", { title: lessonTitle })}</p>
            <p>{eventDate}</p>
            <p>{eventTime}</p>
            <div className="class-teacher">
              <img src={CLASS_FALLBACK.teacherAvatar} alt={teacherName} />
              <div>
                <span>{t("classPage.teacher")}</span>
                <strong>{teacherName}</strong>
              </div>
            </div>
          </div>

          <div className="class-hero-art" aria-hidden="true">
            <img src="/images/class/headphone.png" alt="headphone" />
          </div>

          <div className="class-join-area">
            <p className="class-kicker">{t("classPage.startsIn")}</p>
            <div className="class-countdown-grid">
              {countdown.map((item) => (
                <div key={item.label} className="class-countdown-cell">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="class-join-box">
              <h3>{t("classPage.ready")}</h3>
              {canManageClass && (
                <div className="class-meet-editor">
                  <label htmlFor="meet-link-input">{t("classPage.meetForGroup")}</label>
                  <input
                    id="meet-link-input"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetInput}
                    onChange={(event) => setMeetInput(event.target.value)}
                  />
                  <button className="class-secondary-btn" type="button" onClick={handleSaveMeetLink} disabled={saveLoading}>
                    {saveLoading ? t("classPage.saving") : t("classPage.saveMeet")}
                  </button>
                </div>
              )}
              <a
                className={`class-meet-btn ${hasRealMeetLink ? "" : "is-disabled"}`}
                href={hasRealMeetLink ? meetLink : "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleJoinMeet}
              >
                {t("classPage.join")}
              </a>
            </div>

            <p className="class-link-line">{t("classPage.meetLink", { link: meetLink })}</p>
            {error && <p className="form-error">{error}</p>}
          </div>
        </article>

        <section className="class-grid-main">
          <article className="class-card class-card-calendar">
            <div className="class-card-head">
              <h2>{t("classPage.calendar")}</h2>
            </div>
            <div className="class-calendar-actions">
              <button
                type="button"
                className="class-open-gcal"
                onClick={handleSyncSchedule}
                disabled={scheduleSyncLoading || scheduleLoading || scheduleLessons.length === 0}
              >
                {scheduleSyncLoading ? copy.syncingSchedule : copy.syncedSchedule}
              </button>
              <a className="class-open-gcal" href="https://calendar.google.com/" target="_blank" rel="noreferrer">
                {t("classPage.openGoogle")}
              </a>
            </div>
            {scheduleSyncMessage && <p className="class-sync-message">{scheduleSyncMessage}</p>}

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
                {t("classPage.weekdays", { returnObjects: true }).map((label) => (
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
                  {googleLoading ? t("classPage.connecting") : t("classPage.connectGoogle")}
                </button>
              ) : (
                <p className="class-link-line">{t("classPage.googleConnected")}</p>
              )}
            </div>
            <div className="class-events-list">
              <h3>{copy.scheduleTitle}</h3>
              {scheduleLoading ? (
                <p>{copy.loadingSchedule}</p>
              ) : scheduleLessons.length === 0 ? (
                <p>{copy.emptySchedule}</p>
              ) : (
                <ul className="class-list class-schedule-list">
                  {scheduleLessons.slice(0, 8).map((lesson) => (
                    <li key={lesson.id}>
                      <span className="class-home-icon">CL</span>
                      <div>
                        <strong>{lesson.title}</strong>
                        <p>{new Date(lesson.startAt).toLocaleString(language === "ua" ? "uk-UA" : "en-US")} - {new Date(lesson.endAt).toLocaleTimeString(language === "ua" ? "uk-UA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                        <p>
                          {lesson.groupName}
                          {lesson.teacherName ? ` • ${t("classPage.teacher")}: ${lesson.teacherName}` : ""}
                          {lesson.meetLink ? ` • Meet: ${lesson.meetLink}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
          <article className="class-card class-card-blank">
            <div className="class-card-head">
              <span>Google Calendar</span>
            </div>
            {!googleConnected ? (
              <p>{copy.googleHint}</p>
            ) : (
              <div className="class-events-list class-events-scroll">
                {calendarLoading ? (
                  <p>{t("classPage.loadingCalendar")}</p>
                ) : calendarEvents.length === 0 ? (
                  <p>{copy.googleEmpty}</p>
                ) : (
                  <ul className="class-list">
                    {calendarEvents.map((event) => (
                      <li key={event.id}>
                        <span className="class-home-icon">GC</span>
                        <div>
                          <strong>{event.title}</strong>
                          <p>
                            {event.startAt ? new Date(event.startAt).toLocaleString(language === "ua" ? "uk-UA" : "en-US") : t("classPage.noTime")}
                            {event.meetLink ? ` • Meet: ${event.meetLink}` : ""}
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
              <h2>{t("classPage.materials")}</h2>
              <Link to="/blog">{t("common.all")}</Link>
            </div>
            {canManageClass && (
              <div className="class-meet-editor">
                <label htmlFor="material-title">{t("classPage.fileTitle")}</label>
                <input id="material-title" type="text" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                <label htmlFor="material-file">{t("classPage.file")}</label>
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
                    <strong>{t("classPage.dropFile")}</strong>
                    <span>{t("classPage.browseFile")}</span>
                    {materialFile ? <em>{copy.selectedFile.replace("{{name}}", materialFile.name)}</em> : null}
                  </span>
                </button>
                <button type="button" className="class-secondary-btn" onClick={handleUploadMaterial} disabled={materialUploading}>
                  {materialUploading ? t("classPage.uploading") : t("classPage.addMaterial")}
                </button>
              </div>
            )}
            {materialsLoading ? (
              <p>{t("common.loading")}</p>
            ) : materialsByDay.length === 0 ? (
              <p>{t("classPage.emptyMaterials")}</p>
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
                                <a href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer">
                                  {item.title}
                                </a>
                              </strong>
                              <p>{item.fileName} • {formatFileSize(item.fileSize)}</p>
                              {canManageClass && (
                                <button
                                  type="button"
                                  className="class-secondary-btn"
                                  onClick={() => handleDeleteMaterial(item.id)}
                                >
                                  {t("common.delete")}
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
              <h2>{t("classPage.homework")}</h2>
            </div>
            {canManageClass && (
              <div className="class-meet-editor">
                <label htmlFor="homework-title">{t("classPage.taskTitle")}</label>
                <input id="homework-title" type="text" value={homeworkTitle} onChange={(e) => setHomeworkTitle(e.target.value)} />
                <label htmlFor="homework-file">{t("classPage.file")}</label>
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
                    <strong>{copy.homeworkDrop}</strong>
                    <span>{copy.uploadHint}</span>
                    {homeworkFile ? <em>{copy.selectedFile.replace("{{name}}", homeworkFile.name)}</em> : null}
                  </span>
                </button>
                <button type="button" className="class-secondary-btn" onClick={handleUploadHomework} disabled={homeworkUploading}>
                  {homeworkUploading ? t("classPage.uploading") : t("classPage.addHomework")}
                </button>
              </div>
            )}
            {homeworksLoading ? (
              <p>{t("common.loading")}</p>
            ) : homeworks.length === 0 ? (
              <p>{t("classPage.emptyHomeworks")}</p>
            ) : (
              <ul className="class-list">
                {homeworks.map((item) => (
                  <li key={item.id}>
                    <span className="class-home-icon">{copy.homeworkTag}</span>
                    <div>
                      <strong>
                        <a href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      </strong>
                      <p>{item.dueText || t("classPage.noDeadline")}</p>
                      <p>{item.fileName} • {formatFileSize(item.fileSize)}</p>
                      {canManageClass && (
                        <button type="button" className="class-secondary-btn" onClick={() => handleDeleteHomework(item.id)}>
                          {t("common.delete")}
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
              <h3>{t("classPage.newEvent")}</h3>
              <button type="button" className="class-secondary-btn" onClick={() => setSelectedDay(null)}>
                {t("classPage.close")}
              </button>
            </div>
            <p>{selectedDay.toLocaleDateString(language === "ua" ? "uk-UA" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <div className="class-meet-editor">
              <label htmlFor="event-title-modal">{t("classPage.eventTitle")}</label>
              <input id="event-title-modal" type="text" value={eventForm.title} onChange={(e) => handleEventInput("title", e.target.value)} />
              <label htmlFor="event-start-modal">{t("classPage.eventStart")}</label>
              <input id="event-start-modal" type="datetime-local" value={eventForm.startAt} onChange={(e) => handleEventInput("startAt", e.target.value)} />
              <label htmlFor="event-end-modal">{t("classPage.eventEnd")}</label>
              <input id="event-end-modal" type="datetime-local" value={eventForm.endAt} onChange={(e) => handleEventInput("endAt", e.target.value)} />
              <label htmlFor="event-location-modal">{t("classPage.eventLocation")}</label>
              <input id="event-location-modal" type="text" value={eventForm.location} onChange={(e) => handleEventInput("location", e.target.value)} />
              <label htmlFor="event-meet-modal">{t("classPage.eventMeet")}</label>
              <input id="event-meet-modal" type="url" value={eventForm.meetLink} onChange={(e) => handleEventInput("meetLink", e.target.value)} />
              <label htmlFor="event-description-modal">{t("classPage.eventDescription")}</label>
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
                {createLoading ? t("classPage.savingEvent") : t("classPage.saveAndOpen")}
              </button>
            </div>
            <div className="class-events-list">
              <h3>{t("classPage.dayEvents")}</h3>
              {selectedDayEvents.length === 0 ? (
                <p>{t("classPage.noEvents")}</p>
              ) : (
                <ul className="class-list">
                  {selectedDayEvents.map((event) => (
                    <li key={event.id}>
                      <span className="class-home-icon">{event.source === "schedule" ? "CL" : "EV"}</span>
                      <div>
                        <strong>{event.title}</strong>
                        <p>{event.startAt ? new Date(event.startAt).toLocaleString(language === "ua" ? "uk-UA" : "en-US") : t("classPage.noTime")}</p>
                        {event.source === "schedule" ? (
                        <div>
                          <p>
                            {event.groupName}
                            {event.teacherName ? ` • ${t("classPage.teacher")}: ${event.teacherName}` : ""}
                            {event.meetLink ? ` • Meet: ${event.meetLink}` : ""}
                          </p>
                          {event.googleEventId ? (
                            <button
                              type="button"
                              className="class-secondary-btn"
                              onClick={() => handleDeleteScheduleEvent(event.id)}
                            >
                              {t("classPage.deleteEvent")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="class-secondary-btn"
                              disabled
                              title={copy.unsyncedTitle}
                            >
                              {copy.unsynced}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="class-secondary-btn"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          {t("classPage.deleteEvent")}
                        </button>
                      )}
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
