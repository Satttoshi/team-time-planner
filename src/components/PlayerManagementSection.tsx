'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  PlusIcon,
  Pencil1Icon,
  CheckIcon,
  Cross2Icon,
  ReloadIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import * as Dialog from '@radix-ui/react-dialog';
import {
  getPlayers,
  addNewPlayer,
  updatePlayerDetails,
  togglePlayerActiveStatus,
  deletePlayer,
} from '@/lib/actions';
import { type Player } from '@/lib/db/schema';

interface PlayerManagementSectionProps {
  onPlayersChanged?: () => void;
}

export function PlayerManagementSection({
  onPlayersChanged,
}: PlayerManagementSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'player' as 'player' | 'coach',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '',
    role: 'player' as 'player' | 'coach',
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    player: Player;
    isOpen: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isErrorVisible, setIsErrorVisible] = useState<boolean>(false);

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
      await updatePlayerDetails(
        editingPlayer,
        editForm.name.trim(),
        editForm.role
      );
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
    setErrorMessage(''); // Clear any existing error

    try {
      await togglePlayerActiveStatus(player.id, !player.isActive);
      await loadPlayers();
      onPlayersChanged?.();
    } catch (error) {
      console.error('Failed to toggle player status:', error);
      // Show inline error message instead of alert
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to toggle player status';

      setErrorMessage(message);
      // Start with invisible state, then fade in
      setIsErrorVisible(false);

      // Fade in after a small delay to ensure DOM is updated
      setTimeout(() => setIsErrorVisible(true), 50);

      // Auto-hide error after 4 seconds with fade transition
      setTimeout(() => {
        setIsErrorVisible(false);
        // Remove message after fade completes
        setTimeout(() => setErrorMessage(''), 300);
      }, 4000);
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleDelete = async (player: Player) => {
    // Show confirmation dialog instead of browser confirm
    setDeleteConfirm({ player, isOpen: true });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm?.player) return;

    const player = deleteConfirm.player;
    const loadingKey = `delete-${player.id}`;
    setLoadingState(loadingKey, true);

    try {
      await deletePlayer(player.id);
      await loadPlayers();
      onPlayersChanged?.();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete player:', error);

      setErrorMessage('Failed to delete player. Please try again.');
      // Start with invisible state, then fade in
      setIsErrorVisible(false);

      // Fade in after a small delay to ensure DOM is updated
      setTimeout(() => setIsErrorVisible(true), 50);

      // Auto-hide error after 4 seconds with fade transition
      setTimeout(() => {
        setIsErrorVisible(false);
        // Remove message after fade completes
        setTimeout(() => setErrorMessage(''), 300);
      }, 4000);
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
        <div className="bg-surface-elevated mb-3 h-4 w-32 rounded" />
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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-medium">
          Player Management
        </h3>
        <span className="text-foreground-muted text-xs">
          {activePlayers.length}/6 active
        </span>
      </div>

      {/* Active Players */}
      {activePlayers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-foreground-secondary mb-2 text-xs font-medium">
            Active Players
          </h4>
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

      {/* Error Message Banner - positioned above inactive players */}
      {errorMessage && (
        <div
          className={clsx(
            'bg-status-unready/10 border-status-unready/20 mb-3 flex items-center gap-2 rounded-md border p-3',
            'transition-all duration-300 ease-in-out',
            isErrorVisible
              ? 'translate-y-0 transform opacity-100'
              : '-translate-y-2 transform opacity-0'
          )}
        >
          <ExclamationTriangleIcon className="text-status-unready h-4 w-4 shrink-0" />
          <p className="text-status-unready text-sm font-medium">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Inactive Players */}
      {inactivePlayers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-foreground-secondary mb-2 text-xs font-medium">
            Inactive Players
          </h4>
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
      <div className="border-border border-t pt-3">
        {!showAddForm ? (
          <button
            className={clsx(
              'flex w-full items-center gap-2 rounded px-3 py-2',
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
                id="add-player-name"
                name="add-player-name"
                type="text"
                placeholder="Player name"
                value={newPlayerForm.name}
                onChange={e =>
                  setNewPlayerForm(prev => ({ ...prev, name: e.target.value }))
                }
                className={clsx(
                  'min-w-0 flex-1 rounded px-2 py-1 text-sm',
                  'bg-surface border-border text-foreground border',
                  'focus:ring-ring focus:ring-1 focus:outline-none'
                )}
                autoFocus
              />
              <select
                id="add-player-role"
                name="add-player-role"
                value={newPlayerForm.role}
                onChange={e =>
                  setNewPlayerForm(prev => ({
                    ...prev,
                    role: e.target.value as 'player' | 'coach',
                  }))
                }
                className={clsx(
                  'w-20 shrink-0 rounded px-2 py-1 text-sm',
                  'bg-surface border-border text-foreground border',
                  'focus:ring-ring focus:ring-1 focus:outline-none'
                )}
              >
                <option value="player">Player</option>
                <option value="coach">Coach</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={clsx(
                  'rounded px-3 py-1 text-xs transition-colors',
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
                disabled={
                  !newPlayerForm.name.trim() || loadingStates['add-player']
                }
                className={clsx(
                  'rounded px-3 py-1 text-xs transition-colors',
                  'bg-primary text-white hover:brightness-110',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {loadingStates['add-player'] ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-foreground-muted mt-2 text-xs">
        New players start as inactive. Maximum 6 active players allowed.
      </p>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={deleteConfirm?.isOpen || false}
        onOpenChange={open => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={clsx(
              'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md',
              '-translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg',
              'bg-surface-elevated border-border-elevated border'
            )}
          >
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              Delete Player
            </Dialog.Title>

            <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm?.player?.name}</strong>? This will
              permanently remove them and ALL their availability data. This
              action cannot be undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                className={clsx(
                  'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
                  'focus:bg-surface-elevated focus:text-foreground'
                )}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={clsx(
                  'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  'bg-status-unready-bg text-foreground hover:brightness-110 focus:brightness-110'
                )}
                onClick={confirmDelete}
                disabled={loadingStates[`delete-${deleteConfirm?.player?.id}`]}
              >
                {loadingStates[`delete-${deleteConfirm?.player?.id}`] ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-3 w-3" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>

            <Dialog.Close asChild>
              <button
                className={clsx(
                  'absolute top-4 right-4 rounded p-1 transition-colors focus:outline-none',
                  'text-foreground-muted hover:bg-surface-elevated hover:text-foreground-secondary',
                  'focus:bg-surface-elevated focus:text-foreground-secondary'
                )}
                aria-label="Close"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
  setEditForm: React.Dispatch<
    React.SetStateAction<{ name: string; role: 'player' | 'coach' }>
  >;
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
  setEditForm,
}: PlayerRowProps) {
  const isEditing = editingPlayer === player.id;
  const isLoading =
    loadingStates[`edit-${player.id}`] ||
    loadingStates[`toggle-${player.id}`] ||
    loadingStates[`delete-${player.id}`];

  if (isEditing) {
    return (
      <div className="bg-surface-elevated flex items-center gap-2 rounded pl-2">
        <input
          id={`edit-name-${player.id}`}
          name={`edit-name-${player.id}`}
          type="text"
          value={editForm.name}
          onChange={e =>
            setEditForm(prev => ({ ...prev, name: e.target.value }))
          }
          className={clsx(
            'min-w-0 flex-1 rounded px-2 py-1 text-sm',
            'bg-surface border-border text-foreground border',
            'focus:ring-ring focus:ring-1 focus:outline-none'
          )}
          autoFocus
          placeholder="Name"
        />
        <select
          id={`edit-role-${player.id}`}
          name={`edit-role-${player.id}`}
          value={editForm.role}
          onChange={e =>
            setEditForm(prev => ({
              ...prev,
              role: e.target.value as 'player' | 'coach',
            }))
          }
          className={clsx(
            'w-20 rounded px-2 py-1 text-sm',
            'bg-surface border-border text-foreground border',
            'focus:ring-ring focus:ring-1 focus:outline-none'
          )}
        >
          <option value="player">Player</option>
          <option value="coach">Coach</option>
        </select>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onSaveEdit}
            disabled={!editForm.name.trim() || isLoading}
            className={clsx(
              'rounded p-2 transition-colors',
              'text-status-ready hover:bg-status-ready hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            title="Save changes"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isLoading}
            className={clsx(
              'rounded p-2 transition-colors',
              'text-foreground-secondary hover:bg-surface hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            title="Cancel edit"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated flex items-center gap-2 rounded pl-2">
      <div className="flex flex-1 items-center gap-2">
        <span className="text-foreground text-sm font-medium">
          {player.name}
        </span>
        {player.role === 'coach' && (
          <span className="text-foreground-muted text-xs">Coach</span>
        )}
      </div>

      <div className="flex gap-1">
        {/* Edit Button */}
        <button
          onClick={() => onStartEdit(player)}
          disabled={isLoading}
          className={clsx(
            'rounded p-2 transition-colors',
            'text-foreground-secondary hover:bg-surface hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          title="Edit player"
        >
          <Pencil1Icon className="h-4 w-4" />
        </button>

        {/* Active/Inactive Toggle */}
        <button
          onClick={() => onToggleActive(player)}
          disabled={isLoading}
          className={clsx(
            'rounded p-2 transition-colors',
            player.isActive
              ? 'text-status-uncertain hover:bg-status-uncertain-bg'
              : 'text-status-ready hover:bg-status-ready-bg',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          title={player.isActive ? 'Set as inactive' : 'Set as active'}
        >
          {loadingStates[`toggle-${player.id}`] ? (
            <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <ReloadIcon className="h-4 w-4" />
          )}
        </button>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(player)}
          disabled={isLoading}
          className={clsx(
            'rounded p-2 transition-colors',
            'text-status-unready hover:bg-status-unready-bg',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          title="Delete player"
        >
          {loadingStates[`delete-${player.id}`] ? (
            <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <TrashIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
