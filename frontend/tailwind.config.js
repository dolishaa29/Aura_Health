/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"]
      },
      colors: {
        primary: {
          500: "#22c55e"
        }
      }
    }
  },
  plugins: []
};

