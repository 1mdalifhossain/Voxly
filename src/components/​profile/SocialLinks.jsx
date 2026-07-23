import { Globe, Twitter, Instagram, Github, Youtube } from "lucide-react";

const ICONS = {
  website: Globe,
  twitter: Twitter,
  instagram: Instagram,
  github: Github,
  youtube: Youtube,
};

function normalizeUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Row of icon links for whichever social platforms the profile has set. */
export default function SocialLinks({ links, className = "" }) {
  const entries = Object.entries(links || {}).filter(([, url]) => !!url?.trim());
  if (entries.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {entries.map(([key, url]) => {
        const Icon = ICONS[key] || Globe;
        return (
          <a
            key={key}
            href={normalizeUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}
