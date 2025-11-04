import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

type PlayerProfile = Pick<ProfileRow, "id" | "first_name" | "last_name" | "qttr_value">;
type ProfileSelection = Pick<ProfileRow, "id" | "first_name" | "last_name" | "qttr_value" | "default_role">;

interface GroupedPlayers {
  adults: PlayerProfile[];
  youth: PlayerProfile[];
}

const PlayerTable = ({ players }: { players: PlayerProfile[] }) => {
  if (players.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
        Keine Spieler vorhanden.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[420px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Nr.</TableHead>
            <TableHead>Nachname</TableHead>
            <TableHead>Vorname</TableHead>
            <TableHead className="text-right">QTTR/TTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player, index) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{player.last_name ?? ""}</TableCell>
              <TableCell>{player.first_name ?? ""}</TableCell>
              <TableCell className="text-right">{player.qttr_value ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export const ActivePlayersList = () => {
  const [loading, setLoading] = useState(true);
  const [groupedPlayers, setGroupedPlayers] = useState<GroupedPlayers>({ adults: [], youth: [] });
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
  }, []);

    const fetchPlayers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, qttr_value, default_role")
        .is("deleted_at", null)
        .order("last_name", { ascending: true });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesByUser = new Map<string, Set<AppRole>>();

      (rolesData || []).forEach((entry: UserRoleRow) => {
        const existing = rolesByUser.get(entry.user_id) ?? new Set<AppRole>();
        existing.add(entry.role);
        rolesByUser.set(entry.user_id, existing);
      });

      const adults: PlayerProfile[] = [];
      const youth: PlayerProfile[] = [];

      const profileRows = (profilesData ?? []) as ProfileSelection[];

      profileRows.forEach((profile) => {
        const userRoles = new Set<AppRole>();
        // Note: profile.id is the user_id (references auth.users)
        const rolesForUser = rolesByUser.get(profile.id);

        rolesForUser?.forEach((role) => userRoles.add(role));

        if (profile.default_role) {
          userRoles.add(profile.default_role as AppRole);
        }

        if (!userRoles.has("member")) {
          return;
        }

        const targetList = userRoles.has("trainer") ? youth : adults;

        targetList.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          qttr_value: profile.qttr_value,
        });
      });

      setGroupedPlayers({ adults, youth });
    } catch (error) {
      console.error("Error fetching active players:", error);
      toast({
        title: "Fehler",
        description: "Die aktiven Spieler konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAdultsToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Aktive Spieler – Erwachsene", 14, 20);
    
    const tableData = groupedPlayers.adults.map((player, index) => [
      (index + 1).toString(),
      player.last_name ?? "",
      player.first_name ?? "",
      player.qttr_value?.toString() ?? "-",
    ]);

    autoTable(doc, {
      head: [["Nr.", "Nachname", "Vorname", "QTTR/TTR"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save("aktive-spieler-erwachsene.pdf");
    
    toast({
      title: "PDF erstellt",
      description: "Die Erwachsenen-Spielerliste wurde als PDF gespeichert.",
    });
  };

  const exportYouthToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Aktive Spieler – Jugend", 14, 20);
    
    const tableData = groupedPlayers.youth.map((player, index) => [
      (index + 1).toString(),
      player.last_name ?? "",
      player.first_name ?? "",
      player.qttr_value?.toString() ?? "-",
    ]);

    autoTable(doc, {
      head: [["Nr.", "Nachname", "Vorname", "QTTR/TTR"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save("aktive-spieler-jugend.pdf");
    
    toast({
      title: "PDF erstellt",
      description: "Die Jugend-Spielerliste wurde als PDF gespeichert.",
    });
  };

  if (loading) {
    return (
      <Card className="shadow-sport">
        <CardContent className="flex items-center justify-center p-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-sport">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Aktive Spieler – Erwachsene
              </CardTitle>
              <CardDescription>
                Spielerinnen und Spieler mit der Rolle „Spieler"
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAdultsToPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Als PDF speichern
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PlayerTable players={groupedPlayers.adults} />
        </CardContent>
      </Card>

      <Card className="shadow-sport">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Aktive Spieler – Jugend
              </CardTitle>
              <CardDescription>
                Spielerinnen und Spieler mit der Rolle „Jugend"
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportYouthToPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Als PDF speichern
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PlayerTable players={groupedPlayers.youth} />
        </CardContent>
      </Card>
    </div>
  );
};

