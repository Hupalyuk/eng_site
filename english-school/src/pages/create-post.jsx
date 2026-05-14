import React, { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const titleInputId = useId();
  const descriptionInputId = useId();
  const imageInputId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiBase = getApiBase();

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

    if (!title.trim()) {
      setError("Please add a topic for your post.");
      return;
    }

    if (!description.trim()) {
      setError("Please add a short description.");
      return;
    }

    const content = `${title.trim()}\n\n${description.trim()}`;
    const formData = new FormData();
    formData.append("content", content);
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

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const acceptImageFromInput = (file) => {
    if (!file) {
      setImageFile(null);
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WEBP, ...).");
      return;
    }

    setError("");
    setImageFile(file);
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
              <span>Topic</span>
              <input
                id={titleInputId}
                className="post-input"
                type="text"
                placeholder="e.g. My experience with TOTC"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={90}
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                id={descriptionInputId}
                className="post-textarea"
                rows="6"
                placeholder="Write something helpful for other students..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="field">
              <span>Photo (optional)</span>
              <div
                className={`image-dropzone${isDragActive ? " is-drag-active" : ""}${
                  imagePreviewUrl ? " has-image" : ""
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    document.getElementById(imageInputId)?.click();
                  }
                }}
                onClick={() => document.getElementById(imageInputId)?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);
                  acceptImageFromInput(event.dataTransfer?.files?.[0] || null);
                }}
                aria-describedby={`${imageInputId}-help`}
              >
                {imagePreviewUrl ? (
                  <>
                    <img className="image-preview" src={imagePreviewUrl} alt="Selected upload" />
                    <div className="image-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="image-btn" type="button" onClick={() => setImageFile(null)}>
                        Remove
                      </button>
                      <button
                        className="image-btn is-primary"
                        type="button"
                        onClick={() => document.getElementById(imageInputId)?.click()}
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="image-dropzone-body">
                    <div className="image-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 16a1 1 0 0 0 1-1V8.41l2.29 2.3a1 1 0 1 0 1.42-1.42l-4-4a1 1 0 0 0-1.42 0l-4 4a1 1 0 0 0 1.42 1.42L11 8.41V15a1 1 0 0 0 1 1Zm-7 4a3 3 0 0 1-3-3v-2a1 1 0 1 1 2 0v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H5Z" />
                      </svg>
                    </div>
                    <div className="image-dropzone-text">
                      <strong>Drop your photo here</strong>
                      <span>or click to browse (PNG/JPG/WEBP)</span>
                    </div>
                  </div>
                )}
              </div>

              <input
                id={imageInputId}
                className="image-input"
                type="file"
                accept="image/*"
                onChange={(event) => acceptImageFromInput(event.target.files?.[0] || null)}
              />
              <p id={`${imageInputId}-help`} className="image-help">
                A clear photo makes the post more engaging.
              </p>
            </div>

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
