import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, Users, Calendar, DollarSign, LogOut, Menu } from "lucide-react";
import { Session, User } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  // Helper to get/set approval status in session storage
  const getApprovalFromStorage = (userId: string): boolean | null => {
    const stored = sessionStorage.getItem(`approval_${userId}`);
    if (stored === null) return null;
    return stored === "true";
  };

  const setApprovalInStorage = (userId: string, approved: boolean) => {
    sessionStorage.setItem(`approval_${userId}`, approved.toString());
  };

  const clearApprovalFromStorage = (userId: string) => {
    sessionStorage.removeItem(`approval_${userId}`);
  };

  useEffect(() => {
    let isMounted = true;
    let hasCheckedApproval = false;

    // Check approval status only once per session
    const checkApproval = async (currentUser: User) => {
      // Skip if already checked for this user
      if (hasCheckedApproval) {
        console.log("Approval already checked, skipping");
        return;
      }

      // Check session storage first
      const cachedApproval = getApprovalFromStorage(currentUser.id);
      if (cachedApproval !== null) {
        console.log("Using cached approval status:", cachedApproval);
        if (isMounted) {
          setIsApproved(cachedApproval);
          if (!cachedApproval && location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
        }
        hasCheckedApproval = true;
        return;
      }

      try {
        console.log("Checking approval for user (first time):", currentUser.id);
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Approval check timeout")), 10000)
        );

        const queryPromise = supabase
          .from("profiles")
          .select("is_approved")
          .eq("id", currentUser.id)
          .single();

        const { data: profile, error } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;

        if (!isMounted) {
          console.log("Component unmounted, skipping approval check");
          return;
        }

        hasCheckedApproval = true;

        if (error) {
          console.error("Error checking approval:", error);
          
          // Check if it's a missing profile (user might not have profile yet)
          if (error.code === "PGRST116") {
            console.log("Profile not found, treating as not approved");
            const approved = false;
            setIsApproved(approved);
            setApprovalInStorage(currentUser.id, approved);
            if (location.pathname !== "/pending-approval") {
              navigate("/pending-approval");
            }
            return;
          }
          
          const approved = false;
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);
          if (location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
          return;
        }

        const approved = profile?.is_approved ?? false;
        console.log("Approval status from DB:", approved);
        
        if (isMounted) {
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);

          if (!approved) {
            if (location.pathname !== "/pending-approval") {
              navigate("/pending-approval");
            }
          } else {
            // If approved and on pending approval page, navigate to dashboard
            if (location.pathname === "/pending-approval") {
              navigate("/dashboard");
            }
          }
        }
      } catch (err: any) {
        console.error("Unexpected error checking approval:", err);
        hasCheckedApproval = true;
        if (isMounted) {
          const approved = false;
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);
          if (location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          // Clear approval cache on logout
          if (user) {
            clearApprovalFromStorage(user.id);
          }
          navigate("/auth");
        } else if (session.user) {
          // Reset check flag for new user
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            hasCheckedApproval = false;
          }
          await checkApproval(session.user);
        }
      }
    );

    // Check for existing session (only on mount)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else if (session.user) {
        await checkApproval(session.user);
      } else {
        setIsApproved(null);
      }
    }).catch((err) => {
      console.error("Error getting session:", err);
      if (isMounted) {
        setIsApproved(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]); // Removed location.pathname from dependencies

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/students", icon: Users, label: "Students" },
    { path: "/sessions", icon: Calendar, label: "Sessions" },
    { path: "/ledger", icon: DollarSign, label: "Ledger" },
  ];

  // If we're on the pending approval page, don't show Layout
  if (location.pathname === "/pending-approval") {
    return null;
  }

  // If we're on auth page, don't show Layout
  if (location.pathname === "/auth" || location.pathname === "/") {
    return null;
  }

  // Show loading state while checking approval
  if (!session || !user || isApproved === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
          <p className="mt-2 text-xs text-muted-foreground">Checking approval status...</p>
        </div>
      </div>
    );
  }

  // If not approved, don't render Layout (will redirect)
  if (!isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold">TutorSessions</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">TutorSessions</h1>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  className={`w-full justify-start ${
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isMobile ? "ml-64" : ""} ${isMobile ? "pb-20 pt-0" : "p-8"} ${isMobile ? "px-4 py-4" : ""}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
          <div className="grid h-16 grid-cols-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
