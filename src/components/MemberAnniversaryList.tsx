import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Award } from "lucide-react";

const MILESTONE_YEARS = [5, 10, 15, 20, 25];

const getAnniversaryBadgeColor = (years: number) => {
  switch (years) {
    case 5:
      return "bg-blue-500 text-white";
    case 10:
      return "bg-green-500 text-white";
    case 15:
      return "bg-purple-500 text-white";
    case 20:
      return "bg-orange-500 text-white";
    case 25:
      return "bg-gradient-primary text-primary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

interface AnniversaryMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  member_since: string | null;
  created_at: string;
  years: number;
}

const calculateFullYears = (start: Date, end: Date) => {
  let years = end.getFullYear() - start.getFullYear();

  const hasHadAnniversaryThisYear =
    end.getMonth() > start.getMonth() ||
    (end.getMonth() === start.getMonth() && end.getDate() >= start.getDate());

  if (!hasHadAnniversaryThisYear) {
    years -= 1;
  }

  return years;
};

const toDateOrNull = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatGermanDate = (value: string | null): string => {
  if (!value) {
    return "–";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "–";
  }

  return date.toLocaleDateString("de-DE");
};

export const MemberAnniversaryList = () => {
  const [members, setMembers] = useState<AnniversaryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, member_since, created_at")
          .is("deleted_at", null)
          .order("last_name", { ascending: true });

        if (error) {
          throw error;
        }

        const today = new Date();

        type ProfileSelection = Pick<
          Database["public"]["Tables"]["profiles"]["Row"],
          "id" | "first_name" | "last_name" | "member_since" | "created_at"
        >;

        const withAnniversary = ((data ?? []) as ProfileSelection[]).map((member) => {
          const membershipStart = toDateOrNull(member.member_since) ?? toDateOrNull(member.created_at) ?? today;
          const years = membershipStart ? calculateFullYears(membershipStart, today) : 0;

          return {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            member_since: membershipStart ? membershipStart.toISOString() : null,
            created_at: member.created_at,
            years,
          } satisfies AnniversaryMember;
        });

        setMembers(withAnniversary);
      } catch (error) {
        console.error("Error fetching anniversaries:", error);
        toast({
          title: "Fehler",
          description: "Die Jubiläumsdaten konnten nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [toast]);

  const anniversaryMembers = useMemo(() => {
    return members
      .filter((member) => MILESTONE_YEARS.includes(member.years))
      .sort((a, b) => {
        // Sort by years descending (25, 20, 15, 10, 5)
        if (a.years !== b.years) {
          return b.years - a.years;
        }
        // Then by last name
        const lastNameA = a.last_name || "";
        const lastNameB = b.last_name || "";
        return lastNameA.localeCompare(lastNameB);
      });
  }, [members]);

  return (
    <Card className="shadow-sport">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Vereinsjubiläen
        </CardTitle>
        <CardDescription>
          Mitglieder mit 5, 10, 15, 20 oder 25 Jahren Vereinszugehörigkeit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : anniversaryMembers.length === 0 ? (
          <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
            Aktuell gibt es keine Mitglieder mit einem Vereinsjubiläum (5, 10, 15, 20 oder 25 Jahre).
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 pb-2">
              {MILESTONE_YEARS.map((years) => {
                const count = anniversaryMembers.filter(m => m.years === years).length;
                return count > 0 ? (
                  <Badge key={years} className={getAnniversaryBadgeColor(years)}>
                    {years} Jahre: {count}
                  </Badge>
                ) : null;
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {anniversaryMembers.length} {anniversaryMembers.length === 1 ? "Mitglied" : "Mitglieder"} feiern ein Vereinsjubiläum.
            </p>
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Nr.</TableHead>
                    <TableHead>Nachname</TableHead>
                    <TableHead>Vorname</TableHead>
                    <TableHead>Mitglied seit</TableHead>
                    <TableHead className="text-right">Jubiläum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anniversaryMembers.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{member.last_name ?? ""}</TableCell>
                      <TableCell>{member.first_name ?? ""}</TableCell>
                      <TableCell>{formatGermanDate(member.member_since)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={getAnniversaryBadgeColor(member.years)}>
                          {member.years} Jahre
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberAnniversaryList;
