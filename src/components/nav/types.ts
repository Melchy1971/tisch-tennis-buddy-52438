import React from "react";

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
};


