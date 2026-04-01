import { memo, useCallback } from "react";

const AskBar = memo(function AskBar({
  inputRef, fileInputRef, value, onChange, onSubmit,
  placeholder, btnColor, pastedImage, clearImage, isAsking, processImageFile,
}) {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);
  const handleKeyDown = useCallback((e) => { if (e.key === "Enter") onSubmit(); }, [onSubmit]);
  const handleFileChange = useCallback((e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); }, [processImageFile]);

  return (
    <div className="ask-wrap">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} alt="Attached" className="ask-img-thumb" />
              <button className="ask-img-remove" onClick={clearImage} type="button">✕ Remove</button>
            </div>
          )}
          <input
            ref={inputRef}
            className="ask-bar"
            value={value}
            onChange={handleChange}
            placeholder={pastedImage ? "Ask about this image..." : placeholder}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
          />
          {!pastedImage && <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>}
        </div>

        <button className={`attach-btn${pastedImage ? " has-img" : ""}`} onClick={() => fileInputRef.current?.click()} type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <button className="send-btn" onClick={onSubmit} disabled={isAsking} type="button" style={btnColor ? { background: btnColor } : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

export default AskBar;
