import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, DollarSign, CheckCircle } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  upcomingSessions: number;
  completedThisMonth: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    upcomingSessions: 0,
    completedThisMonth: 0,
  });
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    loadStats();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Get session first (often faster)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error("No session found");
        setDisplayName("User");
        return;
      }

      const user = session.user;
      console.log("User:", user);
      console.log("User metadata:", user.user_metadata);

      // Try to get profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      
      console.log("Profile:", profile);
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      // Use full_name from profile if available, otherwise try user metadata, then email, then "User"
      const fullName = profile?.full_name?.trim() || user.user_metadata?.full_name?.trim();
      const email = profile?.email || user.email;
      
      console.log("Full name:", fullName, "Email:", email);
      
      if (fullName) {
        setDisplayName(fullName);
      } else if (email) {
        setDisplayName(email);
      } else {
        setDisplayName("User");
      }
    } catch (error) {
      console.error("Error in loadUserProfile:", error);
      setDisplayName("User");
    }
  };

  const loadStats = async () => {
    // Get total and active students
    const { count: totalStudents } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    const { count: activeStudents } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Get upcoming sessions
    const { count: upcomingSessions } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "SCHEDULED")
      .gte("scheduled_start_at", new Date().toISOString());

    // Get completed sessions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: completedThisMonth } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "COMPLETED")
      .gte("scheduled_start_at", startOfMonth.toISOString());

    setStats({
      totalStudents: totalStudents || 0,
      activeStudents: activeStudents || 0,
      upcomingSessions: upcomingSessions || 0,
      completedThisMonth: completedThisMonth || 0,
    });
  };

  const statCards = [
    {
      title: "Active Students",
      value: stats.activeStudents,
      total: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Upcoming Sessions",
      value: stats.upcomingSessions,
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Completed This Month",
      value: stats.completedThisMonth,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {displayName ? `Welcome ${displayName}` : "Welcome"}
          </h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your overview.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stat.value}
                  {stat.total !== undefined && (
                    <span className="text-lg text-muted-foreground ml-1">/ {stat.total}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
