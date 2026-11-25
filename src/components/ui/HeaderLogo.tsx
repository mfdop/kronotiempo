import Logo from './Logo'

/** Small logo centered at the top of a granate header. Parent must be `relative`. */
export default function HeaderLogo() {
  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <Logo size={24} color="rgba(255,255,255,0.9)" />
    </div>
  )
}
