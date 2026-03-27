import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/styles.css';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx'

const navRoot = document.getElementById('navroot')
if (navRoot) {
  createRoot(navRoot).render(
    <StrictMode>
      <Navbar />
    </StrictMode>,
  )
}

const footerRoot = document.getElementById('footer-root')
if (footerRoot) {
  createRoot(footerRoot).render(
    <StrictMode>
      <Footer />
    </StrictMode>,
  )
}
