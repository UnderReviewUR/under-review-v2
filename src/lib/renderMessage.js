// ── Chat message renderer — strips markdown, handles bullet blocks ───────────

export function renderMessage(text) {
  if (!text) return null;

  const clean = String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();

  return clean.split(/\n{2,}/).map((para, i) => {
    const lines = para.split("\n").map(s => s.trim()).filter(Boolean);
    const allBullets = lines.length > 1 &&
      lines.every(l => l.startsWith("•") || (l.includes(" — ") && !l.endsWith(".")));

    if (allBullets) {
      return (
        <div key={i} style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
          {lines.map((line, j) => {
            const norm  = line.startsWith("•") ? line.slice(1).trim() : line;
            const parts = norm.split("—").map(s => s.trim());
            const head  = parts[0] || "";
            const tail  = parts.slice(1).join(" — ");
            return (
              <div key={j} style={{ background:"rgba(8,145,178,.06)", border:"1px solid rgba(8,145,178,.12)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontWeight:600, color:"var(--text)", fontSize:13, marginBottom: tail ? 4 : 0 }}>{head}</div>
                {tail && <div style={{ fontSize:12, color:"var(--soft)", lineHeight:1.55 }}>{tail}</div>}
              </div>
            );
          })}
        </div>
      );
    }

    return <div key={i} style={{ lineHeight:1.7, marginBottom:10 }}>{para}</div>;
  });
}
