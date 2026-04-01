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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} alt="Attached preview" className="ask-img-thumb" />
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
            disabled={isAsking}
          />

          {!pastedImage && <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>}
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
          style={btnColor ? { background: btnColor } : undefined}
          onClick={onSubmit}
          disabled={isAsking}
          type="button"
        >
          ➤
        </button>
      </div>
    </div>
  );
});

export default AskBar;
