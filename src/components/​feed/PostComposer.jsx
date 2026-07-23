import { useRef, useState } from "react";
import { Image as ImageIcon, Smile, X, Loader2 } from "lucide-react";
import Avatar from "../profile/Avatar.jsx";
import EmojiPicker from "./EmojiPicker.jsx";
import { extractHashtags, createPost } from "../../lib/posts.js";

const MAX_LENGTH = 2000;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";

export default function PostComposer({ userId, profile, onPostCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const hashtags = extractHashtags(content);
  const canPost = (content.trim().length > 0 || imageFile) && content.length <= MAX_LENGTH && !posting;

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + emoji);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    setError("");

    const { data, error: err } = await createPost(userId, { content, imageFile });

    setPosting(false);
    if (err) {
      setError(err.message || "Couldn't publish your post. Please try again.");
      return;
    }

    setContent("");
    removeImage();
    setShowEmoji(false);
    onPostCreated?.(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-5"
    >
      <div className="flex gap-3">
        <Avatar src={profile?.avatar_url} name={profile?.display_name || profile?.username} size="sm" />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            rows={3}
            maxLength={MAX_LENGTH + 200}
            className="w-full resize-none border-0 focus:ring-0 outline-none text-[15px] text-slate-900 placeholder:text-slate-400 leading-relaxed"
          />

          {imagePreview && (
            <div className="relative mt-1 mb-2 inline-block max-w-full">
              <img src={imagePreview} alt="Selected upload preview" className="max-h-64 rounded-xl border border-slate-100 object-cover" />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove image"
                className="absolute top-2 right-2 bg-slate-900/70 text-white rounded-full p-1 hover:bg-slate-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {hashtags.map((tag) => (
                <span key={tag} className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1 relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
                className="p-2 rounded-full text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleImagePick} />

              <button
                type="button"
                onClick={() => setShowEmoji((s) => !s)}
                aria-label="Add emoji"
                className="p-2 rounded-full text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs ${content.length > MAX_LENGTH ? "text-red-600" : "text-slate-400"}`}>
                {content.length}/{MAX_LENGTH}
              </span>
              <button
                type="submit"
                disabled={!canPost}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-600 px-4 py-2 rounded-full hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:hover:bg-brand-600"
              >
                {posting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
