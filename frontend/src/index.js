import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// Register service worker for PWA with offline support
serviceWorkerRegistration.register({
    onSuccess: () => {
        console.log('PWA: Ready for offline use');
    },
    onUpdate: (registration) => {
        console.log('PWA: New version available');
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
});