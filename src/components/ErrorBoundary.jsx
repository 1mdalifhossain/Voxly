import React from "react";
import Logo from "./Logo.jsx";

/**
 * Catches render/lifecycle errors anywhere below it in the tree and shows a
 * recovery screen instead of an unmounted, blank white page. Wrap this
 * around the whole app (see main.jsx) as a last line of defense — it does
 * not replace per-feature error handling (like the try/catch blocks in
 * lib/*.js), which should still handle expected failures gracefully.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Swap this for real error reporting (Sentry, etc.) in production.
    console.error("Voxly crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo className="w-10 h-10" />
        <h1 className="font-display text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Voxly ran into an unexpected error. Try reloading — if this keeps happening, let us know.
        </p>
        <button
          onClick={this.handleReload}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Reload Voxly
        </button>
      </div>
    );
  }
}
