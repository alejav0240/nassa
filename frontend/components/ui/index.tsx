import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
const toneClass: Record<Tone, string> = {
  success: "ui-tone-success", warning: "ui-tone-warning", danger: "ui-tone-danger",
  info: "ui-tone-info", neutral: "ui-tone-neutral",
};

export function Button({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return <button className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} disabled={disabled || loading} {...props}>
    {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />} {loading ? "Cargando…" : children}
  </button>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`ui-card ${className}`}>{children}</section>; }

export function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="ui-section-title">{eyebrow && <p className="small-label">{eyebrow}</p>}<h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) { return <span className={`ui-badge ${toneClass[tone]}`}>{children}</span>; }

export function Field({ label, help, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string; error?: string }) {
  const message = error || help;
  return <label className="ui-field" htmlFor={id}><span>{label}</span><input id={id} aria-invalid={Boolean(error)} aria-describedby={message ? `${id}-message` : undefined} {...props} />{message && <small id={`${id}-message`} className={error ? "ui-field-error" : ""}>{message}</small>}</label>;
}

export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: string; children: ReactNode }) { return <div className={`ui-notice ${toneClass[tone]}`} role={tone === "danger" ? "alert" : "status"}>{title && <strong>{title}</strong>}<span>{children}</span></div>; }

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: ReactNode }) { return <Card className="ui-metric"><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>{icon && <span className="ui-metric-icon">{icon}</span>}</Card>; }
