export const MAX_LINEUP_POSITIONS = 12;

const MAX_ORDER_VALUE = Number.MAX_SAFE_INTEGER;

export const buildTeamPosition = (teamOrder: number, slot: number) => `${teamOrder}.${slot}`;

export const parseTeamPosition = (position?: string | null) => {
  if (!position) {
    return { teamOrder: MAX_ORDER_VALUE, slotOrder: MAX_ORDER_VALUE };
  }

  const [teamPart, slotPart] = position.split(".");
  const teamOrder = Number.parseInt(teamPart ?? "", 10);
  const slotOrder = Number.parseInt(slotPart ?? "", 10);

  return {
    teamOrder: Number.isFinite(teamOrder) ? teamOrder : MAX_ORDER_VALUE,
    slotOrder: Number.isFinite(slotOrder) ? slotOrder : MAX_ORDER_VALUE
  };
};

export const compareTeamPositions = (first?: string | number | null, second?: string | number | null) => {
  // Convert numbers to strings for consistent handling
  const firstStr = typeof first === 'number' ? String(first) : first;
  const secondStr = typeof second === 'number' ? String(second) : second;
  const firstParsed = parseTeamPosition(firstStr);
  const secondParsed = parseTeamPosition(secondStr);

  if (firstParsed.teamOrder !== secondParsed.teamOrder) {
    return firstParsed.teamOrder - secondParsed.teamOrder;
  }

  if (firstParsed.slotOrder !== secondParsed.slotOrder) {
    return firstParsed.slotOrder - secondParsed.slotOrder;
  }

  if (first && !second) return -1;
  if (!first && second) return 1;

  return 0;
};
