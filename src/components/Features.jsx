import { Zap, Mic, Image as ImageIcon, Users, Bell, MessageCircle } from "lucide-react";
import FeatureCard from "./FeatureCard.jsx";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time everything",
    desc: "Messages, reactions, and notifications land the instant they happen — powered by Supabase Realtime.",
  },
  {
    icon: Mic,
    title: "Voice rooms",
    desc: "Drop into a live audio room and talk instead of type, whenever a thread is better spoken.",
  },
  {
    icon: ImageIcon,
    title: "Rich media posts",
    desc: "Share photos and clips at full quality, hosted and streamed straight from Supabase Storage.",
  },
  {
    icon: Users,
    title: "Communities",
    desc: "Start a space around what you're into and grow it with people who show up for it too.",
  },
  {
    icon: Bell,
    title: "Signal, not noise",
    desc: "Notifications are tuned to what you actually engage with — nothing else gets through.",
  },
  {
    icon: MessageCircle,
    title: "Secure sign-in",
    desc: "Auth handled by Supabase, so your account stays yours and your data stays protected.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-xl mb-16">
          <p className="font-body text-sm font-semibold text-brand-600 mb-3">Features</p>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl text-slate-900 mb-4">
            Built for conversations that actually go somewhere.
          </h2>
          <p className="font-body text-slate-500 text-lg leading-relaxed">
            Every part of Voxly is built to keep people talking — not scrolling past each other.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
