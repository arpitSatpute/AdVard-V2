import { useState, useEffect, useRef, useCallback } from 'react';
import type { DeviceInfo } from '../types/device';
import { getDeviceInfo } from '../services/electronApi';

const POLL_INTERVAL_MS = 3000;

interface UseDeviceInfoResult {
  info: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeviceInfo(serial: string | null): UseDeviceInfoResult {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchInfo = useCallback(async (s: string, showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await getDeviceInfo(s);
      if (!isMounted.current) return;

      if (response.success && response.data) {
        setInfo(response.data);
        setError(null);
      } else if (showLoading) {
        setInfo(null);
        setError(response.error ?? 'Failed to fetch device info');
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      if (showLoading) {
        setInfo(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (isMounted.current && showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (serial) {
      fetchInfo(serial, true);

      const interval = setInterval(() => {
        fetchInfo(serial, false);
      }, POLL_INTERVAL_MS);

      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    } else {
      setInfo(null);
      setError(null);
      return () => {
        isMounted.current = false;
      };
    }
  }, [serial, fetchInfo]);

  const refetch = useCallback(() => {
    if (serial) fetchInfo(serial, true);
  }, [serial, fetchInfo]);

  return { info, isLoading, error, refetch };
}
