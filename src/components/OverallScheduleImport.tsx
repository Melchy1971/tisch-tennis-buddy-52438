import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";

import { HALL_UPDATE_EVENT } from "@/lib/hallEvents";

interface CsvMatchRow {
  termin: string;
  weekday: string;
  staffel: string;
  round: string;
  hallNumber: string;
  homeTeam: string;
  awayTeam: string;
}

type GroupedMatches = Record<string, CsvMatchRow[]>;

type ImportResultSummary = {
  inserted: number;
  skipped: number;
};

type MatchInsertPayload = {
  team_id: string;
  match_date: string;
  team: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  status: "scheduled";
  home_score: null;
  away_score: null;
  home_team: string;
  away_team: string;
  club_team: string;
};

const CSV_HEADERS = {
  termin: ["termin"],
  weekday: ["wochentag"],
  staffel: ["staffel"],
  round: ["runde", "staffelrunde", "staffel_runde"],
  hallNumber: ["hallenr", "halle", "hallenummer", "hallen_nr"],
  homeTeam: [
    "heim",
    "heimteam",
    "heim_mannschaft",
    "heimmannschaft",
  ],
  awayTeam: ["gast", "gastteam", "gast_mannschaft", "gastmannschaft"],
} as const satisfies Record<keyof CsvMatchRow, string[]>;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const normalizeTeam = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const detectDelimiter = (line: string) => {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
};

const parseTermin = (termin: string) => {
  const cleaned = termin.replace(/Uhr/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  let datePart = "";
  let timePart = "";

  if (parts.length === 1) {
    datePart = parts[0];
  } else if (parts.length >= 2) {
    datePart = parts[0];
    timePart = parts[1];
  }

  const isoDate = (() => {
    if (!datePart) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }

    if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(datePart)) {
      const [day, month, yearRaw] = datePart.split(".");
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const parsed = new Date(datePart);
    if (!Number.isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    return null;
  })();

  const normalizedTime = (() => {
    if (!timePart) return "00:00";
    const cleanedTime = timePart.replace(/[^0-9:]/g, "");
    if (/^\d{1,2}:\d{2}$/.test(cleanedTime)) {
      const [hours, minutes] = cleanedTime.split(":");
      return `${hours.padStart(2, "0")}:${minutes}`;
    }
    if (/^\d{1,2}$/.test(cleanedTime)) {
      return `${cleanedTime.padStart(2, "0")}:00`;
    }
    return "00:00";
  })();

  return {
    date: isoDate,
    time: normalizedTime,
  };
};

const buildCsvMatchRow = (headers: string[], values: string[]): CsvMatchRow | null => {
  const normalizedHeaders = headers.map(normalizeKey);

  const extractValue = (keys: readonly string[]) => {
    for (const key of keys) {
      const index = normalizedHeaders.indexOf(key);
      if (index !== -1) {
        return values[index]?.trim() ?? "";
      }
    }
    return "";
  };

  const termin = extractValue(CSV_HEADERS.termin);
  const weekday = extractValue(CSV_HEADERS.weekday);
  const staffelRaw = extractValue(CSV_HEADERS.staffel);
  const roundRaw = extractValue(CSV_HEADERS.round);
  const hallNumber = extractValue(CSV_HEADERS.hallNumber);
  const homeTeam = extractValue(CSV_HEADERS.homeTeam);
  const awayTeam = extractValue(CSV_HEADERS.awayTeam);

  if (!termin || !homeTeam || !awayTeam || !staffelRaw) {
    return null;
  }

  return {
    termin,
    weekday,
    staffel: staffelRaw,
    round: roundRaw,
    hallNumber,
    homeTeam,
    awayTeam,
  };
};

const parseCsv = (text: string): CsvMatchRow[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((header) => header.trim());

  const rows: CsvMatchRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line
      .split(delimiter)
      .map((value) => value.replace(/^"+/, "").replace(/"+$/, "").trim());

    const row = buildCsvMatchRow(headers, values);
    if (row) {
      rows.push(row);
    }
  }

  return rows;
};

const groupByStaffel = (rows: CsvMatchRow[]): GroupedMatches => {
  return rows.reduce<GroupedMatches>((acc, row) => {
    const key = row.staffel || "Unbekannte Staffel";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {});
};

export const OverallScheduleImport = () => {
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatches>({});
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportResultSummary | null>(null);
  const [hallMappings, setHallMappings] = useState<Record<string, { name: string; address: string }>>({});
  const { toast } = useToast();

  const hasImportedData = useMemo(
    () => Object.keys(groupedMatches).length > 0,
    [groupedMatches],
  );

  const resetState = useCallback(() => {
    setGroupedMatches({});
    setSelectedTeams({});
  }, []);

  const loadHalls = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("club_halls")
        .select("hall_number, name, address")
        .order("hall_number");

      if (error) throw error;

      const mapping = (data ?? []).reduce<Record<string, { name: string; address: string }>>(
        (acc, hall) => {
          if (hall.hall_number === null || hall.hall_number === undefined) {
            return acc;
          }

          const key = String(hall.hall_number);
          acc[key] = {
            name: hall.name?.trim() || `Halle ${key}`,
            address: hall.address?.trim() || "",
          };
          return acc;
        },
        {},
      );

      setHallMappings(mapping);
    } catch (error) {
      console.error("Error loading halls", error);
      toast({
        title: "Hallen konnten nicht geladen werden",
        description: "Die Hallenadressen stehen derzeit nicht zur Verfügung.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const resolveHallLocation = useCallback(
    (hallNumber: string) => {
      if (!hallNumber) return null;
      const numericPart = hallNumber.replace(/[^0-9]/g, "");
      if (!numericPart) return null;
      const hall = hallMappings[numericPart];
      if (!hall) return null;
      return hall.address ? `${hall.name} – ${hall.address}` : hall.name;
    },
    [hallMappings],
  );

  useEffect(() => {
    loadHalls();
    const handleHallUpdate = () => {
      loadHalls();
    };
    window.addEventListener(HALL_UPDATE_EVENT, handleHallUpdate);

    return () => {
      window.removeEventListener(HALL_UPDATE_EVENT, handleHallUpdate);
    };
  }, [loadHalls]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        // Lade aktuelle Saisons aus der Datenbank
        const { data: currentSeasons, error: seasonsError } = await supabase
          .from("seasons")
          .select("id")
          .eq("is_current", true);

        if (seasonsError) throw seasonsError;

        // Wenn aktuelle Saisons gefunden wurden, filtere nach diesen
        let query = supabase.from("teams").select("name");
        
        if (currentSeasons && currentSeasons.length > 0) {
          const seasonIds = currentSeasons.map(s => s.id);
          query = query.in("season_id", seasonIds);
        }

        const { data, error } = await query.order("name", { ascending: true });

        if (error) throw error;
        setTeamOptions((data ?? []).map((team) => team.name));
      } catch (error) {
        console.error("Error loading teams", error);
        toast({
          title: "Teams konnten nicht geladen werden",
          description: "Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
          variant: "destructive",
        });
      }
    };

    loadTeams();

    // Realtime-Updates für neue Mannschaften
    const channel = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSummary(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        toast({
          title: "Keine Daten gefunden",
          description: "Die CSV-Datei enthält keine verwertbaren Zeilen.",
          variant: "destructive",
        });
        resetState();
        return;
      }

      const grouped = groupByStaffel(rows);
      setGroupedMatches(grouped);
      setSelectedTeams({});

      toast({
        title: "Import vorbereitet",
        description: `${rows.length} Spiele wurden geladen und nach Staffeln gruppiert.`,
      });
    } catch (error) {
      console.error("Error parsing CSV", error);
      toast({
        title: "Fehler beim Import",
        description: "Die CSV-Datei konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
      resetState();
    } finally {
      setIsProcessing(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleTeamSelection = (staffel: string, team: string) => {
    setSelectedTeams((prev) => ({
      ...prev,
      [staffel]: team,
    }));
  };

  const buildMatchPayload = (
    staffel: string,
    row: CsvMatchRow,
  ): MatchInsertPayload | null => {
    const selectedTeam = selectedTeams[staffel];
    if (!selectedTeam) return null;

    const { date, time } = parseTermin(row.termin);

    if (!date) {
      return null;
    }

    const normalizedSelected = normalizeTeam(selectedTeam);
    const normalizedHome = normalizeTeam(row.homeTeam);
    const normalizedAway = normalizeTeam(row.awayTeam);

    const isHomeTeam = normalizedSelected === normalizedHome;
    const isAwayTeam = normalizedSelected === normalizedAway;

    const opponent = (() => {
      if (isHomeTeam) return row.awayTeam;
      if (isAwayTeam) return row.homeTeam;
      if (normalizedHome.includes(normalizedSelected)) return row.awayTeam;
      if (normalizedAway.includes(normalizedSelected)) return row.homeTeam;
      return row.awayTeam || row.homeTeam;
    })();

    const clubTeam = (() => {
      if (isHomeTeam) return row.homeTeam;
      if (isAwayTeam) return row.awayTeam;
      if (normalizedHome.includes(normalizedSelected)) return row.homeTeam;
      if (normalizedAway.includes(normalizedSelected)) return row.awayTeam;
      return selectedTeam;
    })();

    const resolvedClubTeam = clubTeam || selectedTeam;
    const resolvedOpponent = opponent || "Unbekannte Mannschaft";

    const location = (() => {
      const resolved = resolveHallLocation(row.hallNumber);
      if (resolved) return resolved;
      return row.hallNumber ? `Halle ${row.hallNumber}` : "Unbekannte Halle";
    })();

    return {
      team: resolvedClubTeam,
      opponent: resolvedOpponent,
      date,
      time,
      location,
      status: "scheduled" as const,
      home_score: null,
      away_score: null,
      home_team: row.homeTeam || resolvedClubTeam,
      away_team: row.awayTeam || resolvedOpponent,
      club_team: resolvedClubTeam,
    };
  };

  const handlePersist = async () => {
    if (!hasImportedData) {
      toast({
        title: "Keine Daten",
        description: "Bitte importieren Sie zuerst eine CSV-Datei.",
        variant: "destructive",
      });
      return;
    }

    const missingAssignments = Object.entries(groupedMatches)
      .filter(([staffel]) => !selectedTeams[staffel])
      .map(([staffel]) => staffel);

    if (missingAssignments.length > 0) {
      toast({
        title: "Zuordnung fehlt",
        description: `Bitte ordnen Sie allen Staffeln eine Mannschaft zu: ${missingAssignments.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = Object.entries(groupedMatches)
        .flatMap(([staffel, rows]) =>
          rows.map((row) => buildMatchPayload(staffel, row)),
        )
        .filter((value): value is MatchInsertPayload => Boolean(value));

      if (payload.length === 0) {
        toast({
          title: "Keine gültigen Datensätze",
          description:
            "Es konnten keine vollständigen Spiele für den Import erstellt werden.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("matches").insert(payload);
      if (error) throw error;

      toast({
        title: "Import erfolgreich",
        description: `${payload.length} Spiele wurden in den Spielplan übernommen.`,
      });

      resetState();
      setSummary({ inserted: payload.length, skipped: 0 });
    } catch (error) {
      console.error("Error saving overall schedule", error);
      toast({
        title: "Fehler beim Speichern",
        description: "Die Spiele konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Termin",
      "Wochentag",
      "Staffel",
      "Runde",
      "HalleNr",
      "HeimMannschaft",
      "GastMannschaft",
    ];

    const exampleRow = [
      "20.10.2025 19:30",
      "Montag",
      "Herren Bezirksliga",
      "Hinrunde",
      "1",
      "TTC Musterstadt I",
      "TTC Beispielort II",
    ];

    const csvContent = [headers.join(";"), exampleRow.join(";")].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Gesamtspielplan_Vorlage.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Vorlage heruntergeladen",
      description: "Die CSV-Vorlage wurde erfolgreich gespeichert.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gesamtspielplan Import</CardTitle>
        <CardDescription>
          Importieren Sie den Gesamtspielplan als CSV-Datei, gruppieren Sie die Spiele
          nach Staffel und ordnen Sie diese anschließend einer Mannschaft zu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-2">
            <Label htmlFor="overall-schedule-file">CSV-Datei auswählen</Label>
            <Input
              id="overall-schedule-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing || isSaving}
            />
          </div>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            disabled={isProcessing || isSaving}
          >
            Vorlage herunterladen
          </Button>
        </div>

        <Alert>
          <AlertTitle>Format der CSV-Datei</AlertTitle>
          <AlertDescription>
            Erwartete Spalten: Termin, Wochentag, Staffel, Runde, HalleNr, HeimMannschaft,
            GastMannschaft. Die Spiele werden nach Staffel gruppiert und müssen anschließend
            einer Vereinsmannschaft zugeordnet werden.
          </AlertDescription>
        </Alert>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> CSV-Datei wird verarbeitet…
          </div>
        )}

        {summary && (
          <Alert>
            <AlertTitle>Import abgeschlossen</AlertTitle>
            <AlertDescription>
              {summary.inserted} Spiele wurden erfolgreich gespeichert.
            </AlertDescription>
          </Alert>
        )}

        {hasImportedData ? (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([staffel, matches]) => (
              <Card key={staffel} className="border-muted">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg">{staffel}</CardTitle>
                      <CardDescription>
                        {matches.length} Spiel{matches.length === 1 ? "" : "e"} in dieser Staffel
                      </CardDescription>
                    </div>
                    <div className="w-full md:w-72">
                      <Label>Mannschaft zuordnen</Label>
                      <Select
                        value={selectedTeams[staffel] ?? ""}
                        onValueChange={(value) => handleTeamSelection(staffel, value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mannschaft auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamOptions.length === 0 ? (
                            <SelectItem value="__no_team__" disabled>
                              Keine Teams verfügbar
                            </SelectItem>
                          ) : (
                            teamOptions.map((team) => (
                              <SelectItem key={team} value={team}>
                                {team}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Termin</TableHead>
                          <TableHead>Wochentag</TableHead>
                          <TableHead>Runde</TableHead>
                          <TableHead>Halle</TableHead>
                          <TableHead>Heimspielort</TableHead>
                          <TableHead>Heim</TableHead>
                          <TableHead>Gast</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches.map((match, index) => {
                          const hallLocation = resolveHallLocation(match.hallNumber);
                          return (
                            <TableRow key={`${staffel}-${index}`}>
                              <TableCell className="whitespace-nowrap">
                                {match.termin}
                              </TableCell>
                              <TableCell>{match.weekday || "-"}</TableCell>
                              <TableCell>{match.round || "-"}</TableCell>
                              <TableCell>{match.hallNumber || "-"}</TableCell>
                              <TableCell>
                                {hallLocation || (match.hallNumber ? `Halle ${match.hallNumber}` : "Unbekannte Halle")}
                              </TableCell>
                              <TableCell>{match.homeTeam}</TableCell>
                              <TableCell>{match.awayTeam}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button onClick={handlePersist} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import läuft…
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Spielplan importieren
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : !isProcessing ? (
          <div className="text-sm text-muted-foreground">
            Laden Sie eine CSV-Datei hoch, um den Gesamtspielplan zu importieren.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

