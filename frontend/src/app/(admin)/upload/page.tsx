import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import UploadForm from "@/components/admin/UploadForm";

export const metadata = { title: "Upload — DocFliq" };

export default function UploadPage() {
  return (
    <RoleGuard requiredRole="admin">
      <DashboardLayout>
        <div className="flex flex-col gap-6">
<UploadForm />
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
