import "@/index.css";
import "./preview.css";
import { mountAndroidPreview } from "./bootstrap";

const container = document.getElementById("root");
if (!container) throw new Error("Card Lens kunde inte hitta sin startvy.");

mountAndroidPreview(container);
