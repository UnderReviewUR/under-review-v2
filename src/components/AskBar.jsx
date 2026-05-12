import { memo, useCallback } from "react";

const AskBar = memo(function AskBar({
  inputRef,
  fileInputRef,
  value,
  onChange,
  onSubmit,
  placeholder,
  btnColor,
  pastedImage,
  clearImage,
  isAsking,
  prefetchingContext = false,
  processImageFile,
  /** When false, skip the "PASTE IMAGE…" subline (e.g. hero copy already covers it). */
  showPasteHint = true,
  bettingStyle = "balanced",
  isUnlimited = false,
  /** Optional chip above the input (e.g. free-tier quota warning). */
  freeLimitChip = null,
  /** Optional: scroll chat when input is focused (mobile keyboard). Wired from App via askBarCommon. */
  onInputFocus,
}) {
  const busy = isAsking || prefetchingContext;

  const handleInputFocus = useCallback(() => {
    if (typeof onInputFocus === "function") onInputFocus();
  }, [onInputFocus]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") onSubmit();
    },
    [onSubmit]
  );

  const handleFile = useCallback(
    (e) => {
      if (e.target.files?.[0]) {
        processImageFile(e.target.files[0]);
      }
    },
    [processImageFile]
  );

  return (
    <div className="ask-wrap">
      {freeLimitChip}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      <div className="ask-row">
        <div className="ask-col">
          {isUnlimited && bettingStyle === "limits" && (
            <div style={{
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              color: "var(--muted)",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              paddingBottom: 4,
              paddingLeft: 2,
            }}>
              🔥 Limits mode
            </div>
          )}
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} className="ask-img-thumb" alt="" />
              <button onClick={clearImage} type="button" className="ask-img-remove">
                ✕ Remove
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            className="ask-bar"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={pastedImage ? "Ask about this image..." : placeholder}
            disabled={busy}
          />

          {!pastedImage && showPasteHint && (
            <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>
          )}
        </div>

        <button
          className={`attach-btn${pastedImage ? " has-img" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          📎
        </button>

        <button
          className="send-btn"
          style={btnColor ? { background: btnColor, color: "#080A0C" } : undefined}
          onClick={onSubmit}
          disabled={busy}
          title={prefetchingContext ? "Loading context…" : undefined}
          type="button"
        >
          {prefetchingContext ? "…" : "➤"}
        </button>
      </div>
    </div>
  );
});

export default AskBar;
