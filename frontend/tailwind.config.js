/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0A0B0D",
        panel: "#14161B",
        panel2: "#1B1E24",
        blood: "#E8283F",
        ember: "#FF6B3D",
        term: "#39FF7A",
        amber: "#FFD23D",
        bone: "#EDEAE4",
        ash: "#8A8F98",
        wire: "#2A2D34",
        agentic: "#3DAFFF",
        boss: "#B026FF",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        body: ["Inter", "'Segoe UI'", "sans-serif"],
      },
      boxShadow: {
        'glow-blood': '0 0 20px -5px rgba(232, 40, 63, 0.4)',
        'glow-term': '0 0 20px -5px rgba(57, 255, 122, 0.4)',
        'glow-boss': '0 0 20px -5px rgba(176, 38, 255, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      keyframes: {
        "slide-in": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "pulse-glow": { '0%, 100%': { opacity: 0.8 }, '50%': { opacity: 0.4 } },
      },
      animation: {
        "slide-in": "slide-in 0.25s ease",
        "pulse-glow": "pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
