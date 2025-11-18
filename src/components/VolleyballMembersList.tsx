import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Download, Loader2, Volleyball } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface VolleyballMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  status: string | null;
}

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

type ProfileSelection = Pick<
  ProfileRow,
  "id" | "first_name" | "last_name" | "email" | "phone" | "mobile" | "status" | "default_role"
>;

export const VolleyballMembersList = () => {
  const [members, setMembers] = useState<VolleyballMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, mobile, status, default_role")
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

      const volleyballMembers = (profilesData || [])
        .map((profile) => profile as ProfileSelection)
        .filter((profile) => {
          const userRoles = new Set<AppRole>();
          const rolesForUser = rolesByUser.get(profile.id);

          rolesForUser?.forEach((role) => userRoles.add(role));

          if (profile.default_role) {
            userRoles.add(profile.default_role as AppRole);
          }

          return userRoles.has("volleyball");
        })
        .map((profile) => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          mobile: profile.mobile,
          status: profile.status,
        }));

      setMembers(volleyballMembers);
    } catch (error) {
      console.error("Error fetching volleyball members:", error);
      toast({
        title: "Fehler",
        description: "Die Volleyball-Mitglieder konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const generatedAt = new Date().toLocaleDateString("de-DE");

      doc.setFontSize(16);
      doc.text("Mitglieder Volleyball", 14, 20);

      doc.setFontSize(10);
      doc.text(`Stand: ${generatedAt} · ${members.length} Mitglieder`, 14, 28);

      const tableData = members.map((member, index) => [
        (index + 1).toString(),
        member.last_name ?? "",
        member.first_name ?? "",
        member.email ?? "",
        member.phone || member.mobile || "",
        member.status ?? "",
      ]);

      autoTable(doc, {
        head: [["Nr.", "Nachname", "Vorname", "E-Mail", "Telefon", "Status"]],
        body: tableData,
        startY: 36,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 50 },
          4: { cellWidth: 35 },
          5: { cellWidth: 25 },
        },
      });

      const fileSuffix = generatedAt.replace(/\./g, "-");
      doc.save(`volleyball-mitglieder_${fileSuffix}.pdf`);

      toast({
        title: "PDF erstellt",
        description: "Die Volleyball-Liste wurde als PDF gespeichert.",
      });
    } catch (error) {
      console.error("Error exporting volleyball members to PDF:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die PDF-Datei konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
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
    <Card className="shadow-sport">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Volleyball className="h-5 w-5 text-emerald-500" />
            Mitglieder Volleyball
          </CardTitle>
          <CardDescription>
            Übersicht aller Mitglieder mit der Rolle Volleyball.
          </CardDescription>
        </div>
        <Button onClick={exportToPDF} disabled={exporting || members.length === 0}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Als PDF speichern
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
            Es wurden keine Mitglieder mit der Rolle Volleyball gefunden.
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Nr.</TableHead>
                  <TableHead>Nachname</TableHead>
                  <TableHead>Vorname</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{member.last_name ?? ""}</TableCell>
                    <TableCell>{member.first_name ?? ""}</TableCell>
                    <TableCell>{member.email ?? ""}</TableCell>
                    <TableCell>{member.phone || member.mobile || ""}</TableCell>
                    <TableCell>{member.status ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
