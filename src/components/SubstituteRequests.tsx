import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Calendar, Clock, User, MessageSquare, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

export const SubstituteRequests = () => {
  const substituteRequests = [
    {
      id: 1,
      requester: "Max Mustermann",
      requesterAvatar: "/api/placeholder/40/40",
      team: "Herren I",
      match: "vs TTC Musterstadt",
      date: "Sa, 07.12.2024",
      time: "15:00",
      reason: "Berufliche Verpflichtung",
      urgency: "high",
      status: "open",
      responses: 3,
      created: "2024-11-25T10:30:00",
      position: "Hinten links"
    },
    {
      id: 2, 
      requester: "Tom Weber",
      requesterAvatar: "/api/placeholder/40/40",
      team: "Herren II",
      match: "vs TSV Nordstadt", 
      date: "So, 08.12.2024",
      time: "14:30",
      reason: "Familienfeier",
      urgency: "medium",
      status: "pending",
      responses: 1,
      created: "2024-11-24T16:45:00",
      position: "Vorne rechts"
    },
    {
      id: 3,
      requester: "Lisa Müller", 
      requesterAvatar: "/api/placeholder/40/40",
      team: "Jugend U18",
      match: "vs JSV Mitte",
      date: "Sa, 07.12.2024", 
      time: "11:00",
      reason: "Krankheit",
      urgency: "high",
      status: "filled",
      responses: 5,
      created: "2024-11-23T09:15:00",
      substitute: "Anna Wagner",
      position: "Hinten rechts"
    }
  ];

  const myOffers = [
    {
      id: 4,
      requester: "Peter Schmidt",
      team: "Herren I", 
      match: "vs SC Westend",
      date: "So, 15.12.2024",
      time: "10:00",
      status: "accepted",
      message: "Gerne springe ich ein! Bin fit und verfügbar.",
      position: "Vorne links"
    },
    {
      id: 5,
      requester: "Sarah Wagner",
      team: "Damen I",
      match: "vs TTC Altstadt", 
      date: "Sa, 14.12.2024",
      time: "16:00",
      status: "pending",
      message: "Kann gerne aushelfen, falls noch benötigt.",
      position: "Hinten links"
    }
  ];

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium": 
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "filled":
        return "bg-green-100 text-green-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Offen";
      case "pending":
        return "In Bearbeitung";
      case "filled":
        return "Besetzt";
      case "accepted":
        return "Angenommen";
      default:
        return "Unbekannt";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return AlertCircle;
      case "pending":
        return Clock;
      case "filled":
      case "accepted":
        return CheckCircle;
      default:
        return XCircle;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ersatzstellung</h1>
          <p className="text-muted-foreground">Verwalten Sie Ersatzanfragen und bieten Sie Hilfe an</p>
        </div>
        <Button className="bg-gradient-secondary hover:bg-secondary-hover shadow-accent">
          <RefreshCw className="w-4 h-4 mr-2" />
          Ersatz anfragen
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Offene Anfragen</TabsTrigger>
          <TabsTrigger value="myOffers">Meine Angebote</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Ersatzanfragen ({substituteRequests.filter(r => r.status !== 'filled').length} offen)
              </CardTitle>
              <CardDescription>Helfen Sie Vereinskollegen bei Spielausfällen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {substituteRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                return (
                  <div key={request.id} className="p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={request.requesterAvatar} alt={request.requester} />
                          <AvatarFallback>{request.requester.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{request.requester}</h3>
                            <Badge className={getUrgencyBadge(request.urgency)} variant="outline">
                              {request.urgency === "high" ? "Dringend" : 
                               request.urgency === "medium" ? "Normal" : "Niedrig"}
                            </Badge>
                            <Badge className={getStatusBadge(request.status)} variant="outline">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusText(request.status)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="font-medium text-primary">{request.team}</div>
                            <div className="text-sm font-medium">{request.match}</div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {request.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {request.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {request.position}
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Grund: </span>
                              {request.reason}
                            </div>
                            
                            {request.status === "filled" && request.substitute && (
                              <div className="text-sm text-green-600 font-medium">
                                Ersatz gefunden: {request.substitute}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {request.responses} Antworten
                            </div>
                            <div>
                              Erstellt: {new Date(request.created).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {request.status === "open" && (
                          <Button size="sm" className="bg-gradient-primary hover:bg-primary-hover">
                            Helfen
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="myOffers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meine Hilfsangebote</CardTitle>
              <CardDescription>Übersicht Ihrer Ersatzangebote</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myOffers.map((offer) => {
                const StatusIcon = getStatusIcon(offer.status);
                return (
                  <div key={offer.id} className="p-4 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{offer.requester}</h3>
                          <Badge className={getStatusBadge(offer.status)} variant="outline">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {getStatusText(offer.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-medium text-primary">{offer.team}</div>
                        <div className="text-sm font-medium">{offer.match}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {offer.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {offer.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {offer.position}
                          </div>
                        </div>
                        <div className="text-sm bg-muted/50 p-2 rounded italic">
                          "{offer.message}"
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ersatzstellungs-Verlauf</CardTitle>
              <CardDescription>Chronologie aller Ersatzstellungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Verlaufsdaten werden geladen...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offene Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">8</div>
            <p className="text-xs text-muted-foreground">Benötigen Ersatz</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Meine Hilfen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12</div>
            <p className="text-xs text-muted-foreground">Diesen Monat geholfen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Erfolgsquote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94%</div>
            <p className="text-xs text-muted-foreground">Ersatz gefunden</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};