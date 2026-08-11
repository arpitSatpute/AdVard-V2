import { useState, useEffect, useCallback, useRef } from 'react';
import type { DeviceEntry } from '../types/device';
import { getDevices } from '../services/electronApi';

const POLL_INTERVAL_MS = 2000;

interface UseDevicesResult {
  devices: DeviceEntry[];
  selectedSerial: string | null;
  setSelectedSerial: (serial: string | null) => void;
  isLoading: boolean;
  error: string | null;
  isAdbMissing: boolean;
  refresh: () => void;
}

export function useDevices(): UseDevicesResult {
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdbMissing, setIsAdbMissing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const fetchDevices = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await getDevices();

      if (!isMounted.current) return;

      if (response.success && response.data) {
        setDevices(response.data);
        setError(null);
        setIsAdbMissing(false);

        // Auto-select first device if nothing selected or selected device disconnected
        setSelectedSerial((prev) => {
          const serials = response.data!.map((d) => d.serial);
          if (prev && serials.includes(prev)) return prev;
          return serials.length > 0 ? serials[0] : null;
        });
      } else {
        setDevices([]);
        setError(response.error || 'Failed to fetch devices');
        setIsAdbMissing(response.isAdbMissing ?? false);
        if (response.isAdbMissing) {
          setSelectedSerial(null);
        }
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      setDevices([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchDevices(true);
  }, [fetchDevices]);

  useEffect(() => {
    isMounted.current = true;
    fetchDevices(true);

    intervalRef.current = setInterval(() => {
      fetchDevices(false);
    }, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDevices]);

  return {
    devices,
    selectedSerial,
    setSelectedSerial,
    isLoading,
    error,
    isAdbMissing,
    refresh,
  };
}
