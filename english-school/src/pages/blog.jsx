import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Blog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";

  const readJson = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (!contentType.includes("application/json")) {
      throw new Error("API error: expected JSON response. Check VITE_API_BASE and backend.");
    }
    return JSON.parse(text);
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/api/posts`, {
        credentials: "include",
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load posts.");
      }
      setPosts(payload);
    } catch (err) {
      setError(err.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${apiBase}${url}`;
  };

  const deletePost = async (postId) => {
    setError("");

    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    try {
      const response = await fetch(`${apiBase}/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete post.");
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    }
  };

  const splitPostText = (text = "") => {
    const normalized = String(text).replace(/\r\n/g, "\n");
    const [rawTitle = "", ...rest] = normalized.split("\n");
    const title = rawTitle.replace(/\s+/g, " ").trim();
    const description = rest.join("\n").replace(/\s+/g, " ").trim();
    return { title, description };
  };

  const getTitle = (text = "") => {
    const { title, description } = splitPostText(text);
    const base = title || description;
    if (!base) return "Untitled post";
    return base.length > 64 ? `${base.slice(0, 64)}...` : base;
  };

  const getExcerpt = (text = "") => {
    const { title, description } = splitPostText(text);
    const base = description || title;
    if (!base) return "No description yet.";
    return base.length > 140 ? `${base.slice(0, 140)}...` : base;
  };

  const getInitials = (name = "") => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    const first = parts[0][0] || "";
    const second = parts.length > 1 ? parts[1][0] || "" : "";
    return `${first}${second}`.toUpperCase();
  };

  return (
    <div id="blog-root" className="blog-container">
      <div className="blog-page">
        <div className="blog-cell">
          <h1>Welcome to the TOTC Blog</h1>
          <p>
            Here you will find the latest news, updates, and insights about our virtual classroom for Meet.
            Stay tuned for upcoming articles on how to make the most of your online learning experience with TOTC!
          </p>
          <button className="blog-btn-header">Start learning now</button>
        </div>
        <img className="img-blog-header" src="/images/blog/blog-header.png" alt="Blog-header" />
      </div>

      <section className="blog-feed">
        <div className="blog-feed-header">
          <h2>Community posts</h2>
          <Link className="btn btn-light" to="/create-post">
            Create post
          </Link>
        </div>

        {!user && (
          <p className="post-hint">Log in to create posts, edit, or delete your own content.</p>
        )}

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="post-hint">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="post-hint">No posts yet. Be the first to share something.</p>
        ) : (
          <div className="post-list">
            {posts.map((post) => {
              const imageUrl = resolveImageUrl(post.image_url);
              const title = getTitle(post.content);
              const excerpt = getExcerpt(post.content);
              const initials = getInitials(post.user_name);
              const dateLabel = new Date(post.created_at).toLocaleDateString();
              const isOwner = Boolean(user && post.user_id === user.id);

              return (
                <article key={post.id} className="post-card">
                  <div className="post-media">
                    {imageUrl ? (
                      <img className="post-image" src={imageUrl} alt={title} />
                    ) : (
                      <div className="post-image-placeholder" aria-hidden="true"></div>
                    )}
                  </div>

                  <div className="post-body">
                    <h3 className="post-title">{title}</h3>

                    <div className="post-author-row">
                      <div className="post-avatar">{initials}</div>
                      <div>
                        <p className="post-author">{post.user_name}</p>
                        <p className="post-date">{dateLabel}</p>
                      </div>
                    </div>

                    <p className="post-excerpt">{excerpt}</p>

                    <div className="post-footer">
                      {isOwner ? (
                        <div className="post-owner-actions">
                          <Link className="btn btn-light btn-sm" to={`/edit-post/${post.id}`}>
                            Edit
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => deletePost(post.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button className="link-btn" type="button">
                          Read more
                        </button>
                      )}
                      <span className="post-meta-small">{dateLabel}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Blog;
