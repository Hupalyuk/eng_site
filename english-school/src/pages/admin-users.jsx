import React, { useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/apiBase.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = ["all", "admin", "teacher", "student"];
const STATUSES = ["all", "none", "pending", "approved", "rejected"];

export default function AdminUsers() {
  const { user } = useAuth();
  const apiBase = getApiBase();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [search, role, status]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${apiBase}/api/admin/users${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Failed to load users");
        return;
      }
      setUsers(payload);
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [query, user?.role]);

  const updateUser = async (id, body, method = "PATCH", suffix = "") => {
    const response = await fetch(`${apiBase}/api/admin/users/${id}${suffix}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: method === "DELETE" ? undefined : JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(payload?.error || "Action failed");
      return;
    }

    await loadUsers();
  };

  if (!user) {
    return <main className="page"><section className="admin-panel"><p>Please sign in.</p></section></main>;
  }

  if (user.role !== "admin") {
    return <main className="page"><section className="admin-panel"><p>Only admin can access this page.</p></section></main>;
  }

  return (
    <main className="page">
      <section className="admin-panel">
        <h1>Admin: Users</h1>

        <div className="admin-filters">
          <input placeholder="Search by name/email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={loadUsers}>Refresh</button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Blocked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><input defaultValue={u.name} onBlur={(e) => updateUser(u.id, { ...u, name: e.target.value })} /></td>
                  <td><input defaultValue={u.email} onBlur={(e) => updateUser(u.id, { ...u, email: e.target.value })} /></td>
                  <td>
                    <select defaultValue={u.role} onChange={(e) => updateUser(u.id, { ...u, role: e.target.value })}>
                      <option value="admin">admin</option>
                      <option value="teacher">teacher</option>
                      <option value="student">student</option>
                    </select>
                  </td>
                  <td>{u.teacher_status}</td>
                  <td>{u.is_blocked ? "yes" : "no"}</td>
                  <td className="admin-actions">
                    <button type="button" onClick={() => updateUser(u.id, { blocked: !u.is_blocked }, "PATCH", "/block")}>{u.is_blocked ? "Unblock" : "Block"}</button>
                    <button type="button" onClick={() => updateUser(u.id, {}, "DELETE")}>Delete</button>
                    {u.teacher_status === "pending" && (
                      <>
                        <button type="button" onClick={() => updateUser(u.id, { decision: "approved" }, "PATCH", "/teacher-status")}>Approve</button>
                        <button type="button" onClick={() => updateUser(u.id, { decision: "rejected" }, "PATCH", "/teacher-status")}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
