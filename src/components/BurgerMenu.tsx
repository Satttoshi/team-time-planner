'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HamburgerMenuIcon, TrashIcon, Cross2Icon } from '@radix-ui/react-icons';
import { deleteDayData } from '@/lib/actions';
import { clsx } from 'clsx';

interface BurgerMenuProps {
  date: string; // YYYY-MM-DD format
  onDelete?: () => void;
}

export function BurgerMenu({ date, onDelete }: BurgerMenuProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <>
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Trigger asChild>
          <button
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-700 focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Options"
            type="button"
            onClick={handleOpenDialog}
          >
            <HamburgerMenuIcon className="h-4 w-4 text-gray-300 hover:text-white pointer-events-none" />
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-16px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-600 bg-gray-800 p-6 shadow-lg">
            <Dialog.Title className="mb-2 text-lg font-semibold text-gray-100">
              Day Options
            </Dialog.Title>
            
            {!showConfirmation ? (
              <>
                <Dialog.Description className="mb-4 text-sm text-gray-300">
                  Choose an option for this day:
                </Dialog.Description>

                <div className="flex flex-col gap-3">
                  <button
                    className="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                    onClick={handleDeleteClick}
                  >
                    <TrashIcon className="h-3 w-3" />
                    Delete Day Data
                  </button>
                  
                  <Dialog.Close asChild>
                    <button
                      className="rounded px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                </div>
              </>
            ) : (
              <>
                <Dialog.Description className="mb-4 text-sm text-gray-300">
                  Are you sure you want to delete all availability data for this day?
                  This action cannot be undone.
                </Dialog.Description>

                <div className="flex justify-end gap-3">
                  <button
                    className="rounded px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
                    onClick={handleCancel}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className={clsx(
                      'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                      isDeleting
                        ? 'cursor-not-allowed bg-red-800 text-red-200'
                        : 'bg-red-600 text-white hover:bg-red-700 focus:bg-red-700'
                    )}
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-red-200 border-t-transparent" />
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
                className="absolute right-4 top-4 rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-300 focus:bg-gray-700 focus:text-gray-300 focus:outline-none"
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