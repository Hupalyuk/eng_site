import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiBase } from "../lib/apiBase.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = ["all", "admin", "teacher", "student"];
const TEACHER_STATUSES = ["all", "none", "pending", "approved", "rejected"];
const ENROLLMENT_STATUSES = ["all", "new", "contacted", "approved", "rejected"];
const POST_STATUSES = ["all", "published", "hidden"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIMES = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
const COURSES = ["a1", "b1", "ielts", "biz"];
const ENROLLMENT_ACTION_LABELS = {
  ua: {
    actions: "\u0414\u0456\u0457",
    approve: "\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438",
    reject: "\u0412\u0456\u0434\u0445\u0438\u043b\u0438\u0442\u0438",
    contacted: "\u0417\u0432'\u044f\u0437\u0430\u043b\u0438\u0441\u044f",
  },
  en: {
    actions: "Actions",
    approve: "Approve",
    reject: "Reject",
    contacted: "Contacted",
  },
};

const TEXT = {
  ua: {
    tabs: {
      overview: "Огляд",
      users: "Користувачі",
      enrollments: "Заявки",
      groups: "Групи",
      teachers: "Викладачі",
      posts: "Блог",
      audit: "Журнал",
    },
    stats: {
      users: "Користувачів",
      students: "Студентів",
      teachers: "Викладачів",
      pendingTeachers: "Викладачі на перевірці",
      enrollments: "Заявок",
      pendingEnrollments: "Нові заявки",
      groups: "Груп",
      posts: "Постів",
      hiddenPosts: "Приховані пости",
    },
    common: {
      title: "Адмін-панель",
      refresh: "Оновити",
      search: "Пошук",
      all: "Усі",
      loading: "Завантаження...",
      save: "Зберегти",
      delete: "Видалити",
      cancel: "Скасувати",
      edit: "Редагувати",
      close: "Закрити",
      create: "Створити",
      noData: "Поки що немає даних.",
      page: "Сторінка {{page}} з {{pages}}",
      previous: "Назад",
      next: "Далі",
      yes: "так",
      no: "ні",
      confirmDelete: "Видалити запис?",
      actionFailed: "Дію не виконано.",
      loadFailed: "Не вдалося завантажити дані.",
    },
    users: {
      search: "Ім'я або email",
      role: "Роль",
      status: "Статус викладача",
      blocked: "Блокування",
      blockedAll: "Усі",
      blockedYes: "Заблоковані",
      blockedNo: "Активні",
      columns: ["ID", "Ім'я", "Email", "Роль", "Статус", "Блок", "Дії"],
      block: "Заблокувати",
      unblock: "Розблокувати",
      approve: "Схвалити",
      reject: "Відхилити",
      docs: "Документи",
    },
    enrollments: {
      title: "Заявки на курси",
      search: "Ім'я, email або телефон",
      course: "Курс",
      status: "Статус заявки",
      note: "Нотатка адміністратора",
      columns: ["Студент", "Контакти", "Курс/група", "Розклад", "Нотатка"],
    },
    groups: {
      title: "Групи",
      createTitle: "Нова група",
      name: "Назва",
      course: "Курс",
      days: "Дні",
      times: "Час",
      teacher: "Викладач",
      meet: "Meet-посилання",
      members: "Учасники",
      unassigned: "Без викладача",
      columns: ["Група", "Курс", "Розклад", "Викладач", "Учасники", "Meet", "Дії"],
    },
    teachers: {
      title: "Перевірка викладачів",
      docsFor: "Документи: {{name}}",
      noDocs: "Документів немає.",
      open: "Відкрити",
    },
    posts: {
      title: "Модерація блогу",
      search: "Текст поста або автор",
      status: "Статус",
      author: "Автор",
      publish: "Опублікувати",
      hide: "Приховати",
      columns: ["Пост", "Автор", "Статус", "Дата", "Дії"],
    },
    audit: {
      title: "Журнал дій",
      columns: ["Дія", "Сутність", "Адмін", "Дата", "Деталі"],
    },
  },
  en: {
    tabs: {
      overview: "Overview",
      users: "Users",
      enrollments: "Enrollments",
      groups: "Groups",
      teachers: "Teachers",
      posts: "Blog",
      audit: "Audit",
    },
    stats: {
      users: "Users",
      students: "Students",
      teachers: "Teachers",
      pendingTeachers: "Pending teachers",
      enrollments: "Enrollments",
      pendingEnrollments: "New enrollments",
      groups: "Groups",
      posts: "Posts",
      hiddenPosts: "Hidden posts",
    },
    common: {
      title: "Admin panel",
      refresh: "Refresh",
      search: "Search",
      all: "All",
      loading: "Loading...",
      save: "Save",
      delete: "Delete",
      cancel: "Cancel",
      edit: "Edit",
      close: "Close",
      create: "Create",
      noData: "No data yet.",
      page: "Page {{page}} of {{pages}}",
      previous: "Previous",
      next: "Next",
      yes: "yes",
      no: "no",
      confirmDelete: "Delete this record?",
      actionFailed: "Action failed.",
      loadFailed: "Failed to load data.",
    },
    users: {
      search: "Name or email",
      role: "Role",
      status: "Teacher status",
      blocked: "Blocked",
      blockedAll: "All",
      blockedYes: "Blocked",
      blockedNo: "Active",
      columns: ["ID", "Name", "Email", "Role", "Status", "Blocked", "Actions"],
      block: "Block",
      unblock: "Unblock",
      approve: "Approve",
      reject: "Reject",
      docs: "Documents",
    },
    enrollments: {
      title: "Course enrollments",
      search: "Name, email, or phone",
      course: "Course",
      status: "Enrollment status",
      note: "Admin note",
      columns: ["Student", "Contacts", "Course/group", "Schedule", "Status", "Note"],
    },
    groups: {
      title: "Groups",
      createTitle: "New group",
      name: "Name",
      course: "Course",
      days: "Days",
      times: "Times",
      teacher: "Teacher",
      meet: "Meet link",
      members: "Members",
      unassigned: "Unassigned",
      columns: ["Group", "Course", "Schedule", "Teacher", "Members", "Meet", "Actions"],
    },
    teachers: {
      title: "Teacher review",
      docsFor: "Documents: {{name}}",
      noDocs: "No documents.",
      open: "Open",
    },
    posts: {
      title: "Blog moderation",
      search: "Post text or author",
      status: "Status",
      author: "Author",
      publish: "Publish",
      hide: "Hide",
      columns: ["Post", "Author", "Status", "Date", "Actions"],
    },
    audit: {
      title: "Audit log",
      columns: ["Action", "Entity", "Admin", "Date", "Details"],
    },
  },
};

const emptyPaged = { items: [], total: 0, page: 1, limit: 12 };

function formatDate(value, language) {
  if (!value) return "";
  return new Date(value).toLocaleString(language === "ua" ? "uk-UA" : "en-US");
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function makeQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) search.set(key, value);
  });
  return search.toString();
}

function getEnrollmentColumns(labels, language) {
  const actionLabel = ENROLLMENT_ACTION_LABELS[language].actions;
  return labels.enrollments.columns.includes(actionLabel)
    ? labels.enrollments.columns
    : [...labels.enrollments.columns, actionLabel];
}

function Pagination({ page, total, limit, labels, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="admin-pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {labels.common.previous}
      </button>
      <span>{labels.common.page.replace("{{page}}", page).replace("{{pages}}", pages)}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {labels.common.next}
      </button>
    </div>
  );
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const apiBase = getApiBase();
  const language = i18n.language === "en" ? "en" : "ua";
  const labels = TEXT[language];

  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState(emptyPaged);
  const [enrollments, setEnrollments] = useState(emptyPaged);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState(emptyPaged);
  const [audit, setAudit] = useState({ ...emptyPaged, limit: 20 });
  const [teacherDocs, setTeacherDocs] = useState({ user: null, docs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [userFilters, setUserFilters] = useState({ search: "", role: "all", status: "all", blocked: "", page: 1 });
  const [enrollmentFilters, setEnrollmentFilters] = useState({ search: "", course: "all", status: "all", page: 1 });
  const [postFilters, setPostFilters] = useState({ search: "", status: "all", page: 1 });
  const [auditPage, setAuditPage] = useState(1);
  const [groupForm, setGroupForm] = useState({
    id: null,
    name: "",
    courseCode: "a1",
    daysKey: "mon,wed",
    timesKey: "17:00",
    teacherId: "",
    meetLink: "",
  });
  const [editingNotes, setEditingNotes] = useState({});

  const tabs = useMemo(
    () => ["overview", "users", "enrollments", "groups", "teachers", "posts", "audit"],
    []
  );

  const apiJson = async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      credentials: "include",
      headers: options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined,
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || labels.common.actionFailed);
    return payload;
  };

  const loadStats = async () => setStats(await apiJson("/api/admin/stats"));
  const loadTeachers = async () => setTeachers(await apiJson("/api/admin/teachers"));

  const loadUsers = async () => {
    const query = makeQuery({ ...userFilters, limit: 12 });
    setUsers(await apiJson(`/api/admin/users?${query}`));
  };

  const loadEnrollments = async () => {
    const query = makeQuery({ ...enrollmentFilters, limit: 12 });
    setEnrollments(await apiJson(`/api/admin/enrollments?${query}`));
  };

  const loadGroups = async () => setGroups(await apiJson("/api/admin/groups"));

  const loadPosts = async () => {
    const query = makeQuery({ ...postFilters, limit: 12 });
    setPosts(await apiJson(`/api/admin/posts?${query}`));
  };

  const loadAudit = async () => {
    const query = makeQuery({ page: auditPage, limit: 20 });
    setAudit(await apiJson(`/api/admin/audit-logs?${query}`));
  };

  const loadCurrentTab = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "overview") await loadStats();
      if (activeTab === "users") await loadUsers();
      if (activeTab === "enrollments") await loadEnrollments();
      if (activeTab === "groups") {
        await Promise.all([loadGroups(), loadTeachers()]);
      }
      if (activeTab === "teachers") {
        const [teacherUsers] = await Promise.all([
          apiJson("/api/admin/users?role=all&status=all&limit=100"),
          loadTeachers(),
        ]);
        setUsers(teacherUsers);
      }
      if (activeTab === "posts") await loadPosts();
      if (activeTab === "audit") await loadAudit();
    } catch (err) {
      setError(err.message || labels.common.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") loadCurrentTab();
  }, [activeTab, user?.role, userFilters, enrollmentFilters, postFilters, auditPage]);

  const refreshAll = async () => {
    await loadCurrentTab();
    if (activeTab !== "overview") {
      try {
        setStats(await apiJson("/api/admin/stats"));
      } catch {
        // ignore secondary refresh
      }
    }
  };

  const updateUser = async (id, body, method = "PATCH", suffix = "") => {
    await apiJson(`/api/admin/users/${id}${suffix}`, {
      method,
      body: method === "DELETE" ? undefined : JSON.stringify(body),
    });
    await refreshAll();
  };

  const updateEnrollment = async (item, status) => {
    await apiJson(`/api/admin/enrollments/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        adminNote: editingNotes[item.id] ?? item.admin_note ?? "",
      }),
    });
    await refreshAll();
  };

  const saveGroup = async (event) => {
    event.preventDefault();
    const body = {
      name: groupForm.name,
      courseCode: groupForm.courseCode,
      daysKey: groupForm.daysKey,
      timesKey: groupForm.timesKey,
      teacherId: groupForm.teacherId || null,
      meetLink: groupForm.meetLink,
    };
    await apiJson(groupForm.id ? `/api/admin/groups/${groupForm.id}` : "/api/admin/groups", {
      method: groupForm.id ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    setGroupForm({ id: null, name: "", courseCode: "a1", daysKey: "mon,wed", timesKey: "17:00", teacherId: "", meetLink: "" });
    await refreshAll();
  };

  const editGroup = (group) => {
    setGroupForm({
      id: group.id,
      name: group.name || "",
      courseCode: group.course_code || "a1",
      daysKey: group.days_key || "mon,wed",
      timesKey: group.times_key || "17:00",
      teacherId: group.teacher_id || "",
      meetLink: group.meet_link || "",
    });
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm(labels.common.confirmDelete)) return;
    await apiJson(`/api/admin/groups/${groupId}`, { method: "DELETE" });
    await refreshAll();
  };

  const updatePostStatus = async (postId, status) => {
    await apiJson(`/api/admin/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await refreshAll();
  };

  const deletePost = async (postId) => {
    if (!window.confirm(labels.common.confirmDelete)) return;
    await apiJson(`/api/admin/posts/${postId}`, { method: "DELETE" });
    await refreshAll();
  };

  const openDocs = async (selectedUser) => {
    setLoading(true);
    setError("");
    try {
      const docs = await apiJson(`/api/admin/users/${selectedUser.id}/documents`);
      setTeacherDocs({ user: selectedUser, docs });
    } catch (err) {
      setError(err.message || labels.common.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="admin-stat-grid">
      {Object.entries(labels.stats).map(([key, label]) => (
        <article className="admin-stat-card" key={key}>
          <span>{label}</span>
          <strong>{stats?.[key] ?? 0}</strong>
        </article>
      ))}
    </div>
  );

  const renderUsers = () => (
    <>
      <div className="admin-filters">
        <input
          placeholder={labels.users.search}
          value={userFilters.search}
          onChange={(e) => setUserFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
        />
        <select value={userFilters.role} onChange={(e) => setUserFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }))}>
          {ROLES.map((role) => <option key={role} value={role}>{role === "all" ? labels.common.all : role}</option>)}
        </select>
        <select value={userFilters.status} onChange={(e) => setUserFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
          {TEACHER_STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? labels.common.all : status}</option>)}
        </select>
        <select value={userFilters.blocked} onChange={(e) => setUserFilters((prev) => ({ ...prev, blocked: e.target.value, page: 1 }))}>
          <option value="">{labels.users.blockedAll}</option>
          <option value="false">{labels.users.blockedNo}</option>
          <option value="true">{labels.users.blockedYes}</option>
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{labels.users.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {users.items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td><input defaultValue={item.name} onBlur={(e) => updateUser(item.id, { ...item, name: e.target.value })} /></td>
                <td><input defaultValue={item.email} onBlur={(e) => updateUser(item.id, { ...item, email: e.target.value })} /></td>
                <td>
                  <select defaultValue={item.role} onChange={(e) => updateUser(item.id, { ...item, role: e.target.value })}>
                    <option value="admin">admin</option>
                    <option value="teacher">teacher</option>
                    <option value="student">student</option>
                  </select>
                </td>
                <td>{item.teacher_status}</td>
                <td>{item.is_blocked ? labels.common.yes : labels.common.no}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => updateUser(item.id, { blocked: !item.is_blocked }, "PATCH", "/block")}>
                    {item.is_blocked ? labels.users.unblock : labels.users.block}
                  </button>
                  <button type="button" onClick={() => updateUser(item.id, {}, "DELETE")}>{labels.common.delete}</button>
                  <button type="button" onClick={() => openDocs(item)}>{labels.users.docs}</button>
                  {item.teacher_status === "pending" && (
                    <>
                      <button type="button" onClick={() => updateUser(item.id, { decision: "approved" }, "PATCH", "/teacher-status")}>{labels.users.approve}</button>
                      <button type="button" onClick={() => updateUser(item.id, { decision: "rejected" }, "PATCH", "/teacher-status")}>{labels.users.reject}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={users.page} total={users.total} limit={users.limit} labels={labels} onPage={(page) => setUserFilters((prev) => ({ ...prev, page }))} />
    </>
  );

  const renderEnrollments = () => (
    <>
      <div className="admin-filters">
        <input
          placeholder={labels.enrollments.search}
          value={enrollmentFilters.search}
          onChange={(e) => setEnrollmentFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
        />
        <select value={enrollmentFilters.course} onChange={(e) => setEnrollmentFilters((prev) => ({ ...prev, course: e.target.value, page: 1 }))}>
          <option value="all">{labels.common.all}</option>
          {COURSES.map((course) => <option key={course} value={course}>{course.toUpperCase()}</option>)}
        </select>
        <select value={enrollmentFilters.status} onChange={(e) => setEnrollmentFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
          {ENROLLMENT_STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? labels.common.all : status}</option>)}
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{getEnrollmentColumns(labels, language).map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {enrollments.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.full_name}</strong>
                  <small>{formatDate(item.created_at, language)}</small>
                </td>
                <td>
                  <span>{item.email}</span>
                  <small>{item.phone}</small>
                </td>
                <td>
                  <strong>{String(item.course_code || "").toUpperCase()}</strong>
                  <small>{item.group_name}</small>
                </td>
                <td>{item.days_key} / {item.times_key}</td>
                {/* <td>
                  <select value={item.status} onChange={(e) => updateEnrollment(item, e.target.value)}>
                    {ENROLLMENT_STATUSES.filter((status) => status !== "all").map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td> */}
                <td>
                  <input
                    placeholder={labels.enrollments.note}
                    value={editingNotes[item.id] ?? item.admin_note ?? ""}
                    onChange={(e) => setEditingNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    onBlur={() => updateEnrollment(item, item.status)}
                  />
                </td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className="admin-action-approve"
                    disabled={item.status === "approved"}
                    onClick={() => updateEnrollment(item, "approved")}
                  >
                    {ENROLLMENT_ACTION_LABELS[language].approve}
                  </button>
                  <button
                    type="button"
                    className="admin-action-reject"
                    disabled={item.status === "rejected"}
                    onClick={() => updateEnrollment(item, "rejected")}
                  >
                    {ENROLLMENT_ACTION_LABELS[language].reject}
                  </button>
                  {item.status === "new" && (
                    <button type="button" onClick={() => updateEnrollment(item, "contacted")}>
                      {ENROLLMENT_ACTION_LABELS[language].contacted}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={enrollments.page} total={enrollments.total} limit={enrollments.limit} labels={labels} onPage={(page) => setEnrollmentFilters((prev) => ({ ...prev, page }))} />
    </>
  );

  const renderGroups = () => (
    <>
      <form className="admin-group-form" onSubmit={saveGroup}>
        <h2>{groupForm.id ? labels.common.edit : labels.groups.createTitle}</h2>
        <input placeholder={labels.groups.name} value={groupForm.name} onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} />
        <select value={groupForm.courseCode} onChange={(e) => setGroupForm((prev) => ({ ...prev, courseCode: e.target.value }))}>
          {COURSES.map((course) => <option key={course} value={course}>{course.toUpperCase()}</option>)}
        </select>
        <select multiple value={groupForm.daysKey.split(",").filter(Boolean)} onChange={(e) => setGroupForm((prev) => ({ ...prev, daysKey: Array.from(e.target.selectedOptions).map((option) => option.value).join(",") }))}>
          {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
        <select multiple value={groupForm.timesKey.split(",").filter(Boolean)} onChange={(e) => setGroupForm((prev) => ({ ...prev, timesKey: Array.from(e.target.selectedOptions).map((option) => option.value).join(",") }))}>
          {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
        <select value={groupForm.teacherId} onChange={(e) => setGroupForm((prev) => ({ ...prev, teacherId: e.target.value }))}>
          <option value="">{labels.groups.unassigned}</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <input placeholder={labels.groups.meet} value={groupForm.meetLink} onChange={(e) => setGroupForm((prev) => ({ ...prev, meetLink: e.target.value }))} />
        <div className="admin-actions">
          <button type="submit">{labels.common.save}</button>
          {groupForm.id && (
            <button type="button" onClick={() => setGroupForm({ id: null, name: "", courseCode: "a1", daysKey: "mon,wed", timesKey: "17:00", teacherId: "", meetLink: "" })}>
              {labels.common.cancel}
            </button>
          )}
        </div>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{labels.groups.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td><strong>{group.name}</strong></td>
                <td>{String(group.course_code || "").toUpperCase()}</td>
                <td>{group.days_key} / {group.times_key}</td>
                <td>{group.teacher_name || labels.groups.unassigned}</td>
                <td>{group.actual_member_count ?? group.member_count}</td>
                <td><small>{group.meet_link || "-"}</small></td>
                <td className="admin-actions">
                  <button type="button" onClick={() => editGroup(group)}>{labels.common.edit}</button>
                  <button type="button" onClick={() => deleteGroup(group.id)}>{labels.common.delete}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderTeachers = () => (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{labels.users.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {users.items.filter((item) => item.role === "teacher" || item.teacher_status === "pending").map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.role}</td>
                <td>{item.teacher_status}</td>
                <td>{item.is_blocked ? labels.common.yes : labels.common.no}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => openDocs(item)}>{labels.users.docs}</button>
                  {item.teacher_status === "pending" && (
                    <>
                      <button type="button" onClick={() => updateUser(item.id, { decision: "approved" }, "PATCH", "/teacher-status")}>{labels.users.approve}</button>
                      <button type="button" onClick={() => updateUser(item.id, { decision: "rejected" }, "PATCH", "/teacher-status")}>{labels.users.reject}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderPosts = () => (
    <>
      <div className="admin-filters">
        <input placeholder={labels.posts.search} value={postFilters.search} onChange={(e) => setPostFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))} />
        <select value={postFilters.status} onChange={(e) => setPostFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
          {POST_STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? labels.common.all : status}</option>)}
        </select>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{labels.posts.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {posts.items.map((post) => (
              <tr key={post.id}>
                <td>
                  <strong>{post.title || `#${post.id}`}</strong>
                  <small>{post.description}</small>
                </td>
                <td>{post.user_name}</td>
                <td>{post.status}</td>
                <td>{formatDate(post.created_at, language)}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => updatePostStatus(post.id, post.status === "hidden" ? "published" : "hidden")}>
                    {post.status === "hidden" ? labels.posts.publish : labels.posts.hide}
                  </button>
                  <button type="button" onClick={() => deletePost(post.id)}>{labels.common.delete}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={posts.page} total={posts.total} limit={posts.limit} labels={labels} onPage={(page) => setPostFilters((prev) => ({ ...prev, page }))} />
    </>
  );

  const renderAudit = () => (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{labels.audit.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {audit.items.map((item) => (
              <tr key={item.id}>
                <td>{item.action}</td>
                <td>{item.entity_type} #{item.entity_id || "-"}</td>
                <td>{item.admin_name || item.admin_email || "-"}</td>
                <td>{formatDate(item.created_at, language)}</td>
                <td><code>{JSON.stringify(item.details || {})}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={audit.page} total={audit.total} limit={audit.limit} labels={labels} onPage={setAuditPage} />
    </>
  );

  if (!user) {
    return <main className="page"><section className="admin-panel"><p>{language === "ua" ? "Увійдіть в акаунт." : "Please sign in."}</p></section></main>;
  }

  if (user.role !== "admin") {
    return <main className="page"><section className="admin-panel"><p>{language === "ua" ? "Тільки адміністратор має доступ до цієї сторінки." : "Only admin can access this page."}</p></section></main>;
  }

  return (
    <main className="page">
      <section className="admin-panel">
        <div className="admin-head">
          <div>
            <h1>{labels.common.title}</h1>
            {stats && <p>{labels.stats.users}: {stats.users} · {labels.stats.enrollments}: {stats.enrollments} · {labels.stats.groups}: {stats.groups}</p>}
          </div>
          <button type="button" onClick={refreshAll}>{labels.common.refresh}</button>
        </div>

        <div className="admin-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "is-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {labels.tabs[tab]}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="post-hint">{labels.common.loading}</p>}

        {!loading && activeTab === "overview" && renderOverview()}
        {!loading && activeTab === "users" && renderUsers()}
        {!loading && activeTab === "enrollments" && renderEnrollments()}
        {!loading && activeTab === "groups" && renderGroups()}
        {!loading && activeTab === "teachers" && renderTeachers()}
        {!loading && activeTab === "posts" && renderPosts()}
        {!loading && activeTab === "audit" && renderAudit()}

        {teacherDocs.user && (
          <div className="admin-modal-backdrop" onClick={() => setTeacherDocs({ user: null, docs: [] })}>
            <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-head">
                <h2>{labels.teachers.docsFor.replace("{{name}}", teacherDocs.user.name)}</h2>
                <button type="button" onClick={() => setTeacherDocs({ user: null, docs: [] })}>{labels.common.close}</button>
              </div>
              {teacherDocs.docs.length === 0 ? (
                <p>{labels.teachers.noDocs}</p>
              ) : (
                <ul className="admin-doc-list">
                  {teacherDocs.docs.map((doc) => (
                    <li key={doc.id}>
                      <div>
                        <strong>{doc.file_name}</strong>
                        <small>{formatFileSize(doc.file_size)} · {formatDate(doc.created_at, language)}</small>
                      </div>
                      <a className="btn btn-light btn-sm" href={`${apiBase}${doc.file_url}`} target="_blank" rel="noreferrer">
                        {labels.teachers.open}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
