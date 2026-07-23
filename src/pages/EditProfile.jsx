import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";
import Logo from "../components/Logo.jsx";
import FormField from "../components/auth/FormField.jsx";
import AlertBanner from "../components/auth/AlertBanner.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import CoverPhoto from "../components/profile/CoverPhoto.jsx";
import ImageUploadField from "../components/profile/ImageUploadField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { updateProfile, uploadAvatar, uploadCoverPhoto, isUsernameAvailable, SOCIAL_PLATFORMS } from "../lib/profiles.js";

const BIO_LIMIT = 160;

export default function EditProfile() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, setProfile } = useProfile();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", display_name: "", bio: "", social_links: {} });
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | available | taken | invalid
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || "",
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        social_links: profile.social_links || {},
      });
    }
  }, [profile]);

  // Debounced username availability check.
  useEffect(() => {
    if (!profile || form.username === profile.username) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      setUsernameStatus(form.username.length === 0 ? "idle" : "invalid");
      return;
    }
    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      const { available } = await isUsernameAvailable(form.username, user.id);
      setUsernameStatus(available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.username, profile, user?.id]);

  const handleAvatarUpload = async (file) => {
    const { url, error } = await uploadAvatar(user.id, file);
    if (url) setProfile((p) => ({ ...p, avatar_url: url }));
    return { error };
  };

  const handleCoverUpload = async (file) => {
    const { url, error } = await uploadCoverPhoto(user.id, file);
    if (url) setProfile((p) => ({ ...p, cover_url: url }));
    return { error };
  };

  const handleSocialChange = (key, value) => {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess(false);

    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      setFormError("Please fix your username before saving.");
      return;
    }

    setSaving(true);
    const { data, error } = await updateProfile(user.id, {
      username: form.username,
      display_name: form.display_name.trim() || null,
      bio: form.bio.trim() || null,
      social_links: form.social_links,
    });
    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }
    setProfile(data);
    setSuccess(true);
  };

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const usernameHint = {
    idle: null,
    checking: { text: "Checking availability…", color: "text-slate-400", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    available: { text: "Username is available", color: "text-emerald-600", icon: <Check className="w-3.5 h-3.5" /> },
    taken: { text: "Username is already taken", color: "text-red-600", icon: <X className="w-3.5 h-3.5" /> },
    invalid: { text: "3-20 characters: letters, numbers, underscores only", color: "text-red-600", icon: <X className="w-3.5 h-3.5" /> },
  }[usernameStatus];

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to={`/u/${profile.username}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <span className="font-display font-semibold text-slate-900">Voxly</span>
          </div>
          <span className="w-24" aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-slate-900 mb-1">Edit profile</h1>
        <p className="text-sm text-slate-500 mb-8">
          Update how you appear across Voxly — your photos, bio, and links.
        </p>

        <AlertBanner type="error">{formError}</AlertBanner>
        {success && <AlertBanner type="success">Your profile has been updated.</AlertBanner>}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <ImageUploadField shape="rect" label="Change cover" onUpload={handleCoverUpload}>
            <CoverPhoto src={profile.cover_url} className="h-32 sm:h-40" />
          </ImageUploadField>

          <div className="px-6 -mt-10 pb-6">
            <ImageUploadField shape="circle" label="Change photo" onUpload={handleAvatarUpload}>
              <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="xl" ringed />
            </ImageUploadField>
            <p className="mt-3 text-xs text-slate-400">JPEG, PNG, WEBP, or GIF. Avatar up to 5MB, cover up to 8MB.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <FormField
              id="display_name"
              label="Display name"
              value={form.display_name}
              maxLength={50}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Your name"
            />

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">@</span>
                <input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                  className="w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 py-2.5 pl-8 pr-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                />
              </div>
              {usernameHint && (
                <p className={`mt-1.5 text-xs flex items-center gap-1 ${usernameHint.color}`}>
                  {usernameHint.icon}
                  {usernameHint.text}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
                  Bio
                </label>
                <span className="text-xs text-slate-400">
                  {form.bio.length}/{BIO_LIMIT}
                </span>
              </div>
              <textarea
                id="bio"
                rows={3}
                maxLength={BIO_LIMIT}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell people a little about yourself"
                className="w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="font-display font-semibold text-slate-900">Social links</h2>
            {SOCIAL_PLATFORMS.map((platform) => (
              <FormField
                key={platform.key}
                id={`social-${platform.key}`}
                label={platform.label}
                value={form.social_links[platform.key] || ""}
                onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                placeholder={platform.placeholder}
              />
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/u/${profile.username}`)}
              className="text-sm font-medium text-slate-600 px-5 py-2.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || usernameStatus === "checking"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 px-6 py-2.5 rounded-full hover:bg-brand-700 transition-colors disabled:opacity-60 shadow-sm shadow-brand-200"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
