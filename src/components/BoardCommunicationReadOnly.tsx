import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Image as ImageIcon, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BoardMessage {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface BoardFlyer {
  id: string;
  title: string;
  image_path: string;
  image_name: string;
  image_type: string | null;
  image_size: number | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export const BoardCommunicationReadOnly = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [flyers, setFlyers] = useState<BoardFlyer[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [messagesResult, flyerResult, eventsResult] = await Promise.all([
        supabase
          .from('board_messages')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('board_flyers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('club_events')
          .select('*')
          .order('event_date', { ascending: true })
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (flyerResult.error) throw flyerResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setMessages(messagesResult.data || []);
      const flyersWithUrls = (flyerResult.data || []).map((flyer) => {
        const { data } = supabase.storage
          .from('board-flyers')
          .getPublicUrl(flyer.image_path);
        return {
          ...flyer,
          image_url: data.publicUrl,
        };
      });
      setFlyers(flyersWithUrls);
      setEvents(eventsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Vorstands-Nachrichten */}
          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Vorstands-Nachrichten
              </CardTitle>
              <CardDescription>
                Aktuelle Informationen vom Vorstand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Derzeit sind keine Nachrichten vorhanden.
                  </AlertDescription>
                </Alert>
              ) : (
                messages.map((message) => (
                  <Card key={message.id} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <div>
                        <CardTitle className="text-lg">{message.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {message.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Flyer */}
          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Flyer
              </CardTitle>
              <CardDescription>
                Flyer und visuelle Ankündigungen des Vorstands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {flyers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Derzeit sind keine Flyer vorhanden.
                  </AlertDescription>
                </Alert>
              ) : (
                flyers.map((flyer) => (
                  <Card key={flyer.id} className="border border-border/60 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div>
                        <CardTitle className="text-lg">{flyer.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(flyer.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {flyer.image_url ? (
                        <img
                          src={flyer.image_url}
                          alt={flyer.title}
                          className="w-full rounded-md border border-border/60 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnlargedImage({ url: flyer.image_url!, title: flyer.title })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Die Grafik konnte nicht geladen werden.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vereins-Events */}
        <Card className="shadow-sport">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Vereins-Events
            </CardTitle>
            <CardDescription>
              Kommende Termine und Veranstaltungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Derzeit sind keine Events geplant.
                </AlertDescription>
              </Alert>
            ) : (
              events.map((event) => (
                <Card key={event.id} className="border border-border/60">
                  <CardHeader className="pb-2">
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{enlargedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center">
            <img
              src={enlargedImage?.url}
              alt={enlargedImage?.title}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
