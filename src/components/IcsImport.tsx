import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Upload, FileText, Calendar, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { parseIcs } from "@/lib/icsParser";
import type { Match } from "@/types/match";
import { supabase } from "@/integrations/supabase/client";

const MATCHES_KEY = "icsImportedMatches";
const HISTORY_KEY = "icsImportHistory";
const IMPORT_EVENT = "ics-import-updated";

type ImportHistoryItem = {
  file: string;
  date: string;
  matches: number;
  status: "success" | "error";
  team: string;
};

type FileMeta = {
  fileName: string;
  assignedTeam?: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE");
};

const buildHistoryEntry = (
  meta: FileMeta,
  matches: Match[],
  resultCount: number
): ImportHistoryItem => {
  const teams = new Set(
    matches
      .map((match) => match.club_team ?? match.team)
      .filter((value): value is string => Boolean(value))
  );
  let teamLabel = meta.assignedTeam || "Automatisch";

  if (teams.size === 1) {
    teamLabel = teams.values().next().value as string;
  } else if (teams.size > 1) {
    teamLabel = "Mehrere Mannschaften";
  }

  return {
    file: meta.fileName,
    date: new Date().toLocaleDateString("de-DE"),
    matches: resultCount,
    status: resultCount > 0 ? "success" : "error",
    team: teamLabel
  };
};

export const IcsImport = () => {
  const [dragActive, setDragActive] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [importedMatches, setImportedMatches] = useState<Match[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("auto");
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [teamAssignmentValue, setTeamAssignmentValue] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Load teams from database
  useEffect(() => {
    const loadTeams = async () => {
      const { data: teams, error } = await supabase
        .from("teams")
        .select("name")
        .order("name");

      if (error) {
        console.error("Error loading teams:", error);
        toast({
          title: "Fehler beim Laden der Mannschaften",
          description: "Die Mannschaften konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }

      if (teams) {
        setAvailableTeams(teams.map((team) => team.name));
      }
    };

    loadTeams();
  }, [toast]);

  useEffect(() => {
    try {
      const storedMatches = localStorage.getItem(MATCHES_KEY);
      if (storedMatches) {
        const parsedMatches = JSON.parse(storedMatches) as Match[];
        setImportedMatches(
          parsedMatches.map((match) => ({
            ...match,
            source: "ics"
          }))
        );
      }
    } catch (error) {
      console.error("Fehler beim Laden der importierten Spiele:", error);
    }

    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      // Import history is intentionally kept empty
      setImportHistory([]);
    } catch (error) {
      console.error("Fehler beim Laden des Import-Verlaufs:", error);
    }
  }, []);

  const sortedImportedMatches = useMemo(
    () =>
      [...importedMatches].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [importedMatches]
  );

  useEffect(() => {
    setSelectedMatchIds((previous) =>
      previous.filter((id) => importedMatches.some((match) => match.id === id))
    );
  }, [importedMatches]);

  const persistMatches = (matches: Match[]) => {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
    window.dispatchEvent(new Event(IMPORT_EVENT));
  };

  const persistHistory = (history: ImportHistoryItem[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  };

  const mergeMatches = (events: ReturnType<typeof parseIcs>, meta: FileMeta, current: Match[]) => {
    const existingIds = new Set(current.map((match) => match.id));
    const existingUids = new Set(
      current
        .map((match) => match.icsUid)
        .filter((uid): uid is string => Boolean(uid))
    );
    const baseId = meta.fileName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "ics";
    const createdAt = new Date().toISOString();

    const preparedMatches = events.map((event, index) => {
      const base = event.icsUid ? `ics-${event.icsUid}` : `ics-${baseId}-${index}-${Date.now()}`;
      return {
        id: base,
        team: event.team,
        opponent: event.opponent,
        date: event.date,
        time: event.time,
        location: event.location,
        status: event.status,
        home_score: null,
        away_score: null,
        created_at: createdAt,
        description: event.description || null,
        home_team: event.team,
        away_team: event.opponent,
        club_team: meta.assignedTeam ?? event.team,
        source: "ics" as const,
        icsUid: event.icsUid
      } satisfies Match;
    });

    const uniqueMatches = preparedMatches.filter((match) => {
      if (match.icsUid && existingUids.has(match.icsUid)) {
        return false;
      }

      if (existingIds.has(match.id)) {
        return false;
      }

      return true;
    });

    const updatedMatches = uniqueMatches.length ? [...current, ...uniqueMatches] : current;

    return { uniqueMatches, updatedMatches };
  };

  const addHistoryEntry = (entry: ImportHistoryItem) => {
    setImportHistory((prev) => {
      const updated = [entry, ...prev];
      persistHistory(updated);
      return updated;
    });
  };

  const assignTeamToMatches = (team: string) => {
    if (!importedMatches.length) {
      toast({
        title: "Keine Spiele vorhanden",
        description: "Es sind keine importierten Spiele verfügbar.",
        variant: "destructive"
      });
      return;
    }

    const targetIds = selectedMatchIds.length
      ? new Set(selectedMatchIds)
      : new Set(importedMatches.map((match) => match.id));

    if (!targetIds.size) {
      toast({
        title: "Keine Spiele ausgewählt",
        description: "Bitte markieren Sie Spiele oder importieren Sie neue Termine.",
        variant: "destructive"
      });
      return;
    }

    let updatedCount = 0;

    setImportedMatches((current) => {
      if (!current.length) {
        return current;
      }

      const updated = current.map((match) => {
        const currentClubTeam = match.club_team ?? match.team;
        if (targetIds.has(match.id) && currentClubTeam !== team) {
          updatedCount += 1;
          return {
            ...match,
            club_team: team
          } satisfies Match;
        }
        return match;
      });

      if (updatedCount > 0) {
        persistMatches(updated);
        return updated;
      }

      return current;
    });

    if (updatedCount > 0) {
      const scopeLabel = selectedMatchIds.length
        ? `${selectedMatchIds.length} markierten Spiele`
        : "allen importierten Spielen";

      toast({
        title: "Mannschaft zugewiesen",
        description: `Die Mannschaft ${team} wurde ${scopeLabel} zugeordnet.`
      });
    } else {
      toast({
        title: "Keine Aktualisierung erforderlich",
        description: "Die ausgewählten Spiele sind bereits dieser Mannschaft zugeordnet."
      });
    }
  };

  const toggleMatchSelection = (matchId: string, checked: boolean) => {
    setSelectedMatchIds((previous) => {
      if (checked) {
        if (previous.includes(matchId)) {
          return previous;
        }
        return [...previous, matchId];
      }
      return previous.filter((id) => id !== matchId);
    });
  };

  const toggleSelectAll = () => {
    if (!sortedImportedMatches.length) {
      setSelectedMatchIds([]);
      return;
    }

    if (selectedMatchIds.length === sortedImportedMatches.length) {
      setSelectedMatchIds([]);
    } else {
      setSelectedMatchIds(sortedImportedMatches.map((match) => match.id));
    }
  };

  const processIcsContent = async (content: string, meta: FileMeta) => {
    const parsedEvents = parseIcs(content, {
      defaultTeam: meta.assignedTeam
    });

    if (!parsedEvents.length) {
      addHistoryEntry(buildHistoryEntry(meta, [], 0));
      toast({
        title: "Keine Spiele gefunden",
        description: "Die ausgewählte Datei enthält keine gültigen Termine.",
        variant: "destructive"
      });
      return;
    }

    let newMatches: Match[] = [];
    setImportedMatches((current) => {
      const { uniqueMatches, updatedMatches } = mergeMatches(parsedEvents, meta, current);
      newMatches = uniqueMatches;
      persistMatches(updatedMatches);
      return updatedMatches;
    });

    const entry = buildHistoryEntry(meta, newMatches, newMatches.length);
    addHistoryEntry(entry);

    if (newMatches.length) {
      const duplicateCount = parsedEvents.length - newMatches.length;
      toast({
        title: "Import erfolgreich",
        description:
          duplicateCount > 0
            ? `${newMatches.length} neue Spiele importiert, ${duplicateCount} bereits vorhanden.`
            : `${newMatches.length} Spiele wurden importiert.`
      });
    } else {
      toast({
        title: "Keine neuen Spiele",
        description: "Alle Spiele aus der Datei wurden bereits importiert.",
        variant: "destructive"
      });
    }
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsProcessing(true);
    const assignedTeam = selectedTeam === "auto" ? undefined : selectedTeam;

    for (const file of files) {
      const text = await file.text();
      await processIcsContent(text, { fileName: file.name, assignedTeam });
    }

    setIsProcessing(false);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    await processFiles(files);
    event.target.value = "";
  };

  const handleDrag = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".ics") || file.name.toLowerCase().endsWith(".ical")
    );

    if (!files.length) {
      toast({
        title: "Ungültiges Dateiformat",
        description: "Bitte verwenden Sie Dateien mit der Endung .ics oder .ical.",
        variant: "destructive"
      });
      return;
    }

    await processFiles(files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSampleImport = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch("/sample-schedule.ics");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const assignedTeam = selectedTeam === "auto" ? undefined : selectedTeam;
      await processIcsContent(text, {
        fileName: "sample-schedule.ics",
        assignedTeam
      });
    } catch (error) {
      console.error("Fehler beim Laden der Beispieldatei:", error);
      toast({
        title: "Beispieldatei nicht verfügbar",
        description: "Die Beispieldatei konnte nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTeamAssignmentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setTeamAssignmentValue(value);

    if (!value) {
      return;
    }

    assignTeamToMatches(value);
    setTeamAssignmentValue("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">ICS Import</h1>
        <p className="text-muted-foreground">
          Importieren Sie Spielpläne aus ICS-Kalenderdateien und übertragen Sie die Termine direkt in die Spielplanverwaltung.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,.ical"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Datei hochladen
            </CardTitle>
            <CardDescription>
              Ziehen Sie ICS-Dateien hierher oder klicken Sie zum Auswählen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                dragActive
                  ? "border-primary bg-primary/5 shadow-sport"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={openFileDialog}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFileDialog();
                }
              }}
            >
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">ICS-Datei hochladen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unterstützte Formate: .ics, .ical
                <br />
                Maximale Dateigröße: 10 MB
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  className="bg-gradient-secondary hover:bg-secondary-hover shadow-accent"
                  onClick={openFileDialog}
                  disabled={isProcessing}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Datei auswählen
                </Button>
              </div>
              {isProcessing && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Import läuft… Bitte warten Sie einen Moment.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Import-Einstellungen
            </CardTitle>
            <CardDescription>Konfigurieren Sie den Import-Vorgang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mannschaft zuweisen</label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(event.target.value)}
                 disabled={isProcessing}
               >
                 <option value="auto">Automatisch erkennen</option>
                 {availableTeams.map((team) => (
                   <option key={team} value={team}>
                     {team}
                   </option>
                 ))}
               </select>
              <p className="text-xs text-muted-foreground">
                Wenn die ICS-Datei keine Mannschaft enthält, wird diese Auswahl verwendet.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bestehende Spiele</label>
              <p className="text-sm text-muted-foreground">
                Bereits importierte Spiele werden automatisch erkannt und nicht doppelt hinzugefügt.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Benachrichtigungen</label>
              <p className="text-sm text-muted-foreground">
                Nach erfolgreichem Import erhalten Sie eine Rückmeldung mit der Anzahl der neu erfassten Spiele.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import-Verlauf</CardTitle>
          <CardDescription>Zuletzt importierte ICS-Dateien</CardDescription>
        </CardHeader>
        <CardContent>
          {importHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Es wurden noch keine Dateien importiert.</p>
          ) : (
            <div className="space-y-3">
              {importHistory.map((item, index) => (
                <div
                  key={`${item.file}-${index}-${item.date}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.status === "success" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.file}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.team} • {item.matches} Spiele • {item.date}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={item.status === "success" ? "default" : "destructive"}
                    className={
                      item.status === "success"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {item.status === "success" ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Erfolgreich
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Keine neuen Spiele
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importierte Spiele</CardTitle>
          <CardDescription>Alle aktuell aus ICS-Dateien übernommenen Spiele</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedImportedMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Spiele importiert. Nutzen Sie den Upload, um Termine aus einer ICS-Datei zu übernehmen.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="team-assignment">
                    Mannschaft zuweisen
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      id="team-assignment"
                      className="w-full rounded-md border bg-background p-2 sm:w-64"
                      value={teamAssignmentValue}
                       onChange={handleTeamAssignmentChange}
                     >
                       <option value="">Team auswählen…</option>
                       {availableTeams.map((team) => (
                         <option key={team} value={team}>
                           {team}
                         </option>
                       ))}
                     </select>
                    <span className="text-xs text-muted-foreground">
                      {selectedMatchIds.length > 0
                        ? `${selectedMatchIds.length} Spiele markiert`
                        : "Keine Auswahl – Zuordnung gilt für alle Spiele"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" onClick={toggleSelectAll} className="self-start">
                  {selectedMatchIds.length === sortedImportedMatches.length && sortedImportedMatches.length > 0
                    ? "Auswahl aufheben"
                    : "Alle auswählen"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedMatchIds.length === sortedImportedMatches.length &&
                            sortedImportedMatches.length > 0
                              ? true
                              : selectedMatchIds.length > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() => toggleSelectAll()}
                          aria-label="Alle Spiele auswählen"
                        />
                      </TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Uhrzeit</TableHead>
                      <TableHead>Mannschaft</TableHead>
                      <TableHead>Gegner</TableHead>
                      <TableHead>Ort</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedImportedMatches.map((match) => {
                      const isSelected = selectedMatchIds.includes(match.id);
                      return (
                        <TableRow key={match.id} className={isSelected ? "bg-primary/5" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleMatchSelection(match.id, checked === true)}
                              aria-label={`Spiel am ${formatDate(match.date)} markieren`}
                            />
                          </TableCell>
                          <TableCell>{formatDate(match.date)}</TableCell>
                          <TableCell>{match.time}</TableCell>
                          <TableCell>
                            {match.club_team || match.team ? (
                              match.club_team ?? match.team
                            ) : (
                              <span className="text-muted-foreground italic">Keine Zuordnung</span>
                            )}
                          </TableCell>
                          <TableCell>{match.opponent}</TableCell>
                          <TableCell>{match.location}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
