import { useState, useEffect } from "react";
import { Nav } from "@/components/navigation/Nav";
import type { NavVariant } from "@/components/navigation/Nav";
import { baseNavigation } from "@/navigation";
import { Dashboard } from "@/components/Dashboard";
import { AuthPage } from "@/components/AuthPage";
import { MatchSchedule } from "@/components/MatchSchedule";
import { AdminPanel } from "@/components/AdminPanel";
import { BoardPanel } from "@/components/BoardPanel";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Communication } from "@/components/Communication";
import { TeamOverview } from "@/components/TeamOverview";
import { Info } from "@/components/Info";
import { Administrator } from "@/components/Administrator";
import { Training } from "@/components/Training";
import { SubstituteManager } from "@/components/SubstituteManager";
import MitgliedsprofilBearbeiten from "@/components/MitgliedsprofilBearbeiten";
import { Feedback } from "@/components/Feedback";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [previousPage, setPreviousPage] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>("TTC Vereinsverwaltung");
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }
        
        const isAdminUser = data && data.some(r => r.role === 'admin');
        setIsAdmin(!!isAdminUser);
        
        console.log('Admin status checked:', { isAdminUser, roles: data });
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Check admin status when auth state changes
        if (session?.user) {
          checkAdminStatus();
        } else {
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdminStatus();
      }
    });

    // Load club logo
    loadClubLogo();

    return () => subscription.unsubscribe();
  }, []);

  const loadClubLogo = async () => {
    try {
      const { data } = await supabase
        .from('club_settings')
        .select('logo_url, club_name')
        .limit(1)
        .maybeSingle();
      
      if (data?.logo_url) {
        setClubLogo(data.logo_url);
      }
      if (data?.club_name) {
        setClubName(data.club_name);
      }
    } catch (error) {
      console.error('Error loading club settings:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handlePageChange = (page: string) => {
    if (page === currentPage) {
      return;
    }
    setPreviousPage(currentPage);
    setCurrentPage(page);
  };

  const handleProfileClose = () => {
    const targetPage = previousPage !== "mitgliedsprofil" ? previousPage : "dashboard";
    setCurrentPage(targetPage);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "matches":
        return <MatchSchedule />;
      case "teams":
        return <TeamOverview />;
      case "training":
        return <Training />;
      case "substitutes":
        return <SubstituteManager />;
      case "board":
        return <BoardPanel />;
      case "admin":
        return <AdminPanel />;
      case "administrator":
        return <Administrator />;
      case "communication":
        return <Communication />;
      case "mitgliedsprofil":
        return user ? (
          <MitgliedsprofilBearbeiten
            userId={user.id}
            onClose={handleProfileClose}
          />
        ) : null;
      case "info":
        return <Info />;
      case "feedback":
        return <Feedback />;
      default:
        return <Dashboard />;
    }
  };

  // Dev-only Variant Toggle via ?navVariant=...
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const variantParam = searchParams.get('navVariant') as NavVariant | null;
  const devVariant: NavVariant | undefined =
    variantParam === 'mobile_bottom' || variantParam === 'tablet_drawer' || variantParam === 'desktop_sidebar'
      ? variantParam
      : undefined;

  const navItems = baseNavigation
    .filter((base) => {
      // Administrator nur für Admin-Rolle anzeigen
      if (base.id === 'administrator') {
        console.log('Filtering administrator button:', { isAdmin, baseId: base.id });
        return isAdmin;
      }
      return true;
    })
    .map((base) => ({
      id: base.id,
      label: base.label,
      icon: base.icon,
      active: currentPage === base.id,
      onSelect: () => handlePageChange(base.id),
    }));

  return (
    <div className="h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950 overflow-hidden">
      <div className="flex h-full w-full">
        {/* Neue adaptive Navigation */}
        <Nav items={navItems} variant={devVariant} />
        <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-lg min-h-0 lg:ml-64 pb-20 lg:pb-0">
          <div className="flex justify-between items-center p-4 lg:p-6 border-b border-red-100 bg-white/90 backdrop-blur-sm flex-shrink-0">
            <h1 className="text-xl lg:text-2xl font-semibold text-neutral-900">{clubName}</h1>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-0 lg:mr-2" />
              <span className="hidden lg:inline">Abmelden</span>
            </Button>
          </div>
          <div className="p-4 lg:p-8 flex-1 overflow-y-auto min-h-0">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;