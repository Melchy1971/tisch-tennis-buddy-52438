import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, UserPlus, MapPin, CalendarRange, FileText } from "lucide-react";
import { IcsImport } from "./IcsImport";
import { MemberImport } from "./MemberImport";
import { PinsImport } from "./PinsImport";
import { OverallScheduleImport } from "./OverallScheduleImport";
import { QttrUpload } from "./QttrUpload";
import { useState } from "react";

export const ImportSection = () => {
  const [activeTab, setActiveTab] = useState("ics");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Import</h2>
        <p className="text-muted-foreground">
          Importieren Sie Spielpläne, Mitglieder und Pins
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ics" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            ICS Import
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Mitglieder Import
          </TabsTrigger>
          <TabsTrigger value="pins" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pins
          </TabsTrigger>
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            Gesamtspielplan
          </TabsTrigger>
          <TabsTrigger value="qttr" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            QTTR/TTR-Liste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ics" className="space-y-6">
          <IcsImport />
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MemberImport />
        </TabsContent>

        <TabsContent value="pins" className="space-y-6">
          <PinsImport />
        </TabsContent>

        <TabsContent value="overall" className="space-y-6">
          <OverallScheduleImport />
        </TabsContent>

        <TabsContent value="qttr" className="space-y-6">
          <QttrUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};
