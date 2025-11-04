import { type Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseService } from './database';

// Instanz des DatabaseService erstellen
export const db = new DatabaseService(supabase);

// Beispiel für die Verwendung:
export async function fetchBoardDocuments() {
  return await db.select('board_documents', {
    orderBy: [{ column: 'created_at', ascending: false }]
  });
}

export async function createBoardDocument(data: Database['public']['Tables']['board_documents']['Insert']) {
  return await db.insert('board_documents', data);
}

export async function updateBoardDocument(
  id: string,
  data: Database['public']['Tables']['board_documents']['Update']
) {
  return await db.update('board_documents', id, data);
}

export async function deleteBoardDocument(id: string) {
  return await db.delete('board_documents', id);
}

// Beispiel für eine komplexere Abfrage mit Filtern
export async function searchBoardDocuments(searchTerm: string) {
  return await db.select('board_documents', {
    filters: [
      {
        column: 'title',
        operator: 'ilike',
        value: `%${searchTerm}%`
      }
    ],
    orderBy: [{ column: 'created_at', ascending: false }]
  });
}

// Beispiel für eine Transaktion
export async function moveDocument(documentId: string, newAuthorId: string) {
  return await db.transaction(async () => {
    const { data: document } = await db.select('board_documents', {
      filters: [{ column: 'id', operator: 'eq', value: documentId }]
    });

    if (!document) {
      throw new Error('Dokument nicht gefunden');
    }

    await db.update('board_documents', documentId, { author_id: newAuthorId });

    // Weitere Operationen in der Transaktion...
    return document;
  });
}