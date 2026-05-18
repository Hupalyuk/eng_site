import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/courses' },
  { label: 'Class', to: '/class' },
  { label: 'Blog', to: '/blog' },
  { label: 'About Us', to: '/#about' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="site-nav" data-open={open ? 'true' : 'false'}>
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-text">TOTC</span>
        </div>

        <nav className="nav-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <span className="nav-user">Hi, {user.name}</span>
          ) : loading ? (
            <span className="nav-user">Loading...</span>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>

              <Link to="/register" className="btn btn-light">
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          className="burger"
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className="mobile-panel">
        <nav className="mobile-links" aria-label="Mobile">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-actions">
          {user ? (
            <span className="nav-user">Hi, {user.name}</span>
          ) : loading ? (
            <span className="nav-user">Loading...</span>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-light"
                onClick={() => setOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
