/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  
  // REQUIRED: This tells Tailwind to use NativeWind's rules
  presets: [require("nativewind/preset")],
  
  theme: {
    extend: {
      colors: {
        primary: "#2E7D32",
        secondary: "#F57C00",
        surface: "#FFFFFF",
      },
      borderRadius: {
        soft: "14px",
      },
      boxShadow: {
        soft: "0 4px 16px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};