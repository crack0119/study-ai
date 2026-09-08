import { cx } from './ui'

export interface OptionGroup {
  label: string
  options: string[]
}

export const SubjectSelect = ({
  value,
  onChange,
  options,
  groups,
  placeholder,
}: {
  value: string | null
  onChange: (v: string | null) => void
  options?: string[]
  groups?: OptionGroup[]
  placeholder: string
}) => (
  <div className="relative min-w-0 flex-1">
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cx(
        'h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-8 text-[14px]',
        'focus:outline-none focus:ring-2 focus:ring-ink/15',
        value ? 'text-ink' : 'text-ink-mute',
      )}
    >
      <option value="">{placeholder}</option>
      {options?.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      {groups?.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
)
