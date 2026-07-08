export interface PixelBgrLabController {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  onOpenChange?(listener: (open: boolean) => void): () => void;
}

export function togglePixelBgrLab(controller: PixelBgrLabController): void {
  controller.toggle();
}

export function pixelBgrLabButtonLabel(open: boolean): string {
  return open ? "Close Pixel BGR Lab" : "Pixel BGR Lab";
}

export function createPixelBgrLabToggleButton(controller: PixelBgrLabController): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-pixel-bgr-launch";
  button.style.cssText = [
    "position:fixed",
    "right:12px",
    "bottom:12px",
    "z-index:100002",
    "min-height:44px",
    "min-width:132px",
    "padding:10px 14px",
    "border-radius:10px",
    "border:1px solid rgba(120,220,255,.45)",
    "background:rgba(6,26,42,.92)",
    "color:#eaf6ff",
    "font:12px/1.2 ui-monospace,Menlo,Consolas,monospace",
    "box-shadow:0 4px 18px rgba(0,0,0,.35)",
    "touch-action:manipulation",
  ].join(";");

  const sync = () => {
    const open = controller.isOpen();
    button.textContent = pixelBgrLabButtonLabel(open);
    button.setAttribute("aria-label", pixelBgrLabButtonLabel(open));
    button.setAttribute("aria-pressed", open ? "true" : "false");
    button.classList.toggle("is-open", open);
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    togglePixelBgrLab(controller);
    sync();
  });

  const unsubscribe = controller.onOpenChange?.(sync);
  if (unsubscribe) {
    button.addEventListener("cm-pixel-bgr-destroy", unsubscribe, { once: true });
  }
  sync();
  return button;
}
