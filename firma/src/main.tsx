import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FirmaElectronica from "./pages/FirmaElectronica";
import FirmaFirmar from "./pages/FirmaFirmar";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/firma-electronica">
        <Routes>
          <Route path="/" element={<FirmaElectronica />} />
          <Route path="/firmar/:token" element={<FirmaFirmar />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
