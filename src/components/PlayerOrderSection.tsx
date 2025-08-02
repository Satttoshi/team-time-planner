'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { getPlayers, updatePlayerSortOrder } from '@/lib/actions';
import { type Player } from '@/lib/db/schema';

interface SortablePlayerChipProps {
  player: Player;
  isDragging?: boolean;
}

function SortablePlayerChip({ player, isDragging }: SortablePlayerChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5',
        'bg-surface-elevated border border-border text-foreground',
        'text-sm font-medium transition-all duration-150',
        'cursor-grab active:cursor-grabbing',
        'hover:bg-surface hover:border-border-elevated',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-ring-offset',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg scale-105',
        'select-none touch-none'
      )}
      title={`${player.name} (${player.role})`}
    >
      <span className="truncate">{player.name}</span>
      {player.role === 'coach' && (
        <span className="text-foreground-muted text-xs">Coach</span>
      )}
    </div>
  );
}

interface PlayerOrderSectionProps {
  onPlayersReordered?: () => void;
}

export function PlayerOrderSection({ onPlayersReordered }: PlayerOrderSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setIsLoading(true);
      const playersData = await getPlayers(true); // Only active players for reordering
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedPlayerId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPlayerId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = players.findIndex((player) => player.id === Number(active.id));
    const newIndex = players.findIndex((player) => player.id === Number(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newPlayers = arrayMove(players, oldIndex, newIndex);
    
    // Optimistically update UI
    setPlayers(newPlayers);
    setIsUpdating(true);

    try {
      // Update database with new order
      const playerIds = newPlayers.map(player => player.id);
      await updatePlayerSortOrder(playerIds);
      
      // Notify parent component
      onPlayersReordered?.();
    } catch (error) {
      console.error('Failed to update player order:', error);
      // Revert optimistic update on error
      await loadPlayers();
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-surface-elevated h-4 w-20 rounded mb-2" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-elevated h-8 w-16 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-foreground text-sm font-medium">Player Order</h3>
        {isUpdating && (
          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent text-foreground-muted" />
        )}
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={players.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {players.map((player) => (
              <SortablePlayerChip
                key={player.id}
                player={player}
                isDragging={draggedPlayerId === player.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <p className="text-foreground-muted text-xs mt-2">
        Drag chips to reorder players in the schedule grid
      </p>
    </div>
  );
}