import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const splitPostText = (text = "") => {
  const normalized = String(text).replace(/\r\n/g, "\n");
  const [rawTitle = "", ...rest] = normalized.split("\n");
  const title = rawTitle.replace(/\s+/g, " ").trim();
  const description = rest.join("\n").replace(/\s+/g, " ").trim();
  return { title, description };
};

const EditPost = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const postId = useMemo(() => Number(id), [id]);

  const titleInputId = useId();
  const descriptionInputId = useId();
  const imageInputId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const resolveImageUrl = useCallback(
    (url) => {
      if (!url) return "";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      return `${apiBase}${url}`;
    },
    [apiBase]
  );

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
    setRemoveExistingImage(false);
    setImageFile(file);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!postId) {
        setError("Invalid post id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${apiBase}/api/posts`, { credentials: "include" });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load post.");
        }

        const post = Array.isArray(payload) ? payload.find((p) => p.id === postId) : null;
        if (!post) {
          throw new Error("Post not found.");
        }

        if (!user || post.user_id !== user.id) {
          throw new Error("You can only edit your own posts.");
        }

        const { title: loadedTitle, description: loadedDescription } = splitPostText(post.content);
        if (!active) return;

        setTitle(loadedTitle);
        setDescription(loadedDescription);
        setExistingImageUrl(resolveImageUrl(post.image_url));
      } catch (err) {
        if (active) setError(err.message || "Failed to load post.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [apiBase, postId, resolveImageUrl, user]);

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
    if (removeExistingImage && !imageFile) {
      formData.append("remove_image", "1");
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${apiBase}/api/posts/${postId}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update post.");
      }
      navigate("/blog");
    } catch (err) {
      setError(err.message || "Failed to update post.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewSrc = imagePreviewUrl || (!removeExistingImage ? existingImageUrl : "");

  return (
    <main className="page">
      <section className="blog-feed">
        <div className="blog-feed-header">
          <h2>Edit post</h2>
        </div>

        {!user ? (
          <p className="post-hint">Please log in to edit posts.</p>
        ) : loading ? (
          <p className="post-hint">Loading post...</p>
        ) : (
          <form className="post-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor={titleInputId}>
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

            <label className="field" htmlFor={descriptionInputId}>
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
                  previewSrc ? " has-image" : ""
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
                {previewSrc ? (
                  <>
                    <img className="image-preview" src={previewSrc} alt="Selected upload" />
                    <div className="image-actions" onClick={(event) => event.stopPropagation()}>
                      {(existingImageUrl || imageFile) && (
                        <button
                          className="image-btn"
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            if (existingImageUrl) setRemoveExistingImage(true);
                          }}
                        >
                          Remove
                        </button>
                      )}
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
                If you don't upload a new photo, the current one will stay.
              </p>
            </div>

            <div className="post-form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => navigate("/blog")} disabled={submitting}>
                Cancel
              </button>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  );
};

export default EditPost;
