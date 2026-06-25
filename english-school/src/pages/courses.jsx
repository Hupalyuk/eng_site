import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getLocalizedCourseCategories, getLocalizedCourses } from "../data/courses.js";

const Icon = ({ name }) => {
  if (name === "briefcase") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v3a3 3 0 0 1-3 3h-1v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2H4a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h3V6Zm2 1h2V6a1 1 0 0 0-1-1h0a1 1 0 0 0-1 1v1Zm8 6V9H3v4a1 1 0 0 0 1 1h1v-1a1 1 0 1 1 2 0v1h10v-1a1 1 0 1 1 2 0v1h1a1 1 0 0 0 1-1Z" />
      </svg>
    );
  }
  if (name === "badge") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4.3l.9 1.5a1 1 0 0 0 1.7 0L14.7 19H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7Zm0 2h12v12H14a1 1 0 0 0-.86.49L13 18.77l-.14-.23A1 1 0 0 0 12 18H7V5Zm2 3h8a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 4h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z" />
      </svg>
    );
  }
  if (name === "bubble") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 3H4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3v3a1 1 0 0 0 1.6.8L11.3 17H20a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3Zm1 11a1 1 0 0 1-1 1h-9a1 1 0 0 0-.6.2L8 16.75V16a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0V7Zm1 11a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 18Z" />
    </svg>
  );
};

function Courses() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { t, i18n } = useTranslation();
  const courseCategories = useMemo(() => getLocalizedCourseCategories(t), [t, i18n.language]);
  const courses = useMemo(() => getLocalizedCourses(t), [t, i18n.language]);
  const whyItems = t("courses.why.items", { returnObjects: true });
  const whyIcons = ["GR", "SP", "ED", "TM"];
  const whyIconClasses = ["why-icon--green", "why-icon--yellow", "why-icon--purple", "why-icon--blue"];

  const filtered = useMemo(() => {
    if (activeCategory === "all") return courses;
    return courses.filter((course) => course.category === activeCategory);
  }, [activeCategory, courses]);

  return (
    <main className="courses-page">
      <section className="courses-hero">
        <div className="courses-hero-inner">
          <div className="courses-hero-copy">
            <p className="courses-eyebrow">{t("courses.hero.eyebrow")}</p>
            <h1>
              {t("courses.hero.titleLine1")}
              <br />
              {t("courses.hero.titleLine2")}
            </h1>
            <p className="courses-subtitle">{t("courses.hero.subtitle")}</p>
          </div>

          <div className="courses-hero-media" aria-hidden="true">
            <div className="courses-hero-art">
              <div className="courses-hero-bubble courses-hero-bubble--left">
                <span className="flag" aria-hidden="true">
                  GB
                </span>
                <div>
                  <strong>{t("courses.hero.bubbleTitle")}</strong>
                  <span>{t("courses.hero.bubbleSubtitle")}</span>
                </div>
              </div>

              <div className="courses-hero-photo">
                <img src="/images/home/student2.png" alt="" />
              </div>

              <div className="courses-hero-bubble courses-hero-bubble--right">
                <strong>{t("courses.hero.result")}</strong>
                <span>{t("courses.hero.resultTime")}</span>
                <div className="spark" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="courses-list">
        <header className="courses-list-head">
          <h2>{t("courses.list.title")}</h2>
          <p>{t("courses.list.subtitle")}</p>
        </header>

        <div className="courses-filters" role="tablist" aria-label={t("courses.list.filtersAria")}>
          {courseCategories.map((category) => (
            <button
              key={category.id}
              className={`courses-pill${activeCategory === category.id ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="courses-grid">
          {filtered.map((course) => (
            <article key={course.id} className="course-card">
              <div className={`course-icon course-icon--${course.accent}`}>
                <Icon name={course.icon} />
              </div>

              <h3 className="course-title">{course.title}</h3>
              <span className={`course-tag course-tag--${course.accent}`}>{course.tag}</span>
              <p className="course-desc">{course.description}</p>

              <ul className="course-meta">
                <li>
                  <span className="meta-dot" aria-hidden="true">
                    TM
                  </span>
                  {t("courses.list.duration", { value: course.duration })}
                </li>
                <li>
                  <span className="meta-dot" aria-hidden="true">
                    CL
                  </span>
                  {t("courses.list.lessons", { value: course.lessons })}
                </li>
                <li>
                  <span className="meta-dot" aria-hidden="true">
                    PC
                  </span>
                  {t("courses.list.format", { value: course.format })}
                </li>
              </ul>

              <div className="course-footer">
                <span className="course-price">{course.price}</span>
                <Link className="btn btn-outline btn-sm" to={`/courses/${course.id}/enroll`}>
                  {t("courses.list.details")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="courses-why">
        <h2>{t("courses.why.title")}</h2>
        <div className="why-grid">
          {whyItems.map(([title, desc], index) => (
            <div className="why-item" key={title}>
              <div className={`why-icon ${whyIconClasses[index]}`} aria-hidden="true">
                {whyIcons[index]}
              </div>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="courses-cta">
        <div className="cta-inner">
          <div>
            <h2>{t("courses.cta.title")}</h2>
            <p>{t("courses.cta.desc")}</p>
            {/* <button className="btn btn-light">{t("courses.cta.button")}</button> */}
          </div>
          <div className="cta-art" aria-hidden="true">
            <div className="cta-circle"></div>
            <div className="cta-circle cta-circle--2"></div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Courses;
