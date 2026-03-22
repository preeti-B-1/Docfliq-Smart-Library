import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata = { title: "Analytics — DocFliq" };

export default function AnalyticsPage() {
  return (
    <RoleGuard requiredRole="admin">
      <DashboardLayout>
        <div className="flex flex-col gap-6">
<p className="text-muted-foreground">Analytics dashboard coming in Week 2.</p>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
