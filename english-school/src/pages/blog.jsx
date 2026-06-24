import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiBase } from "../lib/apiBase.js";
import { resolveAssetUrl } from "../lib/assetUrl.js";

const POSTS_PER_PAGE = 6;
const EXCERPT_LIMIT = 180;

const sameId = (left, right) => Number(left) === Number(right);

const Blog = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = getApiBase();
  const language = i18n.language === "en" ? "en" : "ua";
  const showMoreLabel = language === "en" ? "Show more" : "Показати більше";
  const prevLabel = language === "en" ? "Prev" : "Назад";
  const nextLabel = language === "en" ? "Next" : "Далі";

  const readJson = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (!contentType.includes("application/json")) {
      throw new Error(t("common.apiJsonError"));
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
        throw new Error(payload?.error || t("blog.errors.load"));
      }
      setPosts(payload);
      setPage(1);
    } catch (err) {
      setError(err.message || t("blog.errors.load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const deletePost = async (postId) => {
    setError("");

    const confirmed = window.confirm(t("blog.confirmDelete"));
    if (!confirmed) return;

    try {
      const response = await fetch(`${apiBase}/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.error || t("blog.errors.delete"));
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch (err) {
      setError(err.message || t("blog.errors.delete"));
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
    if (!base) return t("blog.untitled");
    return base.length > 64 ? `${base.slice(0, 64)}...` : base;
  };

  const getExcerpt = (text = "") => {
    const { title, description } = splitPostText(text);
    const base = description || title;
    if (!base) return t("blog.noDescription");
    return base.length > EXCERPT_LIMIT ? `${base.slice(0, EXCERPT_LIMIT).trim()}...` : base;
  };

  const hasMoreText = (text = "") => {
    const { title, description } = splitPostText(text);
    const base = description || title;
    return base.length > EXCERPT_LIMIT;
  };

  const getInitials = (name = "") => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    const first = parts[0][0] || "";
    const second = parts.length > 1 ? parts[1][0] || "" : "";
    return `${first}${second}`.toUpperCase();
  };

  const pageCount = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const visiblePosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;
    return posts.slice(start, start + POSTS_PER_PAGE);
  }, [page, posts]);

  const openPost = (post) => setSelectedPost(post);
  const closePost = () => setSelectedPost(null);

  return (
    <div id="blog-root" className="blog-container">
      <div className="blog-page">
        <div className="blog-cell">
          <h1>{t("blog.title")}</h1>
          <p>
            {t("blog.desc")}
          </p>
        </div>
        <img className="img-blog-header" src="/images/blog/blog-header.png" alt="Blog-header" />
      </div>

      <section className="blog-feed">
        <div className="blog-feed-header">
          <h2>{t("blog.feedTitle")}</h2>
          <Link className="btn btn-light" to="/create-post">
            {t("blog.create")}
          </Link>
        </div>

        {!user && (
          <p className="post-hint">{t("blog.loginHint")}</p>
        )}

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="post-hint">{t("blog.loading")}</p>
        ) : posts.length === 0 ? (
          <p className="post-hint">{t("blog.empty")}</p>
        ) : (
          <>
          <div className="post-list">
            {visiblePosts.map((post) => {
              const imageUrl = resolveAssetUrl(post.image_url, apiBase, null);
              const title = getTitle(post.content);
              const excerpt = getExcerpt(post.content);
              const shouldShowMore = hasMoreText(post.content);
              const initials = getInitials(post.user_name);
              const dateLabel = new Date(post.created_at).toLocaleDateString();
              const isOwner = Boolean(user && sameId(post.user_id, user.id));

              return (
                <article key={post.id} className="post-card">
                  <button className="post-media" type="button" onClick={() => openPost(post)}>
                    {imageUrl ? (
                      <img className="post-image" src={imageUrl} alt={title} />
                    ) : (
                      <div className="post-image-placeholder" aria-hidden="true"></div>
                    )}
                  </button>

                  <div className="post-body">
                    <button className="post-title-btn" type="button" onClick={() => openPost(post)}>
                      <h3 className="post-title">{title}</h3>
                    </button>

                    <div className="post-author-row">
                      <div className="post-avatar">{initials}</div>
                      <div>
                        <p className="post-author">{post.user_name}</p>
                        <p className="post-date">{dateLabel}</p>
                      </div>
                    </div>

                    <p className="post-excerpt">{excerpt}</p>
                    {shouldShowMore && (
                      <button className="link-btn post-more-btn" type="button" onClick={() => openPost(post)}>
                        {showMoreLabel}
                      </button>
                    )}

                    <div className="post-footer">
                      {isOwner ? (
                        <div className="post-owner-actions">
                          <Link className="btn btn-light btn-sm" to={`/edit-post/${post.id}`}>
                            {t("blog.edit")}
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => deletePost(post.id)}
                          >
                            {t("blog.delete")}
                          </button>
                        </div>
                      ) : (
                        <button className="link-btn" type="button" onClick={() => openPost(post)}>
                          {t("blog.readMore")}
                        </button>
                      )}
                      <span className="post-meta-small">{dateLabel}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {pageCount > 1 && (
            <div className="blog-pagination" aria-label="Blog pages">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                {prevLabel}
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === page ? "is-active" : ""}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ))}
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>
                {nextLabel}
              </button>
            </div>
          )}
          </>
        )}
      </section>
      {selectedPost ? (() => {
        const imageUrl = resolveAssetUrl(selectedPost.image_url, apiBase, null);
        const { title, description } = splitPostText(selectedPost.content);
        const modalTitle = title || description || t("blog.untitled");
        const modalBody = description || title || t("blog.noDescription");
        const initials = getInitials(selectedPost.user_name);
        const dateLabel = new Date(selectedPost.created_at).toLocaleDateString();
        const isOwner = Boolean(user && sameId(selectedPost.user_id, user.id));

        return (
          <div className="blog-modal-backdrop" onClick={closePost}>
            <article className="blog-modal" onClick={(event) => event.stopPropagation()}>
              <div className="blog-modal-head">
                <div className="post-author-row">
                  <div className="post-avatar">{initials}</div>
                  <div>
                    <p className="post-author">{selectedPost.user_name}</p>
                    <p className="post-date">{dateLabel}</p>
                  </div>
                </div>
                <button className="blog-modal-close" type="button" onClick={closePost} aria-label="Close">
                  ×
                </button>
              </div>
              {imageUrl && <img className="blog-modal-image" src={imageUrl} alt={modalTitle} />}
              <h2>{modalTitle}</h2>
              <p className="blog-modal-text">{modalBody}</p>
              {isOwner && (
                <div className="post-owner-actions">
                  <Link className="btn btn-light btn-sm" to={`/edit-post/${selectedPost.id}`}>
                    {t("blog.edit")}
                  </Link>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => deletePost(selectedPost.id)}>
                    {t("blog.delete")}
                  </button>
                </div>
              )}
            </article>
          </div>
        );
      })() : null}
    </div>
  );
};

export default Blog;
