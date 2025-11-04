import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';
import { handleError } from './error-handling';
import type { Database } from '@/integrations/supabase/types';

// Typen für die Filteroptionen
type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'contains' | 'containedBy' | 'rangeLt' | 'rangeGt' | 'rangeGte' | 'rangeLte' | 'rangeAdjacent' | 'overlaps';

interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: any;
}

interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
  select?: string;
}

// Generischer Typ für Tabellenzugriffe
type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Wrapper-Klasse für sicheren Datenbankzugriff
export class DatabaseService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // SELECT mit Filteroptionen
  async select<T extends TableName>(
    table: T,
    options: QueryOptions = {}
  ): Promise<{ data: TableRow<T>[] | null; error: PostgrestError | null }> {
    try {
      let query = this.supabase.from(table).select(options.select || '*');

      // Filter anwenden
      if (options.filters) {
        for (const filter of options.filters) {
          query = query.filter(filter.column, filter.operator, filter.value);
        }
      }

      // Sortierung anwenden
      if (options.orderBy) {
        for (const order of options.orderBy) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
      }

      // Limit anwenden
      if (options.limit) {
        query = query.limit(options.limit);
      }
      // Note: offset is not supported in this Supabase version, use range instead
      if (options.offset && options.limit) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }

      const { data, error } = await query;
      return { data: data as any, error };
    } catch (error) {
      handleError(error, {
        toastTitle: 'Datenbankfehler',
        customMessage: 'Die Daten konnten nicht geladen werden.'
      });
      return { data: null, error: error as PostgrestError };
    }
  }

  // INSERT mit Validierung
  async insert<T extends TableName>(
    table: T,
    data: TableInsert<T>
  ): Promise<{ data: TableRow<T> | null; error: PostgrestError | null }> {
    try {
      const { data: insertedData, error } = await this.supabase
        .from(table)
        .insert(data as any)
        .select()
        .single();

      return { data: insertedData as any, error };
    } catch (error) {
      handleError(error, {
        toastTitle: 'Datenbankfehler',
        customMessage: 'Die Daten konnten nicht gespeichert werden.'
      });
      return { data: null, error: error as PostgrestError };
    }
  }

  // UPDATE mit Validierung
  async update<T extends TableName>(
    table: T,
    id: string,
    data: TableUpdate<T>
  ): Promise<{ data: TableRow<T> | null; error: PostgrestError | null }> {
    try {
      const { data: updatedData, error } = await this.supabase
        .from(table)
        .update(data as any)
        .eq('id' as any, id)
        .select()
        .single();

      return { data: updatedData as any, error };
    } catch (error) {
      handleError(error, {
        toastTitle: 'Datenbankfehler',
        customMessage: 'Die Daten konnten nicht aktualisiert werden.'
      });
      return { data: null, error: error as PostgrestError };
    }
  }

  // DELETE mit Validierung
  async delete<T extends TableName>(
    table: T,
    id: string
  ): Promise<{ error: PostgrestError | null }> {
    try {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .eq('id' as any, id);

      return { error };
    } catch (error) {
      handleError(error, {
        toastTitle: 'Datenbankfehler',
        customMessage: 'Die Daten konnten nicht gelöscht werden.'
      });
      return { error: error as PostgrestError };
    }
  }

  // Transaktion ausführen
  async transaction<T>(callback: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
    try {
      const result = await callback();
      return { data: result, error: null };
    } catch (error) {
      handleError(error, {
        toastTitle: 'Transaktionsfehler',
        customMessage: 'Die Operation konnte nicht vollständig ausgeführt werden.'
      });
      return { data: null, error: error as Error };
    }
  }
}