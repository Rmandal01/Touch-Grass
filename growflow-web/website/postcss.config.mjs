// Tailwind CSS v4 is wired through PostCSS. This is the only Tailwind config needed for
// v4 — the rest is driven by the `@import "tailwindcss"` line in app/globals.css.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
