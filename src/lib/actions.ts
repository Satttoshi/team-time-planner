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

export async function getPlayers(): Promise<Player[]> {
  try {
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
        { name: 'Mirco', role: 'player' as const, sortOrder: 1 },
        { name: 'Toby', role: 'player' as const, sortOrder: 2 },
        { name: 'Tom', role: 'player' as const, sortOrder: 3 },
        { name: 'Denis', role: 'player' as const, sortOrder: 4 },
        { name: 'Josh', role: 'player' as const, sortOrder: 5 },
        { name: 'Jannis', role: 'coach' as const, sortOrder: 6 },
      ];

      for (const player of playerData) {
        await db.insert(players).values(player);
      }

      console.log('Seeded database with default players');
    } else {
      // Update existing players with correct roles and sort orders
      const playerUpdates = [
        { name: 'Mirco', role: 'player' as const, sortOrder: 1 },
        { name: 'Toby', role: 'player' as const, sortOrder: 2 },
        { name: 'Tom', role: 'player' as const, sortOrder: 3 },
        { name: 'Denis', role: 'player' as const, sortOrder: 4 },
        { name: 'Josh', role: 'player' as const, sortOrder: 5 },
        { name: 'Jannis', role: 'coach' as const, sortOrder: 6 },
      ];

      for (const update of playerUpdates) {
        await db.update(players)
          .set({ role: update.role, sortOrder: update.sortOrder })
          .where(eq(players.name, update.name));
      }

      console.log('Updated existing players with roles and sort orders');
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
    const allPlayers = await getPlayers();
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
