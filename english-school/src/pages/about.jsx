import React from "react";
import { useTranslation } from "react-i18next";
import { FaInstagram, FaFacebook, FaTelegramPlane, FaYoutube, FaTiktok } from "react-icons/fa";

function About() {
  const { t } = useTranslation();

  const staticTeachers = [
    {
      id: 1,
      name: "Богдана Стонога",
      role: "Senior English Teacher",
      certification_level: "C4",
      experience_years: 67,
      specialties: "General English, Speaking",
      avatar: "/images/teachers/anna.png",
    },
    {
      id: 2,
      name: "ВладиСлейв Євчук",
      role: "IELTS Tutor",
      certification_level: "C2",
      experience_years: 8,
      specialties: "IELTS, Academic English",
      avatar: "/images/teachers/oleg.png",
    },
    {
      id: 3,
      name: "Назар Лубешко",
      role: "Speaking Coach",
      certification_level: "C1",
      experience_years: 6,
      specialties: "Speaking, Pronunciation",
      avatar: "/images/teachers/maria.png",
    },
    {
      id: 4,
      name: "РостиСлейв Іваськевич",
      role: "Business English Coach",
      certification_level: "C1",
      experience_years: 7,
      specialties: "Business English, Grammar",
      avatar: "/images/teachers/dmytro.png",
    },
    // {
    //   id: 5,
    //   name: "Ірина Гнатюк",
    //   role: "Kids English Teacher",
    //   certification_level: "B2",
    //   experience_years: 4,
    //   specialties: "Kids, Phonics",
    //   avatar: "/images/teachers/irina.png",
    // },
  ];

  const socialLinks = [
    { name: "instagram", url: "https://instagram.com", icon: FaInstagram },
    { name: "facebook", url: "https://facebook.com", icon: FaFacebook },
    { name: "telegram", url: "https://t.me", icon: FaTelegramPlane },
    { name: "youtube", url: "https://youtube.com", icon: FaYoutube },
    { name: "tiktok", url: "https://tiktok.com", icon: FaTiktok },
  ];

  return (
    <main className="about-page">
      {/* Header */}
      <section className="about-header">
        <div className="about-header-content">
          <h1>{t("about.title")}</h1>
          <p className="about-header-desc">{t("about.subtitle")}</p>
        </div>
        <div className="about-header-image" aria-hidden="true">
          <img src="/images/about/contact.png" alt="Contact" />
        </div>
      </section>

      {/* Contacts Section */}
      <section className="about-contacts">
        <div className="about-contacts-wrapper">
          <div className="about-contacts-info">
            <h2>{t("about.contacts.title")}</h2>

            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <div>
                <h3>{t("about.contacts.phone")}</h3>
                <p>+38 (099) 123 45 67</p>
                <small>{t("about.contacts.phoneTimes")}</small>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-icon">✉️</span>
              <div>
                <h3>{t("about.contacts.email")}</h3>
                <p>info@englishschool.com.ua</p>
                <small>{t("about.contacts.emailTimes")}</small>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-icon">📍</span>
              <div>
                <h3>{t("about.contacts.address")}</h3>
                <p>{t("about.contacts.addressText")}</p>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-icon">🕐</span>
              <div>
                <h3>{t("about.contacts.schedule")}</h3>
                <p>{t("about.contacts.scheduleWeek")}</p>
                <p>{t("about.contacts.scheduleWeekend")}</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="social-links">
              <h3>{t("about.contacts.social")}</h3>
              <div className="social-icons">
                {socialLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="social-icon"
                      title={link.name}
                    >
                      <IconComponent />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="about-map">
            <h2>{t("about.map.title")}</h2>
            <div className="map-container">
              <iframe
                title="School location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2541.5544818267635!2d30.503693515676146!3d50.45084657145855!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cde16e948699%3A0x8a1b1b1b1b1b1b1b!2z0YPQuy4g0JDQvdC-0LLQuNGC0LDQvdC-INCH0LAuIDI!5e0!3m2!1suk!2sua!4v1622548900000"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
            <p className="map-note">{t("about.map.note")}</p>
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <section className="about-teachers">
        <div className="about-teachers-header">
          <h2>{t("about.teachers.title")}</h2>
          <a href="#" className="about-teachers-link">
            {t("about.teachers.viewAll")} →
          </a>
        </div>

        <div className="about-teachers-grid">
          {staticTeachers.map((teacher) => (
            <article key={teacher.id} className="teacher-card">
              <div className="teacher-avatar">
                {teacher.avatar ? (
                  <img src={teacher.avatar} alt={teacher.name} />
                ) : (
                  <div className="teacher-avatar-placeholder">{teacher.name.charAt(0)}</div>
                )}
              </div>
              <h3>{teacher.name}</h3>
              <p className="teacher-role">{teacher.role}</p>
              {teacher.certification_level && (
                <div className="teacher-cert">{teacher.certification_level}</div>
              )}
              {teacher.experience_years && (
                <p className="teacher-experience">{teacher.experience_years} років досвіду</p>
              )}
              <div className="teacher-specialties">
                {teacher.specialties && teacher.specialties.split(",").map((s) => (
                  <span key={s} className="specialty">{s.trim()}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default About;
