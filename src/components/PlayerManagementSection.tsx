'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  PlusIcon, 
  Pencil1Icon, 
  CheckIcon, 
  Cross2Icon,
  ReloadIcon,
  TrashIcon
} from '@radix-ui/react-icons';
import { 
  getPlayers, 
  addNewPlayer, 
  updatePlayerDetails, 
  togglePlayerActiveStatus,
  deletePlayer
} from '@/lib/actions';
import { type Player } from '@/lib/db/schema';

interface PlayerManagementSectionProps {
  onPlayersChanged?: () => void;
}

export function PlayerManagementSection({ onPlayersChanged }: PlayerManagementSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'player' as 'player' | 'coach' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({ name: '', role: 'player' as 'player' | 'coach' });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setIsLoading(true);
      const playersData = await getPlayers(); // Get all players (active and inactive)
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLoadingState = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const handleStartEdit = (player: Player) => {
    setEditingPlayer(player.id);
    setEditForm({ name: player.name, role: player.role });
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditForm({ name: '', role: 'player' });
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer || !editForm.name.trim()) return;
    
    const loadingKey = `edit-${editingPlayer}`;
    setLoadingState(loadingKey, true);
    
    try {
      await updatePlayerDetails(editingPlayer, editForm.name.trim(), editForm.role);
      await loadPlayers();
      onPlayersChanged?.();
      setEditingPlayer(null);
    } catch (error) {
      console.error('Failed to update player:', error);
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleToggleActive = async (player: Player) => {
    const loadingKey = `toggle-${player.id}`;
    setLoadingState(loadingKey, true);
    
    try {
      await togglePlayerActiveStatus(player.id, !player.isActive);
      await loadPlayers();
      onPlayersChanged?.();
    } catch (error) {
      console.error('Failed to toggle player status:', error);
      // Show error message to user since this could be due to 6-player limit
      alert(error instanceof Error ? error.message : 'Failed to toggle player status');
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (!confirm(`Are you sure you want to delete ${player.name}? This will permanently remove them and ALL their availability data. This action cannot be undone.`)) {
      return;
    }
    
    const loadingKey = `delete-${player.id}`;
    setLoadingState(loadingKey, true);
    
    try {
      await deletePlayer(player.id);
      await loadPlayers();
      onPlayersChanged?.();
    } catch (error) {
      console.error('Failed to delete player:', error);
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.name.trim()) return;
    
    setLoadingState('add-player', true);
    
    try {
      await addNewPlayer(newPlayerForm.name.trim(), newPlayerForm.role);
      await loadPlayers();
      onPlayersChanged?.();
      setNewPlayerForm({ name: '', role: 'player' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add player:', error);
    } finally {
      setLoadingState('add-player', false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-surface-elevated h-4 w-32 rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-elevated h-10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const activePlayers = players.filter(p => p.isActive);
  const inactivePlayers = players.filter(p => !p.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-foreground text-sm font-medium">Player Management</h3>
        <span className="text-foreground-muted text-xs">
          {activePlayers.length}/6 active
        </span>
      </div>

      {/* Active Players */}
      {activePlayers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-foreground-secondary text-xs font-medium mb-2">Active Players</h4>
          <div className="space-y-1">
            {activePlayers.map(player => (
              <PlayerRow
                key={player.id}
                player={player}
                editingPlayer={editingPlayer}
                editForm={editForm}
                loadingStates={loadingStates}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                setEditForm={setEditForm}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Players */}
      {inactivePlayers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-foreground-secondary text-xs font-medium mb-2">Inactive Players</h4>
          <div className="space-y-1">
            {inactivePlayers.map(player => (
              <PlayerRow
                key={player.id}
                player={player}
                editingPlayer={editingPlayer}
                editForm={editForm}
                loadingStates={loadingStates}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                setEditForm={setEditForm}
              />
            ))}
          </div>
        </div>
      )}


      {/* Add New Player */}
      <div className="border-t border-border pt-3">
        {!showAddForm ? (
          <button
            className={clsx(
              'flex items-center gap-2 w-full rounded px-3 py-2',
              'text-foreground-secondary text-sm font-medium transition-colors',
              'hover:bg-surface-elevated hover:text-foreground',
              'focus:bg-surface-elevated focus:text-foreground focus:outline-none'
            )}
            onClick={() => setShowAddForm(true)}
          >
            <PlusIcon className="h-3 w-3" />
            Add New Player
          </button>
        ) : (
          <form onSubmit={handleAddPlayer} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Player name"
                value={newPlayerForm.name}
                onChange={(e) => setNewPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                className={clsx(
                  'flex-1 rounded px-2 py-1 text-sm',
                  'bg-surface border border-border text-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                autoFocus
              />
              <select
                value={newPlayerForm.role}
                onChange={(e) => setNewPlayerForm(prev => ({ ...prev, role: e.target.value as 'player' | 'coach' }))}
                className={clsx(
                  'rounded px-2 py-1 text-sm',
                  'bg-surface border border-border text-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
              >
                <option value="player">Player</option>
                <option value="coach">Coach</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className={clsx(
                  'px-3 py-1 rounded text-xs transition-colors',
                  'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
                )}
                onClick={() => {
                  setShowAddForm(false);
                  setNewPlayerForm({ name: '', role: 'player' });
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlayerForm.name.trim() || loadingStates['add-player']}
                className={clsx(
                  'px-3 py-1 rounded text-xs transition-colors',
                  'bg-primary text-white hover:brightness-110',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loadingStates['add-player'] ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-foreground-muted text-xs mt-2">
        New players start as inactive. Maximum 6 active players allowed.
      </p>
    </div>
  );
}

interface PlayerRowProps {
  player: Player;
  editingPlayer: number | null;
  editForm: { name: string; role: 'player' | 'coach' };
  loadingStates: Record<string, boolean>;
  onStartEdit: (player: Player) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggleActive: (player: Player) => void;
  onDelete: (player: Player) => void;
  setEditForm: React.Dispatch<React.SetStateAction<{ name: string; role: 'player' | 'coach' }>>;
}

function PlayerRow({
  player,
  editingPlayer,
  editForm,
  loadingStates,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleActive,
  onDelete,
  setEditForm
}: PlayerRowProps) {
  const isEditing = editingPlayer === player.id;
  const isLoading = loadingStates[`edit-${player.id}`] || loadingStates[`toggle-${player.id}`] || 
                   loadingStates[`delete-${player.id}`];

  const getPlayerStatusChip = (player: Player) => {
    if (player.isActive) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-status-ready text-foreground">Active</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-foreground-muted border border-border">Inactive</span>;
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            className={clsx(
              'flex-1 rounded px-2 py-1 text-sm',
              'bg-surface border border-border text-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
            autoFocus
          />
          <select
            value={editForm.role}
            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as 'player' | 'coach' }))}
            className={clsx(
              'rounded px-2 py-1 text-sm',
              'bg-surface border border-border text-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
          >
            <option value="player">Player</option>
            <option value="coach">Coach</option>
          </select>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onSaveEdit}
            disabled={!editForm.name.trim() || isLoading}
            className={clsx(
              'p-1 rounded transition-colors',
              'text-status-ready hover:bg-status-ready hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <CheckIcon className="h-3 w-3" />
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isLoading}
            className={clsx(
              'p-1 rounded transition-colors',
              'text-foreground-secondary hover:bg-surface hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Cross2Icon className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-surface-elevated rounded">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-foreground text-sm font-medium">{player.name}</span>
        {player.role === 'coach' && (
          <span className="text-foreground-muted text-xs">Coach</span>
        )}
        {getPlayerStatusChip(player)}
      </div>
      
      <div className="flex gap-1">
        {/* Edit Button */}
        <button
          onClick={() => onStartEdit(player)}
          disabled={isLoading}
          className={clsx(
            'p-1 rounded transition-colors',
            'text-foreground-secondary hover:bg-surface hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Edit player"
        >
          <Pencil1Icon className="h-3 w-3" />
        </button>

        {/* Active/Inactive Toggle */}
        <button
          onClick={() => onToggleActive(player)}
          disabled={isLoading}
          className={clsx(
            'p-1 rounded transition-colors',
            player.isActive 
              ? 'text-status-uncertain hover:bg-status-uncertain hover:text-foreground' 
              : 'text-status-ready hover:bg-status-ready hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title={player.isActive ? 'Set as inactive' : 'Set as active'}
        >
          {loadingStates[`toggle-${player.id}`] ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <ReloadIcon className="h-3 w-3" />
          )}
        </button>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(player)}
          disabled={isLoading}
          className={clsx(
            'p-1 rounded transition-colors',
            'text-status-unready hover:bg-status-unready hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Delete player"
        >
          {loadingStates[`delete-${player.id}`] ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <TrashIcon className="h-3 w-3" />
          )}
        </button>
      </div>
    </div>
  );
}