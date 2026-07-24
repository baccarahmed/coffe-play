import { insforge } from './insforge';

export interface GamePrice {
  id: string;
  game_name: string;
  player_count: string; // "2" ou "4"
  duration: string;     // "30min" ou "1h"
  station_type: 'ps4' | 'ps5'; // "ps4" or "ps5"
  price: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Récupérer le prix exact pour un jeu, un nombre de joueurs, une durée et un type de station spécifiques.
 * Retourne le prix (ou null) depuis la table de prix admin configurable (game_prices).
 */
export async function getGamePrice(gameName: string, playerCount: string, duration: string, stationType: 'ps4' | 'ps5' = 'ps5'): Promise<number | null> {
  try {
    const { data, error } = await insforge.database
      .from('game_prices')
      .select('price')
      .eq('game_name', gameName)
      .eq('player_count', playerCount)
      .eq('duration', duration)
      .eq('station_type', stationType)
      .maybeSingle();

    if (error) {
      // Don't log expected errors (table doesn't exist, no matching row) as loud errors
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error('Erreur de récupération du prix :', error);
      }
      return null;
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
  duration: string;
  station_type: 'ps4' | 'ps5';
  price: number;
}): Promise<GamePrice | null> {
  const { data, error } = await insforge.database
    .from('game_prices')
    .upsert([entry], { onConflict: 'game_name,player_count,duration,station_type' })
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
    .order('duration')
    .order('station_type');

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