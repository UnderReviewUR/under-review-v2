export default function NflPropGuideSection({ guide, onSelectProp = null }) {
  const clickable = typeof onSelectProp === "function";
  return (
    <>
      {guide.map((prop) => {
        const lineLabel =
          prop.live && (prop.floor === "—" || prop.ceil === "—")
            ? `Line: ${prop.line}${prop.game ? ` · ${prop.game}` : ""}`
            : `Line: ${prop.line} · Floor ${prop.floor} / Ceil ${prop.ceil}`;
        return (
          <div
            key={`${prop.player}-${prop.propType}-${prop.line}-${prop.game || ""}`}
            className="nfl-prop-card"
            onClick={clickable ? () => onSelectProp(prop) : undefined}
            style={clickable ? undefined : { cursor: "default" }}
          >
            <div className="nfl-prop-top">
              <div className="nfl-prop-player">{prop.player}</div>
              <div className="nfl-prop-type">{prop.propType}</div>
            </div>
            <div className="nfl-prop-line">{lineLabel}</div>
            <div className={`nfl-prop-lean ${prop.leanClass || ""}`}>{prop.lean}</div>
          </div>
        );
      })}
    </>
  );
}
