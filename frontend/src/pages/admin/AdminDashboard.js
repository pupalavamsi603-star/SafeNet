import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, ShieldAlert, GraduationCap, Flag, Mail, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Overview } from "./Overview";
import { ScamManager } from "./ScamManager";
import { QuizManager } from "./QuizManager";
import { ReportsView, MessagesView, UsersView } from "./DataViews";
import { api } from "../../lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  const refreshStats = useCallback(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12" data-testid="admin-dashboard-page">
      <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-3">Control center</p>
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter">Admin Dashboard</h1>

      <Tabs defaultValue="overview" className="mt-10">
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="overview" data-testid="admin-tab-overview"><LayoutDashboard className="w-4 h-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="scams" data-testid="admin-tab-scams"><ShieldAlert className="w-4 h-4 mr-1.5" /> Scam Articles</TabsTrigger>
          <TabsTrigger value="quiz" data-testid="admin-tab-quiz"><GraduationCap className="w-4 h-4 mr-1.5" /> Quiz</TabsTrigger>
          <TabsTrigger value="reports" data-testid="admin-tab-reports"><Flag className="w-4 h-4 mr-1.5" /> Reports</TabsTrigger>
          <TabsTrigger value="messages" data-testid="admin-tab-messages"><Mail className="w-4 h-4 mr-1.5" /> Messages</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users"><Users className="w-4 h-4 mr-1.5" /> Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8"><Overview stats={stats} /></TabsContent>
        <TabsContent value="scams" className="mt-8"><ScamManager onChange={refreshStats} /></TabsContent>
        <TabsContent value="quiz" className="mt-8"><QuizManager onChange={refreshStats} /></TabsContent>
        <TabsContent value="reports" className="mt-8"><ReportsView /></TabsContent>
        <TabsContent value="messages" className="mt-8"><MessagesView /></TabsContent>
        <TabsContent value="users" className="mt-8"><UsersView onChange={refreshStats} /></TabsContent>
      </Tabs>
    </div>
  );
}
