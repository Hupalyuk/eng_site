import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <div className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <span>TOTC</span>
          </div>
          <p>
            {t("footer.product")
              .split("\n")
              .map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
          </p>
        </div>

        <div className="footer-newsletter">
          <h3>{t("footer.newsletterTitle")}</h3>
          <form className="newsletter-form">
            <input type="email" placeholder={t("footer.emailPlaceholder")} />
            <button type="submit">{t("footer.subscribe")}</button>
          </form>
        </div>

        <div className="footer-links">
          <a href="/class">{t("nav.class")}</a>
          <span>|</span>
          <a href="#privacy">{t("footer.privacy")}</a>
          <span>|</span>
          <a href="#terms">{t("footer.terms")}</a>
        </div>
        <div className="footer-copy">{t("footer.copy")}</div>
      </div>
    </div>
  );
}
