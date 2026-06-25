import React from "react";
import { useTranslation } from "react-i18next";

function Home() {
  const { t } = useTranslation();
  const cloudCards = t("home.cloud.cards", { returnObjects: true });
  const featureBullets = t("home.features.bullets", { returnObjects: true });

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-body" id="home">
          <div className="home-hero-copy">
            <h1>
              <span className="home-eyebrow">{t("home.hero.titleStart")} </span>
              {t("home.hero.titleEnd")}
            </h1>
            <p className="home-hero-desc">{t("home.hero.desc")}</p>
            {/* <button className="btn btn-accent">{t("home.hero.cta")}</button> */}
          </div>
          <div className="home-hero-media" aria-hidden="true">
            <div className="home-hero-image">
              <img src="/images/home/student2.png" alt={t("home.hero.imageAlt")} />
            </div>
          </div>
        </div>

        <div className="home-hero-curve" aria-hidden="true"></div>
      </section>

      <section className="cloud" id="courses">
        <p className="cloud-title">{t("home.cloud.title")}</p>
        <p className="cloud-sub">{t("home.cloud.sub")}</p>

        <div className="cloud-cards">
          {cloudCards.map((card, index) => (
            <article className="cloud-card" key={card.title}>
              <div className={`icon ${["badge-purple", "badge-teal", "badge-blue"][index]}`}>
                {["DOC", "CAL", "CRM"][index]}
              </div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about" id="about">
        <h2>{t("home.about.title")}</h2>
        <p>{t("home.about.desc")}</p>
      </section>

      <section className="features" id="features">
        <div className="features-head">
          <h2>
            {t("home.features.titleStart")} <span>{t("home.features.titleAccent")}</span>
          </h2>
          <p>{t("home.features.subtitle")}</p>
        </div>

        <div className="features-body">
          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/user-interface.png" alt="user-interface" />
            </div>
          </div>

          <div className="feature-copy">
            <h3>
              {t("home.features.classroomTitleStart")}{" "}
              <span>{t("home.features.classroomTitleAccent")}</span>{" "}
              {t("home.features.classroomTitleEnd")}
            </h3>
            <ul>
              {featureBullets.map((bullet, index) => (
                <li key={bullet}>
                  <span className={`dot ${["dot-purple", "dot-orange", "dot-indigo"][index]}`}></span>
                  <p>{bullet}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-head">
          <div className="feature-body">
            <h3>
              {t("home.features.toolsTitleStart")}{" "}
              <span>{t("home.features.toolsTitleAccent")}</span>{" "}
              {t("home.features.toolsTitleEnd")}
            </h3>
            <p>{t("home.features.toolsDesc")}</p>
          </div>

          <div className="feature-media ada" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/student2.png" alt="student2" />
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-head">
          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/tests.png" alt="tests" />
            </div>
          </div>

          <div className="feature-body">
            <h3>
              {t("home.features.assessmentsTitle")}{" "}
              <span>{t("home.features.assessmentsAccent")}</span>{" "}
              {t("home.features.assessmentsEnd")}
            </h3>
            <p>{t("home.features.assessmentsDesc")}</p>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-head">
          <div className="feature-body">
            <h3>
              <span>{t("home.features.managementAccent")}</span>{" "}
              {t("home.features.managementEnd")}
            </h3>
            <p>{t("home.features.managementDesc")}</p>
          </div>

          <div className="feature-media" aria-hidden="true">
            <div className="feature-image">
              <img src="/images/home/gradebook.png" alt="gradebook" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
