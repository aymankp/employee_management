import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import "./assets/styles/theme.css";
import App from './App';  // Sirf ek baar import
import './assets/styles/globals.css';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);