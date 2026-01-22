import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// CORRECTION : Plus d'extension .jsx ici
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// CORRECTION : Ajout du "!" après getElementById('root')
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);