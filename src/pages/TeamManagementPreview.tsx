import { TeamManagement } from "@/components/TeamManagement";

const TeamManagementPreview = () => (
  <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950 py-10">
    <div className="max-w-6xl mx-auto px-6">
      <div className="rounded-3xl border border-white/10 bg-white/95 p-8 shadow-xl backdrop-blur">
        <TeamManagement />
      </div>
    </div>
  </div>
);

export default TeamManagementPreview;
