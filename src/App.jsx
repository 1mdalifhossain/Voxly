import NavBar from "./components/NavBar.jsx";
import Hero from "./components/Hero.jsx";
import Features from "./components/Features.jsx";
import ScreenshotSection from "./components/ScreenshotSection.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <div className="bg-white">
      <NavBar />
      <main>
        <Hero />
        <Features />
        <ScreenshotSection />
      </main>
      <Footer />
    </div>
  );
}
