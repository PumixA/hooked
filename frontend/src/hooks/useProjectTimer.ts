import { useCallback, useEffect, useRef, useState } from 'react';
import { localDb } from '../services/localDb';

interface TimerRuntimeState {
  running: boolean;
  startedAtMs: number | null;
  baseElapsedSec: number;
  sessionStartRow: number | null;
}

interface SaveSessionPayload {
  project_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

interface UseProjectTimerParams {
  projectId?: string;
  projectStatus?: string;
  currentRow?: number;
  initialTotalDuration?: number;
  onSaveDuration: (seconds: number) => void;
  onSaveSession: (payload: SaveSessionPayload) => void;
}

interface UseProjectTimerReturn {
  elapsed: number;
  isActive: boolean;
  sessionStartRow: number | null;
  toggleTimer: () => void;
  resetTimer: () => void;
  setElapsedFromSettings: (seconds: number) => void;
}

const TIMER_METADATA_PREFIX = 'timer:';

function getTimerMetadataKey(projectId: string): string {
  return `${TIMER_METADATA_PREFIX}${projectId}`;
}

export function useProjectTimer({
  projectId,
  projectStatus,
  currentRow,
  initialTotalDuration,
  onSaveDuration,
  onSaveSession,
}: UseProjectTimerParams): UseProjectTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartRow, setSessionStartRow] = useState<number | null>(null);

  const baseElapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const onSaveDurationRef = useRef(onSaveDuration);
  const onSaveSessionRef = useRef(onSaveSession);
  const initialDurationRef = useRef(initialTotalDuration ?? 0);

  useEffect(() => {
    onSaveDurationRef.current = onSaveDuration;
  }, [onSaveDuration]);

  useEffect(() => {
    onSaveSessionRef.current = onSaveSession;
  }, [onSaveSession]);

  useEffect(() => {
    initialDurationRef.current = initialTotalDuration ?? 0;
  }, [initialTotalDuration]);

  const persistRuntimeState = useCallback(async () => {
    if (!projectId) return;

    const state: TimerRuntimeState = {
      running: startedAtRef.current !== null,
      startedAtMs: startedAtRef.current,
      baseElapsedSec: baseElapsedRef.current,
      sessionStartRow,
    };

    try {
      await localDb.setMetadata(getTimerMetadataKey(projectId), state);
    } catch (error) {
      console.warn('[Timer] Unable to persist runtime state', error);
    }
  }, [projectId, sessionStartRow]);

  const checkpointElapsed = useCallback((): number => {
    if (!isActive || startedAtRef.current === null) {
      return baseElapsedRef.current;
    }

    const now = Date.now();
    const currentElapsed = baseElapsedRef.current + Math.floor((now - startedAtRef.current) / 1000);

    baseElapsedRef.current = currentElapsed;
    startedAtRef.current = now;
    setElapsed(currentElapsed);

    return currentElapsed;
  }, [isActive]);

  useEffect(() => {
    let isMounted = true;

    const hydrateRuntimeState = async () => {
      if (!projectId) {
        setElapsed(0);
        setIsActive(false);
        setSessionStartRow(null);
        baseElapsedRef.current = 0;
        startedAtRef.current = null;
        return;
      }

      const defaultElapsed = initialDurationRef.current;

      try {
        const runtime = await localDb.getMetadata<TimerRuntimeState>(getTimerMetadataKey(projectId));
        if (!isMounted) return;

        if (runtime) {
          baseElapsedRef.current = runtime.baseElapsedSec ?? defaultElapsed;
          startedAtRef.current = runtime.running ? runtime.startedAtMs : null;
          setSessionStartRow(runtime.sessionStartRow ?? null);

          if (runtime.running && runtime.startedAtMs) {
            const currentElapsed = baseElapsedRef.current + Math.floor((Date.now() - runtime.startedAtMs) / 1000);
            setElapsed(currentElapsed);
            setIsActive(true);
          } else {
            setElapsed(baseElapsedRef.current);
            setIsActive(false);
          }

          return;
        }
      } catch (error) {
        console.warn('[Timer] Unable to load runtime state', error);
      }

      baseElapsedRef.current = defaultElapsed;
      startedAtRef.current = null;
      setElapsed(defaultElapsed);
      setIsActive(false);
      setSessionStartRow(null);
    };

    hydrateRuntimeState();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (isActive || !projectId) return;

    const persistedElapsed = initialTotalDuration ?? 0;
    if (persistedElapsed !== elapsed) {
      baseElapsedRef.current = persistedElapsed;
      setElapsed(persistedElapsed);
    }
  }, [elapsed, initialTotalDuration, isActive, projectId]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const startedAt = startedAtRef.current ?? now;
      const currentElapsed = baseElapsedRef.current + Math.floor((now - startedAt) / 1000);
      setElapsed(currentElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const autoSaveInterval = setInterval(() => {
      const currentElapsed = checkpointElapsed();
      onSaveDurationRef.current(currentElapsed);
      persistRuntimeState().catch(console.error);
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [checkpointElapsed, isActive, persistRuntimeState]);

  useEffect(() => {
    if (!projectId) return;
    persistRuntimeState().catch(console.error);
  }, [persistRuntimeState, projectId, sessionStartRow]);

  useEffect(() => {
    if (!projectId) return;

    const saveOnHide = () => {
      const currentElapsed = checkpointElapsed();
      localDb.saveProject({ id: projectId, total_duration: currentElapsed }).catch(console.error);
      persistRuntimeState().catch(console.error);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveOnHide();
      }
    };

    const handlePageLeave = () => {
      saveOnHide();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handlePageLeave);
    window.addEventListener('pagehide', handlePageLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handlePageLeave);
      window.removeEventListener('pagehide', handlePageLeave);
      saveOnHide();
    };
  }, [checkpointElapsed, persistRuntimeState, projectId]);

  const toggleTimer = useCallback(() => {
    if (!projectId || projectStatus === 'completed') return;

    if (isActive) {
      const now = Date.now();
      const startedAt = startedAtRef.current ?? now;
      const duration = Math.floor((now - startedAt) / 1000);
      const exactElapsed = baseElapsedRef.current + duration;

      if (duration > 2) {
        onSaveSessionRef.current({
          project_id: projectId,
          start_time: new Date(startedAt).toISOString(),
          end_time: new Date(now).toISOString(),
          duration_seconds: duration,
        });
      }

      baseElapsedRef.current = exactElapsed;
      startedAtRef.current = null;
      setElapsed(exactElapsed);
      setIsActive(false);
      onSaveDurationRef.current(exactElapsed);
      persistRuntimeState().catch(console.error);
      return;
    }

    startedAtRef.current = Date.now();
    setIsActive(true);

    if (sessionStartRow === null && currentRow !== undefined) {
      setSessionStartRow(currentRow);
    }

    persistRuntimeState().catch(console.error);
  }, [currentRow, isActive, persistRuntimeState, projectId, projectStatus, sessionStartRow]);

  const resetTimer = useCallback(() => {
    if (projectStatus === 'completed') return;

    baseElapsedRef.current = 0;
    startedAtRef.current = null;
    setElapsed(0);
    setIsActive(false);
    setSessionStartRow(null);
    onSaveDurationRef.current(0);
    persistRuntimeState().catch(console.error);
  }, [persistRuntimeState, projectStatus]);

  const setElapsedFromSettings = useCallback(
    (seconds: number) => {
      const normalized = Math.max(0, Math.floor(seconds));
      baseElapsedRef.current = normalized;
      setElapsed(normalized);

      if (isActive) {
        startedAtRef.current = Date.now();
      }

      onSaveDurationRef.current(normalized);
      persistRuntimeState().catch(console.error);
    },
    [isActive, persistRuntimeState],
  );

  return {
    elapsed,
    isActive,
    sessionStartRow,
    toggleTimer,
    resetTimer,
    setElapsedFromSettings,
  };
}
