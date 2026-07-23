import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

/**
 * Renders `children` (the current image preview) with a hover/tap overlay
 * that opens a file picker and immediately calls `onUpload(file)`.
 */
export default function ImageUploadField({ onUpload, shape = "circle", label, children, className = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    setUploading(true);
    const result = await onUpload(file);
    setUploading(false);
    if (result?.error) {
      setError(result.error.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className={className}>
      <div className={`relative group ${shapeClass} overflow-hidden`}>
        {children}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={label || "Change photo"}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 group-hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:bg-black/40 transition-all ${shapeClass}`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              {label && <span className="text-xs font-medium">{label}</span>}
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
