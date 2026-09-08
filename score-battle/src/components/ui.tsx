import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cx('rounded-xl border border-line bg-surface', className)}>{children}</section>
)

export const SectionTitle = ({ children, aside }: { children: ReactNode; aside?: ReactNode }) => (
  <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
    <h2 className="text-[13px] font-semibold tracking-tight text-ink-soft">{children}</h2>
    {aside ? <div className="text-[11px] text-ink-mute">{aside}</div> : null}
  </div>
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = ({ variant = 'outline', size = 'md', className, ...rest }: ButtonProps) => {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors ' +
    'disabled:cursor-not-allowed disabled:opacity-40 select-none active:translate-y-px'
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-11 px-4 text-[14px]' }
  const variants = {
    primary: 'bg-ink text-canvas hover:opacity-90',
    outline: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
    ghost: 'text-ink-soft hover:bg-surface-2',
    danger: 'border border-red-500/40 text-red-500 hover:bg-red-500/10',
  }
  return <button className={cx(base, sizes[size], variants[variant], className)} {...rest} />
}

export const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cx(
      'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
      checked ? 'border-transparent bg-ink' : 'border-line-strong bg-surface-2',
    )}
  >
    <span
      className={cx(
        'absolute top-0.5 size-4.5 rounded-full transition-all',
        checked ? 'left-6 bg-canvas' : 'left-0.5 bg-line-strong',
      )}
    />
  </button>
)

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) => (
  <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cx(
          'h-8 rounded-[6px] px-3 text-[12.5px] font-medium transition-colors',
          value === o.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-ink-mute',
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
)

export const Modal = ({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onCancel} />
      <div className="rise relative m-3 w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-[16px] font-semibold">{title}</h3>
        {description ? <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{description}</p> : null}
        {children}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button className="flex-1" variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="px-1 py-8 text-center text-[13px] leading-relaxed text-ink-mute">{children}</p>
)
