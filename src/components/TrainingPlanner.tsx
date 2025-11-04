import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, Users, Calendar, Plus, Filter } from "lucide-react";
import { useState } from "react";

export const TrainingPlanner = () => {
  const [selectedWeek, setSelectedWeek] = useState("current");

  const trainingSlots = [
    {
      id: 1,
      title: "Herren Training",
      date: "Montag, 02.12.2024",
      time: "19:00 - 21:00",
      location: "Halle A",
      maxParticipants: 12,
      currentParticipants: 8,
      trainer: "Klaus Bauer",
      status: "open",
      participants: [
        { name: "Max Mustermann", avatar: "/api/placeholder/32/32" },
        { name: "Tom Weber", avatar: "/api/placeholder/32/32" },
        { name: "Peter Schmidt", avatar: "/api/placeholder/32/32" },
        { name: "Andreas Müller", avatar: "/api/placeholder/32/32" }
      ]
    },
    {
      id: 2,
      title: "Damen Training",
      date: "Dienstag, 03.12.2024", 
      time: "18:30 - 20:30",
      location: "Halle B",
      maxParticipants: 10,
      currentParticipants: 6,
      trainer: "Anna Schmidt",
      status: "open",
      participants: [
        { name: "Anna Schmidt", avatar: "/api/placeholder/32/32" },
        { name: "Lisa Müller", avatar: "/api/placeholder/32/32" },
        { name: "Sarah Wagner", avatar: "/api/placeholder/32/32" }
      ]
    },
    {
      id: 3,
      title: "Jugend U18 Training",
      date: "Mittwoch, 04.12.2024",
      time: "17:00 - 18:30", 
      location: "Halle A",
      maxParticipants: 15,
      currentParticipants: 15,
      trainer: "Tom Weber",
      status: "full",
      participants: []
    },
    {
      id: 4,
      title: "Mixed Freies Training",
      date: "Donnerstag, 05.12.2024",
      time: "20:00 - 22:00",
      location: "Halle A & B",
      maxParticipants: 20,
      currentParticipants: 12,
      trainer: "Freies Training",
      status: "open",
      participants: [
        { name: "Various Members", avatar: "/api/placeholder/32/32" }
      ]
    }
  ];

  const upcomingMatches = [
    {
      team: "Herren I",
      club_team: "Herren I",
      opponent: "TTC Musterstadt", 
      date: "Sa, 07.12",
      time: "15:00",
      needsPlayers: 2,
      confirmedPlayers: 6
    },
    {
      team: "Damen I",
      club_team: "Damen I",
      opponent: "SV Beispiel",
      date: "So, 08.12", 
      time: "10:00",
      needsPlayers: 1,
      confirmedPlayers: 5
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "full":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Plätze frei";
      case "full":
        return "Ausgebucht";
      case "cancelled":
        return "Abgesagt";
      default:
        return "Unbekannt";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trainingsplanung</h1>
          <p className="text-muted-foreground">Planen Sie Trainings und koordinieren Sie Teilnehmer</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-gradient-secondary hover:bg-secondary-hover shadow-accent">
            <Plus className="w-4 h-4 mr-2" />
            Training erstellen
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Diese Woche
              </CardTitle>
              <CardDescription>Trainingsplan für die aktuelle Woche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingSlots.map((slot) => (
                <div key={slot.id} className="p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{slot.title}</h3>
                        <Badge className={getStatusBadge(slot.status)} variant="outline">
                          {getStatusText(slot.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {slot.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {slot.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {slot.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{slot.currentParticipants}/{slot.maxParticipants} Teilnehmer</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Trainer: {slot.trainer}
                        </div>
                      </div>

                      {slot.participants.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {slot.participants.slice(0, 4).map((participant, index) => (
                              <Avatar key={index} className="w-6 h-6 border-2 border-background">
                                <AvatarImage src={participant.avatar} alt={participant.name} />
                                <AvatarFallback className="text-xs">
                                  {participant.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {slot.participants.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                +{slot.participants.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {slot.status === "open" && (
                        <Button size="sm" className="bg-gradient-primary hover:bg-primary-hover">
                          Teilnehmen
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Spielersuche
              </CardTitle>
              <CardDescription>Kommende Spiele benötigen Verstärkung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingMatches.map((match, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <div className="font-medium">{match.club_team ?? match.team}</div>
                    <div className="text-sm text-muted-foreground">
                      vs {match.opponent}
                    </div>
                    <div className="text-sm">
                      {match.date} um {match.time}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600 font-medium">
                        {match.needsPlayers} Spieler gesucht
                      </span>
                      <span className="text-muted-foreground">
                        {match.confirmedPlayers} bestätigt
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      Melde mich!
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">78%</div>
                <div className="text-sm text-muted-foreground">Trainings-Teilnahme</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">24</div>
                <div className="text-sm text-muted-foreground">Trainings diesen Monat</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-muted-foreground">Aktive Trainer</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};