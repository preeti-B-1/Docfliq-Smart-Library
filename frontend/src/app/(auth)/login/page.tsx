import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export const metadata = { title: "Sign in — DocFliq" };



export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl overflow-hidden mb-4">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect width="40" height="40" rx="8" fill="#7C3AED"/>
              <rect x="8" y="20" width="16" height="14" rx="2" fill="white"/>
              <circle cx="18" cy="12" r="5" fill="white"/>
              <circle cx="28" cy="12" r="4" fill="white" fillOpacity="0.7"/>
              <circle cx="30" cy="22" r="4" fill="white" fillOpacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 font-display">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to your DocFliq account</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-card p-8 flex flex-col gap-5">
          <LoginForm />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs text-zinc-400">
              <span className="bg-white px-3">or</span>
            </div>
          </div>

          <GoogleAuthButton />

          <p className="text-center text-sm text-zinc-500">
            No account?{" "}
            <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              Register for free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
