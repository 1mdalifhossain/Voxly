import { Heart, Repeat2, Send } from "lucide-react";

const SIDEBAR_ITEMS = ["Home", "Rooms", "Communities", "Messages", "Notifications"];

const MOCK_POSTS = [
  {
    name: "Sofia Reyes",
    handle: "@sofia",
    text: "New product shots from the studio today — the blue set is my favorite so far.",
    likes: 58,
    reposts: 6,
  },
  {
    name: "Kenji Aoki",
    handle: "@kenji",
    text: "Live room starting in 10: talking through this week's design crit.",
    likes: 33,
    reposts: 9,
  },
];

export default function ScreenshotSection() {
  return (
    <section id="screens" className="py-28 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto text-center mb-14">
        <p className="font-body text-sm font-semibold text-brand-600 mb-3">Inside Voxly</p>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-slate-900 mb-4">
          One feed. Every voice.
        </h2>
        <p className="font-body text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
          A single scroll for posts, replies, and rooms — designed to feel calm, not chaotic.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-900/10 overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
            <span className="ml-3 font-body text-xs text-slate-400">voxly.app</span>
          </div>

          <div className="grid sm:grid-cols-[220px_1fr] min-h-[380px]">
            <div className="hidden sm:flex flex-col gap-1 p-4 border-r border-slate-100 bg-slate-50/60 font-body text-sm">
              {SIDEBAR_ITEMS.map((label, i) => (
                <div
                  key={label}
                  className={`px-3 py-2 rounded-lg ${i === 0 ? "bg-brand-600 text-white font-medium" : "text-slate-500"}`}
                >
                  {label}
                </div>
              ))}
              <div className="mt-auto flex items-center gap-2 px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-brand-500" />
                <span className="text-slate-600 text-xs">@you</span>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {MOCK_POSTS.map((post) => (
                <div key={post.handle} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-brand-400" />
                    <div>
                      <p className="font-body text-sm font-semibold text-slate-800">{post.name}</p>
                      <p className="font-body text-xs text-slate-400">{post.handle}</p>
                    </div>
                  </div>
                  <p className="font-body text-sm text-slate-600 mb-3">{post.text}</p>
                  <div className="flex items-center gap-5 text-slate-400 font-body text-xs">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3.5 h-3.5" />
                      {post.reposts}
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
