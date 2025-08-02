'use server';

import {
  db,
  players,
  availability,
  type Player,
  type Availability,
  type AvailabilityStatus,
} from './db';
import { eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getPlayers(activeOnly: boolean = false): Promise<Player[]> {
  try {
    if (activeOnly) {
      return await db.select().from(players)
        .where(eq(players.isActive, 1))
        .orderBy(players.sortOrder);
    }
    
    return await db.select().from(players).orderBy(players.sortOrder);
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

export async function getAvailabilityForDates(
  dates: string[]
): Promise<Availability[]> {
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
    // First, check if a record exists
    const existing = await db
      .select({ id: availability.id })
      .from(availability)
      .where(
        and(eq(availability.playerId, playerId), eq(availability.date, date))
      );

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(availability)
        .set({
          hours: sql`jsonb_set(hours, ${`{${hour}}`}, ${`"${status}"`})`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(availability.playerId, playerId), eq(availability.date, date))
        );
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

export async function updateBulkAvailabilityStatus(
  playerId: number,
  date: string,
  hours: string[],
  status: AvailabilityStatus
): Promise<void> {
  try {
    // First, check if a record exists
    const existing = await db
      .select({ id: availability.id, hours: availability.hours })
      .from(availability)
      .where(
        and(eq(availability.playerId, playerId), eq(availability.date, date))
      );

    if (existing.length > 0) {
      // Build JSONB update for multiple hours at once
      const updateExpression = 'hours';
      const hoursObj: Record<string, AvailabilityStatus> = {};

      hours.forEach(hour => {
        hoursObj[hour] = status;
      });

      await db
        .update(availability)
        .set({
          hours: sql`${sql.raw(updateExpression)} || ${JSON.stringify(hoursObj)}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(availability.playerId, playerId), eq(availability.date, date))
        );
    } else {
      // Create new record with all hours set to the status
      const hoursObj: Record<string, AvailabilityStatus> = {};
      hours.forEach(hour => {
        hoursObj[hour] = status;
      });

      await db.insert(availability).values({
        playerId,
        date,
        hours: hoursObj,
      });
    }
  } catch (error) {
    console.error('Error updating bulk availability status:', error);
    throw new Error('Failed to update bulk availability status');
  }
}

export async function seedPlayersIfNeeded(): Promise<void> {
  try {
    const existingPlayers = await db.select().from(players);

    if (existingPlayers.length === 0) {
      const playerData = [
        { name: 'Mirco', role: 'player' as const, sortOrder: 1, isActive: 1 },
        { name: 'Toby', role: 'player' as const, sortOrder: 2, isActive: 1 },
        { name: 'Tom', role: 'player' as const, sortOrder: 3, isActive: 1 },
        { name: 'Denis', role: 'player' as const, sortOrder: 4, isActive: 1 },
        { name: 'Josh', role: 'player' as const, sortOrder: 5, isActive: 1 },
        { name: 'Jannis', role: 'coach' as const, sortOrder: 6, isActive: 1 },
      ];

      for (const player of playerData) {
        await db.insert(players).values(player);
      }

      console.log('Seeded database with default players');
    } else {
      // Update existing players with correct roles only (preserve user-defined sort orders)
      const playerUpdates = [
        { name: 'Mirco', role: 'player' as const },
        { name: 'Toby', role: 'player' as const },
        { name: 'Tom', role: 'player' as const },
        { name: 'Denis', role: 'player' as const },
        { name: 'Josh', role: 'player' as const },
        { name: 'Jannis', role: 'coach' as const },
      ];

      for (const update of playerUpdates) {
        await db.update(players)
          .set({ role: update.role })
          .where(eq(players.name, update.name));
      }

      console.log('Updated existing players with roles (preserved sort orders)');
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

export async function getPlayerAvailabilityForDate(
  date: string
): Promise<PlayerAvailability[]> {
  try {
    const allPlayers = await getPlayers(true); // Only active players for schedule grid
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
        availability:
          (playerAvailability?.hours as Record<string, AvailabilityStatus>) ||
          {},
      };
    });
  } catch (error) {
    console.error('Error fetching player availability for date:', error);
    throw new Error('Failed to fetch player availability');
  }
}

export async function getAllPlayerAvailabilityForDates(
  dates: string[]
): Promise<Record<string, PlayerAvailability[]>> {
  try {
    const allPlayers = await getPlayers(true); // Only active players for schedule grid
    const availabilityRecords = await getAvailabilityForDates(dates);

    const result: Record<string, PlayerAvailability[]> = {};

    for (const date of dates) {
      const dayAvailabilityRecords = availabilityRecords.filter(
        record => record.date === date
      );

      result[date] = allPlayers.map(player => {
        const playerAvailability = dayAvailabilityRecords.find(
          record => record.playerId === player.id
        );

        return {
          player,
          availability:
            (playerAvailability?.hours as Record<string, AvailabilityStatus>) ||
            {},
        };
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching player availability for dates:', error);
    throw new Error('Failed to fetch player availability for dates');
  }
}

export async function updatePlayerSortOrder(playerIds: number[]): Promise<void> {
  try {
    // Update sort order for all players (Neon HTTP driver doesn't support transactions)
    for (let i = 0; i < playerIds.length; i++) {
      await db
        .update(players)
        .set({ sortOrder: i + 1 })
        .where(eq(players.id, playerIds[i]));
    }
    console.log('Updated player sort order');
  } catch (error) {
    console.error('Error updating player sort order:', error);
    throw new Error('Failed to update player sort order');
  }
}

export async function deleteDayData(date: string): Promise<void> {
  try {
    // Delete all availability records for the specified date
    await db.delete(availability).where(eq(availability.date, date));
    console.log(`Deleted all availability data for date: ${date}`);
  } catch (error) {
    console.error('Error deleting day data:', error);
    throw new Error('Failed to delete day data');
  }
}

export async function updatePlayerDetails(
  playerId: number,
  name: string,
  role: 'player' | 'coach'
): Promise<void> {
  try {
    await db
      .update(players)
      .set({ name, role })
      .where(eq(players.id, playerId));
    console.log(`Updated player ${playerId} details`);
  } catch (error) {
    console.error('Error updating player details:', error);
    throw new Error('Failed to update player details');
  }
}

export async function togglePlayerActiveStatus(
  playerId: number,
  isActive: boolean
): Promise<void> {
  try {
    // If activating a player, check if we would exceed 6 active players
    if (isActive) {
      const activePlayers = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.isActive, 1));
      
      if (activePlayers.length >= 6) {
        throw new Error('Cannot activate player: Maximum of 6 active players allowed');
      }
    }
    
    await db
      .update(players)
      .set({ isActive: isActive ? 1 : 0 })
      .where(eq(players.id, playerId));
    console.log(`Updated player ${playerId} active status to ${isActive}`);
  } catch (error) {
    console.error('Error toggling player active status:', error);
    throw error;
  }
}

export async function deletePlayer(playerId: number): Promise<void> {
  try {
    // Note: This will cascade delete all availability records for this player
    await db.delete(players).where(eq(players.id, playerId));
    console.log(`Deleted player ${playerId}`);
  } catch (error) {
    console.error('Error deleting player:', error);
    throw new Error('Failed to delete player');
  }
}

export async function addNewPlayer(
  name: string,
  role: 'player' | 'coach' = 'player'
): Promise<Player> {
  try {
    // Get the next sort order
    const existingPlayers = await getPlayers();
    const nextSortOrder = Math.max(...existingPlayers.map(p => p.sortOrder), 0) + 1;
    
    const [newPlayer] = await db.insert(players).values({
      name,
      role,
      sortOrder: nextSortOrder,
      isActive: 0, // New players start as inactive to avoid exceeding 6-player limit
    }).returning();
    
    console.log(`Created new player: ${name}`);
    return newPlayer;
  } catch (error) {
    console.error('Error adding new player:', error);
    throw new Error('Failed to add new player');
  }
}
