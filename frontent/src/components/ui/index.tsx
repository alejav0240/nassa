import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx('ds-brand', compact && 'ds-brand--compact')} aria-label="AgroShift AI">
      <span className="ds-brand__leaf" aria-hidden="true">✦</span>
      {!compact && <span>AgroShift <strong>AI</strong></span>}
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cx('ds-button', `ds-button--${variant}`, `ds-button--${size}`, className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('ds-card', className)}>{children}</section>;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="ds-section-heading">
      {eyebrow && <p className="ds-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p className="ds-muted">{description}</p>}
    </div>
  );
}

export function Field({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <label className="ds-field">
      <span>{label}</span>
      <input {...props} aria-invalid={error ? true : undefined} />
      {error ? <small className="ds-field__error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function MetricCard({ label, value, source, status, tone = 'success', icon }: { label: string; value: string; source?: string; status?: string; tone?: 'success' | 'info' | 'warning'; icon?: ReactNode }) {
  return (
    <Card className="ds-metric-card">
      <div className="ds-metric-card__top">
        <span className="ds-muted">{label}</span>
        {icon && <span className={`ds-metric-card__icon ds-metric-card__icon--${tone}`}>{icon}</span>}
      </div>
      <strong>{value}</strong>
      {source && <small className="ds-muted">{source}</small>}
      {status && <span className="ds-metric-card__status">{status}</span>}
    </Card>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success'; title: string; children: ReactNode }) {
  return (
    <div className={`ds-notice ds-notice--${tone}`} role="note">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

export function NavItem({ active, label, icon, onClick }: { active?: boolean; label: string; icon?: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={cx('ds-nav-item', active && 'ds-nav-item--active')} aria-current={active ? 'page' : undefined} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
