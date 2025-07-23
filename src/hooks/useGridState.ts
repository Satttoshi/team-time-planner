'use client';

import { useState, useRef, useCallback } from 'react';

const AVAILABLE_EARLY_HOURS = [
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
];

export interface UseGridStateOptions {
  onUserActivity?: (isActive: boolean) => void;
}

export function useGridState({ onUserActivity }: UseGridStateOptions = {}) {
  const [additionalHours, setAdditionalHours] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [bulkPendingPlayers, setBulkPendingPlayers] = useState<Set<number>>(new Set());
  
  const userActiveRef = useRef(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddEarlyHour = useCallback((allHours: string[]) => {
    // Find the next available early hour to add
    const currentEarlyHours = allHours.filter(hour => parseInt(hour) < 19);
    const availableHours = AVAILABLE_EARLY_HOURS.filter(
      hour => !currentEarlyHours.includes(hour)
    );

    if (availableHours.length > 0) {
      // Add the latest available early hour (18, then 17, then 16)
      const nextHour = availableHours[availableHours.length - 1];
      setAdditionalHours(prev => [...prev, nextHour]);
    }
  }, []);

  const setUserActive = useCallback((isActive: boolean) => {
    userActiveRef.current = isActive;
    
    if (isActive) {
      onUserActivity?.(true);
      
      // Reset activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      activityTimeoutRef.current = setTimeout(() => {
        userActiveRef.current = false;
        onUserActivity?.(false);
      }, 2000);
    } else {
      onUserActivity?.(false);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
    }
  }, [onUserActivity]);

  const clearState = useCallback(() => {
    setAdditionalHours([]);
    setPendingUpdates(new Set());
    setBulkPendingPlayers(new Set());
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    
    userActiveRef.current = false;
    onUserActivity?.(false);
  }, [onUserActivity]);

  const canAddEarlyHour = useCallback((allHours: string[]) => {
    const currentEarlyHours = allHours.filter(hour => parseInt(hour) < 19);
    return currentEarlyHours.length < AVAILABLE_EARLY_HOURS.length;
  }, []);

  return {
    additionalHours,
    pendingUpdates,
    setPendingUpdates,
    bulkPendingPlayers,
    setBulkPendingPlayers,
    userActiveRef,
    activityTimeoutRef,
    handleAddEarlyHour,
    setUserActive,
    clearState,
    canAddEarlyHour,
  };
}