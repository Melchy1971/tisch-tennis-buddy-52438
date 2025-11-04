import { SupabaseClient } from '@supabase/supabase-js';

// Zentrale Definition der Rollen und ihrer Berechtigungen
export const Roles = {
  ADMIN: 'admin',
  VORSTAND: 'vorstand',
  ENTWICKLER: 'entwickler'
} as const;

export type Role = typeof Roles[keyof typeof Roles];

// Bereiche für die Berechtigungen
export const Permissions = {
  MANAGE_DOCUMENTS: 'manage_documents',
  MANAGE_MESSAGES: 'manage_messages',
  MANAGE_FLYERS: 'manage_flyers',
  MANAGE_EVENTS: 'manage_events',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

// Mapping von Berechtigungen zu erlaubten Rollen
const permissionRoleMap: Record<Permission, Role[]> = {
  [Permissions.MANAGE_DOCUMENTS]: [Roles.ADMIN, Roles.VORSTAND, Roles.ENTWICKLER],
  [Permissions.MANAGE_MESSAGES]: [Roles.ADMIN, Roles.VORSTAND, Roles.ENTWICKLER],
  [Permissions.MANAGE_FLYERS]: [Roles.ADMIN, Roles.VORSTAND, Roles.ENTWICKLER],
  [Permissions.MANAGE_EVENTS]: [Roles.ADMIN, Roles.VORSTAND, Roles.ENTWICKLER],
};

// Überprüft, ob ein Benutzer eine bestimmte Berechtigung hat
export async function checkPermission(supabase: SupabaseClient, permission: Permission): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return false;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error getting user roles:', rolesError);
      return false;
    }

    const userRoles = (roles || []).map(r => r.role as Role);
    const allowedRoles = permissionRoleMap[permission];
    
    return userRoles.some(role => allowedRoles.includes(role));
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Hilfsfunktion zum Abrufen aller Berechtigungen eines Benutzers
export async function getUserPermissions(supabase: SupabaseClient): Promise<Permission[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return [];
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error getting user roles:', rolesError);
      return [];
    }

    const userRoles = (roles || []).map(r => r.role as Role);
    const permissions = new Set<Permission>();

    Object.entries(permissionRoleMap).forEach(([permission, allowedRoles]) => {
      if (userRoles.some(role => allowedRoles.includes(role))) {
        permissions.add(permission as Permission);
      }
    });

    return Array.from(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}