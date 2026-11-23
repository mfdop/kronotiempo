import { useState } from 'react'
import type { ReactNode } from 'react'

// ─── CARD ────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}
export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden ${className}`}
      style={{ border: '1px solid rgba(123,31,58,0.11)', ...style }}
    >
      {children}
    </div>
  )
}

// ─── CARD HEADER ─────────────────────────────────────────────────────────────
interface CardHeaderProps {
  title: string
  action?: { label: string; onClick: () => void }
}
export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#A08888' }}>
        {title}
      </span>
      {action && (
        <button onClick={action.onClick}
                className="text-[13px] font-bold"
                style={{ color: '#7B1F3A' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── INFO ROW ────────────────────────────────────────────────────────────────
interface InfoRowProps {
  label: string
  value?: ReactNode
  first?: boolean
}
export function InfoRow({ label, value, first }: InfoRowProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderTop: first ? 'none' : '1px solid rgba(123,31,58,0.11)' }}
    >
      <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
      <span className="text-[13px] font-semibold text-right max-w-[60%]"
            style={{ color: '#1C1010' }}>
        {value ?? <span style={{ color: '#A08888', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
      </span>
    </div>
  )
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
interface SectionHeaderProps {
  children: ReactNode
  action?: { label: string; onClick: () => void }
}
export function SectionHeader({ children, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#A08888' }}>
        {children}
      </span>
      {action && (
        <button onClick={action.onClick}
                className="text-[13px] font-bold"
                style={{ color: '#7B1F3A' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
type BadgeVariant = 'granate' | 'blue' | 'green' | 'amber' | 'red' | 'neutral'

const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  granate: { background: '#F5E8EC', color: '#7B1F3A' },
  blue:    { background: '#E8F0F8', color: '#1A4F7A' },
  green:   { background: '#EAF3EC', color: '#2E6B3E' },
  amber:   { background: '#FDF3DC', color: '#9C6A00' },
  red:     { background: '#FCEAEA', color: '#8C1F1F' },
  neutral: { background: '#F7F3EE', color: '#A08888' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}
export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
      style={BADGE_STYLES[variant]}
    >
      {children}
    </span>
  )
}

// ─── GRANATE BUTTON ──────────────────────────────────────────────────────────
interface GranateButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  fullWidth?: boolean
}
export function GranateButton({
  children, onClick, type = 'button', disabled, fullWidth
}: GranateButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`py-3.5 rounded-xl text-white font-bold text-[14px] transition-opacity ${fullWidth ? 'w-full' : ''}`}
      style={{ background: '#7B1F3A', opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

// ─── GHOST BUTTON ────────────────────────────────────────────────────────────
interface GhostButtonProps {
  children: ReactNode
  onClick?: () => void
  fullWidth?: boolean
}
export function GhostButton({ children, onClick, fullWidth }: GhostButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 rounded-xl text-[14px] font-semibold transition-opacity ${fullWidth ? 'w-full' : ''}`}
      style={{
        border: '1.5px solid rgba(123,31,58,0.22)',
        color: '#6B5555',
        background: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── PAGE HEADER (top nav bar) ────────────────────────────────────────────────
interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
  onBack?: () => void
}
export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
  return (
    <div className="shrink-0" style={{ background: '#7B1F3A' }}>
      {/* Status bar spacer for iOS */}
      <div className="safe-top" />
      <div className="flex items-center justify-between px-4.5 py-2.5 pb-3.5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-white/80 text-[13px] font-medium">
              ‹ Atrás
            </button>
          )}
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-[13px] font-medium rounded-2xl px-3.5 py-1.5"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── HERO HEADER (for animal fichas) ─────────────────────────────────────────
interface HeroHeaderProps {
  name: string
  subtitle: string
  chips?: Array<{ label: string; style?: React.CSSProperties }>
  onBack?: () => void
  avatar?: ReactNode
}
export function HeroHeader({ name, subtitle, chips = [], onBack, avatar }: HeroHeaderProps) {
  return (
    <div
      className="shrink-0 px-4.5 pb-0 pt-2"
      style={{ background: 'linear-gradient(165deg, #5C1629 0%, #7B1F3A 100%)' }}
    >
      <div className="safe-top" />
      {onBack && (
        <button onClick={onBack}
                className="text-[13px] font-medium mb-2.5 block"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
          ‹ Animales
        </button>
      )}
      <div className="flex items-end gap-3.5">
        {avatar && (
          <div className="mb-[-20px] relative z-10 shrink-0">{avatar}</div>
        )}
        <div className="pb-5">
          <h1 className="text-[22px] font-bold text-white tracking-tight">{name}</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {subtitle}
          </p>
          {chips.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {chips.map((chip, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                  style={chip.style ?? { background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── INNER TABS (horizontal scrollable) ──────────────────────────────────────
interface InnerTabsProps {
  tabs: string[]
  active: number
  onChange: (i: number) => void
}
export function InnerTabs({ tabs, active, onChange }: InnerTabsProps) {
  return (
    <div
      className="flex overflow-x-auto scrollbar-hide shrink-0 bg-white px-1.5 pt-5"
      style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}
    >
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(i)}
          className="px-3 pb-2.5 text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors"
          style={{
            color: active === i ? '#7B1F3A' : '#A08888',
            borderBottom: active === i ? '2px solid #7B1F3A' : '2px solid transparent',
            fontWeight: active === i ? 700 : 500,
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ─── BOTTOM SHEET ────────────────────────────────────────────────────────────
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(28,16,16,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl px-5 pb-10 pt-5 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-4"
             style={{ background: 'rgba(123,31,58,0.22)' }} />
        <div className="flex items-center justify-between mb-5">
          {title
            ? <h2 className="text-[17px] font-bold" style={{ color: '#1C1010' }}>{title}</h2>
            : <div />
          }
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] leading-none shrink-0"
                  style={{ background: '#F7F3EE', color: '#6B5555' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── CONFIRM TOAST ────────────────────────────────────────────────────────────
interface ConfirmToastProps {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}
export function ConfirmToast({ open, message, onConfirm, onCancel }: ConfirmToastProps) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-200 whitespace-nowrap"
      style={{
        background: '#1C1010',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transform: open ? 'translateX(-50%)' : 'translateX(-50%) translateY(8px)',
      }}
    >
      <span className="text-white text-[13px] font-medium">{message}</span>
      <button
        onClick={onConfirm}
        className="text-[12px] font-bold px-3 py-1.5 rounded-lg"
        style={{ background: '#7B1F3A', color: '#fff' }}
      >
        Sí
      </button>
      <button
        onClick={onCancel}
        className="text-[12px] font-medium"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        No
      </button>
    </div>
  )
}

// ─── FIELD (form input) ───────────────────────────────────────────────────────
interface FieldProps {
  label: string
  children: ReactNode
  hint?: string
}
export function Field({ label, children, hint }: FieldProps) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
             style={{ color: '#A08888' }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1.5 italic" style={{ color: '#A08888' }}>{hint}</p>}
    </div>
  )
}

export const inputClass = `
  w-full rounded-xl px-4 py-2.5 text-[14px] outline-none
  bg-[#F7F3EE] text-[#1C1010]
`
export const inputStyle: React.CSSProperties = {
  border: '1.5px solid rgba(123,31,58,0.22)',
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-4xl animate-pulse">🐴</div>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}
// ─── DELETE ZONE (2-step confirmation) ───────────────────────────────────────
export function DeleteZone({
  label,
  onDelete,
  isPending = false,
}: {
  label: string
  onDelete: () => void
  isPending?: boolean
}) {
  const [step, setStep] = useState(0)

  if (step === 0) {
    return (
      <button
        onClick={() => setStep(1)}
        className="w-full py-3.5 rounded-xl text-[14px] font-semibold"
        style={{ background: '#FCEAEA', color: '#8C1F1F', border: '1px solid rgba(140,31,31,0.18)' }}
      >
        🗑 Eliminar {label}
      </button>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid rgba(140,31,31,0.35)' }}>
      <div className="px-4 py-3" style={{ background: '#FCEAEA' }}>
        <p className="text-[13px] font-bold" style={{ color: '#8C1F1F' }}>⚠ ¿Confirmar eliminación?</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>
          Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.
        </p>
      </div>
      <div className="flex gap-2 p-3" style={{ background: '#fff' }}>
        <button
          onClick={() => setStep(0)}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: '#F7F3EE', color: '#6B5555' }}
        >
          Cancelar
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: '#8C1F1F', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  )
}

export function EmptyState({ icon = '🐴', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: '#1C1010' }}>{title}</p>
      {subtitle && <p className="text-[13px]" style={{ color: '#A08888' }}>{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold"
          style={{ background: '#7B1F3A' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
