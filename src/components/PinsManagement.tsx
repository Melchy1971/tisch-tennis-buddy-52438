import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Trash2, Save, Calendar, Plus, AlertTriangle } from "lucide-react";
import { matchPinSchema, newPinSchema, getValidationError } from "@/lib/validation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

interface MatchPin {
  id: string;
  match_id: string;
  spielpin: string;
  spielpartie_pin: string | null;
  match: {
    team: string;
    opponent: string;
    date: string;
    time: string;
    home_team?: string | null;
    away_team?: string | null;
    club_team?: string | null;
  };
}

interface Match {
  id: string;
  team: string;
  opponent: string;
  date: string;
  time: string;
  home_team?: string | null;
  away_team?: string | null;
  club_team?: string | null;
}

export const PinsManagement = () => {
  const [pins, setPins] = useState<MatchPin[]>([]);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ spielpin: string; spielpartie_pin: string }>({ spielpin: "", spielpartie_pin: "" });
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [newPin, setNewPin] = useState<{ match_id: string; spielpin: string; spielpartie_pin: string }>({
    match_id: "",
    spielpin: "",
    spielpartie_pin: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPins();
    loadSeasons();
    loadMatches();
  }, [selectedSeason]);

  const loadSeasons = async () => {
    const { data: matches } = await supabase
      .from("matches")
      .select("date")
      .order("date", { ascending: false });

    if (matches) {
      const uniqueSeasons = Array.from(
        new Set(matches.map((m) => {
          const year = new Date(m.date).getFullYear();
          return `${year}/${year + 1}`;
        }))
      );
      setSeasons(uniqueSeasons);
    }
  };

  const loadPins = async () => {
    let query = supabase
      .from("match_pins")
      .select(`
        id,
        match_id,
        spielpin,
        spielpartie_pin,
        matches (
          team,
          opponent,
          date,
          time,
          home_team,
          away_team,
          club_team
        )
      `);

    if (selectedSeason !== "all") {
      const [startYear] = selectedSeason.split("/");
      const seasonStart = `${startYear}-07-01`;
      const seasonEnd = `${parseInt(startYear) + 1}-06-30`;
      
      query = query
        .gte("matches.date", seasonStart)
        .lte("matches.date", seasonEnd);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Fehler beim Laden",
        description: "Pins konnten nicht geladen werden.",
        variant: "destructive",
      });
      console.error("Error loading pins:", error);
      return;
    }

    if (data) {
      const formattedPins = data.map((pin: any) => ({
        id: pin.id,
        match_id: pin.match_id,
        spielpin: pin.spielpin,
        spielpartie_pin: pin.spielpartie_pin,
        match: Array.isArray(pin.matches) ? pin.matches[0] : pin.matches,
      }));
      
      // Sort pins by date (newest first)
      formattedPins.sort((a, b) => {
        if (!a.match?.date || !b.match?.date) return 0;
        return new Date(b.match.date).getTime() - new Date(a.match.date).getTime();
      });
      
      setPins(formattedPins);
    }
  };

  const handleEdit = (pin: MatchPin) => {
    setEditingPin(pin.id);
    setEditValues({
      spielpin: pin.spielpin,
      spielpartie_pin: pin.spielpartie_pin || "",
    });
  };

  const handleSave = async (pinId: string) => {
    try {
      // Validate input
      const validationResult = matchPinSchema.safeParse(editValues);
      if (!validationResult.success) {
        throw new Error(getValidationError(validationResult.error));
      }

      const { error } = await supabase
        .from("match_pins")
        .update({
          spielpin: validationResult.data.spielpin,
          spielpartie_pin: validationResult.data.spielpartie_pin || null,
        })
        .eq("id", pinId);

      if (error) throw error;

      toast({
        title: "Erfolgreich gespeichert",
        description: "Pin wurde aktualisiert.",
      });

      setEditingPin(null);
      loadPins();
    } catch (error: any) {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (pinId: string) => {
    if (!confirm("Möchten Sie diesen Pin wirklich löschen?")) return;

    const { error } = await supabase
      .from("match_pins")
      .delete()
      .eq("id", pinId);

    if (error) {
      toast({
        title: "Fehler beim Löschen",
        description: "Pin konnte nicht gelöscht werden.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolgreich gelöscht",
      description: "Pin wurde entfernt.",
    });

    loadPins();
  };

  const loadMatches = async () => {
    let query = supabase
      .from("matches")
      .select("id, team, opponent, date, time, home_team, away_team, club_team")
      .order("date", { ascending: false });

    if (selectedSeason !== "all") {
      const [startYear] = selectedSeason.split("/");
      const seasonStart = `${startYear}-07-01`;
      const seasonEnd = `${parseInt(startYear) + 1}-06-30`;
      
      query = query
        .gte("date", seasonStart)
        .lte("date", seasonEnd);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Fehler beim Laden",
        description: "Spiele konnten nicht geladen werden.",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setAvailableMatches(data);
    }
  };

  const handleAddPin = async () => {
    try {
      // Validate input
      const validationResult = newPinSchema.safeParse(newPin);
      if (!validationResult.success) {
        throw new Error(getValidationError(validationResult.error));
      }

      const { error } = await supabase
        .from("match_pins")
        .insert({
          match_id: validationResult.data.match_id,
          spielpin: validationResult.data.spielpin,
          spielpartie_pin: validationResult.data.spielpartie_pin || null,
        });

      if (error) throw error;

      toast({
        title: "Erfolgreich hinzugefügt",
        description: "Pin wurde erstellt.",
      });

      setNewPin({ match_id: "", spielpin: "", spielpartie_pin: "" });
      loadPins();
    } catch (error: any) {
      toast({
        title: "Fehler beim Hinzufügen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Möchten Sie wirklich ALLE Pins löschen? Diese Aktion kann nicht rückgängig gemacht werden!")) return;

    let query = supabase.from("match_pins").delete();

    if (selectedSeason !== "all") {
      const [startYear] = selectedSeason.split("/");
      const seasonStart = `${startYear}-07-01`;
      const seasonEnd = `${parseInt(startYear) + 1}-06-30`;
      
      const matchesInSeason = await supabase
        .from("matches")
        .select("id")
        .gte("date", seasonStart)
        .lte("date", seasonEnd);

      if (matchesInSeason.data) {
        const matchIds = matchesInSeason.data.map(m => m.id);
        query = query.in("match_id", matchIds);
      }
    } else {
      query = query.neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { error } = await query;

    if (error) {
      toast({
        title: "Fehler beim Löschen",
        description: "Pins konnten nicht gelöscht werden.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Erfolgreich gelöscht",
      description: "Alle Pins wurden entfernt.",
    });

    loadPins();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Pins-Verwaltung
        </CardTitle>
        <CardDescription>
          Verwalten Sie die importierten Spielpins und Spielcodes pro Saison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="season" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Saison:
            </Label>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Saison wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Saisons</SelectItem>
                {seasons.map((season) => (
                  <SelectItem key={season} value={season}>
                    {season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Alle Pins löschen
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4" />
              Pin manuell hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="match">Spiel auswählen</Label>
                <Select
                  value={newPin.match_id}
                  onValueChange={(value) => setNewPin({ ...newPin, match_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spiel wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const groupedMatches = availableMatches.reduce((acc, match) => {
                        const teamName = match.club_team ?? match.team;
                        if (!acc[teamName]) {
                          acc[teamName] = [];
                        }
                        acc[teamName].push(match);
                        return acc;
                      }, {} as Record<string, Match[]>);

                      return Object.entries(groupedMatches)
                        .sort(([teamA], [teamB]) => teamA.localeCompare(teamB))
                        .map(([team, matches]) => (
                          <SelectGroup key={team}>
                            <SelectLabel>{team}</SelectLabel>
                            {matches.map((match) => (
                              <SelectItem key={match.id} value={match.id}>
                                {new Date(match.date).toLocaleDateString("de-DE")} - vs {match.away_team ?? match.opponent}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-spielpin">Spielpin *</Label>
                <Input
                  id="new-spielpin"
                  placeholder="z.B. 123456"
                  value={newPin.spielpin}
                  onChange={(e) => setNewPin({ ...newPin, spielpin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-spielcode">Spielcode (optional)</Label>
                <Input
                  id="new-spielcode"
                  placeholder="z.B. ABC123"
                  value={newPin.spielpartie_pin}
                  onChange={(e) => setNewPin({ ...newPin, spielpartie_pin: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleAddPin} className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Pin hinzufügen
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {(() => {
            // Group pins by team
            const groupedPins = pins.reduce((acc, pin) => {
              const teamName = pin.match?.club_team ?? pin.match?.team ?? "Unbekannte Mannschaft";
              if (!acc[teamName]) {
                acc[teamName] = [];
              }
              acc[teamName].push(pin);
              return acc;
            }, {} as Record<string, MatchPin[]>);

            const sortedTeams = Object.keys(groupedPins).sort((a, b) => a.localeCompare(b, "de-DE"));

            if (sortedTeams.length === 0) {
              return (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      Keine Pins vorhanden
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return sortedTeams.map((teamName) => {
              const teamPins = groupedPins[teamName];
              return (
                <Card key={teamName}>
                  <CardHeader>
                    <CardTitle className="text-lg">{teamName}</CardTitle>
                    <CardDescription>
                      {teamPins.length} {teamPins.length === 1 ? "Spielpaarung" : "Spielpaarungen"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Datum</TableHead>
                            <TableHead>Heim</TableHead>
                            <TableHead>Gast</TableHead>
                            <TableHead>Spielpin</TableHead>
                            <TableHead>Spielcode</TableHead>
                            <TableHead className="text-right">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamPins.map((pin) => (
                            <TableRow key={pin.id}>
                              <TableCell>
                                {pin.match ? new Date(pin.match.date).toLocaleDateString("de-DE") : "-"}
                              </TableCell>
                              <TableCell>{pin.match?.home_team ?? pin.match?.team ?? "-"}</TableCell>
                              <TableCell>{pin.match?.away_team ?? pin.match?.opponent ?? "-"}</TableCell>
                              <TableCell>
                                {editingPin === pin.id ? (
                                  <Input
                                    value={editValues.spielpin}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, spielpin: e.target.value })
                                    }
                                    className="w-24"
                                  />
                                ) : (
                                  <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                                    {pin.spielpin}
                                  </code>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingPin === pin.id ? (
                                  <Input
                                    value={editValues.spielpartie_pin}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, spielpartie_pin: e.target.value })
                                    }
                                    className="w-32"
                                  />
                                ) : (
                                  pin.spielpartie_pin ? (
                                    <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                                      {pin.spielpartie_pin}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {editingPin === pin.id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleSave(pin.id)}
                                      >
                                        <Save className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingPin(null)}
                                      >
                                        Abbrechen
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(pin)}
                                      >
                                        Bearbeiten
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(pin.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
      </CardContent>
    </Card>
  );
};
