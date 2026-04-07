import React from "react";
import ReactDOM from "react-dom/client";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx';
import './index.css'
import './styles/styles.css';
import Footer from './components/Footer.jsx'

ReactDOM.createRoot(document.getElementById("home-root")).render(
  <App />
);

const footerRoot = document.getElementById('footer-root')
if (footerRoot) {
  createRoot(footerRoot).render(
    <StrictMode>
      <Footer />
    </StrictMode>,
  )
}
