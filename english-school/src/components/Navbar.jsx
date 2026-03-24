import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'Courses', href: '#courses' },
  { label: 'Careers', href: '#careers' },
  { label: 'Blog', href: '#blog' },
  { label: 'About Us', href: '#about' },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-nav" data-open={open ? 'true' : 'false'}>
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-text">TOTC</span>
        </div>

        <nav className="nav-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <button className="btn btn-ghost" type="button">Login</button>
          <button className="btn btn-light" type="button">Sign Up</button>
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
            <a key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mobile-actions">
          <button className="btn btn-ghost" type="button">Login</button>
          <button className="btn btn-light" type="button">Sign Up</button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
