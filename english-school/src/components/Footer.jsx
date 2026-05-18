export default function Footer() {
  return (
    <div className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <span>TOTC</span>
          </div>
          <p>
            Virtual Class
            <br />
            for Zoom
          </p>
        </div>

        <div className="footer-newsletter">
          <h3>Subscribe to get our Newsletter</h3>
          <form className="newsletter-form">
            <input type="email" placeholder="Your Email" />
            <button type="submit">Subscribe</button>
          </form>
        </div>

        <div className="footer-links">
          <a href="/class">Class</a>
          <span>|</span>
          <a href="#privacy">Privacy Policy</a>
          <span>|</span>
          <a href="#terms">Terms &amp; Conditions</a>
        </div>
        <div className="footer-copy">© 2021 Class Technologies Inc.</div>
      </div>
    </div>
  )
}
