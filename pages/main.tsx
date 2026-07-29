import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("게임 운영 화면을 시작할 수 없습니다.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);

