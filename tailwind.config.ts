import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-void': '#0A0A0F',
        'bg-panel': '#14141C',
        'neon-violet': '#A742F5',
        'neon-cyan': '#00F0FF',
        'neon-crimson': '#FF2E4D',
        'text-primary': '#E8E8F0',
        'text-muted': '#6B6B7D',
        border: '#2D2D3F',
      },
      fontFamily: {
        'display': ['Rajdhani', 'Orbitron', 'sans-serif'],
        'body': ['Inter', 'Sora', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Display sizes
        'display-2xl': ['3rem', { lineHeight: '1' }],
        'display-xl': ['2.5rem', { lineHeight: '1' }],
        'display-lg': ['2rem', { lineHeight: '1' }],
        'display-md': ['1.75rem', { lineHeight: '1.2' }],
        // Body sizes
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'body-base': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.4' }],
      },
      spacing: {
        // Scoreboard card dimensions (maintaining screen real estate)
        'scoreboard-w': '320px',
        'scoreboard-h': '200px',
      },
      borderRadius: {
        // Game-like sharp but not harsh
        'scoreboard': '8px',
      },
      boxShadow: {
        // Subtle glow effects
        'neon': '0 0 10px rgba(167, 66, 245, 0.5)',
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.5)',
        'neon-crimson': '0 0 10px rgba(255, 46, 77, 0.5)',
        'scoreboard': '0 4px 20px rgba(0, 0, 0, 0.6)',
      },
      screens: {
        // Match typical gaming/streaming setups
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1440px',
      },
    },
  },
  plugins: [],
};
export default config;
