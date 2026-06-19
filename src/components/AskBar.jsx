import { memo, useCallback } from "react";

function IconPaperclip({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.5 6.5v9.25a4.25 4.25 0 1 1-8.5 0V5.75a2.75 2.75 0 1 1 5.5 0v9.5a1.25 1.25 0 1 1-2.5 0V7h-1.5v8.25a2.75 2.75 0 1 0 5.5 0V5.75a4.25 4.25 0 1 0-8.5 0v10a5.75 5.75 0 0 0 11.5 0V6.5h-1.5z"
      />
    </svg>
  );
}

function IconSend({ className }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.4 20.4 21 12 3.4 3.6l2.2 6.4L17 12 5.6 15.4 3.4 20.4z"
      />
    </svg>
  );
}

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
  processImageFile,
  /** When false, skip the "PASTE IMAGE…" subline (e.g. hero copy already covers it). */
  showPasteHint = true,
  bettingStyle = "balanced",
  isUnlimited = false,
  /** Optional chip above the input (e.g. free-tier quota warning). */
  freeLimitChip = null,
  /** When true (only pass from fixed dock in App.jsx): logo-gradient border on text input; CSS scoped to `.docked-bar` / `.docked-interaction-zone`. */
  dockedGradient = false,
  /** Override paste/attach subline copy (default: PASTE IMAGE…). */
  pasteHintText = null,
  /** `home` = multiline hero; `wc-inline` = single-row form (mobile keyboard send). */
  layout = "default",
}) {
  const busy = isAsking;
  const canSubmit = !busy && String(value || "").trim().length > 0;

  const askInputProps = {
    inputMode: "text",
    autoComplete: "off",
    autoCorrect: "on",
    spellCheck: true,
    autoCapitalize: "sentences",
    enterKeyHint: "send",
  };

  const handleFormSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!canSubmit) return;
      onSubmit();
    },
    [canSubmit, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }
    },
    [canSubmit, onSubmit],
  );

  const handleFile = useCallback(
    (e) => {
      if (e.target.files?.[0]) {
        processImageFile(e.target.files[0]);
      }
    },
    [processImageFile]
  );

  const wrapClass = [
    "ask-wrap",
    dockedGradient ? "ask-wrap--docked-gradient" : "",
    layout === "home" ? "ask-wrap--home" : "",
    layout === "wc-inline" ? "ask-wrap--wc-inline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass}>
      {freeLimitChip}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {dockedGradient ? (
        <>
          {isUnlimited && bettingStyle === "limits" && (
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 9,
                color: "var(--muted)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                paddingBottom: 4,
                paddingLeft: 2,
              }}
            >
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
          {!pastedImage && showPasteHint && (
            <div className="ur-docked-paste-hint">{pasteHintText || "PASTE IMAGE OR TAP ATTACH"}</div>
          )}
          <form className="ask-form ask-form--docked" onSubmit={handleFormSubmit}>
            <div className="ask-row ask-row--docked-triple">
              <button
                className={`attach-btn ur-dock-icon-btn ur-dock-attach${pastedImage ? " has-img" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                aria-label="Attach image"
              >
                <IconPaperclip className="ur-dock-icon-svg" />
              </button>
              <div className="ur-dock-input-mid">
                <div className="ask-bar-gradient-frame">
                  <div className="ask-bar-docked-inner">
                    <div className="ask-bar-docked-input-slot">
                      <input
                        ref={inputRef}
                        className="ask-bar ask-bar--docked-fill"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pastedImage ? "Ask about this image..." : placeholder}
                        disabled={busy}
                        {...askInputProps}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="send-btn ur-dock-icon-btn ur-dock-send"
                disabled={!canSubmit}
                title={isAsking ? "Working…" : "Send"}
                type="submit"
                aria-label="Send"
              >
                {isAsking ? (
                  <span className="ur-dock-send-busy" aria-hidden>
                    …
                  </span>
                ) : (
                  <IconSend className="ur-dock-icon-svg ur-dock-icon-svg--on-magenta" />
                )}
              </button>
            </div>
          </form>
        </>
      ) : layout === "wc-inline" ? (
        <>
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} className="ask-img-thumb" alt="" />
              <button onClick={clearImage} type="button" className="ask-img-remove">
                ✕ Remove
              </button>
            </div>
          )}
          {!pastedImage && showPasteHint ? (
            <div className="ask-wc-inline-hint">{pasteHintText || "Paste a slip, line, or matchup."}</div>
          ) : null}
          <form className="ask-form ask-form--wc-inline" onSubmit={handleFormSubmit}>
            <div className="ask-row ask-row--wc-inline">
              <button
                className={`ask-wc-inline-attach${pastedImage ? " has-img" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                aria-label="Attach image"
              >
                <IconPaperclip className="ask-wc-inline-icon" />
              </button>
              <input
                ref={inputRef}
                className="ask-bar ask-bar--wc-inline"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pastedImage ? "Ask about this image..." : placeholder}
                disabled={busy}
                {...askInputProps}
              />
              <button
                className="ask-wc-inline-send"
                disabled={!canSubmit}
                title={isAsking ? "Working…" : "Send"}
                type="submit"
                aria-label="Send"
                style={btnColor ? { background: btnColor } : undefined}
              >
                {isAsking ? (
                  <span aria-hidden>…</span>
                ) : (
                  <IconSend className="ask-wc-inline-icon ask-wc-inline-icon--send" />
                )}
              </button>
            </div>
          </form>
        </>
      ) : layout === "home" ? (
        <div className="ask-row ask-row--home-hero">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} className="ask-img-thumb" alt="" />
              <button onClick={clearImage} type="button" className="ask-img-remove">
                ✕ Remove
              </button>
            </div>
          )}
          <div className={`ask-home-hero-frame${value?.trim() ? " has-text" : ""}`}>
            <div className="ask-home-hero-inner">
              <textarea
                ref={inputRef}
                className="ask-bar ask-bar--home-hero"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder={pastedImage ? "Ask about this image..." : placeholder}
                disabled={busy}
                rows={3}
                {...askInputProps}
              />
              <div className="ask-home-hero-foot">
                {!pastedImage && showPasteHint ? (
                  <span className="ask-home-hero-paste-hint">
                    {pasteHintText || "Paste a slip, line, or matchup."}
                  </span>
                ) : (
                  <span className="ask-home-hero-paste-hint ask-home-hero-paste-hint--empty" aria-hidden />
                )}
                <div className="ask-home-hero-actions">
                  <button
                    className={`ask-home-hero-attach${pastedImage ? " has-img" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    aria-label="Attach image"
                  >
                    <IconPaperclip className="ask-home-hero-attach-icon" />
                  </button>
                  <button
                    className="ask-home-hero-send"
                    onClick={onSubmit}
                    disabled={busy || !String(value || "").trim()}
                    title={isAsking ? "Working…" : "Send"}
                    type="button"
                    aria-label="Send"
                  >
                    {isAsking ? (
                      <span aria-hidden>…</span>
                    ) : (
                      <IconSend className="ask-home-hero-send-icon" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ask-row">
            <div className="ask-col">
              {isUnlimited && bettingStyle === "limits" && (
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 9,
                    color: "var(--muted)",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    paddingBottom: 4,
                    paddingLeft: 2,
                  }}
                >
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
                placeholder={pastedImage ? "Ask about this image..." : placeholder}
                disabled={busy}
                {...askInputProps}
              />

              {!pastedImage && showPasteHint && (
                <div className="ask-hint">{pasteHintText || "PASTE IMAGE OR TAP ATTACH"}</div>
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
              title={isAsking ? "Working…" : undefined}
              type="button"
            >
              {isAsking ? "…" : "➤"}
            </button>
        </div>
      )}
    </div>
  );
});

export default AskBar;
