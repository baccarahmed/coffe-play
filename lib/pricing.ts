import { insforge } from './insforge';

export interface GamePrice {
  id: string;
  game_name: string;
  player_count: string; // "1" ou "2"
  duration?: string;     // "30min" ou "1h" (nullable for match-based)
  price_per_match?: number; // nullable for duration-based
  station_type: 'ps4' | 'ps5'; // "ps4" or "ps5"
  price?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Récupérer le prix exact pour un jeu, un nombre de joueurs, une durée/type et un type de station spécifiques.
 * Retourne le prix (ou null) depuis la table de prix admin configurable (game_prices).
 */
export async function getGamePrice(gameName: string, playerCount: string, durationOrType: string, stationType: 'ps4' | 'ps5' = 'ps5'): Promise<number | null> {
  try {
    const query = insforge.database
      .from('game_prices')
      .select('*')
      .eq('game_name', gameName)
      .eq('player_count', playerCount)
      .eq('station_type', stationType);

    // Add duration filter if it's duration-based
    if (durationOrType !== 'per_match') {
      query.eq('duration', durationOrType);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      // Don't log expected errors (table doesn't exist, no matching row) as loud errors
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error('Erreur de récupération du prix :', error);
      }
      return null;
    }

    if (durationOrType === 'per_match') {
      return data?.price_per_match ?? null;
    }

    return data?.price ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Créer ou remplacer une entrée de prix.
 */
export async function upsertGamePrice(entry: {
  game_name: string;
  player_count: string;
  duration?: string;
  price_per_match?: number;
  station_type: 'ps4' | 'ps5';
  price?: number;
}): Promise<GamePrice | null> {
  // Determine the unique constraint fields
  const onConflictFields: string[] = ['game_name', 'player_count', 'station_type'];
  if (entry.duration) {
    onConflictFields.push('duration');
  }

  const { data, error } = await insforge.database
    .from('game_prices')
    .upsert([entry])
    .select()
    .single();

  if (error) {
    console.error('Erreur d\'insertion du prix :', error);
    return null;
  }

  return data;
}

/**
 * Récupérer tous les prix (utilisé par l'interface admin).
 */
export async function getAllGamePrices(): Promise<GamePrice[]> {
  const { data, error } = await insforge.database
    .from('game_prices')
    .select('*')
    .order('game_name')
    .order('player_count')
    .order('duration', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Erreur de récupération des prix :', error);
    return [];
  }

  return data || [];
}

/**
 * Supprimer une entrée de prix par ID.
 */
export async function deleteGamePrice(id: string): Promise<boolean> {
  const { error } = await insforge.database
    .from('game_prices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erreur de suppression du prix :', error);
    return false;
  }

  return true;
}
