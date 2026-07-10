/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        surface: "#fafafa",
        "surface-elevated": "#ffffff",
        border: "#e8e8e8",
        "border-subtle": "#f0f0f0",
        text: "#1a1a1a",
        "text-secondary": "#6b6b6b",
        "text-tertiary": "#9a9a9a",
        accent: "#0071e3",
        "accent-hover": "#0077ed",
        sidebar: "#f5f5f7",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};
