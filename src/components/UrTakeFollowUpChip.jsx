/** Shared class names for UR Take follow-up / suggestion chips (styles in appBaseCss.js). */
export const UR_TAKE_FOLLOW_UP_CHIP_CLASS = "ur-take-follow-up-chip";
export const UR_TAKE_FOLLOW_UP_CHIP_VARIANTS = ["cyan", "magenta"];

/**
 * Brand ghost pill — cyan or magenta border, transparent fill, white body-weight text.
 * @param {{ children: import('react').ReactNode, variant?: 'cyan'|'magenta', className?: string } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export default function UrTakeFollowUpChip({
  children,
  variant = "cyan",
  className = "",
  type = "button",
  ...rest
}) {
  const mod =
    variant === "magenta"
      ? "ur-take-follow-up-chip--magenta"
      : "ur-take-follow-up-chip--cyan";
  return (
    <button
      type={type}
      className={`${UR_TAKE_FOLLOW_UP_CHIP_CLASS} ${mod}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
