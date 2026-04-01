import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export const metadata = { title: "Create account — DocFliq" };


export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-violet-600 p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.10) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.07) 0%, transparent 40%)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect width="40" height="40" rx="8" fill="white" fillOpacity="0.2"/>
              <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
              <circle cx="18" cy="12" r="5" fill="white"/>
              <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
              <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
            </svg>
          </div>
          <span className="text-white text-xl font-bold font-display tracking-tight">DocFliq</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight font-display mb-4">
            Join thousands of
            <br />
            medical professionals
          </h2>
          <p className="text-violet-200 text-lg leading-relaxed">
            Access AI-curated medical content across multiple specialties. Free for all clinicians.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              "AI-tagged by specialty and difficulty",
              "Bookmark and track reading history",
              "Ask AI questions about any article",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-violet-100 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-violet-300 text-sm">
          © 2026 DocFliq
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="40" height="40" rx="8" fill="#7C3AED"/>
                <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
                <circle cx="18" cy="12" r="5" fill="white"/>
                <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
                <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-zinc-900 font-display">DocFliq</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 font-display">Create your account</h1>
            </div>

          <div className="flex flex-col gap-5">
            <RegisterForm />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs text-zinc-400">
                <span className="bg-white px-3">or continue with</span>
              </div>
            </div>

            <GoogleAuthButton />

            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
