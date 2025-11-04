import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, 
  Users, 
  UserCog, 
  Calendar, 
  Trophy, 
  MessageCircle, 
  AlertTriangle,
  Loader2
} from "lucide-react";

export const Demo = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const isDemoFillEnabled = false;
  const isDangerZoneEnabled = false;
  const { toast } = useToast();

  const handleFillDemoData = async () => {
    if (!isDemoFillEnabled) {
      return;
    }

    setLoading("fill");
    try {
      const { error } = await supabase.functions.invoke('demo-management', {
        body: { action: 'fill_all' }
      });

      if (error) throw error;

      toast({
        title: "Demodaten erstellt",
        description: "Alle Bereiche wurden mit Testdaten befüllt",
      });
    } catch (error) {
      console.error('Error filling demo data:', error);
      toast({
        title: "Fehler",
        description: "Demodaten konnten nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleResetCategory = async (category: string) => {
    setLoading(category);
    try {
      const { error } = await supabase.functions.invoke('demo-management', {
        body: { action: 'reset_category', category }
      });

      if (error) throw error;

      toast({
        title: "Daten gelöscht",
        description: `${getCategoryLabel(category)} wurde zurückgesetzt`,
      });
    } catch (error) {
      console.error(`Error resetting ${category}:`, error);
      toast({
        title: "Fehler",
        description: `${getCategoryLabel(category)} konnte nicht zurückgesetzt werden`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleResetAll = async () => {
    if (!isDangerZoneEnabled) {
      return;
    }

    if (!window.confirm("Möchten Sie wirklich ALLE Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!")) {
      return;
    }

    setLoading("reset_all");
    try {
      const { error } = await supabase.functions.invoke('demo-management', {
        body: { action: 'reset_all' }
      });

      if (error) throw error;

      toast({
        title: "System zurückgesetzt",
        description: "Alle Daten wurden erfolgreich gelöscht",
      });
    } catch (error) {
      console.error('Error resetting all:', error);
      toast({
        title: "Fehler",
        description: "System konnte nicht zurückgesetzt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      members: "Mitglieder",
      teams: "Mannschaften",
      matches: "Spielverwaltung",
      training: "Trainings",
      qttr: "QTTR/TTR-Liste",
      communication: "Kommunikation",
    };
    return labels[category] || category;
  };

  const categories = [
    { id: "members", label: "Mitglieder", icon: Users, description: "Alle Mitgliederdaten löschen" },
    { id: "teams", label: "Mannschaften", icon: UserCog, description: "Alle Mannschaften und Zuordnungen löschen" },
    { id: "matches", label: "Spielverwaltung", icon: Calendar, description: "Alle Spiele und Ergebnisse löschen" },
    { id: "training", label: "Trainings", icon: Calendar, description: "Alle Trainingstermine löschen" },
    { id: "qttr", label: "QTTR/TTR-Liste", icon: Trophy, description: "QTTR-Daten löschen" },
    { id: "communication", label: "Kommunikation", icon: MessageCircle, description: "Alle Nachrichten und Events löschen" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900">Demo-Verwaltung</h2>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Testdaten für das System
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Achtung:</strong> Alle Aktionen in diesem Bereich wirken sich auf die Datenbank aus. 
          Gelöschte Daten können nicht wiederhergestellt werden.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Demodaten befüllen
          </CardTitle>
          <CardDescription>
            Erstellt Testdaten für alle Bereiche der Anwendung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              onClick={handleFillDemoData}
              disabled={loading !== null || !isDemoFillEnabled}
              className="w-full"
            >
              {loading === "fill" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle Demodaten...
                </>
              ) : (
                "Alle Bereiche mit Demodaten befüllen"
              )}
            </Button>
            {!isDemoFillEnabled && (
              <p className="text-sm text-muted-foreground text-center">
                Diese Funktion ist derzeit deaktiviert.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Einzelne Bereiche zurücksetzen</CardTitle>
          <CardDescription>
            Löschen Sie Daten aus spezifischen Kategorien
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{category.label}</div>
                    <div className="text-sm text-muted-foreground">{category.description}</div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleResetCategory(category.id)}
                  disabled={loading !== null}
                >
                  {loading === category.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Löschen"
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Gefahr-Zone
          </CardTitle>
          <CardDescription>
            Komplettes System auf Auslieferungszustand zurücksetzen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="destructive"
            onClick={handleResetAll}
            disabled={loading !== null || !isDangerZoneEnabled}
            className="w-full"
          >
            {loading === "reset_all" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setze zurück...
              </>
            ) : (
              "Alle Daten löschen (Auslieferungszustand)"
            )}
          </Button>
          {!isDangerZoneEnabled && (
            <p className="text-sm text-muted-foreground text-center">
              Die Gefahr-Zone ist derzeit deaktiviert.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
