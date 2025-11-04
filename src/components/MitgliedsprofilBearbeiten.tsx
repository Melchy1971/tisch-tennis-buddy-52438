import React, { useState, useEffect } from 'react';
import './MitgliedsprofilBearbeiten.css';
import { Trash2, Check, UserCog, User, UserCheck, Shield, UsersRound, Crown, GraduationCap, Volleyball, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { passwordSchema } from '@/lib/validation';

interface MitgliedsprofilBearbeitenProps {
  profileId?: string;
  onClose?: () => void;
  onSaved?: () => void;
  userId?: string;
}

interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  memberNumber: string;
  phone: string;
  mobile: string;
  street: string;
  postalCode: string;
  city: string;
  birthday: string;
  memberSince: string;
  ttrValue: string;
}

export default function MitgliedsprofilBearbeiten({ profileId, onClose, onSaved, userId }: MitgliedsprofilBearbeitenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(profileId || null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  const [canDelete, setCanDelete] = useState(false);
  const [canEditRoles, setCanEditRoles] = useState(false);
  const [canEditQttr, setCanEditQttr] = useState(false);
  const [canEditMemberSince, setCanEditMemberSince] = useState(false);
  const [canEditStatus, setCanEditStatus] = useState(false);
  const [formData, setFormData] = useState<FormDataState>({
    firstName: '',
    lastName: '',
    email: '',
    memberNumber: '',
    phone: '',
    mobile: '',
    street: '',
    postalCode: '',
    city: '',
    birthday: '',
    memberSince: '',
    ttrValue: '',
  });

  const [status, setStatus] = useState('active');
  const [roles, setRoles] = useState({
    player: false,
    mitglied: true,
    damen: false,
    senioren: false,
    jugend: false,
    captain: false,
    vorstand: false,
    admin: false,
    volleyball: false,
  });
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'password'>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load profile data and check permissions
  useEffect(() => {
    loadProfileData();
    checkPermissions();
  }, [profileId, userId]);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (userRoles) {
        const hasAdminOrVorstand = userRoles.some(
          r => r.role === 'admin' || r.role === 'vorstand'
        );
        const canManageRoles = userRoles.some(
          r => r.role === 'admin' || r.role === 'vorstand' || r.role === 'entwickler'
        );
        const canManageMemberSince = userRoles.some(
          r => r.role === 'admin' || r.role === 'vorstand' || r.role === 'entwickler'
        );
        
        // Für normale Mitglieder: Rollen schreibgeschützt, kein Löschen
        setCanDelete(false); // Entfernt den Löschen-Button für alle
        setCanEditRoles(false); // Rollen schreibgeschützt für alle
        setCanEditQttr(hasAdminOrVorstand);
        setCanEditMemberSince(canManageMemberSince);
        setCanEditStatus(hasAdminOrVorstand || canManageRoles);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      let profile = null;
      
      // If userId is provided, load profile by user_id
      if (userId) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileError) throw profileError;
        profile = data;
        if (profile) {
          setCurrentProfileId(profile.id);
          setCurrentUserId(profile.user_id);
        }
      } 
      // If profileId is provided, load profile by id
      else if (profileId) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        
        if (profileError) throw profileError;
        profile = data;
        if (profile) {
          setCurrentProfileId(profile.id);
          setCurrentUserId(profile.user_id);
        }
      }
      // Otherwise, get current user and load their profile
      else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        profile = data;
        if (profile) {
          setCurrentProfileId(profile.id);
          setCurrentUserId(user.id);
        }
      }

      if (profile) {
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          memberNumber: profile.member_number || '',
          phone: profile.phone || '',
          mobile: profile.mobile || '',
          street: profile.street || '',
          postalCode: profile.postal_code || '',
          city: profile.city || '',
          birthday: profile.birthday || '',
          memberSince: profile.member_since
            ? (typeof profile.member_since === 'string'
              ? profile.member_since.split('T')[0]
              : new Date(profile.member_since).toISOString().split('T')[0])
            : (profile.created_at ? profile.created_at.split('T')[0] : ''),
          ttrValue: profile.qttr_value !== null && profile.qttr_value !== undefined
            ? String(profile.qttr_value)
            : '',
        });
        setStatus(profile.status || 'active');

        // Load user roles if user_id exists
        if (profile.user_id) {
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          if (rolesError) throw rolesError;

          if (userRoles) {
            const roleSet = new Set(userRoles.map(r => r.role));
            setRoles({
              player: roleSet.has('player'),
              mitglied: roleSet.has('mitglied'),
              damen: roleSet.has('damen'),
              senioren: roleSet.has('senioren'),
              jugend: roleSet.has('jugend' as any),
              captain: roleSet.has('mannschaftsfuehrer'),
              vorstand: roleSet.has('vorstand'),
              admin: roleSet.has('admin'),
              volleyball: roleSet.has('volleyball'),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = [
    {
      id: 'player',
      icon: User,
      label: 'Spieler',
      description: 'Aktive Spieler, die Mannschaften zugewiesen werden können',
      badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    },
    {
      id: 'mitglied',
      icon: UserCog,
      label: 'Mitglied',
      description: 'Vereinsmitglieder ohne aktive Spielerrolle',
      badgeClassName: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    },
    {
      id: 'damen',
      icon: UserCheck,
      label: 'Damen',
      description: 'Spielerinnen für Damen/Mädchen-Mannschaften',
      badgeClassName: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300',
    },
    {
      id: 'senioren',
      icon: UserCheck,
      label: 'Senioren',
      description: 'Spieler für Senioren-Mannschaften',
      badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'jugend',
      icon: GraduationCap,
      label: 'Jugend',
      description: 'Spieler:innen im Jugendbereich',
      badgeClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'captain',
      icon: Shield,
      label: 'Mannschaftsführer',
      description: 'Verwalten Mannschaften und Spieltermine',
      badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    },
    {
      id: 'vorstand',
      icon: UsersRound,
      label: 'Vorstand',
      description: 'Leitet den Verein und gibt neue Mitglieder frei',
      badgeClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
    {
      id: 'admin',
      icon: Crown,
      label: 'Administrator',
      description: 'Hat Zugriff auf alle Verwaltungsfunktionen',
      badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    },
    {
      id: 'volleyball',
      icon: Volleyball,
      label: 'Volleyball',
      description: 'Mitglieder mit Volleyball-Zugehörigkeit',
      badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
  ];

  const activeRoles = roleConfig.filter((role) => roles[role.id as keyof typeof roles]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
      label: 'Aktiv',
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    },
    inactive: {
      label: 'Inaktiv',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    },
    pending: {
      label: 'Ausstehend',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
  };

  const currentStatus = statusConfig[status] ?? statusConfig.active;

  const handleTabChange = (value: string) => {
    if (value === 'profile' || value === 'roles' || value === 'password') {
      setActiveTab(value);
    }
  };

  const handleInputChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (roleId: string) => {
    setRoles((prev) => ({ ...prev, [roleId]: !prev[roleId as keyof typeof prev] }));
  };

  const ensureProfileId = async (): Promise<string | null> => {
    if (currentProfileId) {
      return currentProfileId;
    }

    if (!currentUserId) {
      toast.error('Keine Profil-ID vorhanden');
      return null;
    }

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingProfile) {
        setCurrentProfileId(existingProfile.id);
        setCurrentUserId(existingProfile.user_id);
        return existingProfile.id;
      }

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: currentUserId,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          email: formData.email || null,
          member_number: formData.memberNumber || null,
          phone: formData.phone || null,
          mobile: formData.mobile || null,
          street: formData.street || null,
          postal_code: formData.postalCode || null,
          city: formData.city || null,
          birthday: formData.birthday || null,
          status,
          member_since: formData.memberSince ? formData.memberSince : null,
        })
        .select('id, user_id')
        .single();

      if (insertError) throw insertError;

      setCurrentProfileId(insertedProfile.id);
      setCurrentUserId(insertedProfile.user_id);
      return insertedProfile.id;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      toast.error('Profil konnte nicht geladen oder erstellt werden');
      return null;
    }
  };

  const handleSave = async () => {
    const ensuredProfileId = await ensureProfileId();
    if (!ensuredProfileId) {
      toast.error('Keine Profil-ID vorhanden');
      return;
    }

    // Validierung der Pflichtfelder
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Bitte füllen Sie Vor- und Nachname aus');
      return;
    }

    try {
      setSaving(true);

      const trimmedTtrValue = formData.ttrValue.trim();
      let parsedTtrValue: number | null = null;
      if (trimmedTtrValue !== '') {
        parsedTtrValue = Number.parseInt(trimmedTtrValue, 10);
        if (Number.isNaN(parsedTtrValue)) {
          toast.error('Bitte geben Sie einen gültigen TTR-Wert ein.');
          setSaving(false);
          return;
        }
      }

      // UPDATE the existing profile (NO INSERT to prevent duplicates)
      const updatePayload: Record<string, any> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email || null,
        member_number: formData.memberNumber || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        street: formData.street || null,
        postal_code: formData.postalCode || null,
        city: formData.city || null,
        birthday: formData.birthday || null,
        ...(canEditStatus && {
          status: status,
        }),
        ...(canEditMemberSince && {
          member_since: formData.memberSince ? formData.memberSince : null,
        }),
        updated_at: new Date().toISOString(),
      };

      if (canEditQttr) {
        updatePayload.qttr_value = parsedTtrValue;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', ensuredProfileId)
        .select('user_id')
        .single();

      if (profileError) throw profileError;

      // Überprüfen der Benutzerberechtigungen vor der Rollenaktualisierung
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      // Update roles in user_roles table if user_id exists and user has permissions
      if (canEditRoles && profile?.user_id) {
        // Get current roles
        const { data: currentRoles, error: fetchError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id);

        if (fetchError) throw fetchError;

        const currentRoleSet = new Set(currentRoles?.map(r => r.role) || []);
        
        // Map UI roles to database roles
        const roleMapping: Record<string, any> = {
          player: 'player',
          mitglied: 'mitglied',
          damen: 'damen',
          senioren: 'senioren',
          jugend: 'jugend',
          captain: 'mannschaftsfuehrer',
          vorstand: 'vorstand',
          admin: 'admin',
          volleyball: 'volleyball',
        };

        const selectedRoles = Object.entries(roles)
          .filter(([_, checked]) => checked)
          .map(([roleId, _]) => roleMapping[roleId])
          .filter(Boolean);

        const rolesToAdd = selectedRoles.filter((r: any) => !currentRoleSet.has(r));
        const rolesToRemove = Array.from(currentRoleSet).filter((r: any) => !selectedRoles.includes(r));

        // Add new roles
        if (rolesToAdd.length > 0) {
          const { error: addError } = await supabase
            .from('user_roles')
            .insert(rolesToAdd.map((role: any) => ({ user_id: profile.user_id, role })));

          if (addError) throw addError;
        }

        // Remove unchecked roles
        if (rolesToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', profile.user_id)
            .in('role', rolesToRemove);

          if (removeError) throw removeError;
        }
      }

      // Überprüfen, ob die Profilaktualisierung erfolgreich war
      if (!profile) {
        throw new Error('Profil konnte nicht aktualisiert werden');
      }

      toast.success('Profil erfolgreich aktualisiert');
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Speichern des Profils';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast.error('Bitte füllen Sie beide Passwortfelder aus');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein');
      return;
    }

    // Validate password strength
    try {
      passwordSchema.parse(newPassword);
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || 'Passwort erfüllt nicht die Anforderungen';
      toast.error(errorMessage);
      return;
    }

    try {
      setSaving(true);

      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Passwort erfolgreich geändert');
      setNewPassword('');
      setConfirmPassword('');
      onSaved?.();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Fehler beim Ändern des Passworts');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ensuredProfileId = await ensureProfileId();
    if (!ensuredProfileId) {
      return;
    }

    if (!confirm('Möchten Sie dieses Profil wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
        .eq('id', ensuredProfileId);

      if (error) throw error;

      toast.success('Profil erfolgreich gelöscht');
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Fehler beim Löschen des Profils');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitgliedsprofil bearbeiten</h1>
          <p className="text-center mt-8">Lade Profil...</p>
        </div>
      </div>
    );
  }

  if (!currentProfileId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitgliedsprofil bearbeiten</h1>
          <p className="text-center mt-8">
            Für das angemeldete Mitglied konnte kein Profil gefunden werden. Bitte wenden Sie sich an den Vorstand oder eine
            Administratorin bzw. einen Administrator, um ein Profil anzulegen.
          </p>
          {onClose && (
            <div className="text-center mt-6">
              <button onClick={onClose} className="whitespace-nowrap rounded-md text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mitgliedsprofil bearbeiten
        </h1>
        <p className="text-gray-600 mt-2">
          Aktualisieren Sie die Profildaten und Rollen des Mitglieds.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-sm text-gray-600">Aktuelle Rollen:</span>
          {activeRoles.length > 0 ? (
            activeRoles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${role.badgeClassName}`}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {role.label}
                </div>
              );
            })
          ) : (
            <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
              Keine Rollen zugewiesen
            </div>
          )}
          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentStatus.className}`}>
            {currentStatus.label}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto mb-6">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="roles">Rollen</TabsTrigger>
            <TabsTrigger value="password">Passwort</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="w-full h-full">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium leading-none">
                  Vorname
                </label>
                <input
                  id="first_name"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Vorname"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium leading-none">
                  Nachname
                </label>
                <input
                  id="last_name"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Nachname"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="member_number" className="text-sm font-medium leading-none">
                  Mitgliedsnummer
                </label>
                <input
                  id="member_number"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="z. B. 12345"
                  value={formData.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="ttr_value" className="text-sm font-medium leading-none">
                  QTTR/TTR-Wert
                </label>
                <input
                  id="ttr_value"
                  type="number"
                  inputMode="numeric"
                  className={`flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${canEditQttr ? 'bg-background' : 'bg-muted cursor-not-allowed'}`}
                  placeholder="z. B. 1450"
                  value={formData.ttrValue}
                  onChange={(e) => canEditQttr && handleInputChange('ttrValue', e.target.value)}
                  readOnly={!canEditQttr}
                />
                {!canEditQttr && (
                  <p className="text-xs text-muted-foreground">
                    Nur Vorstand und Admin können den TTR-Wert ändern.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium leading-none">
                  Telefon
                </label>
                <input
                  id="phone"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Festnetz"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium leading-none">
                  Mobil
                </label>
                <input
                  id="mobile"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Mobilnummer"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="street" className="text-sm font-medium leading-none">
                  Straße
                </label>
                <input
                  id="street"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Straße und Hausnummer"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="postal_code" className="text-sm font-medium leading-none">
                  PLZ
                </label>
                <input
                  id="postal_code"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="z. B. 12345"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium leading-none">
                  Ort
                </label>
                <input
                  id="city"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Wohnort"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="birthday" className="text-sm font-medium leading-none">
                  Geburtstag
                </label>
                <input
                  id="birthday"
                  type="date"
                  className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="member_since" className="text-sm font-medium leading-none">
                  Mitglied seit
                </label>
                <input
                  id="member_since"
                  type="date"
                  className={`flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${canEditMemberSince ? 'bg-background' : 'bg-muted cursor-not-allowed'}`}
                  value={formData.memberSince}
                  onChange={(e) => canEditMemberSince && handleInputChange('memberSince', e.target.value)}
                  readOnly={!canEditMemberSince}
                  disabled={!canEditMemberSince}
                />
                <p className="text-xs text-muted-foreground">
                  {canEditMemberSince
                    ? 'Bitte geben Sie das Eintrittsdatum des Mitglieds an.'
                    : 'Nur Vorstand, Admin und Entwickler können das Eintrittsdatum ändern.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Status</label>
              <select
                value={status}
                onChange={(e) => canEditStatus && setStatus(e.target.value)}
                disabled={!canEditStatus}
                className={`flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${canEditStatus ? 'bg-background' : 'bg-muted cursor-not-allowed'}`}
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
              {!canEditStatus && (
                <p className="text-xs text-muted-foreground">
                  Nur Vorstand, Admin und Entwickler können den Status ändern.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="w-full h-full">
            {!canEditRoles && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rollen können nur von Vorstand, Admin und Entwickler bearbeitet werden. Sie haben hier nur Leserechte.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Rollen</label>
              <p className="text-xs text-muted-foreground">
                {canEditRoles 
                  ? "Wählen Sie die Rollen aus, die diesem Mitglied zugewiesen werden sollen. Die Rolle \"Mitglied\" wird automatisch sichergestellt."
                  : "Übersicht der aktuell zugewiesenen Rollen. Änderungen können nur von Vorstand, Admin und Entwickler vorgenommen werden."}
              </p>
              <div className="grid gap-2">
                {roleConfig.map((role) => {
                  const Icon = role.icon;
                  const isChecked = roles[role.id as keyof typeof roles];
                  return (
                    <div 
                      key={role.id} 
                      className={`flex items-start gap-3 p-3 ${!canEditRoles ? 'opacity-70' : ''}`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => canEditRoles && handleRoleToggle(role.id)}
                        disabled={!canEditRoles}
                        className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        data-state={isChecked ? 'checked' : 'unchecked'}
                      >
                        {isChecked && (
                          <span className="flex items-center justify-center text-current">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                      <div className="space-y-1">
                        <label
                          htmlFor={`role-${role.id}`}
                          className={`flex items-center gap-2 text-sm font-medium ${canEditRoles ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => canEditRoles && handleRoleToggle(role.id)}
                        >
                          <Icon className="h-4 w-4" />
                          {role.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="password" className="w-full h-full">
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Passwort ändern</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Hier können Sie Ihr Passwort ändern. Das neue Passwort muss folgende Anforderungen erfüllen:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1 ml-2">
                      <li>Mindestens 8 Zeichen</li>
                      <li>Mindestens ein Großbuchstabe</li>
                      <li>Mindestens ein Kleinbuchstabe</li>
                      <li>Mindestens eine Zahl</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label htmlFor="new_password" className="text-sm font-medium leading-none">
                    Neues Passwort
                  </label>
                  <input
                    id="new_password"
                    type="password"
                    className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Neues Passwort eingeben"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm_password" className="text-sm font-medium leading-none">
                    Passwort bestätigen
                  </label>
                  <input
                    id="confirm_password"
                    type="password"
                    className="flex h-10 w-full rounded-md bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
      </Tabs>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 pt-6">
        <div className="flex gap-2">
          <button 
            onClick={onClose}
            disabled={saving}
            className="whitespace-nowrap rounded-md text-sm font-medium bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button 
            onClick={activeTab === 'password' ? handlePasswordSave : handleSave}
            disabled={saving || (activeTab === 'roles' && !canEditRoles) || (activeTab === 'password' && (!newPassword || !confirmPassword))}
            className="whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover h-10 px-4 py-2 bg-gradient-primary disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Änderungen speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
