export type MatchSource = "supabase" | "ics";

export interface Match {
  id: string;
  team: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  created_at: string;
  home_team?: string | null;
  away_team?: string | null;
  club_team?: string | null;
  description?: string | null;
  source?: MatchSource;
  icsUid?: string;
  category?: string;
  displayClubTeam?: string;
  displayHomeTeam?: string;
  displayAwayTeam?: string;
}
