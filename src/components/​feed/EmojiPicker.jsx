import { useEffect, useRef } from "react";

const EMOJI = [
  "😀", "😂", "🥹", "😊", "😍", "🤔", "😎", "🙌",
  "👏", "👍", "🔥", "✨", "🎉", "❤️", "💯", "🙏",
  "😢", "😮", "😅", "🤝", "👀", "🚀", "⭐", "😴",
];

/** Small emoji grid popover; calls onSelect(emoji) and stays open for multi-picks. */
export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-20 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 grid grid-cols-8 gap-1"
      role="menu"
    >
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
