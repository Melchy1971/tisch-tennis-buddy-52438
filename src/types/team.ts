export type TeamMember = {
  id: string;
  name: string;
  email: string;
  rating: number;
  playStyle?: string;
  availability?: string;
  isCaptain?: boolean;
  position?: number;
};

export type BaseTeamMember = Omit<TeamMember, "isCaptain">;

export type TrainingSlot = {
  day: string;
  time: string;
};

export type HomeMatchInfo = {
  location: string;
  day?: string;
  time?: string;
};

export type Team = {
  id: string;
  name: string;
  league: string;
  division?: string;
  trainingSlots: TrainingSlot[];
  homeMatch?: HomeMatchInfo;
  members: TeamMember[];
};

export type Season = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isCurrent?: boolean;
  isArchived?: boolean;
  category?: "erwachsene" | "jugend";
};

export type SeasonState = {
  teams: Team[];
};

export type SeasonDefinition = {
  teams: Team[];
  assignments: Record<string, string[]>;
  captains: Record<string, string>;
};
