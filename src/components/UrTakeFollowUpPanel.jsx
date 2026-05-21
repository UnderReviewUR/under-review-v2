import UrTakeFollowUpChip from "./UrTakeFollowUpChip.jsx";

/**
 * Follow-up suggestion row — kicker + ghost chips (single layout for thread + dock).
 * @param {{
 *   kicker?: string,
 *   labels: string[],
 *   onPick: (label: string, index: number) => void,
 *   className?: string,
 *   chipVariantAtIndex?: (index: number) => 'cyan'|'magenta',
 * }} props
 */
export default function UrTakeFollowUpPanel({
  kicker = "Go deeper",
  labels = [],
  onPick,
  className = "",
  chipVariantAtIndex = (idx) => (idx % 2 === 0 ? "cyan" : "magenta"),
}) {
  const items = (Array.isArray(labels) ? labels : []).filter((t) => String(t || "").trim());
  if (!items.length) return null;

  return (
    <div
      className={`ur-take-follow-up-panel${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Suggested follow-ups"
    >
      <p className="ur-take-follow-up-panel__kicker">{kicker}</p>
      <div className="ur-take-follow-up-panel__chips">
        {items.map((label, idx) => (
          <UrTakeFollowUpChip
            key={`${label}-${idx}`}
            variant={chipVariantAtIndex(idx)}
            onMouseDown={(e) => {
              if (e.button === 0) e.preventDefault();
            }}
            onClick={() => {
              if (typeof onPick === "function") onPick(label, idx);
            }}
          >
            {label}
          </UrTakeFollowUpChip>
        ))}
      </div>
    </div>
  );
}
