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
  processImageFile,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") onSubmit();
    },
    [onSubmit]
  );

  const handleFileChange = useCallback(
    (e) => {
      if (e.target.files?.[0]) {
        processImageFile(e.target.files[0]);
      }
    },
    [processImageFile]
  );

  return (
    <div className="ask-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              {pastedImage.previewUrl}
              <button
                className="ask-img-remove"
                type="button"
                onClick={clearImage}
              >
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
            disabled={isAsking}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
          />

          {!pastedImage && (
            <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>
          )}
        </div>

        <button
          className={`attach-btn${pastedImage ? " has-img" : ""}`}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>

        <button
          className="send-btn"
          type="button"
          onClick={onSubmit}
          disabled={isAsking}
          style={btnColor ? { background: btnColor } : undefined}
        >
          ➤
        </button>
      </div>
    </div>
  );
});

export default AskBar;