/**
 * page.tsx
 * --------
 * The GrowFlow hub: one simple view of your live, Supabase-backed plant. The Chrome
 * extension drives it (every tab switch is scored and the points are stored here); this page
 * just shows the current plant and its latest score. All the scoring/logic lives server-side.
 */

import LiveGarden from "@/components/LiveGarden";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-14">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-moss-900">
          Grow<span className="text-moss-500">Flow</span> 🌱
        </h1>
        <p className="mt-2 text-moss-700">
          Focus grows your plant. Doomscrolling makes it wilt.
        </p>
      </header>

      <LiveGarden />

      <footer className="mt-auto pt-4 text-center text-xs text-moss-500">
        Driven by the GrowFlow Chrome extension — switch tabs and watch your plant react.
      </footer>
    </main>
  );
}
