import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrainingSession {
  id: string;
  date: string;
  time: string;
  member1_id: string;
  member2_id: string;
  notes: string;
  created_by: string;
  created_at: string;
  participants: string[];
  creator_name?: string;
  member1_name?: string;
  member2_name?: string;
}

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export const Training = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    loadCurrentUser();
    loadMembers();
    loadSessions();
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("last_name", { ascending: true });

      if (error) throw error;

      if (data) {
        const membersList = data
          .filter(m => m.first_name && m.last_name)
          .map(m => ({
            user_id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            full_name: `${m.first_name} ${m.last_name}`
          }));
        setMembers(membersList);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data: sessionsData, error } = await supabase
        .from("training_sessions")
        .select("*")
        .order("session_date", { ascending: true });

      if (error) throw error;

      // Load creator names
      if (sessionsData) {
        const sessionsWithNames = await Promise.all(
          sessionsData.map(async (session) => {
            const { data: creatorProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", session.created_by)
              .maybeSingle();

            const sessionDate = new Date(session.session_date);
            
            return {
              ...session,
              date: sessionDate.toISOString().split('T')[0],
              time: sessionDate.toTimeString().slice(0, 5),
              creator_name: creatorProfile
                ? `${creatorProfile.first_name} ${creatorProfile.last_name}`
                : "Unbekannt",
              member1_id: '',
              member2_id: '',
              member1_name: '',
              member2_name: '',
              participants: []
            };
          })
        );

        setSessions(sessionsWithNames);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Fehler",
        description: "Trainings konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const sessionDateTime = `${formData.date}T${formData.time}:00`;
      const { error } = await supabase.from("training_sessions").insert({
        session_date: sessionDateTime,
        location: formData.location,
        notes: formData.notes,
        notes: formData.notes,
        created_by: currentUserId,
        participants: [currentUserId],
      });

      if (error) throw error;

      toast({
        title: "Training erstellt",
        description: "Das Training wurde erfolgreich erstellt.",
      });

      setFormData({ date: "", time: "", location: "", notes: "" });
      setShowForm(false);
      loadSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Fehler",
        description: "Training konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSession = async (sessionId: string, participants: string[]) => {
    try {
      const isParticipating = participants.includes(currentUserId);
      
      const updatedParticipants = isParticipating
        ? participants.filter((id) => id !== currentUserId)
        : [...participants, currentUserId];

      const { error } = await supabase
        .from("training_sessions")
        .update({ participants: updatedParticipants })
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: isParticipating ? "Abgemeldet" : "Angemeldet",
        description: isParticipating
          ? "Du hast dich vom Training abgemeldet."
          : "Du hast dich für das Training angemeldet.",
      });

      loadSessions();
    } catch (error) {
      console.error("Error updating participation:", error);
      toast({
        title: "Fehler",
        description: "Teilnahme konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Training
          </h1>
          <p className="text-muted-foreground mt-2">
            Verabrede dich mit anderen Mitgliedern zum Training
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Abbrechen" : "Neues Training"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Training erstellen</CardTitle>
            <CardDescription>
              Erstelle ein neues Training und lade andere Mitglieder ein
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Uhrzeit</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="z.B. Sporthalle 1"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  "Training erstellen"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Noch keine Trainings geplant. Erstelle das erste Training!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const isParticipating = session.participants.includes(currentUserId);
            const sessionDate = new Date(session.date);
            const isPast = sessionDate < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <Card key={session.id} className={isPast ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {new Date(session.date).toLocaleDateString("de-DE", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {session.time} Uhr
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <Users className="w-4 h-4" />
                          {session.member1_name} vs. {session.member2_name}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant={isParticipating ? "default" : "secondary"}>
                      <Users className="w-3 h-3 mr-1" />
                      {session.participants.length} Teilnehmer
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.notes && (
                    <p className="text-sm text-muted-foreground">{session.notes}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Erstellt von {session.creator_name}
                  </div>
                  {!isPast && (
                    <Button
                      onClick={() => handleJoinSession(session.id, session.participants)}
                      variant={isParticipating ? "outline" : "default"}
                      className="w-full"
                    >
                      {isParticipating ? "Abmelden" : "Anmelden"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
