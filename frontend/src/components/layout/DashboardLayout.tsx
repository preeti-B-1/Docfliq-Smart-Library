import Navbar from "@/components/layout/Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-screen-xl px-4 py-4 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
