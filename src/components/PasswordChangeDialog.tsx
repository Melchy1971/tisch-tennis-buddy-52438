import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { passwordSchema, getValidationError } from "@/lib/validation";

export const PasswordChangeDialog = () => {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPasswordChangeRequired();
  }, []);

  const checkPasswordChangeRequired = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("requires_password_change")
      .eq("user_id", user.id)
      .single();

    if (profile?.requires_password_change) {
      setOpen(true);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Die Passwörter stimmen nicht überein.");
      }

      // Validate password with zod schema
      const validationResult = passwordSchema.safeParse(newPassword);
      if (!validationResult.success) {
        throw new Error(getValidationError(validationResult.error));
      }

      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: validationResult.data,
      });

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Benutzer nicht gefunden");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ requires_password_change: false })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast({
        title: "Erfolg",
        description: "Ihr Passwort wurde erfolgreich geändert.",
      });

      setOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>Passwort ändern erforderlich</DialogTitle>
          </div>
          <DialogDescription>
            Sie müssen Ihr temporäres Passwort ändern, bevor Sie fortfahren können.
            Bitte wählen Sie ein neues, sicheres Passwort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Neues Passwort</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Passwort bestätigen</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePasswordChange();
                }
              }}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Ihr Passwort sollte:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Mindestens 8 Zeichen lang sein</li>
              <li>Groß- und Kleinbuchstaben enthalten</li>
              <li>Mindestens eine Zahl enthalten</li>
              <li>Mindestens ein Sonderzeichen enthalten</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handlePasswordChange} disabled={loading || !newPassword || !confirmPassword}>
            {loading ? "Wird gespeichert..." : "Passwort ändern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
