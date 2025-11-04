import React, { useState, useEffect } from "react";
import type { NavItem } from "@/components/nav/types";
import { RovingFocusList } from "../RovingFocusList";
import { supabase } from "@/integrations/supabase/client";

interface ClubSettings {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  club_name: string;
}

export function DesktopSidebarNav({ items }: { items: NavItem[] }) {
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);

  useEffect(() => {
    loadClubSettings();
  }, []);

  const loadClubSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('club_settings')
        .select('primary_color, secondary_color, logo_url, club_name')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setClubSettings(data);
    } catch (error) {
      console.error('Error loading club settings:', error);
    }
  };

  const primaryColor = clubSettings?.primary_color || '#DC2626';
  const secondaryColor = clubSettings?.secondary_color || '#991B1B';
  const logoUrl = clubSettings?.logo_url;
  const clubName = clubSettings?.club_name || 'TTC Verein';

  return (
    <aside 
      className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen lg:fixed lg:left-0 lg:top-0 border-r z-30 overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Vereinslogo und Name */}
        {logoUrl && (
          <div className="mb-6 flex flex-col items-center">
            <img
              src={logoUrl}
              alt="Vereinslogo"
              className="h-32 w-32 object-contain rounded-lg bg-white/10 p-2"
            />
            <h2 className="mt-3 text-lg font-bold text-white text-center">
              {clubName}
            </h2>
          </div>
        )}
        
        <RovingFocusList 
          items={items.map(i => ({ ...i, onSelect: i.onSelect || (() => {}) }))} 
          orientation="vertical" 
          className="space-y-1"
        />
      </div>
    </aside>
  );
}


