import { UsersRound, Megaphone, FileText, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardCommunicationReadOnly } from "./BoardCommunicationReadOnly";
import { QttrDownloadSection } from "./QttrDownloadSection";
import { BoardDocumentsReadOnly } from "./BoardDocumentsReadOnly";

export const Communication = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UsersRound className="w-8 h-8 text-primary" />
          Kommunikation
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Aktuelle Informationen und Listen für alle Mitglieder.
        </p>
      </div>

      <Tabs defaultValue="communication" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="communication">
            <Megaphone className="w-4 h-4 mr-2" />
            Kommunikation
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FolderOpen className="w-4 h-4 mr-2" />
            Dokumente
          </TabsTrigger>
          <TabsTrigger value="qttr">
            <FileText className="w-4 h-4 mr-2" />
            QTTR/TTR-Liste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communication" className="mt-6">
          <BoardCommunicationReadOnly />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <BoardDocumentsReadOnly />
        </TabsContent>

        <TabsContent value="qttr" className="mt-6">
          <QttrDownloadSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
