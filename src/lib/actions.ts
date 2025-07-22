'use server'

import { db, players, availability, type Player, type Availability, type AvailabilityStatus } from './db';
import { eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getPlayers(): Promise<Player[]> {
  try {
    return await db.select().from(players).orderBy(players.name);
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

export async function createPlayer(name: string): Promise<Player> {
  try {
    const [player] = await db.insert(players).values({ name }).returning();
    return player;
  } catch (error) {
    console.error('Error creating player:', error);
    throw new Error('Failed to create player');
  }
}

export async function getAvailabilityForDates(dates: string[]): Promise<Availability[]> {
  try {
    return await db
      .select()
      .from(availability)
      .where(inArray(availability.date, dates));
  } catch (error) {
    console.error('Error fetching availability:', error);
    throw new Error('Failed to fetch availability');
  }
}

export async function updateAvailabilityStatus(
  playerId: number,
  date: string,
  hour: string,
  status: AvailabilityStatus
): Promise<void> {
  try {
    // First, check if record exists
    const existing = await db
      .select({ id: availability.id })
      .from(availability)
      .where(and(
        eq(availability.playerId, playerId),
        eq(availability.date, date)
      ));

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(availability)
        .set({
          hours: sql`jsonb_set(hours, ${`{${hour}}`}, ${`"${status}"`})`,
          updatedAt: new Date()
        })
        .where(and(
          eq(availability.playerId, playerId),
          eq(availability.date, date)
        ));
    } else {
      // Create new record
      await db.insert(availability).values({
        playerId,
        date,
        hours: { [hour]: status },
      });
    }
  } catch (error) {
    console.error('Error updating availability status:', error);
    throw new Error('Failed to update availability status');
  }
}

export async function seedPlayersIfNeeded(): Promise<void> {
  try {
    const existingPlayers = await db.select().from(players);
    
    if (existingPlayers.length === 0) {
      const playerNames = ['Mirko', 'Toby', 'Tom', 'Denis', 'Josh', 'Jannis'];
      
      for (const name of playerNames) {
        await db.insert(players).values({ name });
      }
      
      console.log('Seeded database with default players');
    }
  } catch (error) {
    console.error('Error seeding players:', error);
    throw new Error('Failed to seed players');
  }
}

// Helper type for UI components
export interface PlayerAvailability {
  player: Player;
  availability: Record<string, AvailabilityStatus>; // hour -> status
}

export async function getPlayerAvailabilityForDate(date: string): Promise<PlayerAvailability[]> {
  try {
    const allPlayers = await getPlayers();
    const availabilityRecords = await db
      .select()
      .from(availability)
      .where(eq(availability.date, date));

    return allPlayers.map(player => {
      const playerAvailability = availabilityRecords.find(
        record => record.playerId === player.id
      );

      return {
        player,
        availability: (playerAvailability?.hours as Record<string, AvailabilityStatus>) || {}
      };
    });
  } catch (error) {
    console.error('Error fetching player availability for date:', error);
    throw new Error('Failed to fetch player availability');
  }
}