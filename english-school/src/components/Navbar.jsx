import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { supportedLanguages } from '../i18n.js';

const NAV_ITEMS = [
  { labelKey: 'nav.home', to: '/' },
  { labelKey: 'nav.courses', to: '/courses' },
  { labelKey: 'nav.class', to: '/class' },
  { labelKey: 'nav.blog', to: '/blog' },
  { labelKey: 'nav.about', to: '/about' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
    setOpen(false);
  };

  const renderLanguageSwitch = () => (
    <div className="language-switch" role="group" aria-label={t('nav.aria.language')}>
      {supportedLanguages.map((language) => (
        <button
          key={language.code}
          type="button"
          className={`lang-option${i18n.language === language.code ? ' is-active' : ''}`}
          aria-pressed={i18n.language === language.code}
          title={language.name}
          onClick={() => changeLanguage(language.code)}
        >
          {language.label}
        </button>
      ))}
    </div>
  );

  return (
    <header className="site-nav" data-open={open ? 'true' : 'false'}>
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-text">TOTC</span>
        </div>

        <nav className="nav-links" aria-label={t('nav.aria.primary')}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.labelKey} to={item.to}>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {renderLanguageSwitch()}
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin/users" className="btn btn-ghost">
                  {t('nav.admin')}
                </Link>
              )}
              <span className="nav-user">{t('nav.hi', { name: user.name, role: user.role })}</span>
              <button type="button" className="btn btn-danger" onClick={logout}>
                {t('nav.logout')}
              </button>
            </>
          ) : loading ? (
            <span className="nav-user">{t('common.loading')}</span>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                {t('nav.login')}
              </Link>

              <Link to="/register" className="btn btn-light">
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>

        <button
          className="burger"
          type="button"
          aria-label={t('nav.aria.toggle')}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className="mobile-panel">
        <nav className="mobile-links" aria-label={t('nav.aria.mobile')}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.labelKey} to={item.to} onClick={() => setOpen(false)}>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="mobile-actions">
          {renderLanguageSwitch()}
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin/users"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  {t('nav.admin')}
                </Link>
              )}
              <span className="nav-user">{t('nav.hi', { name: user.name, role: user.role })}</span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await logout();
                  setOpen(false);
                }}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : loading ? (
            <span className="nav-user">{t('common.loading')}</span>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                {t('nav.login')}
              </Link>

              <Link
                to="/register"
                className="btn btn-light"
                onClick={() => setOpen(false)}
              >
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
