import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { memberImportSchema } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AssignUserIdsResponse } from "@/types/assign-user-ids";

interface MemberRow {
  Vorname: string;
  Nachname: string;
  Email?: string;
  "E-Mail"?: string;
  Telefon?: string;
  "Telefonnummer"?: string;
  Mobil?: string;
  Mitgliedsnummer?: string;
  Strasse?: string;
  "Straße"?: string;
  PLZ?: string;
  Stadt?: string;
  Geburtstag?: string;
  "Geburtstag (TT.MM.JJJJ)"?: string;
  "Temporäres Passwort"?: string;
  Rolle?: string;
  [key: string]: string | undefined;
}

interface ImportLog {
  successful: string[];
  failed: { name: string; error: string }[];
  updated: string[];
}

type ImportMembersResponse = {
  successful: string[];
  failed: { name: string; error: string }[];
  updated: string[];
  userIdSummary?: AssignUserIdsResponse;
};

export const MemberImport = () => {
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      "Vorname",
      "Nachname",
      "E-Mail",
      "Telefon",
      "Mobil",
      "Mitgliedsnummer",
      "Straße",
      "PLZ",
      "Stadt",
      "Geburtstag (TT.MM.JJJJ)",
      "Temporäres Passwort",
      "Rolle"
    ];

    const exampleRow = [
      "Max",
      "Mustermann",
      "max.mustermann@example.com",
      "+49 30 1234567",
      "+49 170 1234567",
      "M001",
      "Musterstraße 1",
      "12345",
      "Musterstadt",
      "15.01.1990",
      "Willkommen2025!",
      "mitglied"
    ];

    const csvContent = [
      headers.join(";"),
      exampleRow.join(";")
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Mitglieder_Import_Vorlage.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Vorlage heruntergeladen",
      description: "Die CSV-Vorlage wurde erfolgreich heruntergeladen.",
    });
  };

  const parseCSV = (text: string): MemberRow[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(";")
      .map(h => h.trim().replace(/^"+/, "").replace(/"+$/, ""));
    const rows: MemberRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(";")
        .map(v => v.trim().replace(/^"+/, "").replace(/"+$/, ""));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      
      rows.push(row as MemberRow);
    }

    return rows;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const jsonData = parseCSV(text);

      if (jsonData.length === 0) {
        throw new Error("Die CSV-Datei enthält keine Daten.");
      }

      // Validate required fields and data format
      const invalidRows: { row: number; errors: string[] }[] = [];
      const members = jsonData.map((row, index) => {
        const memberData = {
          first_name: row.Vorname,
          last_name: row.Nachname,
          email: row.Email || row["E-Mail"],
          phone: row.Telefon || row["Telefonnummer"],
          mobile: row.Mobil,
          member_number: row.Mitgliedsnummer,
          street: row.Strasse || row["Straße"],
          postal_code: row.PLZ,
          city: row.Stadt,
          birthday: row.Geburtstag || row["Geburtstag (TT.MM.JJJJ)"],
          temporary_password: row["Temporäres Passwort"],
          role: row.Rolle || "mitglied", // Changed default from "player" to "mitglied"
        };

        // Validate each row with zod schema
        const validationResult = memberImportSchema.safeParse(memberData);
        if (!validationResult.success) {
          invalidRows.push({
            row: index + 2, // +2 for header row and 0-index
            errors: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
          });
          return null;
        }

        return validationResult.data;
      }).filter(Boolean);

      if (invalidRows.length > 0) {
        const errorMessages = invalidRows.map(
          ({ row, errors }) => `Zeile ${row}: ${errors.join(', ')}`
        ).join('\n');
        throw new Error(`Validierungsfehler:\n${errorMessages}`);
      }

      // Call edge function to import members
      const { data: result, error } = await supabase.functions.invoke<ImportMembersResponse>("import-members", {
        body: { members },
      });

      if (error) throw error;

      const {
        successful = [],
        failed = [],
        updated = [],
        userIdSummary,
      } = result ?? {};

      // Store the import log for display
      setImportLog({ successful, failed, updated });

      let message = `${successful.length} Mitglied(er) erfolgreich importiert.`;
      if (updated && updated.length > 0) {
        message += ` ${updated.length} aktualisiert.`;
      }
      if (failed.length > 0) {
        message += ` ${failed.length} fehlgeschlagen.`;
      }

      const hasUserIdErrors = Boolean(userIdSummary?.errors?.length);

      if (userIdSummary) {
        if (userIdSummary.created > 0) {
          message += ` ${userIdSummary.created} fehlende Benutzer-IDs vergeben.`;
        }
        if (hasUserIdErrors) {
          message += ` ${userIdSummary.errors.length} Benutzer-IDs konnten nicht erstellt werden.`;
          console.error("assign-user-ids errors:", userIdSummary.errors);
        }
      }

      toast({
        title: failed.length > 0 ? "Import teilweise erfolgreich" : "Import erfolgreich",
        description: message,
        variant: failed.length > 0 || hasUserIdErrors ? "destructive" : "default",
      });

      // Notify other components that members have been imported
      window.dispatchEvent(new Event("members-imported"));

      // Reset input
      event.target.value = "";
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Fehler beim Import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mitglieder-Import</CardTitle>
        <CardDescription>
          Laden Sie mehrere Mitglieder gleichzeitig über eine CSV-Datei hoch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">1. Vorlage herunterladen</h3>
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            CSV-Vorlage herunterladen
          </Button>
          <p className="text-xs text-muted-foreground">
            Laden Sie die Vorlage herunter und füllen Sie diese mit den Mitgliederdaten aus.
            Email und Passwort sind optional. Verfügbare Rollen: mitglied (Standard), player, admin, moderator, vorstand, mannschaftsfuehrer.
            Verwenden Sie Semikolon (;) als Trennzeichen.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">2. Ausgefüllte Datei hochladen</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  CSV-Datei hochladen
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mitglieder mit Email und Passwort können sich anmelden. Bei bestehenden Mitgliedern (Name+Vorname) werden die Daten aktualisiert.
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <h4 className="font-medium mb-2">Hinweise:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Pflichtfelder: Vorname, Nachname</li>
            <li>Email und Passwort sind optional (für Mitglieder ohne Login)</li>
            <li>Bestehende Mitglieder (gleicher Vor- und Nachname) werden aktualisiert</li>
            <li>Doppelte Email-Adressen sind erlaubt</li>
            <li>Die Standard-Rolle ist "mitglied", wenn nichts anderes angegeben wird</li>
          </ul>
        </div>

        {importLog && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Import-Protokoll</h3>
              <Button variant="outline" size="sm" onClick={() => setImportLog(null)}>
                Protokoll löschen
              </Button>
            </div>

            {importLog.successful.length > 0 && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    Erfolgreich importiert ({importLog.successful.length})
                  </div>
                  <ScrollArea className="h-32 w-full rounded border bg-background p-2">
                    <ul className="space-y-1 text-sm">
                      {importLog.successful.map((name, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {importLog.updated.length > 0 && (
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    Aktualisiert ({importLog.updated.length})
                  </div>
                  <ScrollArea className="h-32 w-full rounded border bg-background p-2">
                    <ul className="space-y-1 text-sm">
                      {importLog.updated.map((name, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 text-blue-600 shrink-0" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {importLog.failed.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    Fehlgeschlagen ({importLog.failed.length})
                  </div>
                  <ScrollArea className="h-48 w-full rounded border bg-background p-2">
                    <ul className="space-y-2 text-sm">
                      {importLog.failed.map((failure, idx) => (
                        <li key={idx} className="border-b pb-2 last:border-0">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">{failure.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {failure.error}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
