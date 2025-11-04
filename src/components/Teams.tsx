import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Calendar, Plus } from "lucide-react";

export const Teams = () => {
  const teams = [
    {
      name: "Herren I",
      league: "Bezirksliga",
      players: 8,
      wins: 12,
      losses: 3,
      nextMatch: "Sa, 30.11 vs TTC Musterstadt",
      status: "active"
    },
    {
      name: "Herren II", 
      league: "Kreisliga A",
      players: 10,
      wins: 8,
      losses: 7,
      nextMatch: "So, 01.12 vs TSV Nordstadt",
      status: "active"
    },
    {
      name: "Damen I",
      league: "Bezirksklasse",
      players: 6,
      wins: 9,
      losses: 6,
      nextMatch: "So, 01.12 vs SV Beispiel",
      status: "active"
    },
    {
      name: "Jugend U18",
      league: "Jugendliga",
      players: 12,
      wins: 15,
      losses: 2,
      nextMatch: "Sa, 30.11 vs JSV Mitte",
      status: "active"
    },
    {
      name: "Jugend U15",
      league: "Jugendliga",
      players: 8,
      wins: 11,
      losses: 4,
      nextMatch: "So, 01.12 vs TTC Jung",
      status: "active"
    },
    {
      name: "Herren III",
      league: "Kreisliga B",
      players: 6,
      wins: 5,
      losses: 10,
      nextMatch: "-",
      status: "inactive"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mannschaften</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Vereinsmannschaften und Spieler</p>
        </div>
        <Button className="bg-gradient-secondary hover:bg-secondary-hover shadow-accent">
          <Plus className="w-4 h-4 mr-2" />
          Neue Mannschaft
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team, index) => (
          <Card key={index} className="hover:shadow-sport transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Badge 
                  variant={team.status === "active" ? "default" : "secondary"}
                  className={team.status === "active" ? "bg-gradient-primary" : ""}
                >
                  {team.status === "active" ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
              <CardDescription className="font-medium text-primary">{team.league}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{team.players} Spieler</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-green-600">
                    <Trophy className="w-4 h-4" />
                    <span>{team.wins}</span>
                  </div>
                  <div className="text-muted-foreground">-</div>
                  <div className="flex items-center gap-1 text-red-600">
                    <Trophy className="w-4 h-4" />
                    <span>{team.losses}</span>
                  </div>
                </div>
              </div>
              
              {team.nextMatch !== "-" && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-md">
                  <Calendar className="w-4 h-4" />
                  <span>{team.nextMatch}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Spieler
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Statistiken
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};