import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Compare from './Compare.jsx';
import './compare.css';

createRoot(document.getElementById('root')).render(<StrictMode><Compare /></StrictMode>);
