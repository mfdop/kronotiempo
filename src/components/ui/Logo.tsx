interface LogoProps {
  /** Height in px (width follows the aspect ratio) */
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

export default function Logo({ size = 24, color = '#AB2A3E', className, style }: LogoProps) {
  return (
    <svg
      viewBox="100 100 1500 1780"
      height={size}
      width={(size * 1500) / 1780}
      fill={color}
      color={color}
      className={className}
      style={style}
      aria-hidden
    >
      <circle cx="849" cy="1128" r="693" fill="none" stroke="currentColor" strokeWidth="102" />
      <path d="M798 107h102v330H798zM160 533l74-70 136 146-66 71zM1539 533l-74-70-136 146 66 71zM820 645h58v450l4 10 174 170-43 39-188-182-5-12z" />
    </svg>
  )
}
