import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata = { title: "Reading History — DocFliq" };

export default function HistoryPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="flex flex-col gap-6">
<p className="text-muted-foreground">History coming in Week 2.</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
