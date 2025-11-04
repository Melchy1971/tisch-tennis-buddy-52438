-- Setze die Erwachsenen-Saison 2025/26 als aktiv
UPDATE seasons 
SET is_current = true 
WHERE id = '2025-2026' AND category = 'erwachsene';

-- Setze die Jugend-Saison 2025/26 VR als aktiv
UPDATE seasons 
SET is_current = true 
WHERE id = '2025-2025' AND category = 'jugend';