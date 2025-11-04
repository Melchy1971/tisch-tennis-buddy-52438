import { useMemo, useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Crown, MapPin, Users, Calendar, TrendingUp, Layers } from "lucide-react";
import type { Team, TeamMember } from "@/types/team";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compareTeamPositions } from "@/lib/teamPositions";

export const TeamOverview = () => {
  const { toast } = useToast();
  const [teamsAdults, setTeamsAdults] = useState<Team[]>([]);
  const [teamsYouth, setTeamsYouth] = useState<Team[]>([]);
  const [loadingAdults, setLoadingAdults] = useState(true);
  const [loadingYouth, setLoadingYouth] = useState(true);
  const [selectedSeasonIdAdults, setSelectedSeasonIdAdults] = useState<string>("");
  const [selectedSeasonIdYouth, setSelectedSeasonIdYouth] = useState<string>("");
  const [activeTab, setActiveTab] = useState("adults");
  
  // Load current seasons from database
  useEffect(() => {
    const loadCurrentSeasons = async () => {
      try {
        const { data: seasons, error } = await supabase
          .from('seasons')
          .select('*')
          .eq('is_current', true);
        
        if (error) throw error;
        
        const adultSeason = seasons?.find(s => s.category === 'erwachsene');
        const youthSeason = seasons?.find(s => s.category === 'jugend');
        
        if (adultSeason) setSelectedSeasonIdAdults(adultSeason.id);
        if (youthSeason) setSelectedSeasonIdYouth(youthSeason.id);
      } catch (error) {
        console.error('Error loading current seasons:', error);
        toast({
          title: "Fehler",
          description: "Aktuelle Saisons konnten nicht geladen werden.",
          variant: "destructive",
        });
      }
    };
    
    loadCurrentSeasons();
  }, [toast]);

  const loadTeamsForSeason = useCallback(async (seasonId: string, category: 'adults' | 'youth') => {
    try {
      const setLoading = category === 'adults' ? setLoadingAdults : setLoadingYouth;
      const setTeams = category === 'adults' ? setTeamsAdults : setTeamsYouth;
      
      setLoading(true);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId);

      if (teamsError) throw teamsError;

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*');

      if (membersError) throw membersError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, qttr_value');

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        ((profilesData || []) as {
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          qttr_value: number | null;
        }[]).map(p => [
          p.user_id,
          {
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unbekannt',
            email: p.email || '',
            rating: p.qttr_value ?? 0,
          }
        ])
      );

      const teamsWithMembers: Team[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        league: team.league,
        division: team.division || undefined,
        trainingSlots: (team.training_slots as any[]) || [],
        homeMatch: team.home_match as any || undefined,
        members: (membersData || [])
          .filter(m => m.team_id === team.id)
          .map(m => {
            const profile = profilesMap.get(m.member_id);
            return {
              id: m.member_id,
              name: profile?.name || m.member_id,
              email: profile?.email || '',
              rating: profile?.rating ?? 0,
              isCaptain: m.is_captain,
              position: m.position || undefined
            };
          })
          .sort((a, b) => {
            const positionComparison = compareTeamPositions(a.position, b.position);
            if (positionComparison !== 0) return positionComparison;
            return a.name.localeCompare(b.name, "de-DE");
          })
      }));

      const sortedTeams = [...teamsWithMembers].sort((a, b) =>
        a.name.localeCompare(b.name, "de-DE", { sensitivity: "base" })
      );

      setTeams(sortedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: "Fehler",
        description: "Teams konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      const setLoading = category === 'adults' ? setLoadingAdults : setLoadingYouth;
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedSeasonIdAdults) {
      loadTeamsForSeason(selectedSeasonIdAdults, 'adults');
    }
  }, [selectedSeasonIdAdults, loadTeamsForSeason]);

  useEffect(() => {
    if (selectedSeasonIdYouth) {
      loadTeamsForSeason(selectedSeasonIdYouth, 'youth');
    }
  }, [selectedSeasonIdYouth, loadTeamsForSeason]);

  const aggregatedPlayersAdults = useMemo<(TeamMember & { teams: string[] })[]>(() => {
    const playerMap = new Map<string, TeamMember & { teams: string[] }>();

    teamsAdults.forEach((team) => {
      team.members.forEach((member) => {
        const existing = playerMap.get(member.id);
        if (existing) {
          existing.teams = Array.from(new Set([...existing.teams, team.name]));
          existing.isCaptain = existing.isCaptain || member.isCaptain;
        } else {
          playerMap.set(member.id, { ...member, teams: [team.name] });
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => b.rating - a.rating);
  }, [teamsAdults]);

  const aggregatedPlayersYouth = useMemo<(TeamMember & { teams: string[] })[]>(() => {
    const playerMap = new Map<string, TeamMember & { teams: string[] }>();

    teamsYouth.forEach((team) => {
      team.members.forEach((member) => {
        const existing = playerMap.get(member.id);
        if (existing) {
          existing.teams = Array.from(new Set([...existing.teams, team.name]));
          existing.isCaptain = existing.isCaptain || member.isCaptain;
        } else {
          playerMap.set(member.id, { ...member, teams: [team.name] });
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => b.rating - a.rating);
  }, [teamsYouth]);

  const totalTeamsAdults = teamsAdults.length;
  const totalTeamsYouth = teamsYouth.length;
  const assignedPlayersAdults = teamsAdults.reduce((sum, team) => sum + team.members.length, 0);
  const assignedPlayersYouth = teamsYouth.reduce((sum, team) => sum + team.members.length, 0);
  const availablePlayers = 0;
  const averageRatingAdults = aggregatedPlayersAdults.length
    ? Math.round(
        aggregatedPlayersAdults.reduce((sum, player) => sum + player.rating, 0) / aggregatedPlayersAdults.length,
      )
    : 0;
  const averageRatingYouth = aggregatedPlayersYouth.length
    ? Math.round(
        aggregatedPlayersYouth.reduce((sum, player) => sum + player.rating, 0) / aggregatedPlayersYouth.length,
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Mannschaften & QTTR-Übersicht
        </h2>
        <p className="text-muted-foreground">
          Alle Rollen erhalten hier einen schnellen Blick auf aktuelle Mannschaften, zugeteilte Spieler:innen
          und deren QTTR/TTR-Werte.
        </p>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="adults">Mannschaften Erwachsene</TabsTrigger>
          <TabsTrigger value="youth">Mannschaften Jugend</TabsTrigger>
        </TabsList>

        <TabsContent value="adults" className="space-y-6">
          <div className="space-y-1 mb-6">
            <h3 className="text-xl font-semibold">Erwachsene Mannschaften</h3>
            <p className="text-sm text-muted-foreground">
              Alle Mannschaften der aktuellen Erwachsenen-Saison
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktive Mannschaften</CardTitle>
                <Layers className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeamsAdults}</div>
                <p className="text-xs text-muted-foreground">Erwachsene Teams</p>
              </CardContent>
            </Card>
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eingesetzte Spieler:innen</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedPlayersAdults}</div>
                <p className="text-xs text-muted-foreground">in aktuellen Mannschaften</p>
              </CardContent>
            </Card>
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durchschnittlicher QTTR/TTR</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRatingAdults}</div>
                <p className="text-xs text-muted-foreground">über alle erfassten Mitglieder</p>
              </CardContent>
            </Card>
          </div>
          {loadingAdults ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : teamsAdults.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {teamsAdults.map((team) => (
                <Card key={team.id} className="shadow-sport h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl font-semibold">{team.name}</CardTitle>
                        <CardDescription className="text-base">
                          {team.league}
                          {team.division ? ` • ${team.division}` : ""}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                        {team.members.length} Spieler:innen
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(team.trainingSlots.length > 0 || team.homeMatch) && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">Rahmendaten</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          {team.trainingSlots.map((slot, index) => (
                            <div key={`${team.id}-training-${index}`} className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                Training {index + 1}: {slot.day}, {slot.time} Uhr
                              </span>
                            </div>
                          ))}
                          {team.homeMatch && (team.homeMatch.location || team.homeMatch.day) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span>
                                {team.homeMatch.day && team.homeMatch.time
                                  ? `Heimspiele: ${team.homeMatch.day}, ${team.homeMatch.time} Uhr – ${team.homeMatch.location}`
                                  : `Heimspielort: ${team.homeMatch.location}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">Aufstellung</div>
                      <Separator />
                      <div className="space-y-3">
                        {team.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Keine Spieler:innen zugewiesen.</p>
                        ) : (
                          team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{member.name}</span>
                                  {member.isCaptain && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <Crown className="h-3 w-3 text-primary" /> Kapitän:in
                                    </Badge>
                                  )}
                                </div>
                                {member.playStyle && (
                                  <div className="text-xs text-muted-foreground">
                                    Spielstil: {member.playStyle}
                                  </div>
                                )}
                              </div>
                              <Badge className="self-start sm:self-auto bg-gradient-primary text-white">
                                QTTR {member.rating}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle>Keine Mannschaften gefunden</CardTitle>
                <CardDescription>Für diese Saison wurden noch keine Mannschaften angelegt.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="youth" className="space-y-6">
          <div className="space-y-1 mb-6">
            <h3 className="text-xl font-semibold">Jugend Mannschaften</h3>
            <p className="text-sm text-muted-foreground">
              Alle Mannschaften der aktuellen Jugend-Saison
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktive Mannschaften</CardTitle>
                <Layers className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeamsYouth}</div>
                <p className="text-xs text-muted-foreground">Jugend Teams</p>
              </CardContent>
            </Card>
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eingesetzte Spieler:innen</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedPlayersYouth}</div>
                <p className="text-xs text-muted-foreground">in aktuellen Mannschaften</p>
              </CardContent>
            </Card>
            <Card className="shadow-sport">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durchschnittlicher QTTR/TTR</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRatingYouth}</div>
                <p className="text-xs text-muted-foreground">über alle erfassten Mitglieder</p>
              </CardContent>
            </Card>
          </div>

          {loadingYouth ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : teamsYouth.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {teamsYouth.map((team) => (
                <Card key={team.id} className="shadow-sport h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl font-semibold">{team.name}</CardTitle>
                        <CardDescription className="text-base">
                          {team.league}
                          {team.division ? ` • ${team.division}` : ""}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                        {team.members.length} Spieler:innen
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(team.trainingSlots.length > 0 || team.homeMatch) && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">Rahmendaten</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          {team.trainingSlots.map((slot, index) => (
                            <div key={`${team.id}-training-${index}`} className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                Training {index + 1}: {slot.day}, {slot.time} Uhr
                              </span>
                            </div>
                          ))}
                          {team.homeMatch && (team.homeMatch.location || team.homeMatch.day) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span>
                                {team.homeMatch.day && team.homeMatch.time
                                  ? `Heimspiele: ${team.homeMatch.day}, ${team.homeMatch.time} Uhr – ${team.homeMatch.location}`
                                  : `Heimspielort: ${team.homeMatch.location}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">Aufstellung</div>
                      <Separator />
                      <div className="space-y-3">
                        {team.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Keine Spieler:innen zugewiesen.</p>
                        ) : (
                          team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{member.name}</span>
                                  {member.isCaptain && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <Crown className="h-3 w-3 text-primary" /> Kapitän:in
                                    </Badge>
                                  )}
                                </div>
                                {member.playStyle && (
                                  <div className="text-xs text-muted-foreground">
                                    Spielstil: {member.playStyle}
                                  </div>
                                )}
                              </div>
                              <Badge className="self-start sm:self-auto bg-gradient-primary text-white">
                                QTTR {member.rating}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle>Keine Mannschaften gefunden</CardTitle>
                <CardDescription>Für diese Jugend-Saison wurden noch keine Mannschaften angelegt.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
