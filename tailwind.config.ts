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
        'coach-black': '#121212',
        'coach-gray': '#1E1E1E',
        'coach-gold': '#D4AF37',
        'coach-gold-dark': '#BC962B',
      },
    },
  },
  plugins: [],
};
export default config;