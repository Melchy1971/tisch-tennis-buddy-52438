import { useState } from "react";
import { AdminTransfer } from "./AdminTransfer";
import { DesignSettings } from "./DesignSettings";
import { Demo } from "./Demo";
import { ProfileMerge } from "./ProfileMerge";
import { ProfilesManager } from "./ProfilesManager";
import { HallManager } from "./HallManager";
import { ClubInfoSettings } from "./ClubInfoSettings";
import { EmailSettings } from "./EmailSettings";
import { DeveloperProfile } from "./DeveloperProfile";
import { Shield, Palette, Database, Users, Building2, BadgeInfo, Mail, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Administrator = () => {
  const [profilesTab, setProfilesTab] = useState<"active" | "trash">("active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Administrator-Bereich
        </h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie die Administrator-Rolle und Vereinseinstellungen
        </p>
      </div>

      <Tabs defaultValue="admin" className="w-full">
        <TabsList>
          <TabsTrigger value="admin">
            <Shield className="w-4 h-4 mr-2" />
            Administrator
          </TabsTrigger>
          <TabsTrigger value="profiles">
            <Users className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="club">
            <BadgeInfo className="w-4 h-4 mr-2" />
            Verein
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="design">
            <Palette className="w-4 h-4 mr-2" />
            Design
          </TabsTrigger>
          <TabsTrigger value="management">
            <Database className="w-4 h-4 mr-2" />
            Verwaltung
          </TabsTrigger>
          <TabsTrigger value="halls">
            <Building2 className="w-4 h-4 mr-2" />
            Hallen
          </TabsTrigger>
          <TabsTrigger value="developer">
            <UserCog className="w-4 h-4 mr-2" />
            Entwickler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          <AdminTransfer />
        </TabsContent>

        <TabsContent value="profiles" className="space-y-8">
          <ProfilesManager onTabChange={setProfilesTab} />
          {profilesTab === "active" && (
            <div className="border-t pt-8">
              <ProfileMerge />
            </div>
          )}
        </TabsContent>

        <TabsContent value="club">
          <ClubInfoSettings />
        </TabsContent>

        <TabsContent value="email">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="design">
          <DesignSettings />
        </TabsContent>

        <TabsContent value="management">
          <Demo />
        </TabsContent>

        <TabsContent value="halls">
          <HallManager />
        </TabsContent>

        <TabsContent value="developer">
          <DeveloperProfile />
        </TabsContent>
      </Tabs>
    </div>
  );
};
