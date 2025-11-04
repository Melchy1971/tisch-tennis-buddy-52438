import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Upload, Users, Calendar, Trophy, MapPin, RefreshCcw } from "lucide-react";
import { UserAdmin } from "./UserAdmin";
import { MatchSchedule } from "./MatchSchedule";
import { useState } from "react";
import { TeamManagement } from "./TeamManagement";
import { ImportSection } from "./ImportSection";
import { PinsManagement } from "./PinsManagement";
import { MemberUpdate } from "./MemberUpdate";

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Admin-Bereich
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Benutzer, Spielpläne, Pins und den Import von Daten
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzerverwaltung
          </TabsTrigger>
          <TabsTrigger value="member-update" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Mitglieder Update
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Mannschaften
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Spielplanverwaltung
          </TabsTrigger>
          <TabsTrigger value="pins" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pins
          </TabsTrigger>
          <TabsTrigger value="imports" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserAdmin onNavigateToMemberUpdate={() => setActiveTab("member-update")} />
        </TabsContent>

        <TabsContent value="member-update" className="space-y-6">
          <MemberUpdate />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <MatchSchedule />
        </TabsContent>

        <TabsContent value="pins" className="space-y-6">
          <PinsManagement />
        </TabsContent>

        <TabsContent value="imports" className="space-y-6">
          <ImportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
