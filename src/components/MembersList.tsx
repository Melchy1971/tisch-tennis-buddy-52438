import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  member_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  birthday: string | null;
  qttr_value: number | null;
  status: string | null;
  created_at: string;
}

export const MembersList = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const normalizeMemberNumber = (memberNumber: string | null) => {
        if (!memberNumber) return Number.POSITIVE_INFINITY;

        const numericPart = parseInt(memberNumber.replace(/\D/g, ""), 10);
        if (Number.isNaN(numericPart)) {
          return Number.POSITIVE_INFINITY;
        }

        return numericPart;
      };

      const sortedMembers = [...(data || [])].sort((a, b) => {
        const numberA = normalizeMemberNumber(a.member_number);
        const numberB = normalizeMemberNumber(b.member_number);

        if (numberA !== numberB) {
          return numberA - numberB;
        }

        const memberNumberCompare = (a.member_number || "").localeCompare(
          b.member_number || "",
          "de",
          { numeric: true, sensitivity: "base" }
        );
        if (memberNumberCompare !== 0) {
          return memberNumberCompare;
        }

        const lastNameCompare = (a.last_name || "").localeCompare(b.last_name || "", "de", {
          sensitivity: "base"
        });
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }

        return (a.first_name || "").localeCompare(b.first_name || "", "de", {
          sensitivity: "base"
        });
      });

      setMembers(sortedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Fehler",
        description: "Die Mitgliederliste konnte nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      const exportData = members.map((member, index) => ({
        'Nr.': index + 1,
        'Nachname': member.last_name || '',
        'Vorname': member.first_name || '',
        'Mitgliedsnummer': member.member_number || '',
        'E-Mail': member.email || '',
        'Telefon': member.phone || '',
        'Mobil': member.mobile || '',
        'Straße': member.street || '',
        'PLZ': member.postal_code || '',
        'Ort': member.city || '',
        'Geburtstag': member.birthday ? new Date(member.birthday).toLocaleDateString('de-DE') : '',
        'QTTR/TTR': member.qttr_value || '',
        'Status': member.status || '',
        'Beitrittsdatum': new Date(member.created_at).toLocaleDateString('de-DE')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mitgliederliste");

      // Auto-size columns
      const maxWidth = exportData.reduce((acc, row) => {
        Object.keys(row).forEach((key, i) => {
          const value = String(row[key as keyof typeof row]);
          acc[i] = Math.max(acc[i] || 10, key.length, value.length);
        });
        return acc;
      }, [] as number[]);

      ws['!cols'] = maxWidth.map(w => ({ wch: Math.min(w + 2, 50) }));

      XLSX.writeFile(wb, `Mitgliederliste_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.xlsx`);

      toast({
        title: "Export erfolgreich",
        description: "Die Mitgliederliste wurde als Excel-Datei heruntergeladen."
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die Excel-Datei konnte nicht erstellt werden.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(16);
      doc.text("Mitgliederliste", 14, 15);

      doc.setFontSize(10);
      doc.text(`Stand: ${new Date().toLocaleDateString("de-DE")} · ${members.length} Mitglieder`, 14, 22);

      const tableData = members.map((member, index) => [
        index + 1,
        member.last_name || '',
        member.first_name || '',
        member.member_number || '',
        member.email || '',
        member.phone || member.mobile || '',
        `${member.postal_code || ''} ${member.city || ''}`.trim(),
        member.qttr_value?.toString() || '',
        member.status || ''
      ]);

      autoTable(doc, {
        head: [['Nr.', 'Nachname', 'Vorname', 'Mitgl.-Nr.', 'E-Mail', 'Telefon', 'Ort', 'QTTR', 'Status']],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 40 },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 }
        }
      });

      doc.save(`Mitgliederliste_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.pdf`);

      toast({
        title: "Export erfolgreich",
        description: "Die Mitgliederliste wurde als PDF heruntergeladen."
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die PDF konnte nicht erstellt werden.",
        variant: "destructive"
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mitgliederliste
            </CardTitle>
            <CardDescription>
              Vollständige Liste aller Vereinsmitglieder mit allen Daten
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToExcel}
              disabled={exporting || members.length === 0}
              variant="outline"
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={exporting || members.length === 0}
              className="gap-2 bg-gradient-primary hover:bg-primary-hover"
            >
              <FileText className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm text-muted-foreground">
          Gesamt: <strong>{members.length}</strong> Mitglieder
        </div>
        <ScrollArea className="h-[600px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-12">Nr.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mitgl.-Nr.</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Geburtstag</TableHead>
                <TableHead className="text-right">QTTR/TTR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member, index) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {member.last_name}, {member.first_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.member_number || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{member.email || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <div>{member.phone || '-'}</div>
                    {member.mobile && member.mobile !== member.phone && (
                      <div className="text-xs text-muted-foreground">{member.mobile}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {member.street && <div>{member.street}</div>}
                    {(member.postal_code || member.city) && (
                      <div className="text-muted-foreground">
                        {member.postal_code} {member.city}
                      </div>
                    )}
                    {!member.street && !member.postal_code && !member.city && '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {member.birthday
                      ? new Date(member.birthday).toLocaleDateString('de-DE')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {member.qttr_value || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status === 'active' ? 'Aktiv' : member.status || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
