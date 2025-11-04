import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Match } from "@/types/match";

export const Dashboard = () => {
  const [teamsCount, setTeamsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [upcomingMatchesCount, setUpcomingMatchesCount] = useState<number>(0);
  const [winsCount, setWinsCount] = useState<number>(0);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [recentResults, setRecentResults] = useState<Match[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all current seasons (erwachsene and jugend can have different season IDs)
        const { data: currentSeasonsData, error: seasonError } = await supabase
          .from('seasons')
          .select('id')
          .eq('is_current', true);

        if (seasonError) throw seasonError;

        const currentSeasonIds = currentSeasonsData?.map(s => s.id) || [];

        // Fetch teams count for current seasons - both erwachsene and jugend
        if (currentSeasonIds.length > 0) {
          const { count: teamsCountResult, error: teamsError } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .in('season_id', currentSeasonIds)
            .in('category', ['erwachsene', 'jugend']);

          if (teamsError) throw teamsError;
          setTeamsCount(teamsCountResult || 0);
        } else {
          setTeamsCount(0);
        }

        // Fetch members count (exclude deleted profiles)
        const { count: membersCountResult, error: membersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        if (membersError) throw membersError;
        setMembersCount(membersCountResult || 0);

        // Fetch upcoming matches count
        const today = new Date().toISOString().split('T')[0];
        const { count: matchesCount, error: matchesCountError } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .gte('date', today);

        if (matchesCountError) throw matchesCountError;
        setUpcomingMatchesCount(matchesCount || 0);

        // Fetch completed matches to count wins for current season
        const { data: completedMatches, error: completedError } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'completed')
          .not('home_score', 'is', null)
          .not('away_score', 'is', null);

        if (completedError) throw completedError;

        // Count wins (Heimspiel wenn location "Zaberfeld" enthält)
        const wins = (completedMatches || []).filter(match => {
          const isHomeMatch = match.location?.toLowerCase().includes('zaberfeld');
          if (isHomeMatch) {
            return (match.home_score || 0) > (match.away_score || 0);
          } else {
            return (match.away_score || 0) > (match.home_score || 0);
          }
        }).length;

        setWinsCount(wins);

        // First, find the next match date
        const { data: nextMatchData, error: nextMatchError } = await supabase
          .from('matches')
          .select('date')
          .eq('status', 'scheduled')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(1)
          .single();

        if (nextMatchError && nextMatchError.code !== 'PGRST116') throw nextMatchError;

        // If we have a next match date, fetch all matches from that date
        let matchesData: Match[] = [];
        if (nextMatchData) {
          const { data, error: matchesError } = await supabase
            .from('matches')
            .select('*')
            .eq('status', 'scheduled')
            .eq('date', nextMatchData.date)
            .order('time', { ascending: true });

          if (matchesError) throw matchesError;
          matchesData = data || [];
        }

        // Enhance upcoming matches with proper team names
        const enhancedUpcomingMatches = (matchesData || []).map(match => {
          const isHomeMatch = match.location?.toLowerCase().includes('zaberfeld');
          const clubTeamName = match.club_team || (isHomeMatch ? match.home_team : match.away_team) || match.team;
          
          return {
            ...match,
            displayHomeTeam: match.home_team || match.team,
            displayAwayTeam: match.away_team || match.opponent,
            displayClubTeam: clubTeamName
          };
        });

        setUpcomingMatches(enhancedUpcomingMatches);

        // Fetch recent results (completed matches, limit 3)
        const { data: resultsData, error: resultsError } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'completed')
          .not('home_score', 'is', null)
          .not('away_score', 'is', null)
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .limit(3);

        if (resultsError) throw resultsError;

        // Fetch current season teams to get proper team names
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, season_id')
          .in('season_id', currentSeasonIds);

        if (teamsError) throw teamsError;

        // Create a map of team names for lookup
        const teamNamesMap = new Map();
        (teamsData || []).forEach(team => {
          teamNamesMap.set(team.id, team.name);
        });

        // Enhance results with proper team names
        const enhancedResults = (resultsData || []).map(match => {
          const isHomeMatch = match.location?.toLowerCase().includes('zaberfeld');
          const clubTeamName = match.club_team || (isHomeMatch ? match.home_team : match.away_team) || match.team;
          
          return {
            ...match,
            displayHomeTeam: match.home_team || match.team,
            displayAwayTeam: match.away_team || match.opponent,
            displayClubTeam: clubTeamName
          };
        });

        setRecentResults(enhancedResults);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { 
      title: "Aktive Mannschaften", 
      value: loading ? "..." : String(teamsCount), 
      description: "Saison 2025-26",
      icon: Users,
      color: "bg-gradient-primary"
    },
    { 
      title: "Nächste Spiele", 
      value: loading ? "..." : String(upcomingMatchesCount), 
      description: "Anstehende Spiele",
      icon: Calendar,
      color: "bg-gradient-secondary"
    },
    { 
      title: "Siege diese Saison", 
      value: loading ? "..." : String(winsCount), 
      description: "Aktuelle Saison",
      icon: Trophy,
      color: "bg-gradient-primary"
    },
    { 
      title: "Mitglieder", 
      value: loading ? "..." : String(membersCount), 
      description: "Registrierte Mitglieder",
      icon: Users,
      color: "bg-gradient-secondary"
    }
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const day = days[date.getDay()];
    const dayNum = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}, ${dayNum}.${month}`;
  };

  const getMatchResult = (match: Match) => {
    const isHomeMatch = match.location?.toLowerCase().includes('zaberfeld');
    const ourScore = isHomeMatch ? match.home_score : match.away_score;
    const theirScore = isHomeMatch ? match.away_score : match.home_score;
    
    if (ourScore === null || theirScore === null) return { status: 'unknown', color: 'bg-muted/50' };
    
    if (ourScore > theirScore) return { status: 'Sieg', color: 'bg-green-50 dark:bg-green-950/20', textColor: 'text-green-600 dark:text-green-400' };
    if (ourScore < theirScore) return { status: 'Verloren', color: 'bg-red-50 dark:bg-red-950/20', textColor: 'text-red-600 dark:text-red-400' };
    return { status: 'Unentschieden', color: 'bg-yellow-50 dark:bg-yellow-950/20', textColor: 'text-yellow-600 dark:text-yellow-500' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Willkommen zurück! Hier ist eine Übersicht über Ihren Verein.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-sport transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`w-8 h-8 rounded-md ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Letzte Ergebnisse
            </CardTitle>
            <CardDescription>Aktuelle Spielergebnisse</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Lädt...</div>
            ) : recentResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Ergebnisse vorhanden
              </div>
            ) : (
              <div className="space-y-4">
                {recentResults.map((match) => {
                  return (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{match.displayClubTeam}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.displayHomeTeam} - {match.displayAwayTeam}
                      </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{match.home_score}:{match.away_score}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Kommende Spiele
            </CardTitle>
            <CardDescription>Alle Spiele vom nächsten Spieltag</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Lädt...</div>
            ) : upcomingMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine kommenden Spiele geplant
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{match.displayClubTeam}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.displayHomeTeam} - {match.displayAwayTeam}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatDate(match.date)}</div>
                      <div className="text-sm text-muted-foreground">{match.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
