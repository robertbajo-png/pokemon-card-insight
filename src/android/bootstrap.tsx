import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AndroidPreview from "./AndroidPreview";

export function mountAndroidPreview(container: Element) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <AndroidPreview />
    </StrictMode>,
  );
  return root;
}
