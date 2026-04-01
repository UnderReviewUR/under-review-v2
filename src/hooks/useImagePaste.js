import { useState, useEffect, useCallback, useRef } from "react";

export default function useImagePaste() {
  const [pastedImage, setPastedImage] = useState(null);
  const fileInputRef = useRef(null);

  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPastedImage({
        base64: dataUrl.split(",")[1],
        mediaType: file.type,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setPastedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Global paste handler
  useEffect(() => {
    const handle = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const f = item.getAsFile();
          if (f) processImageFile(f);
          break;
        }
      }
    };
    window.addEventListener("paste", handle);
    return () => window.removeEventListener("paste", handle);
  }, [processImageFile]);

  return { pastedImage, processImageFile, clearImage, fileInputRef };
}
