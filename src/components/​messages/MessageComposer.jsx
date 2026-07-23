import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, X, Loader2 } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder.jsx";

const TYPING_STOP_DELAY = 2500;

/**
 * The message input bar: text (with live typing broadcast), an image picker
 * with an inline preview + caption, and a voice recorder. Only one of
 * text/image/voice goes out per send.
 */
export default function MessageComposer({ onSendText, onSendImage, onSendVoice, onTypingChange, disabled = false }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [sending, setSending] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) onTypingChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTextChange = (value) => {
    setText(value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange?.(true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingChange?.(false);
    }, TYPING_STOP_DELAY);
  };

  const stopTyping = () => {
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange?.(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (sending) return;
    stopTyping();

    if (imageFile) {
      setSending(true);
      await onSendImage?.(imageFile, text);
      setImageFile(null);
      setText("");
      setSending(false);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    await onSendText?.(trimmed);
    setText("");
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceSend = async (blob, duration, mimeType) => {
    setSending(true);
    await onSendVoice?.(blob, duration, mimeType);
    setSending(false);
  };

  const canSendText = text.trim().length > 0 || !!imageFile;

  return (
    <div className="border-t border-slate-100 bg-white px-3 sm:px-4 py-3">
      {imagePreviewUrl && (
        <div className="relative inline-block mb-2 ml-1">
          <img src={imagePreviewUrl} alt="Selected" className="h-20 w-20 object-cover rounded-xl border border-slate-200" />
          <button
            type="button"
            onClick={() => setImageFile(null)}
            aria-label="Remove image"
            className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 hover:bg-slate-900"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Attach an image"
          className="p-2.5 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50 shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder={imageFile ? "Add a caption…" : "Message…"}
          disabled={disabled || sending}
          className="flex-1 resize-none bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 max-h-[120px]"
        />

        {canSendText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || sending}
            aria-label="Send message"
            className="p-2.5 rounded-full text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        ) : (
          <div className="shrink-0">
            <VoiceRecorder onSend={handleVoiceSend} disabled={disabled || sending} />
          </div>
        )}
      </div>
    </div>
  );
}
