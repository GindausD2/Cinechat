"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
export function GlassButton({ children, className = "", variant = "glass", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "glass" | "primary" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}
export function GlassSidebar({ children }: { children: React.ReactNode }) { return <aside className="glass-sidebar">{children}</aside>; }
export function GlassModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} onCancel={onClose} className="glass-modal" aria-labelledby={titleId}>
    <div className="modal-title"><h2 id={titleId}>{title}</h2><button aria-label="Close dialog" className="icon-button" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
export function GlassPlayerControls({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) { return <div className="glass-player-controls" ref={ref}>{children}</div>; }
export function GlassChatPanel({ children }: { children: React.ReactNode }) { return <aside className="glass-chat-panel" aria-label="Screening chat">{children}</aside>; }
