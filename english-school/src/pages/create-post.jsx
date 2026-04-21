import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";

  const readJson = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (!contentType.includes("application/json")) {
      throw new Error("API error: expected JSON response. Check VITE_API_BASE and backend.");
    }
    return JSON.parse(text);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Please write something before posting.");
      return;
    }

    const formData = new FormData();
    formData.append("content", content.trim());
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${apiBase}/api/posts`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create post.");
      }
      navigate("/blog");
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="blog-feed">
        <div className="blog-feed-header">
          <h2>Create a post</h2>
        </div>

        {!user ? (
          <p className="post-hint">Please log in to create a post.</p>
        ) : (
          <form className="post-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Share your thoughts</span>
              <textarea
                rows="5"
                placeholder="Write about courses, your interests, or anything helpful..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Photo (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              />
            </label>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Publish post"}
            </button>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  );
};

export default CreatePost;
