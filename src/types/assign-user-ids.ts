export type AssignUserIdsResponse = {
  processed: number;
  alreadyAssigned: number;
  created: number;
  skipped: number;
  placeholders: number;
  errors: string[];
};
