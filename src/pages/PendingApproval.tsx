import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PendingApproval = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is approved
    const checkApproval = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_approved")
          .eq("id", user.id)
          .single();

        if (error) {
          return;
        }

        if (profile?.is_approved) {
          // Clear cache and update session storage
          sessionStorage.setItem(`approval_${user.id}`, "true");
          // Force a page reload to trigger Layout to use new approval status
          window.location.href = "/dashboard";
        }
      }
    };

    checkApproval();
    
    // Check every 5 seconds if user has been approved
    const interval = setInterval(checkApproval, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">
              Thank you for signing up! Your account has been created successfully, but it requires administrator approval before you can access the system.
            </p>
            <p className="text-sm">
              You will be automatically redirected to the dashboard once your account has been approved.
            </p>
            <p className="text-sm mt-4 text-muted-foreground">
              This page will refresh automatically to check your approval status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;

