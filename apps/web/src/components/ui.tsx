import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Check, CircleAlert, Clock3, MapPin, MessageCircle, Navigation, Phone, X } from 'lucide-react';
import type { ButtonHTMLAttributes, KeyboardEvent, PropsWithChildren, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export function ActionButton({ variant = 'primary', busy = false, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }) {
  return <button {...props} className={`action-button action-button--${variant} ${className}`.trim()} aria-busy={busy || undefined} disabled={busy || props.disabled}>{children}</button>;
}

export function IconButton({ label, children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>) {
  return <button {...props} type={props.type ?? 'button'} className="icon-button" aria-label={label}>{children}</button>;
}

type NoticeTone = 'info' | 'waiting' | 'error' | 'success';
const noticeIcons: Record<NoticeTone, ReactNode> = {
  info: <CircleAlert aria-hidden="true" />, waiting: <Clock3 aria-hidden="true" />,
  error: <CircleAlert aria-hidden="true" />, success: <Check aria-hidden="true" />
};

export function StatusNotice({ tone = 'info', title, children, live = false }: PropsWithChildren<{ tone?: NoticeTone; title: string; live?: boolean }>) {
  return <div className={`status-notice status-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={live ? 'polite' : undefined}>{noticeIcons[tone]}<div><strong>{title}</strong>{children ? <p>{children}</p> : null}</div></div>;
}

export function Field({ label, hint, error, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const descriptionId = `${id}-description`;
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={hint || error ? descriptionId : undefined} />{hint || error ? <p id={descriptionId} className={error ? 'field-error' : 'field-hint'}>{error ?? hint}</p> : null}</div>;
}

export function ContactActions({ phone = '+20 10 0000 0000' }: { phone?: string }) {
  const normalized = phone.replaceAll(' ', '');
  return <div className="contact-actions" aria-label="التواصل والاتجاه"><a href={`tel:${normalized}`}><Phone aria-hidden="true" /><span>اتصال</span></a><a href={`https://wa.me/${normalized.replace('+', '')}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /><span>واتساب</span></a><button type="button"><Navigation aria-hidden="true" /><span>الاتجاهات</span></button></div>;
}

export function ProgressSummary({ processed, total, delivered, held }: { processed: number; total: number; delivered: number; held: number }) {
  const value = total === 0 ? 0 : Math.round((processed / total) * 100);
  return <section className="progress-summary" aria-labelledby="progress-label"><div className="progress-summary__label"><strong id="progress-label">تمت معالجة {processed} من {total} وقفات</strong><span>{value}%</span></div><div className="progress-track" role="progressbar" aria-labelledby="progress-label" aria-valuemin={0} aria-valuemax={total} aria-valuenow={processed}><span style={{ inlineSize: `${value}%` }} /></div><div className="metric-row"><span><strong>{delivered}</strong> تسليم كامل</span><span><strong>{held}</strong> مع المندوب</span></div></section>;
}

export type TabItem<T extends string> = { id: T; label: string };
export function FilterTabs<T extends string>({ items, active, onChange, label }: { items: TabItem<T>[]; active: T; onChange: (id: T) => void; label: string }) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowLeft') next = Math.min(items.length - 1, index + 1);
    if (event.key === 'ArrowRight') next = Math.max(0, index - 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    const nextItem = items[next];
    if (next !== index && nextItem) { event.preventDefault(); onChange(nextItem.id); document.getElementById(`tab-${nextItem.id}`)?.focus(); }
  };
  return <div className="filter-tabs" role="tablist" aria-label={label}>{items.map((item, index) => <button id={`tab-${item.id}`} key={item.id} role="tab" aria-selected={item.id === active} aria-controls={`panel-${item.id}`} tabIndex={item.id === active ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={(event) => onKeyDown(event, index)}>{item.label}</button>)}</div>;
}

export function FocusedOverlay({ open, onOpenChange, title, description, children, footer, returnFocusId }: PropsWithChildren<{ open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; footer: ReactNode; returnFocusId?: string }>) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content" dir="rtl" onOpenAutoFocus={(event) => { event.preventDefault(); document.getElementById('focused-overlay-title')?.focus(); }} onCloseAutoFocus={(event) => { if (returnFocusId) { event.preventDefault(); document.getElementById(returnFocusId)?.focus(); } }}><div className="dialog-handle" aria-hidden="true" /><div className="dialog-heading"><div><Dialog.Title id="focused-overlay-title" tabIndex={-1}>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close asChild><IconButton label="إغلاق"><X aria-hidden="true" /></IconButton></Dialog.Close></div><div className="dialog-body">{children}</div><div className="dialog-footer">{footer}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export function StopIdentity({ stageLabel, long = false }: { stageLabel: string; long?: boolean }) {
  return <div className="stop-identity"><span className="stage-label"><MapPin aria-hidden="true" />{stageLabel}</span><h2><bdi dir="auto">{long ? 'المهندس حسام الدين عبد الرحمن محمد عبد الله وشركاؤه لاستلام الطلبات' : 'حسام الدين عبد الرحمن'}</bdi></h2><p>١٢ شارع التحرير، الدور الرابع، شقة ١٢ — الاتصال عند الوصول وترك الطلب مع مسؤول الاستلام</p><a className="phone-link" href="tel:+201000000000"><bdi dir="ltr">+20 10 0000 0000</bdi></a></div>;
}

export function BackLabel({ children }: PropsWithChildren) { return <span className="back-label"><ArrowLeft aria-hidden="true" />{children}</span>; }
