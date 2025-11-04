import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Calendar, Settings, Trophy, Shield, MessageCircle, Users, Info, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation = ({ currentPage, onPageChange }: NavigationProps) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(true);

  useEffect(() => {
    checkAdminStatus();
    loadClubLogo();
    loadFeedbackVisibility();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data && data.some(r => r.role === 'admin')) {
        setIsAdmin(true);
      }
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, requiresAdmin: false },
    { id: "teams", label: "Mannschaften", icon: Users, requiresAdmin: false },
    { id: "matches", label: "Spielplan", icon: Calendar, requiresAdmin: false },
    { id: "training", label: "Training", icon: Trophy, requiresAdmin: false },
    { id: "substitutes", label: "Ersatz", icon: Users, requiresAdmin: false },
    { id: "communication", label: "Kommunikation", icon: MessageCircle, requiresAdmin: false },
    { id: "board", label: "Vorstand", icon: Shield, requiresBoard: true },
    { id: "admin", label: "Admin-Bereich", icon: Shield, requiresAdmin: true },
    { id: "administrator", label: "Administrator", icon: Shield, requiresAdmin: true },
    { id: "mitgliedsprofil", label: "Profil", icon: User, requiresAdmin: false },
    { id: "info", label: "Info", icon: Info, requiresAdmin: false },
    { id: "feedback", label: "Verbesserungen", icon: MessageCircle, requiresAdmin: false, requiresFeedbackEnabled: true },
  ];

  const [hasBoard, setHasBoard] = useState(false);

  useEffect(() => {
    checkBoardStatus();
  }, []);

  const checkBoardStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (data && data.some(r => r.role === 'admin' || r.role === 'vorstand')) {
        setHasBoard(true);
      }
    }
  };

  const loadClubLogo = async () => {
    try {
      const { data } = await supabase
        .from('club_settings')
        .select('logo_url')
        .limit(1)
        .maybeSingle();
      
      if (data?.logo_url) {
        setClubLogo(data.logo_url);
      }
    } catch (error) {
      console.error('Error loading club logo:', error);
    }
  };

  const loadFeedbackVisibility = async () => {
    try {
      const { data } = await supabase
        .from('club_settings')
        .select('show_feedback_section')
        .limit(1)
        .maybeSingle();
      
      setShowFeedback(data?.show_feedback_section ?? true);
    } catch (error) {
      console.error('Error loading feedback visibility:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.requiresAdmin) return isAdmin;
    if ((item as any).requiresBoard) return hasBoard;
    if ((item as any).requiresFeedbackEnabled) return showFeedback;
    return true;
  });

  return (
    <Card className="h-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-red-950 border-r border-red-900 shadow-sport text-white">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-accent">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TT Verein</h1>
            <p className="text-sm text-white/70">Manager</p>
          </div>
        </div>

        {clubLogo && (
          <div className="mb-6 flex justify-center">
            <img
              src={clubLogo}
              alt="Club Logo"
              className="h-24 w-24 object-contain"
            />
          </div>
        )}

        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-12 transition-colors ${
                  isActive
                    ? "bg-gradient-primary text-white shadow-sport"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </Card>
  );
};