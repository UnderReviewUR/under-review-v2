import { useCallback, useEffect, useState } from "react";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

export default function useImagePaste(fileInputRef) {
  const [pastedImage, setPastedImage] = useState(null);

  const clearImage = useCallback(() => {
    setPastedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef?.current) fileInputRef.current.value = "";
  }, [fileInputRef]);

  const processImageFile = useCallback(async (file) => {
    if (!file || !file.type?.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);
    const dataUrl = await fileToDataUrl(file);
    const parsed = parseDataUrl(dataUrl);

    setPastedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        fileName: file.name,
        previewUrl,
        mediaType: parsed?.mediaType || file.type,
        base64: parsed?.base64 || "",
      };
    });
  }, []);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items || [];
      for (const item of items) {
        if (!item.type?.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) {
          processImageFile(file).catch(() => {});
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  useEffect(() => {
    return () => {
      setPastedImage((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
    };
  }, []);

  return {
    pastedImage,
    clearImage,
    processImageFile,
  };
}
