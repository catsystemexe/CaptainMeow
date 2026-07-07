export interface OpenDevDialogOptions {
  readonly title: string;
  readonly content: HTMLElement;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly danger?: boolean;
  readonly opener?: HTMLElement | null;
  readonly onConfirm: () => boolean | void;
  readonly onCancel?: () => void;
}

let activeDialog: { close: (confirmed?: boolean) => void } | null = null;

export function openDevDialog({ title, content, confirmLabel, cancelLabel = "Cancel", danger = false, opener = document.activeElement as HTMLElement | null, onConfirm, onCancel }: OpenDevDialogOptions): void {
  activeDialog?.close(false);

  const overlay = document.createElement("div");
  overlay.className = "dev-dialog-overlay";
  overlay.setAttribute("data-dev-dialog-overlay", "true");
  overlay.style.cssText = "position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(0,0,0,0.48);font:12px monospace;";
  const dialog = document.createElement("div");
  dialog.className = "dev-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", title);
  dialog.style.cssText = "width:min(340px,calc(100vw - 32px));display:flex;flex-direction:column;gap:8px;padding:12px;background:#111;color:#eee;border:1px solid rgba(255,255,255,0.32);box-shadow:0 12px 36px rgba(0,0,0,0.55);";
  const heading = document.createElement("div");
  heading.textContent = title;
  heading.style.cssText = "font-weight:800;color:#fff;";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;justify-content:flex-end;gap:6px;";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = cancelLabel;
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.textContent = confirmLabel;
  for (const button of [cancel, confirm]) button.style.cssText = "min-height:26px;padding:0 10px;font:12px monospace;background:#181818;color:#eee;border:1px solid rgba(255,255,255,0.28);";
  if (danger) confirm.style.cssText += "background:#471b1b;border-color:#ff7777;color:#fff;";
  actions.append(cancel, confirm);
  dialog.append(heading, content, actions);
  overlay.appendChild(dialog);

  let closed = false;
  const close = (confirmed = false) => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown, true);
    overlay.remove();
    activeDialog = null;
    if (!confirmed) onCancel?.();
    if (opener && typeof opener.focus === "function") opener.focus();
  };
  const tryConfirm = () => {
    const keepOpen = onConfirm() === false;
    if (!keepOpen) close(true);
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); close(false); }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); tryConfirm(); }
  };
  activeDialog = { close };
  cancel.addEventListener("click", () => close(false));
  confirm.addEventListener("click", tryConfirm);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(false); });
  document.addEventListener("keydown", onKeydown, true);
  document.body.appendChild(overlay);
  const focusTarget = dialog.querySelector<HTMLElement>("input,button,[tabindex]");
  (focusTarget ?? confirm).focus();
}
