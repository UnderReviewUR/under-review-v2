export default function NflPropGuideSection({ guide, onSelectProp }) {
  return (
    <>
      {guide.map((prop) => (
        <div
          key={`${prop.player}-${prop.propType}`}
          className="nfl-prop-card"
          onClick={() => onSelectProp(prop)}
        >
          <div className="nfl-prop-top">
            <div className="nfl-prop-player">{prop.player}</div>
            <div className="nfl-prop-type">{prop.propType}</div>
          </div>
          <div className="nfl-prop-line">
            Line: {prop.line} · Floor {prop.floor} / Ceil {prop.ceil}
          </div>
          <div className={`nfl-prop-lean ${prop.leanClass}`}>{prop.lean}</div>
        </div>
      ))}
    </>
  );
}
