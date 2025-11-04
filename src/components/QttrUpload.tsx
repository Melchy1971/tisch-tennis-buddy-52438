import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, Trash2, Download, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";

const CLEAR_ASSIGNMENT = "__clear__";
const NO_ASSIGNMENT = "__none__";

type RawRow = Record<string, any>;

type ImportedEntry = {
  id: string;
  name: string;
  ttrValue: number;
  raw: RawRow;
  club?: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
  qttrValue: number | null;
};

const normalizeString = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const parseNumericValue = (value: any): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^0-9,.-]/g, "")
      .replace(/,(?=\d{1,2}(?:\D|$))/g, ".")
      .replace(/\s+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseImportedRows = (rows: RawRow[]) => {
  const warnings: string[] = [];
  const entries: ImportedEntry[] = [];
  const timestamp = Date.now();

  rows.forEach((row, index) => {
    const keyIndex = new Map<string, string>();
    Object.keys(row).forEach((key) => {
      keyIndex.set(key.toLowerCase().trim(), key);
    });

    const findValue = (matcher: (key: string) => boolean) => {
      for (const [lowerKey, originalKey] of keyIndex.entries()) {
        if (matcher(lowerKey)) {
          const value = row[originalKey];
          if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
          }
        }
      }
      return undefined;
    };

    const explicitName = findValue((key) => key.includes("name") || key.includes("spieler"));
    const firstName = findValue((key) => key.includes("vorname") || key.includes("firstname") || key.includes("first"));
    const lastName = findValue((key) => key.includes("nachname") || key.includes("lastname") || key.includes("last"));

    let name = "";
    if (explicitName !== undefined) {
      name = String(explicitName).trim();
    } else {
      name = `${firstName ? String(firstName).trim() : ""} ${lastName ? String(lastName).trim() : ""}`.trim();
    }

    const ttrRaw = findValue((key) => key.includes("ttr"));
    const ttrValue = parseNumericValue(ttrRaw);

    if (!name) {
      warnings.push(`Zeile ${index + 2}: Kein Name gefunden.`);
      return;
    }

    if (ttrValue === null) {
      warnings.push(`Zeile ${index + 2}: Kein gültiger QTTR/TTR-Wert gefunden.`);
      return;
    }

    const clubValue = findValue((key) => key.includes("verein") || key.includes("club"));

    entries.push({
      id: `${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      ttrValue,
      raw: row,
      club: clubValue ? String(clubValue).trim() : undefined,
    });
  });

  return { entries, warnings };
};

export const QttrUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [importedEntries, setImportedEntries] = useState<ImportedEntry[]>([]);
  const [memberAssignments, setMemberAssignments] = useState<Record<string, string>>({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentFile();
    fetchMembers();
  }, []);

  const fetchCurrentFile = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .list('', {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentFile(data[0].name);
      } else {
        setCurrentFile(null);
      }
    } catch (error) {
      console.error('Error fetching current file:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setMembersLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, qttr_value, status')
        .eq('status', 'active') // Only fetch active members
        .order('last_name', { ascending: true });

      if (error) throw error;

      const formattedMembers = (data || []).map((member) => ({
        id: member.id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Unbekannt',
        email: member.email || '',
        qttrValue: member.qttr_value ?? null,
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Fehler",
        description: "Die Mitglieder konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAssignmentChange = (memberId: string, value: string) => {
    setMemberAssignments((prev) => {
      const next = { ...prev };
      if (value === NO_ASSIGNMENT) {
        delete next[memberId];
      } else {
        next[memberId] = value;
      }
      return next;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls"].includes(extension)) {
      toast({
        title: "Ungültiges Dateiformat",
        description: "Bitte laden Sie eine Excel-Datei (.xlsx oder .xls) hoch.",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: "" });

      if (rows.length === 0) {
        throw new Error("Die Excel-Datei enthält keine Daten.");
      }

      const { entries, warnings } = parseImportedRows(rows);

      if (entries.length === 0) {
        throw new Error("Es konnten keine gültigen QTTR/TTR-Werte in der Datei gefunden werden.");
      }

      setImportedEntries(entries);
      setParseWarnings(warnings);

      const entryNameMap = new Map(entries.map((entry) => [normalizeString(entry.name), entry.id]));
      const autoAssignments: Record<string, string> = {};
      members.forEach((member) => {
        const match = entryNameMap.get(normalizeString(member.name));
        if (match) {
          autoAssignments[member.id] = match;
        }
      });
      setMemberAssignments(autoAssignments);

      setUploading(true);
      try {
        if (currentFile) {
          await supabase.storage
            .from('qttr-lists')
            .remove([currentFile]);
        }

        const fileName = 'aktuelle-qttr-liste.xlsx';
        const { error: uploadError } = await supabase.storage
          .from('qttr-lists')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        setCurrentFile(fileName);
        toast({
          title: "Import erfolgreich",
          description: warnings.length
            ? `${entries.length} Werte wurden eingelesen. ${warnings.length} Zeile(n) konnten nicht verarbeitet werden.`
            : `${entries.length} Werte wurden eingelesen und gespeichert.`
        });

        fetchCurrentFile();
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload fehlgeschlagen",
          description: "Die Excel-Datei konnte nicht hochgeladen werden.",
          variant: "destructive"
        });
      } finally {
        setUploading(false);
      }
    } catch (error: any) {
      console.error('Error processing Excel file:', error);
      toast({
        title: "Import fehlgeschlagen",
        description: error.message ?? "Die Excel-Datei konnte nicht verarbeitet werden.",
        variant: "destructive"
      });
      setImportedEntries([]);
      setMemberAssignments({});
      setParseWarnings([]);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;

    const confirmed = window.confirm('Möchten Sie die aktuelle QTTR/TTR-Liste wirklich löschen?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.storage
        .from('qttr-lists')
        .remove([currentFile]);

      if (error) throw error;

      setCurrentFile(null);
      setImportedEntries([]);
      setMemberAssignments({});
      setParseWarnings([]);
      toast({
        title: "Datei gelöscht",
        description: "Die QTTR/TTR-Liste wurde entfernt."
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Fehler",
        description: "Die Datei konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    if (!currentFile) return;

    try {
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .download(currentFile);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      });
    }
  };

  const filteredMembers = useMemo(() => {
    const search = normalizeString(memberSearch);
    if (!search) return members;
    return members.filter((member) => {
      const normalizedName = normalizeString(member.name);
      const normalizedEmail = member.email ? member.email.toLowerCase() : '';
      return normalizedName.includes(search) || normalizedEmail.includes(search);
    });
  }, [memberSearch, members]);

  const assignmentStats = useMemo(() => {
    const values = Object.values(memberAssignments);
    const clears = values.filter((value) => value === CLEAR_ASSIGNMENT).length;
    const updates = values.length - clears;
    return {
      total: values.length,
      updates,
      clears,
    };
  }, [memberAssignments]);

  const handleSaveAssignments = async () => {
    const assignments = Object.entries(memberAssignments);
    if (assignments.length === 0) {
      toast({
        title: "Keine Änderungen",
        description: "Bitte wählen Sie mindestens eine Zuordnung aus, bevor Sie speichern."
      });
      return;
    }

    setSavingAssignments(true);
    try {
      const errors: string[] = [];
      let updated = 0;
      let cleared = 0;

      for (const [memberId, assignment] of assignments) {
        const member = members.find((m) => m.id === memberId);
        const memberLabel = member?.name ?? memberId;

        if (assignment === CLEAR_ASSIGNMENT) {
          const { error } = await supabase
            .from('profiles')
            .update({ qttr_value: null })
            .eq('id', memberId);

          if (error) {
            errors.push(`• ${memberLabel}: ${error.message}`);
          } else {
            cleared += 1;
          }
          continue;
        }

        const entry = importedEntries.find((item) => item.id === assignment);
        if (!entry) {
          errors.push(`• ${memberLabel}: Kein passender Importdatensatz gefunden.`);
          continue;
        }

        const { error } = await supabase
          .from('profiles')
          .update({ qttr_value: entry.ttrValue })
          .eq('id', memberId);

        if (error) {
          errors.push(`• ${memberLabel}: ${error.message}`);
        } else {
          updated += 1;
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Teilweise gespeichert",
          description: `Einige Zuordnungen konnten nicht gespeichert werden:
${errors.join("\n")}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "QTTR/TTR-Werte aktualisiert",
          description: `${updated} Wert(e) gespeichert${cleared ? `, ${cleared} Wert(e) entfernt` : ''}.`
        });
      }

      await fetchMembers();
      setMemberAssignments({});
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: "Fehler beim Speichern",
        description: "Die Zuordnungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSavingAssignments(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            QTTR/TTR-Liste verwalten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          QTTR/TTR-Liste verwalten
        </CardTitle>
        <CardDescription>
          Importieren Sie die aktuelle QTTR/TTR-Liste als Excel-Datei und ordnen Sie die Werte den Mitgliedern zu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentFile ? (
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="flex-1">
                Aktuelle Datei: <strong>{currentFile}</strong>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Herunterladen
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Es ist derzeit keine QTTR/TTR-Liste hochgeladen.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="qttr-file">
              {currentFile ? "Neue Liste hochladen (ersetzt die aktuelle)" : "QTTR/TTR-Liste hochladen"}
            </Label>
            <Input
              id="qttr-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Erlaubt sind Excel-Dateien (.xlsx oder .xls). Die Datei wird nach dem Upload für alle Mitglieder sichtbar sein.
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Datei wird verarbeitet...
            </div>
          )}
        </div>

        {parseWarnings.length > 0 && (
          <Alert>
            <AlertTitle>Hinweise beim Import</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {parseWarnings.join("\n")}
            </AlertDescription>
          </Alert>
        )}

        {importedEntries.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px),minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Mitgliederzuordnung</h3>
                    <p className="text-xs text-muted-foreground">
                      Wählen Sie für jedes Mitglied den passenden Datensatz aus der importierten Liste.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignmentStats.total > 0 && (
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        {assignmentStats.updates} Updates{assignmentStats.clears ? ` · ${assignmentStats.clears} Rücksetzungen` : ''}
                      </Badge>
                    )}
                    <Button
                      onClick={handleSaveAssignments}
                      disabled={savingAssignments || assignmentStats.total === 0}
                      className="whitespace-nowrap"
                    >
                      {savingAssignments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Speichern...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Zuordnungen speichern
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {assignmentStats.total > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {assignmentStats.updates} Wert(e) werden aktualisiert{assignmentStats.clears ? `, ${assignmentStats.clears} Wert(e) werden entfernt.` : '.'}
                  </p>
                )}
                <Input
                  placeholder="Mitglieder durchsuchen..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
              </div>
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-4">
                  {membersLoading ? (
                    <div className="text-sm text-muted-foreground">Mitglieder werden geladen...</div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Keine Mitglieder gefunden.</div>
                  ) : (
                    filteredMembers.map((member) => {
                      const selectedAssignment = memberAssignments[member.id];
                      const selectedEntry = importedEntries.find((entry) => entry.id === selectedAssignment);
                      return (
                        <div key={member.id} className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                          <div>
                            <p className="font-semibold leading-none text-foreground">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Aktueller QTTR/TTR-Wert: {member.qttrValue ?? '—'}
                          </div>
                          <Select
                            value={selectedAssignment ?? undefined}
                            onValueChange={(value) => handleAssignmentChange(member.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Importierten Datensatz auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_ASSIGNMENT}>Keine Auswahl</SelectItem>
                              <SelectItem value={CLEAR_ASSIGNMENT}>QTTR/TTR-Wert zurücksetzen</SelectItem>
                              {importedEntries.map((entry) => (
                                <SelectItem key={entry.id} value={entry.id}>
                                  {entry.name} · {entry.ttrValue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedAssignment === CLEAR_ASSIGNMENT && (
                            <p className="text-xs text-muted-foreground">
                              Der gespeicherte QTTR/TTR-Wert wird entfernt.
                            </p>
                          )}
                          {selectedEntry && (
                            <p className="text-xs text-muted-foreground">
                              Neuer Wert: {selectedEntry.ttrValue}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Importierte Datensätze</h3>
                <p className="text-xs text-muted-foreground">
                  {importedEntries.length} Datensätze aus der hochgeladenen Datei.
                </p>
              </div>
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">QTTR/TTR</TableHead>
                      <TableHead>Verein</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.ttrValue}</TableCell>
                        <TableCell>{entry.club || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Laden Sie zunächst eine Excel-Datei hoch, um QTTR/TTR-Werte zu importieren und den Mitgliedern zuzuweisen.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
