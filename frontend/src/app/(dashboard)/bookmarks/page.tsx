import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata = { title: "My Bookmarks — DocFliq" };

export default function BookmarksPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="flex flex-col gap-6">
<p className="text-muted-foreground">Bookmarks coming in Week 2.</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
