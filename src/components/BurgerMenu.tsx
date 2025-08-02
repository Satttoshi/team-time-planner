'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  HamburgerMenuIcon,
  TrashIcon,
  Cross2Icon,
  SunIcon,
  MoonIcon,
  DesktopIcon,
} from '@radix-ui/react-icons';
import { deleteDayData } from '@/lib/actions';
import { useTheme } from 'next-themes';
import { clsx } from 'clsx';
import { PlayerOrderSection } from './PlayerOrderSection';
import { PlayerManagementSection } from './PlayerManagementSection';

interface BurgerMenuProps {
  date: string; // YYYY-MM-DD format
  onDelete?: () => void;
  onPlayersReordered?: () => void;
}

export function BurgerMenu({ date, onDelete, onPlayersReordered }: BurgerMenuProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setShowConfirmation(false);
  };

  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDayData(date);
      onDelete?.();
      setIsDialogOpen(false);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to delete day data:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
    } else {
      setIsDialogOpen(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const getThemeIcon = (themeOption: 'light' | 'dark' | 'system') => {
    switch (themeOption) {
      case 'light':
        return <SunIcon className="h-3 w-3" />;
      case 'dark':
        return <MoonIcon className="h-3 w-3" />;
      case 'system':
        return <DesktopIcon className="h-3 w-3" />;
    }
  };

  const getThemeLabel = (themeOption: 'light' | 'dark' | 'system') => {
    switch (themeOption) {
      case 'light':
        return 'Light Theme';
      case 'dark':
        return 'Dark Theme';
      case 'system':
        return 'System Theme';
    }
  };

  return (
    <>
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Trigger asChild>
          <button
            className={clsx(
              'flex h-6 w-6 items-center justify-center rounded transition-colors',
              'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
            )}
            title="Options"
            type="button"
            onClick={handleOpenDialog}
          >
            <HamburgerMenuIcon className="pointer-events-none h-4 w-4" />
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={clsx(
              'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-16px)] max-w-md',
              '-translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg',
              'bg-surface-elevated border-border-elevated border'
            )}
          >
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              Options
            </Dialog.Title>

            {!showConfirmation ? (
              <>
                <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
                  Choose an option:
                </Dialog.Description>

                <div className="flex flex-col gap-3">
                  {/* Theme Selection */}
                  <div className="border-border border-b pb-3">
                    <h3 className="text-foreground mb-2 text-sm font-medium">
                      Theme
                    </h3>
                    <div className="flex flex-col gap-1">
                      {!mounted
                        ? // Static buttons during hydration
                          (['light', 'dark', 'system'] as const).map(
                            themeOption => (
                              <div
                                key={themeOption}
                                className="text-foreground-secondary flex items-center gap-2 rounded px-3 py-2 text-sm font-medium"
                              >
                                {getThemeIcon(themeOption)}
                                {getThemeLabel(themeOption)}
                              </div>
                            )
                          )
                        : // Interactive buttons after mounting
                          (['light', 'dark', 'system'] as const).map(
                            themeOption => (
                              <button
                                key={themeOption}
                                className={clsx(
                                  'flex items-center gap-2 rounded px-3 py-2',
                                  'text-sm font-medium transition-colors focus:outline-none',
                                  theme === themeOption
                                    ? 'bg-primary text-white'
                                    : 'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground focus:bg-surface-elevated focus:text-foreground'
                                )}
                                onClick={() => handleThemeChange(themeOption)}
                              >
                                {getThemeIcon(themeOption)}
                                {getThemeLabel(themeOption)}
                                {theme === themeOption &&
                                  themeOption === 'system' &&
                                  resolvedTheme && (
                                    <span className="ml-auto text-xs opacity-70">
                                      ({resolvedTheme})
                                    </span>
                                  )}
                              </button>
                            )
                          )}
                    </div>
                  </div>

                  {/* Player Order */}
                  <div className="border-border border-b pb-3">
                    <PlayerOrderSection onPlayersReordered={onPlayersReordered} />
                  </div>

                  {/* Player Management */}
                  <div className="border-border border-b pb-3">
                    <PlayerManagementSection onPlayersChanged={onPlayersReordered} />
                  </div>

                  {/* Day Options */}
                  <div>
                    <h3 className="text-foreground mb-2 text-sm font-medium">
                      Day Options
                    </h3>
                    <button
                      className={clsx(
                        'flex w-full items-center gap-2 rounded px-3 py-2',
                        'text-foreground-secondary text-sm font-medium transition-colors',
                        'hover:bg-surface-elevated hover:text-foreground',
                        'focus:bg-surface-elevated focus:text-foreground focus:outline-none'
                      )}
                      onClick={handleDeleteClick}
                    >
                      <TrashIcon className="h-3 w-3" />
                      Delete Day Data
                    </button>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      className={clsx(
                        'mt-2 rounded px-4 py-2 text-sm font-medium transition-colors',
                        'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
                        'focus:bg-surface-elevated focus:text-foreground focus:outline-none'
                      )}
                      onClick={handleCancel}
                    >
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </>
            ) : (
              <>
                <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
                  Are you sure you want to delete all availability data for this
                  day? This action cannot be undone.
                </Dialog.Description>

                <div className="flex justify-end gap-3">
                  <button
                    className={clsx(
                      'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                      'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
                      'focus:bg-surface-elevated focus:text-foreground',
                      isDeleting && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={handleCancel}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className={clsx(
                      'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                      isDeleting
                        ? 'bg-status-unready-bg text-status-unready cursor-not-allowed'
                        : 'bg-status-unready-bg text-foreground hover:brightness-110 focus:brightness-110'
                    )}
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
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
              </>
            )}

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
    </>
  );
}
