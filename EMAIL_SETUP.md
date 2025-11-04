# E-Mail-Konfiguration für Supabase

## Problem
Bei der Registrierung neuer Mitglieder wird keine E-Mail-Validierung versendet.

## Lösung

### 1. Supabase Dashboard öffnen
- Gehen Sie zu https://supabase.com/dashboard
- Wählen Sie Ihr Projekt aus

### 2. Authentication Settings konfigurieren
- Gehen Sie zu **Authentication** → **Settings**
- Stellen Sie sicher, dass folgende Einstellungen aktiviert sind:
  - ✅ **Enable email confirmations**
  - ✅ **Enable email signup**
  - ✅ **Enable email recovery**

### 3. E-Mail-Templates konfigurieren
- Gehen Sie zu **Authentication** → **Email Templates**
- Konfigurieren Sie die Templates für:
  - **Confirm signup**: Bestätigung der Registrierung
  - **Reset password**: Passwort zurücksetzen
  - **Email change**: E-Mail-Adresse ändern

### 4. SMTP-Konfiguration (optional)
Falls Sie einen eigenen SMTP-Server verwenden möchten:
- Gehen Sie zu **Authentication** → **Settings** → **SMTP Settings**
- Konfigurieren Sie Ihren SMTP-Server

### 5. SQL-Trigger reparieren
Führen Sie das SQL-Script `fix_user_registration.sql` in der Supabase SQL-Konsole aus.

## Testen
1. Registrieren Sie einen neuen Benutzer
2. Überprüfen Sie, ob eine E-Mail-Bestätigung versendet wird
3. Überprüfen Sie, ob ein Profil in der `profiles`-Tabelle angelegt wird
