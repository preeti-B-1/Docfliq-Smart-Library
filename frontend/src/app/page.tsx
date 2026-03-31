import Link from "next/link";
/* OLD imports for removed sections: import { BookOpen, Brain, Search, Bookmark } from "lucide-react"; */

/* OLD — simple redirect
import { redirect } from "next/navigation";
export default function HomePage() {
  redirect("/library");
}
*/

function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="mx-auto max-w-screen-xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="40" height="40" rx="8" fill="#7C3AED"/>
                <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
                <circle cx="18" cy="12" r="5" fill="white"/>
                <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
                <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-zinc-900 font-display tracking-tight">DocFliq</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors px-4 py-2 rounded-lg hover:bg-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* features and stats arrays removed along with their sections */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="pt-36 pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/70 via-white to-white pointer-events-none" />
        <div
          className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-8 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 text-sm text-violet-700 font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            AI-powered medical knowledge
          </div>

          <h1 className="text-6xl font-bold text-zinc-900 leading-[1.1] font-display mb-6 tracking-tight">
            The medical library
            <br />
            <span className="text-violet-600">built for clinicians</span>
          </h1>

          <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Discover peer-reviewed articles, case studies, and clinical
            guidelines, for all specialties and searchable in seconds.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-150 shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-zinc-700 font-semibold px-8 py-3.5 rounded-xl text-base border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features and Stats removed */}

      {/* CTA section removed */}

      {/* Footer */}
      <footer className="py-8 px-6 bg-zinc-950">
        <div className="mx-auto max-w-screen-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="40" height="40" rx="8" fill="#7C3AED"/>
                <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
                <circle cx="18" cy="12" r="5" fill="white"/>
                <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
                <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <span className="text-white font-semibold font-display">DocFliq</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 DocFliq. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-zinc-300 transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
