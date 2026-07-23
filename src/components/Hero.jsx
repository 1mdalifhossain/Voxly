import { ArrowRight } from "lucide-react";
import ConversationBubble from "./ConversationBubble.jsx";

const AVATAR_COLORS = ["bg-brand-600", "bg-brand-400", "bg-brand-800", "bg-brand-500"];

export default function Hero() {
  return (
    <section className="pt-40 pb-28 px-6 bg-gradient-to-b from-brand-50/60 via-white to-white overflow-hidden">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold font-body px-3 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
            </span>
            482 people talking right now
          </div>

          <h1 className="font-display font-semibold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] text-slate-900 mb-6">
            Where conversations
            <br />
            become <span className="text-brand-600">community.</span>
          </h1>

          <p className="font-body text-lg text-slate-500 max-w-md mb-9 leading-relaxed">
            Voxly is the place to post, react, and talk in real time — with people who actually reply.
            No noise, just voices worth hearing.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button className="flex items-center gap-2 bg-brand-600 text-white font-body font-semibold px-6 py-3.5 rounded-full hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button className="font-body font-semibold text-slate-700 px-6 py-3.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors">
              Login
            </button>
          </div>

          <div className="flex items-center gap-3 mt-10">
            <div className="flex -space-x-3">
              {AVATAR_COLORS.map((c, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-white`} />
              ))}
            </div>
            <p className="font-body text-sm text-slate-500">
              <span className="font-semibold text-slate-700">12,000+</span> voices already here
            </p>
          </div>
        </div>

        <div className="relative h-[420px] hidden md:block">
          <ConversationBubble
            name="Priya"
            initials="PR"
            time="2m"
            color="bg-brand-500"
            text="Just launched my first thread here — the replies came in before I even finished typing 😅"
            likes={24}
            className="top-2 left-4 animate-floatA"
          />
          <ConversationBubble
            name="Diego"
            initials="DG"
            time="8m"
            color="bg-brand-700"
            text="Voice rooms on Voxly hit different. Sat in on a live one for an hour without noticing."
            likes={41}
            className="top-40 right-0 animate-floatB"
          />
          <ConversationBubble
            name="Amara"
            initials="AM"
            time="just now"
            color="bg-brand-400"
            text="Posted 3 photos from the trip, got tagged in a memory within a minute 📸"
            likes={12}
            className="top-[19rem] left-10 animate-floatC"
          />
        </div>
      </div>
    </section>
  );
}
