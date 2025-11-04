import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeedbackItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    loadFeedback();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin" || r.role === "vorstand");
      setIsAdmin(hasAdminRole || false);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const loadFeedback = async () => {
    try {
      setIsLoading(true);
      const { data: feedbackData, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = feedbackData?.map(f => f.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      // Merge data
      const mergedData = feedbackData?.map(feedback => ({
        ...feedback,
        profile: profilesData?.find(p => p.user_id === feedback.user_id) || null
      })) || [];

      setFeedbackList(mergedData);
    } catch (error: any) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Fehler beim Laden",
        description: "Das Feedback konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: "open",
        });

      if (error) throw error;

      toast({
        title: "Feedback gesendet",
        description: "Vielen Dank für Ihr Feedback!",
      });

      setTitle("");
      setDescription("");
      loadFeedback();
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Fehler beim Senden",
        description: error.message || "Das Feedback konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!feedbackToDelete) return;

    try {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedbackToDelete);

      if (error) throw error;

      toast({
        title: "Feedback gelöscht",
        description: "Das Feedback wurde erfolgreich gelöscht.",
      });

      loadFeedback();
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("feedback")
        .update({ status: newStatus })
        .eq("id", feedbackId);

      if (error) throw error;

      toast({
        title: "Status aktualisiert",
        description: "Der Status wurde erfolgreich geändert.",
      });

      loadFeedback();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "default";
      case "in_progress": return "secondary";
      case "resolved": return "outline";
      default: return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return "Offen";
      case "in_progress": return "In Bearbeitung";
      case "resolved": return "Erledigt";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Verbesserungen und Feedback
          </CardTitle>
          <CardDescription>
            Teilen Sie uns Ihre Ideen und Verbesserungsvorschläge mit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurze Beschreibung"
                maxLength={200}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung Ihrer Verbesserungsidee oder Ihres Feedbacks"
                rows={4}
                maxLength={2000}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Feedback senden
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eingereichte Verbesserungen</CardTitle>
          <CardDescription>
            Alle eingereichten Feedback-Einträge
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : feedbackList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Noch kein Feedback vorhanden
            </p>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{feedback.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Von:{" "}
                            {feedback.profile
                              ? `${feedback.profile.first_name || ""} ${feedback.profile.last_name || ""}`.trim() || "Unbekannt"
                              : "Unbekannt"}{" "}
                            • {new Date(feedback.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(feedback.status)}>
                            {getStatusLabel(feedback.status)}
                          </Badge>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFeedbackToDelete(feedback.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>

                      {isAdmin && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(feedback.id, "open")}
                            disabled={feedback.status === "open"}
                          >
                            Offen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(feedback.id, "in_progress")}
                            disabled={feedback.status === "in_progress"}
                          >
                            In Bearbeitung
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(feedback.id, "resolved")}
                            disabled={feedback.status === "resolved"}
                          >
                            Erledigt
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Feedback löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Feedback löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
