import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, Users, Calendar, DollarSign, Menu, Settings } from "lucide-react";
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
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Helper to get/set approval status in session storage
  const getApprovalFromStorage = (userId: string): boolean | null => {
    const stored = sessionStorage.getItem(`approval_${userId}`);
    if (stored === null) return null;
    return stored === "true";
  };

  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const hasEverLoadedApproval = useRef(false);
  
  // Initialize approval from session storage immediately on mount
  useEffect(() => {
    const initApproval = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession?.user) {
        const cached = getApprovalFromStorage(initialSession.user.id);
        if (cached !== null) {
          setIsApproved(cached);
          hasEverLoadedApproval.current = true;
        }
      }
    };
    initApproval();
  }, []);

  // Load user language preference
  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .single();

      if (profile?.language && i18n.language !== profile.language) {
        await i18n.changeLanguage(profile.language);
      }
    };

    loadUserLanguage();
  }, [i18n]);

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
      // Check session storage first - if we have cached approval, use it immediately
      const cachedApproval = getApprovalFromStorage(currentUser.id);
        if (cachedApproval !== null) {
          if (isMounted) {
            setIsApproved(cachedApproval);
            hasEverLoadedApproval.current = true;
            if (!cachedApproval && location.pathname !== "/pending-approval") {
              navigate("/pending-approval");
            }
          }
          hasCheckedApproval = true;
          return;
        }

      // Skip if already checked for this user (shouldn't happen if cache is null, but safety check)
      if (hasCheckedApproval) {
        return;
      }

      try {
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
          return;
        }

        hasCheckedApproval = true;

        if (error) {
          // Check if it's a missing profile (user might not have profile yet)
          if (error.code === "PGRST116") {
            const approved = false;
            setIsApproved(approved);
            setApprovalInStorage(currentUser.id, approved);
            hasEverLoadedApproval.current = true;
            if (location.pathname !== "/pending-approval") {
              navigate("/pending-approval");
            }
            return;
          }
          
          const approved = false;
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);
          hasEverLoadedApproval.current = true;
          if (location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
          return;
        }

        const approved = profile?.is_approved ?? false;
        
        if (isMounted) {
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);
          hasEverLoadedApproval.current = true;

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
        hasCheckedApproval = true;
        if (isMounted) {
          const approved = false;
          setIsApproved(approved);
          setApprovalInStorage(currentUser.id, approved);
          hasEverLoadedApproval.current = true;
          if (location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
          // If we have cached approval, use it immediately and skip database check
          const cachedApproval = getApprovalFromStorage(session.user.id);
          if (cachedApproval !== null) {
            setIsApproved(cachedApproval);
            hasEverLoadedApproval.current = true;
            hasCheckedApproval = true;
            if (!cachedApproval && location.pathname !== "/pending-approval") {
              navigate("/pending-approval");
            }
            return;
          }
          
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
        // If we have cached approval, use it immediately and skip database check
        const cachedApproval = getApprovalFromStorage(session.user.id);
        if (cachedApproval !== null) {
          setIsApproved(cachedApproval);
          hasEverLoadedApproval.current = true;
          hasCheckedApproval = true;
          if (!cachedApproval && location.pathname !== "/pending-approval") {
            navigate("/pending-approval");
          }
          return;
        }
        await checkApproval(session.user);
      } else {
        setIsApproved(null);
      }
    }).catch((err) => {
      if (isMounted) {
        setIsApproved(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]); // Removed location.pathname from dependencies

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: t("common.dashboard") },
    { path: "/students", icon: Users, label: t("common.students") },
    { path: "/sessions", icon: Calendar, label: t("common.sessions") },
    { path: "/ledger", icon: DollarSign, label: t("common.ledger") },
    { path: "/settings", icon: Settings, label: t("common.settings") },
  ];

  // If we're on the pending approval page, don't show Layout
  if (location.pathname === "/pending-approval") {
    return null;
  }

  // If we're on auth page, don't show Layout
  if (location.pathname === "/auth" || location.pathname === "/") {
    return null;
  }

  // Check if we have any cached approval in session storage (check all possible keys)
  // This helps us avoid loading even if user state is temporarily null during navigation
  const hasAnyCachedApproval = (): boolean => {
    // Check all session storage keys for approval
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('approval_')) {
        const value = sessionStorage.getItem(key);
        if (value === 'true') {
          return true;
        }
      }
    }
    return false;
  };

  // Check specific user's cached approval if we have a user
  const hasUserCachedApproval = user ? getApprovalFromStorage(user.id) === true : false;
  const hasAnyApproval = hasUserCachedApproval || hasAnyCachedApproval();
  
  // Restore approval from cache if we have it but state is null
  useEffect(() => {
    if (isApproved === null && hasAnyApproval) {
      // Try to get the user ID from any approval key
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('approval_') && sessionStorage.getItem(key) === 'true') {
          setIsApproved(true);
          hasEverLoadedApproval.current = true;
          break;
        }
      }
    }
  }, [isApproved, hasAnyApproval]);
  
  // Show loading only if:
  // 1. We've never successfully loaded approval before (most important check)
  // 2. AND we don't have approval status in state
  // 3. AND we don't have any cached approval
  // Note: Once we've loaded approval once, never show loading again (even if state is temporarily null)
  const shouldShowLoading = !hasEverLoadedApproval.current && 
                            isApproved === null && 
                            !hasAnyApproval;
  
  if (shouldShowLoading) {
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
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("common.settings")}
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
              {navItems.filter((item) => item.path !== "/settings").map((item) => (
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
              variant={isActive("/settings") ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive("/settings")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => navigate("/settings")}
            >
              <Settings className="mr-3 h-5 w-5" />
              {t("common.settings")}
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
            {navItems.filter((item) => item.path !== "/settings").map((item) => {
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
