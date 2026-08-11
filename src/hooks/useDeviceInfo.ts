import { useState, useEffect, useRef } from 'react';
import type { DeviceInfo } from '../types/device';
import { getDeviceInfo } from '../services/electronApi';

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

  const fetch = async (s: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDeviceInfo(s);
      if (!isMounted.current) return;
      if (response.success && response.data) {
        setInfo(response.data);
      } else {
        setInfo(null);
        setError(response.error ?? 'Failed to fetch device info');
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      setInfo(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (serial) {
      fetch(serial);
    } else {
      setInfo(null);
      setError(null);
    }
    return () => {
      isMounted.current = false;
    };
  }, [serial]);

  const refetch = () => {
    if (serial) fetch(serial);
  };

  return { info, isLoading, error, refetch };
}
