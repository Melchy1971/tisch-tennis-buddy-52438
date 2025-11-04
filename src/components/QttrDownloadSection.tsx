import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  qttr_value: number | null;
}

export const QttrDownloadSection = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, qttr_value, status')
        .eq('status', 'active') // Only fetch active members
        .order('qttr_value', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text("QTTR/TTR-Liste", 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Stand: ${new Date().toLocaleDateString("de-DE")}`, 14, 30);

      // Prepare table data
      const tableData = members
        .filter(m => m.qttr_value !== null)
        .map((member, index) => [
          index + 1,
          `${member.last_name || ''}, ${member.first_name || ''}`.trim(),
          member.qttr_value?.toString() || '-'
        ]);

      // Add table
      autoTable(doc, {
        head: [['Nr.', 'Name', 'QTTR/TTR']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38] },
      });

      doc.save('qttr-liste.pdf');

      toast({
        title: "Download erfolgreich",
        description: "Die QTTR/TTR-Liste wurde als PDF heruntergeladen."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download fehlgeschlagen",
        description: "Die PDF konnte nicht erstellt werden.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sport">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-pulse text-muted-foreground">
            Lade Mitgliederliste...
          </div>
        </CardContent>
      </Card>
    );
  }

  const membersWithQttr = members.filter(m => m.qttr_value !== null);

  if (membersWithQttr.length === 0) {
    return (
      <Card className="shadow-sport">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Aktuelle QTTR/TTR-Liste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Derzeit sind keine QTTR/TTR-Werte zugewiesen. Bitte kontaktieren Sie den Vorstand.
            </AlertDescription>
          </Alert>
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
              <FileText className="w-5 h-5" />
              Aktuelle QTTR/TTR-Liste
            </CardTitle>
            <CardDescription>
              Stand: {new Date().toLocaleDateString("de-DE")} · {membersWithQttr.length} Spieler
            </CardDescription>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Erstelle PDF..." : "Als PDF herunterladen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nr.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right w-32">QTTR/TTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithQttr.map((member, index) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {member.last_name}, {member.first_name}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {member.qttr_value}
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