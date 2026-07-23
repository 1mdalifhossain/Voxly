export default function Logo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 10C4 6.68629 6.68629 4 10 4H30C33.3137 4 36 6.68629 36 10V22C36 25.3137 33.3137 28 30 28H16L8 35V28H10C6.68629 28 4 25.3137 4 22V10Z"
        fill="#2563EB"
      />
      <path
        d="M14 12L20 22L26 12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
