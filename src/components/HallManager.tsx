import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { HALL_UPDATE_EVENT } from "@/lib/hallEvents";

type HallFormState = {
  id?: string;
  hallNumber: number;
  name: string;
  address: string;
};

const HALL_NUMBERS = [1, 2, 3] as const;

const createInitialState = (): Record<(typeof HALL_NUMBERS)[number], HallFormState> =>
  HALL_NUMBERS.reduce((acc, hallNumber) => {
    acc[hallNumber] = { hallNumber, name: "", address: "" };
    return acc;
  }, {} as Record<(typeof HALL_NUMBERS)[number], HallFormState>);

export const HallManager = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState(createInitialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const loadHalls = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_halls")
        .select("id, hall_number, name, address")
        .order("hall_number");

      if (error) throw error;

      const baseState = createInitialState();

      (data ?? []).forEach((hall) => {
        const hallNumber = hall.hall_number as number | null;
        if (!hallNumber || !HALL_NUMBERS.includes(hallNumber as (typeof HALL_NUMBERS)[number])) {
          return;
        }

        baseState[hallNumber] = {
          id: hall.id,
          hallNumber,
          name: hall.name ?? "",
          address: hall.address ?? ""
        };
      });

      setForms(baseState);
      setIsDirty(false);
    } catch (error) {
      console.error("Error loading halls:", error);
      toast({
        title: "Laden fehlgeschlagen",
        description: "Die Hallen konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHalls();
  }, [loadHalls]);

  const handleFieldChange = (hallNumber: (typeof HALL_NUMBERS)[number], field: "name" | "address", value: string) => {
    setForms((prev) => ({
      ...prev,
      [hallNumber]: {
        ...prev[hallNumber],
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only save halls that have at least a name
      const payload = HALL_NUMBERS.map((hallNumber) => {
        const form = forms[hallNumber];
        const name = form.name.trim();
        const address = form.address.trim();
        
        // Skip halls without any content
        if (!name && !address) return null;
        
        // Don't include id - let upsert handle it based on hall_number
        return {
          hall_number: hallNumber,
          name: name || `Halle ${hallNumber}`, // Use default name if empty
          address: address || null
        };
      }).filter(Boolean); // Remove null entries

      if (payload.length === 0) {
        toast({
          title: "Keine Daten zum Speichern",
          description: "Bitte geben Sie mindestens einen Hallennamen ein.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("club_halls").upsert(payload, { onConflict: "hall_number" });
      if (error) throw error;

      toast({
        title: "Hallen gespeichert",
        description: "Die Hallenadressen wurden aktualisiert."
      });

      setIsDirty(false);
      window.dispatchEvent(new Event(HALL_UPDATE_EVENT));
      await loadHalls();
    } catch (error) {
      console.error("Error saving halls:", error);
      toast({
        title: "Speichern fehlgeschlagen",
        description: "Die Hallen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasContent = useMemo(
    () =>
      HALL_NUMBERS.some((hallNumber) => {
        const form = forms[hallNumber];
        return Boolean(form.name.trim() || form.address.trim());
      }),
    [forms]
  );

  return (
    <Card className="shadow-sport">
      <CardHeader>
        <CardTitle>Hallenverwaltung</CardTitle>
        <CardDescription>
          Pflegen Sie Bezeichnung und Adresse der Hallen 1 bis 3. Diese Angaben werden unter anderem beim Spielplan-Import zur
          Adresszuordnung verwendet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {HALL_NUMBERS.map((hallNumber) => {
            const form = forms[hallNumber];
            return (
              <div
                key={hallNumber}
                className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Halle {hallNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Ordnen Sie hier den Namen und die Anschrift der Halle {hallNumber} zu.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`hall-${hallNumber}-name`}>Bezeichnung</Label>
                  <Input
                    id={`hall-${hallNumber}-name`}
                    value={form.name}
                    onChange={(event) => handleFieldChange(hallNumber, "name", event.target.value)}
                    placeholder="z. B. Sporthalle Zaberfeld"
                    disabled={loading || saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`hall-${hallNumber}-address`}>Adresse</Label>
                  <Textarea
                    id={`hall-${hallNumber}-address`}
                    value={form.address}
                    onChange={(event) => handleFieldChange(hallNumber, "address", event.target.value)}
                    placeholder="z. B. Schulstraße 1, 74374 Zaberfeld"
                    disabled={loading || saving}
                    rows={4}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {!hasContent
              ? "Hinterlegen Sie mindestens eine Halle, damit Spielpläne automatisch mit Adressen versehen werden."
              : "Änderungen werden sofort für Import- und Kommunikationsfunktionen verwendet."}
          </p>
          <Button onClick={handleSave} disabled={saving || !isDirty} className="sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Hallen speichern
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

