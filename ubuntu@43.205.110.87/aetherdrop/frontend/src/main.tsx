import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import DownloadPage from "./DownloadPage";
import "./index.css";

import { Routes, Route } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/download/:id" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
