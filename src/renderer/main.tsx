import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FloatingSubtitles from './components/FloatingSubtitles';
import './styles/index.css';

const isFloatingSubtitles = window.location.hash === '#/floating-subtitles';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isFloatingSubtitles ? <FloatingSubtitles /> : <App />}</React.StrictMode>,
);
