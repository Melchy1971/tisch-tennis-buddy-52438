import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, MapPin, Check, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PinRow {
  "Datum, Uhrzeit (Lokal)"?: string;
  "Heimmannschaft"?: string;
  "Gastmannschaft"?: string;
  "Mannschaft"?: string;
  "Spiel-Code"?: string;
  "Spiel-Pin"?: string;
}

interface ParsedPinData {
  date: string;
  homeTeam: string;
  awayTeam: string;
  teamCategory: string;
  spielpin: string;
  spielcode: string | null;
}

interface GroupedPins {
  [category: string]: ParsedPinData[];
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

interface TeamAssignment {
  category: string;
  assignedTeam: string | null;
  pins: ParsedPinData[];
}

interface FailedImport {
  date: string;
  homeTeam: string;
  awayTeam: string;
  spielpin: string;
  spielpartiePin?: string | null;
  reason: string;
}

interface ImportPinsResponse {
  successful: number;
  failed: number;
  total: number;
  failedImports?: FailedImport[];
}

type TeamOption = {
  name: string;
  category: "erwachsene" | "jugend" | null;
};

export const PinsImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [failedImports, setFailedImports] = useState<FailedImport[]>([]);
  const [manualMatchAssignments, setManualMatchAssignments] = useState<Record<number, string>>({});
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setIsLoadingTeams(true);

        const { data: currentSeasons, error: seasonsError } = await supabase
          .from("seasons")
          .select("id")
          .eq("is_current", true);

        if (seasonsError) throw seasonsError;

        let teamQuery = supabase.from("teams").select("name");

        if (currentSeasons && currentSeasons.length > 0) {
          const seasonIds = currentSeasons.map((season) => season.id);
          teamQuery = teamQuery.in("season_id", seasonIds);
        }

        const { data: teamData, error: teamsError } = await teamQuery.order("name", { ascending: true });

        if (teamsError) throw teamsError;

        setTeams(
          (teamData || []).map((team) => ({
            name: team.name,
            category: null as TeamOption["category"],
          }))
        );

        // Also load available matches
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id, team, opponent, date, time, home_team, away_team, club_team")
          .order("date", { ascending: false });

        if (matchesError) throw matchesError;

        if (matchesData) {
          setAvailableMatches(matchesData);
        }
      } catch (error) {
        console.error("Error loading teams for Pins import:", error);
        toast({
          title: "Fehler beim Laden der Mannschaften",
          description: "Die Mannschaftsliste konnte nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTeams(false);
      }
    };

    loadTeams();
  }, [toast]);

  const downloadTemplate = () => {
    const template: PinRow[] = [
      {
        "Datum, Uhrzeit (Lokal)": "Sa. 20.09.2025 12:00 (2)",
        "Heimmannschaft": "TTC Beispiel",
        "Gastmannschaft": "TTC Gegner",
        "Mannschaft": "Jugend 13",
        "Spiel-Code": "ABCD1234EFGH",
        "Spiel-Pin": "1234",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pins");

    const colWidths = [
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
    ];
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, "pins_import_vorlage.xlsx");

    toast({
      title: "Vorlage heruntergeladen",
      description: "Füllen Sie die Vorlage mit Datum, Mannschaften und Pins aus.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    const inputElement = event.target;
    setFile(uploadedFile);
    setIsProcessing(true);
    setShowPreview(false);
    setTeamAssignments([]);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: PinRow[] = XLSX.utils.sheet_to_json(worksheet);

      const parsedPins: ParsedPinData[] = jsonData
        .filter(
          (row) =>
            row["Datum, Uhrzeit (Lokal)"] &&
            row["Heimmannschaft"] &&
            row["Gastmannschaft"] &&
            row["Spiel-Pin"] &&
            row["Mannschaft"]
        )
        .map((row) => ({
          date: normalizeDateString(row["Datum, Uhrzeit (Lokal)"]?.toString() || ""),
          homeTeam: row["Heimmannschaft"]?.toString().trim() || "",
          awayTeam: row["Gastmannschaft"]?.toString().trim() || "",
          teamCategory: row["Mannschaft"]?.toString().trim() || "",
          spielpin: row["Spiel-Pin"]?.toString().trim() || "",
          spielcode: row["Spiel-Code"]?.toString().trim() || null,
        }));

      if (parsedPins.length === 0) {
        toast({
          title: "Keine gültigen Daten",
          description: "Die Excel-Datei enthält keine gültigen Pin-Daten.",
          variant: "destructive",
        });
        return;
      }

      // Group by team category
      const grouped: GroupedPins = parsedPins.reduce((acc, pin) => {
        if (!acc[pin.teamCategory]) {
          acc[pin.teamCategory] = [];
        }
        acc[pin.teamCategory].push(pin);
        return acc;
      }, {} as GroupedPins);

      // Create team assignments
      const assignments: TeamAssignment[] = Object.entries(grouped).map(([category, pins]) => ({
        category,
        assignedTeam: null,
        pins,
      }));

      setTeamAssignments(assignments);
      setShowPreview(true);

      toast({
        title: "Datei verarbeitet",
        description: `${parsedPins.length} Pins gefunden in ${assignments.length} Kategorien. Bitte ordnen Sie die Mannschaften zu.`,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Fehler beim Verarbeiten",
        description: "Die Datei konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
      setFile(null);
      if (inputElement) {
        inputElement.value = "";
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTeamAssignment = (category: string, teamName: string) => {
    setTeamAssignments((prev) =>
      prev.map((assignment) =>
        assignment.category === category ? { ...assignment, assignedTeam: teamName } : assignment
      )
    );
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setFailedImports([]);

    try {
      let totalSuccessful = 0;
      let totalFailed = 0;
      const allFailedImports: FailedImport[] = [];

      for (const assignment of teamAssignments) {
        if (!assignment.assignedTeam) continue;

        const pinsData = assignment.pins.map((pin) => ({
          date: pin.date,
          homeTeam: pin.homeTeam,
          awayTeam: pin.awayTeam,
          spielpin: pin.spielpin,
          spielpartiePin: pin.spielcode,
        }));

        const { data: result, error: importError } = await supabase.functions.invoke<ImportPinsResponse>(
          "import-pins",
          {
            body: {
              pins: pinsData,
              clubTeam: assignment.assignedTeam,
            },
          }
        );

        if (importError) throw importError;

        if (result) {
          totalSuccessful += result.successful;
          totalFailed += result.failed;
          if (result.failedImports && result.failedImports.length > 0) {
            allFailedImports.push(...result.failedImports);
          }
        }
      }

      setFailedImports(allFailedImports);

      toast({
        title: totalFailed > 0 ? "Import teilweise erfolgreich" : "Import erfolgreich",
        description: `${totalSuccessful} Pin(s) erfolgreich importiert. ${totalFailed} fehlgeschlagen.`,
        variant: totalFailed > 0 ? "destructive" : "default",
      });

      // Reset preview state but keep file and failed imports visible
      setShowPreview(false);
      setTeamAssignments([]);
      
      // Only reset file if import was fully successful
      if (totalFailed === 0) {
        setFile(null);
        const fileInput = document.getElementById("pins-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (error) {
      console.error("Error importing pins:", error);
      toast({
        title: "Fehler beim Import",
        description: "Die Pins konnten nicht importiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setTeamAssignments([]);
    setFile(null);
    setFailedImports([]);
    setManualMatchAssignments({});
    const fileInput = document.getElementById("pins-file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSaveManualPin = async (failedImportIndex: number) => {
    const failedImport = failedImports[failedImportIndex];
    const matchId = manualMatchAssignments[failedImportIndex];

    if (!matchId) {
      toast({
        title: "Keine Spielpaarung ausgewählt",
        description: "Bitte wählen Sie eine Spielpaarung aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("match_pins")
        .upsert({
          match_id: matchId,
          spielpin: failedImport.spielpin,
          spielpartie_pin: failedImport.spielpartiePin || null,
        }, {
          onConflict: "match_id",
        });

      if (error) throw error;

      toast({
        title: "Pin erfolgreich gespeichert",
        description: "Der Pin wurde der Spielpaarung zugeordnet.",
      });

      // Remove from failed imports list
      setFailedImports(prev => prev.filter((_, idx) => idx !== failedImportIndex));
      setManualMatchAssignments(prev => {
        const updated = { ...prev };
        delete updated[failedImportIndex];
        return updated;
      });
    } catch (error: any) {
      toast({
        title: "Fehler beim Speichern",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveFailedImportsLog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um Logs zu speichern.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("pin_import_logs")
        .insert({
          user_id: user.id,
          failed_count: failedImports.length,
          log_data: failedImports,
        } as any);

      if (error) throw error;

      toast({
        title: "Log gespeichert",
        description: "Die fehlgeschlagenen Imports wurden als Log in der Datenbank gespeichert.",
      });
    } catch (error: any) {
      console.error("Error saving log:", error);
      toast({
        title: "Fehler beim Speichern",
        description: error.message || "Das Log konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const adultTeams = teams.filter((team) => team.category === "erwachsene" || team.category === null);
  const youthTeams = teams.filter((team) => team.category === "jugend");

  const allAssigned = teamAssignments.every((assignment) => assignment.assignedTeam !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Spielpins und Spielcodes Import
        </CardTitle>
        <CardDescription>
          Importieren Sie Spielpins und Spielcodes aus einer Excel-Datei. Ordnen Sie die Pins nach Mannschaften zu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showPreview ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. Vorlage herunterladen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Laden Sie die Excel-Vorlage herunter und füllen Sie sie mit Ihren Pin-Daten aus.
              </p>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Vorlage herunterladen
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Ausgefüllte Datei hochladen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Laden Sie die ausgefüllte Excel-Datei hoch, um die Pins zu verarbeiten.
              </p>
              <div className="space-y-2">
                <Label htmlFor="pins-file">Excel-Datei auswählen</Label>
                <Input
                  id="pins-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">Ausgewählte Datei: {file.name}</p>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Datei wird verarbeitet...</span>
              </div>
            )}

            {failedImports.length > 0 && (
              <div className="border border-destructive rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-destructive">Fehlgeschlagene Imports ({failedImports.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveFailedImportsLog}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Log speichern
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Folgende Datensätze konnten nicht importiert werden. Wählen Sie die passende Spielpaarung aus und speichern Sie den Pin:
                </p>
                <div className="space-y-4">
                  {failedImports.map((failedImport, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Datum: </span>
                            <span className="font-medium">{failedImport.date}</span>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <span className="text-muted-foreground">Pin: </span>
                              <span className="font-mono font-medium">{failedImport.spielpin}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Code: </span>
                              <span className="font-mono font-medium">{failedImport.spielpartiePin || "-"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Heim: </span>
                            <span>{failedImport.homeTeam}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gast: </span>
                            <span>{failedImport.awayTeam}</span>
                          </div>
                        </div>
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                          <span className="font-medium">Grund: </span>
                          {failedImport.reason}
                        </div>
                      </div>

                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label htmlFor={`match-${idx}`}>Spielpaarung zuordnen</Label>
                          <Select
                            value={manualMatchAssignments[idx] || ""}
                            onValueChange={(value) => setManualMatchAssignments(prev => ({ ...prev, [idx]: value }))}
                          >
                            <SelectTrigger id={`match-${idx}`}>
                              <SelectValue placeholder="Spiel auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const filteredMatches = availableMatches.filter(m => m.date === failedImport.date);
                                
                                if (filteredMatches.length === 0) {
                                  return (
                                    <SelectItem value="none" disabled>
                                      Keine Spiele am {failedImport.date} gefunden
                                    </SelectItem>
                                  );
                                }

                                const groupedMatches = filteredMatches.reduce((acc, match) => {
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
                                          {match.home_team || match.team} vs {match.away_team || match.opponent}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => handleSaveManualPin(idx)}
                          disabled={!manualMatchAssignments[idx]}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Speichern
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Hinweise:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li className="text-primary font-medium">
                  ⚠️ Wichtig: Die Spiele müssen bereits in der Datenbank existieren! Importieren Sie zuerst den
                  Spielplan über "ICS Import".
                </li>
                <li>
                  Die Excel-Datei muss die Spalten "Datum, Uhrzeit (Lokal)", "Heimmannschaft", "Gastmannschaft",
                  "Mannschaft", "Spiel-Pin" und "Spiel-Code" enthalten
                </li>
                <li>Alle Spalten außer "Spiel-Code" sind Pflichtfelder</li>
                <li>Nach dem Upload ordnen Sie die erkannten Kategorien den Teams aus der Saison zu</li>
                <li>Vorhandene Pins werden aktualisiert, neue werden hinzugefügt</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">3. Mannschaften zuordnen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ordnen Sie jede erkannte Kategorie einer Mannschaft aus der aktuellen Saison zu.
              </p>
            </div>

            <div className="space-y-6">
              {teamAssignments.map((assignment) => (
                <div key={assignment.category} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{assignment.category}</h4>
                      <p className="text-sm text-muted-foreground">{assignment.pins.length} Pins gefunden</p>
                    </div>
                    {assignment.assignedTeam && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  <Select
                    value={assignment.assignedTeam ?? undefined}
                    onValueChange={(value) => handleTeamAssignment(assignment.category, value)}
                    disabled={isLoadingTeams || isImporting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingTeams ? "Mannschaften werden geladen…" : "Mannschaft auswählen"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {adultTeams.length === 0 && youthTeams.length === 0 && (
                        <SelectItem value="__none" disabled>
                          Keine Mannschaften gefunden
                        </SelectItem>
                      )}
                      {adultTeams.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Erwachsene</SelectLabel>
                          {adultTeams.map((team) => (
                            <SelectItem key={`adult-${team.name}`} value={team.name}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {youthTeams.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Jugend</SelectLabel>
                          {youthTeams.map((team) => (
                            <SelectItem key={`youth-${team.name}`} value={team.name}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Heimmannschaft</TableHead>
                        <TableHead>Gastmannschaft</TableHead>
                        <TableHead>Pin</TableHead>
                        <TableHead>Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignment.pins.slice(0, 3).map((pin, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{pin.date}</TableCell>
                          <TableCell className="text-sm">{pin.homeTeam}</TableCell>
                          <TableCell className="text-sm">{pin.awayTeam}</TableCell>
                          <TableCell className="text-sm font-mono">{pin.spielpin}</TableCell>
                          <TableCell className="text-sm font-mono">{pin.spielcode || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {assignment.pins.length > 3 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                            ... und {assignment.pins.length - 3} weitere
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirmImport} disabled={!allAssigned || isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird importiert...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Import bestätigen
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancelPreview} disabled={isImporting}>
                Abbrechen
              </Button>
            </div>

            {!allAssigned && (
              <p className="text-sm text-amber-600">
                Bitte ordnen Sie alle Kategorien einer Mannschaft zu, um den Import zu starten.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const normalizeDateString = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Check if already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle German format with weekday: "Sa. 20.09.2025 12:00 (2)" or "Fr. 17.10.2025 17:30 (1 v)"
  const germanFullMatch = trimmed.match(/^\w{2,3}\.\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (germanFullMatch) {
    const day = germanFullMatch[1].padStart(2, "0");
    const month = germanFullMatch[2].padStart(2, "0");
    const year = germanFullMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle simple dot format: DD.MM.YYYY
  const dotDateMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotDateMatch) {
    const day = dotDateMatch[1].padStart(2, "0");
    const month = dotDateMatch[2].padStart(2, "0");
    const year = dotDateMatch[3].length === 2 ? `20${dotDateMatch[3]}` : dotDateMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle slash format: DD/MM/YYYY
  const slashDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDateMatch) {
    const day = slashDateMatch[1].padStart(2, "0");
    const month = slashDateMatch[2].padStart(2, "0");
    const year = slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try parsing as Date
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
    const day = `${parsed.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  console.error(`Could not parse date: ${trimmed}`);
  return trimmed;
};

