import { useCallback, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { RefreshCcw, Info, Loader2, FileUp, FileWarning } from "lucide-react";

type MemberRecord = {
  memberNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status?: string;
  ttr?: number;
  street?: string;
  city?: string;
};

type MemberDiffEntry = {
  id: string;
  type: "new" | "update";
  backup: MemberRecord;
  current?: MemberRecord;
  changes: Array<{
    field: keyof MemberRecord;
    label: string;
    previous?: string;
    next: string;
  }>;
};

const fieldLabels: Record<keyof MemberRecord, string> = {
  memberNumber: "Mitglieds-Nr.",
  firstName: "Vorname",
  lastName: "Nachname",
  email: "E-Mail",
  phone: "Telefon",
  status: "Status",
  ttr: "QTTR/TTR",
  street: "Straße",
  city: "Ort",
};

const headerAliases: Record<string, keyof MemberRecord | "qttr"> = {
  membernumber: "memberNumber",
  mitgliedsnummer: "memberNumber",
  mitgliedsnr: "memberNumber",
  mitgliedsnummern: "memberNumber",
  firstname: "firstName",
  vorname: "firstName",
  lastname: "lastName",
  nachname: "lastName",
  name: "lastName",
  email: "email",
  emailadresse: "email",
  mail: "email",
  telefon: "phone",
  telefonnummer: "phone",
  phone: "phone",
  mobil: "phone",
  status: "status",
  mitgliedsstatus: "status",
  ttr: "ttr",
  qttr: "qttr",
  qttrwert: "qttr",
  street: "street",
  strasse: "street",
  strasze: "street",
  straße: "street",
  adresse: "street",
  address: "street",
  city: "city",
  ort: "city",
  stadt: "city",
};

const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const detectDelimiter = (line: string): string => {
  const candidates: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === "," || char === ";" || char === "\t")) {
      candidates[char] += 1;
    }
  }

  const [[bestDelimiter]] = Object.entries(candidates).sort(([, a], [, b]) => b - a);
  return candidates[bestDelimiter] > 0 ? bestDelimiter : ";";
};

const parseCsv = (raw: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (char === "\"") {
      if (inQuotes && raw[index + 1] === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && raw[index + 1] === "\n") {
        index += 1;
      }
      currentRow.push(currentValue.trim());
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
};

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    memberNumber: "TTB-001",
    firstName: "Anna",
    lastName: "Schneider",
    email: "anna.schneider@example.com",
    phone: "+49 170 1234567",
    status: "Aktiv",
    ttr: 1460,
    street: "Hauptstraße 12",
    city: "München",
  },
  {
    memberNumber: "TTB-002",
    firstName: "Marco",
    lastName: "Fischer",
    email: "marco.fischer@example.com",
    phone: "+49 151 8899776",
    status: "Passiv",
    ttr: 1352,
    street: "Bergweg 4",
    city: "Augsburg",
  },
  {
    memberNumber: "TTB-003",
    firstName: "Sven",
    lastName: "Lehmann",
    email: "sven.lehmann@example.com",
    phone: "+49 160 9988776",
    status: "Aktiv",
    ttr: 1504,
    street: "Kirchgasse 8",
    city: "Landshut",
  },
];

export const MemberUpdate = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRecord[]>(INITIAL_MEMBERS);
  const [diffEntries, setDiffEntries] = useState<MemberDiffEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [ignoredRecords, setIgnoredRecords] = useState(0);

  const summary = useMemo(() => {
    const updates = diffEntries.filter((entry) => entry.type === "update").length;
    const creations = diffEntries.filter((entry) => entry.type === "new").length;
    return {
      total: diffEntries.length,
      updates,
      creations,
      selected: selectedEntries.length,
    };
  }, [diffEntries, selectedEntries]);

  const getMemberKey = useCallback((member: MemberRecord) => {
    return (
      member.memberNumber ||
      member.email ||
      `${member.firstName?.toLocaleLowerCase()}-${member.lastName?.toLocaleLowerCase()}`
    );
  }, []);

  const parseBackupRecords = useCallback(
    (raw: string): MemberRecord[] => {
      const withoutBom = raw.replace(/^\uFEFF/, "");
      const normalised = withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const firstLine = normalised
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0);

      if (!firstLine) {
        throw new Error("Die CSV-Datei enthält keine Datenzeilen.");
      }

      const delimiter = detectDelimiter(firstLine);
      const rows = parseCsv(normalised, delimiter);

      if (rows.length === 0) {
        throw new Error("Die CSV-Datei konnte nicht gelesen werden.");
      }

      const [headerRow, ...dataRows] = rows;
      const normalizedHeaders = headerRow.map(normalizeHeader);
      type ColumnKey = keyof MemberRecord | "qttr";
      const columnMap: Partial<Record<ColumnKey, number>> = {};

      normalizedHeaders.forEach((header, index) => {
        const key = headerAliases[header];
        if (key && columnMap[key] === undefined) {
          columnMap[key] = index;
        }
      });

      if (columnMap.firstName === undefined || columnMap.lastName === undefined) {
        throw new Error("Die CSV-Datei muss mindestens die Spalten \"Vorname\" und \"Nachname\" enthalten.");
      }

      const getCell = (row: string[], key: ColumnKey) => {
        const columnIndex = columnMap[key];
        if (columnIndex === undefined) {
          return undefined;
        }

        const value = row[columnIndex]?.trim();
        return value && value.length > 0 ? value : undefined;
      };

      const records = dataRows
        .map((row) => {
          const firstName = getCell(row, "firstName");
          const lastName = getCell(row, "lastName");

          if (!firstName || !lastName) {
            return null;
          }

          const member: MemberRecord = {
            firstName,
            lastName,
          };

          const memberNumber = getCell(row, "memberNumber");
          if (memberNumber) {
            member.memberNumber = memberNumber;
          }

          const email = getCell(row, "email");
          if (email) {
            member.email = email;
          }

          const phone = getCell(row, "phone");
          if (phone) {
            member.phone = phone;
          }

          const status = getCell(row, "status");
          if (status) {
            member.status = status;
          }

          const street = getCell(row, "street");
          if (street) {
            member.street = street;
          }

          const city = getCell(row, "city");
          if (city) {
            member.city = city;
          }

          const ttrValue = getCell(row, "ttr") ?? getCell(row, "qttr");
          if (ttrValue) {
            const normalizedNumber = Number(ttrValue.replace(/\./g, "").replace(/,/g, "."));
            if (!Number.isNaN(normalizedNumber)) {
              member.ttr = normalizedNumber;
            }
          }

          return member;
        })
        .filter((entry): entry is MemberRecord => entry !== null);

      if (records.length === 0) {
        throw new Error("Es konnten keine gültigen Mitglieder aus der CSV-Datei ermittelt werden.");
      }

      return records;
    },
    [],
  );

  const compareMembers = useCallback(
    (backupRecords: MemberRecord[]) => {
      let ignored = 0;
      const entries: MemberDiffEntry[] = [];
      const seen = new Set<string>();

      backupRecords.forEach((backup) => {
        const key = getMemberKey(backup);
        if (!key || seen.has(key)) {
          ignored += 1;
          return;
        }

        seen.add(key);
        const current = members.find((member) => getMemberKey(member) === key);
        const changes: MemberDiffEntry["changes"] = [];
        const comparableFields: Array<keyof MemberRecord> = [
          "firstName",
          "lastName",
          "email",
          "phone",
          "status",
          "ttr",
          "street",
          "city",
        ];

        if (!current) {
          comparableFields.forEach((field) => {
            const value = backup[field];
            if (value !== undefined && value !== null && value !== "") {
              changes.push({
                field,
                label: fieldLabels[field],
                previous: undefined,
                next: String(value),
              });
            }
          });

          entries.push({
            id: key,
            type: "new",
            backup,
            changes,
          });
          return;
        }

        comparableFields.forEach((field) => {
          const backupValue = backup[field];
          if (backupValue === undefined || backupValue === null || backupValue === "") {
            return;
          }

          const currentValue = current[field];
          const normalizedCurrent =
            typeof currentValue === "number" ? currentValue : currentValue ? String(currentValue) : undefined;
          const normalizedBackup =
            typeof backupValue === "number" ? backupValue : backupValue ? String(backupValue) : undefined;

          if (normalizedBackup !== normalizedCurrent) {
            changes.push({
              field,
              label: fieldLabels[field],
              previous: normalizedCurrent?.toString(),
              next: normalizedBackup?.toString() ?? "",
            });
          }
        });

        if (changes.length > 0) {
          entries.push({
            id: key,
            type: "update",
            backup,
            current,
            changes,
          });
        }
      });

      setIgnoredRecords(ignored);
      setDiffEntries(entries);
      setSelectedEntries(entries.map((entry) => entry.id));
    },
    [getMemberKey, members],
  );

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setImportError(null);

      try {
        const content = await file.text();
        const backupRecords = parseBackupRecords(content);
        compareMembers(backupRecords);

        toast({
          title: "Backup eingelesen",
          description: `${backupRecords.length} Datensätze wurden aus ${file.name} geladen.`,
        });
      } catch (error) {
        console.error(error);
        setDiffEntries([]);
        setSelectedEntries([]);
        setIgnoredRecords(0);
        setImportError(
          error instanceof Error
            ? error.message
            : "Die Backupdatei konnte nicht verarbeitet werden. Bitte prüfen Sie das Format.",
        );
      } finally {
        event.target.value = "";
      }
    },
    [compareMembers, parseBackupRecords, toast],
  );

  const handleToggleSelection = useCallback((id: string, checked: boolean | "indeterminate") => {
    setSelectedEntries((previous) => {
      const alreadySelected = previous.includes(id);
      if (checked && !alreadySelected) {
        return [...previous, id];
      }

      if (!checked && alreadySelected) {
        return previous.filter((entryId) => entryId !== id);
      }

      return previous;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedEntries((previous) => {
      if (previous.length === diffEntries.length) {
        return [];
      }

      return diffEntries.map((entry) => entry.id);
    });
  }, [diffEntries]);

  const applyUpdates = useCallback(() => {
    if (selectedEntries.length === 0) {
      return;
    }

    setIsUpdating(true);
    const selectedSet = new Set(selectedEntries);
    const relevantEntries = diffEntries.filter((entry) => selectedSet.has(entry.id));

    setTimeout(() => {
      setMembers((previousMembers) => {
        const updatedMembers = [...previousMembers];

        relevantEntries.forEach((entry) => {
          if (entry.type === "update" && entry.current) {
            const key = getMemberKey(entry.current);
            const index = updatedMembers.findIndex((member) => getMemberKey(member) === key);
            if (index !== -1) {
              updatedMembers[index] = {
                ...updatedMembers[index],
                ...entry.backup,
              };
            }
          }

          if (entry.type === "new") {
            updatedMembers.push({
              ...entry.backup,
              memberNumber:
                entry.backup.memberNumber ||
                `TTB-${String(updatedMembers.length + 1).padStart(3, "0")}`,
            });
          }
        });

        return updatedMembers;
      });

      setDiffEntries((previous) => previous.filter((entry) => !selectedSet.has(entry.id)));
      setSelectedEntries([]);
      setIsUpdating(false);

      toast({
        title: "Mitglieder aktualisiert",
        description: `${relevantEntries.length} Datensätze wurden übernommen.`,
      });
    }, 600);
  }, [diffEntries, getMemberKey, selectedEntries, toast]);

  const renderChangeValue = (label: string, previous?: string, next?: string) => {
    return (
      <div key={`${label}-${previous ?? "empty"}-${next ?? "empty"}`} className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs">
          {previous ? (
            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <span className="truncate" title={previous}>
                Bisher: {previous}
              </span>
              <Badge variant="outline" className="shrink-0">
                Alt
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Noch kein Wert vorhanden</span>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-foreground" title={next}>
              Neu: {next ?? ""}
            </span>
            <Badge className="shrink-0">Neu</Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-primary" />
            Mitglieder Update
          </h2>
          <p className="text-muted-foreground">
            Aktualisieren Sie bestehende Mitgliederdaten auf Basis der neuesten Informationen.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle>Backupdatei einlesen</AlertTitle>
        <AlertDescription>
          Laden Sie eine CSV-Backupdatei (z. B. exportierte Mitgliederliste) hoch. Mitglieder mit geänderten Werten
          erscheinen im Statusbereich und können gezielt zur Aktualisierung vorgemerkt werden.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Backupdatei auswählen</CardTitle>
          <CardDescription>
            Unterstützt werden CSV-Dateien mit Kopfzeile. Pflichtspalten: Vorname, Nachname.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="member-backup">Backupdatei</Label>
            <Input
              id="member-backup"
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              onChange={handleFileUpload}
            />
            <p className="text-xs text-muted-foreground">
              Beispielstruktur: <code>Mitglieds-Nr.;Vorname;Nachname;Status</code>
            </p>
          </div>

          {importError ? (
            <Alert variant="destructive">
              <FileWarning className="w-4 h-4" />
              <AlertTitle>Import fehlgeschlagen</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Statusübersicht</CardTitle>
            <CardDescription>
              Prüfen Sie, welche Datensätze neue Informationen enthalten und bereits vorgemerkt sind.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={toggleAll} disabled={diffEntries.length === 0}>
            {selectedEntries.length === diffEntries.length ? "Auswahl zurücksetzen" : "Alle markieren"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Hochgeladene Datensätze</p>
              <p className="text-2xl font-semibold text-foreground">{summary.total}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Geänderte Mitglieder</p>
              <p className="text-2xl font-semibold text-foreground">{summary.updates}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Neue Mitglieder</p>
              <p className="text-2xl font-semibold text-foreground">{summary.creations}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Vorgemerkt</p>
              <p className="text-2xl font-semibold text-foreground">{summary.selected}</p>
            </div>
          </div>

          {ignoredRecords > 0 ? (
            <p className="text-xs text-muted-foreground">
              Hinweis: {ignoredRecords} Datensätze konnten nicht zugeordnet werden (doppelte Einträge oder fehlende
              Identifikatoren).
            </p>
          ) : null}

          {diffEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <p>Noch keine Änderungen geladen. Bitte laden Sie eine Backupdatei hoch.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {diffEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Änderungen im Überblick</CardTitle>
            <CardDescription>
              Wählen Sie aus, welche Profile aktualisiert oder angelegt werden sollen. Markierte Zeilen werden beim Update
              berücksichtigt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitglied</TableHead>
                    <TableHead>Profilvergleich</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28 text-right">Vormerken</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffEntries.map((entry) => {
                    const isSelected = selectedEntries.includes(entry.id);
                    const memberName = `${entry.backup.firstName} ${entry.backup.lastName}`.trim();

                    return (
                      <TableRow key={entry.id} data-state={isSelected ? "selected" : undefined} className="align-top">
                        <TableCell className="min-w-[180px]">
                          <div className="font-medium text-foreground">{memberName}</div>
                          <p className="text-xs text-muted-foreground">
                            {entry.backup.memberNumber ? `${entry.backup.memberNumber} · ` : ""}
                            {entry.backup.email || "Keine E-Mail hinterlegt"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {entry.changes.map((change) =>
                              renderChangeValue(change.label, change.previous, change.next),
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <Badge variant={entry.type === "new" ? "secondary" : "default"}>
                            {entry.type === "new" ? "Neuer Datensatz" : "Aktualisierung"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleToggleSelection(entry.id, !!checked)}
                              aria-label={`Mitglied ${memberName} für Update vormerken`}
                              className={cn("mt-1", isSelected && "border-primary")}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Markieren Sie alle Datensätze, deren neue Werte in die Profile übernommen werden sollen.
              </p>
              <Button
                className="bg-gradient-primary hover:bg-primary-hover shadow-sport"
                disabled={selectedEntries.length === 0 || isUpdating}
                onClick={applyUpdates}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Update starten
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Mitgliederübersicht</CardTitle>
          <CardDescription>
            Vorschau auf die in diesem Arbeitsbereich verfügbaren Mitgliederprofile nach der letzten Aktualisierung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Es sind noch keine Mitglieder erfasst.</p>
          ) : (
            members.slice(0, 6).map((member) => (
              <div
                key={getMemberKey(member)}
                className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.memberNumber || "Ohne Mitgliedsnummer"} · {member.status || "Status unbekannt"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p>{member.email || "Keine E-Mail hinterlegt"}</p>
                  {member.ttr ? <p>QTTR/TTR: {member.ttr}</p> : null}
                </div>
              </div>
            ))
          )}
          {members.length > 6 ? (
            <p className="text-xs text-muted-foreground">
              … und {members.length - 6} weitere Mitglieder. Die vollständige Liste steht nach dem Update im Mitgliederbereich
              zur Verfügung.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberUpdate;
