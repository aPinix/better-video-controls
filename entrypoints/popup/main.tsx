import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializePopupViewSession } from '@/helpers/popup-view-session';

import Popup from './popup';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root element was not found');
}

await initializePopupViewSession();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
