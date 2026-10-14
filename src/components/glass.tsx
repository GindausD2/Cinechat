"use client";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
export function GlassButton({ children, className = "", variant = "glass", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "glass" | "primary" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 130, damping: 22 }} className={`glass-card ${className}`}>{children}</motion.div>;
}
export function GlassSidebar({ children }: { children: React.ReactNode }) { return <aside className="glass-sidebar">{children}</aside>; }
export function GlassModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} onCancel={onClose} className="glass-modal">
    <div className="modal-title"><h2>{title}</h2><button aria-label="Close dialog" className="icon-button" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
export function GlassPlayerControls({ children }: { children: React.ReactNode }) { return <div className="glass-player-controls">{children}</div>; }
export function GlassChatPanel({ children }: { children: React.ReactNode }) { return <aside className="glass-chat-panel">{children}</aside>; }
