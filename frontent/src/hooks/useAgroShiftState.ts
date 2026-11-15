import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PREFERENCES, DEFAULT_USER_PROFILE } from '../data/mockData';
import { alertService } from '../services/alertService';
import { historyService } from '../services/historyService';
import { parcelService } from '../services/parcelService';
import { backendApi, BackendAnalysis } from '../services/apiClient';
import {
  AnalysisSubTab,
  AppAlert,
  CropHistoryRecord,
  FieldObservation,
  NavTab,
  Parcel,
  UserPreferences,
  UserProfile,
  SyncStatus,
} from '../types/agroshift';

const PREFS_KEY = 'agroterra_prefs_v1';
const PROFILE_KEY = 'agroterra_profile_v1';

const NAV_TABS: NavTab[] = ['inicio', 'mapa', 'parcelas', 'analisis', 'perfil'];
const ANALYSIS_SUB_TABS: AnalysisSubTab[] = ['satelital', 'fusion', 'fuentes', 'insights', 'historial'];

function isNavTab(value: string | null): value is NavTab {
  return value !== null && NAV_TABS.includes(value as NavTab);
}

function isAnalysisSubTab(value: string | null): value is AnalysisSubTab {
  return value !== null && ANALYSIS_SUB_TABS.includes(value as AnalysisSubTab);
}

function readNavigationUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    activeTab: isNavTab(params.get('tab')) ? params.get('tab') as NavTab : 'inicio' as NavTab,
    analysisSubTab: isAnalysisSubTab(params.get('subtab'))
      ? params.get('subtab') as AnalysisSubTab
      : 'satelital' as AnalysisSubTab,
    selectedParcelId: params.get('parcel'),
    detailParcelId: params.get('detail'),
  };
}

function writeNavigationUrl(
  state: { activeTab: NavTab; analysisSubTab: AnalysisSubTab; selectedParcelId: string; detailParcelId: string | null },
  mode: 'push' | 'replace'
) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', state.activeTab);
  url.searchParams.set('subtab', state.analysisSubTab);
  if (state.selectedParcelId) url.searchParams.set('parcel', state.selectedParcelId);
  else url.searchParams.delete('parcel');
  if (state.detailParcelId) url.searchParams.set('detail', state.detailParcelId);
  else url.searchParams.delete('detail');
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
}

export function useAgroShiftState() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => readNavigationUrl().activeTab);
  const [analysisSubTab, setAnalysisSubTab] = useState<AnalysisSubTab>(() => readNavigationUrl().analysisSubTab);
  const [parcels, setParcels] = useState<Parcel[]>(() => parcelService.getAll());
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [dataSource, setDataSource] = useState<'local-demo' | 'backend' | 'offline'>('local-demo');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingSync, setPendingSync] = useState<{ operation: 'create' | 'update' | 'delete'; parcel: Parcel } | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [backendAnalysis, setBackendAnalysis] = useState<BackendAnalysis | null>(null);
  const [analysisFingerprint, setAnalysisFingerprint] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(() => {
    const initial = parcelService.getAll();
    return readNavigationUrl().selectedParcelId ?? initial[0]?.id ?? 'parcela-norte';
  });
  const [detailParcelId, setDetailParcelId] = useState<string | null>(() => readNavigationUrl().detailParcelId);
  const [historyRecords, setHistoryRecords] = useState<CropHistoryRecord[]>(() =>
    historyService.getAll()
  );
  const [alerts, setAlerts] = useState<AppAlert[]>(() => alertService.getAll());
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) } : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
    } catch {
      // Ignore
    }
  }, [userProfile]);

  useEffect(() => {
    let active = true;
    void parcelService.loadRemote().then((remoteParcels) => {
      if (!active) return;
      if (remoteParcels) {
        setBackendStatus('connected');
        setDataSource('backend');
        setParcels(remoteParcels);
        setSelectedParcelId((current) => remoteParcels.some((parcel) => parcel.id === current)
          ? current
          : remoteParcels[0]?.id ?? '');
      } else {
        setBackendStatus('offline');
        setDataSource('offline');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const syncParcel = useCallback(async (operation: 'create' | 'update' | 'delete', parcel: Parcel) => {
    setSyncStatus('saving');
    const result = operation === 'create'
      ? await parcelService.createRemote(parcel)
      : operation === 'update'
        ? await parcelService.updateRemote(parcel)
        : await parcelService.removeRemote(parcel);

    const succeeded = operation === 'delete' ? result === true : result !== null;
    if (!succeeded) {
      setPendingSync({ operation, parcel });
      setSyncStatus('error');
      return;
    }

    setPendingSync(null);
    setSyncStatus('saved');
    if (operation === 'create' && result && typeof result !== 'boolean') {
      setParcels((current) => {
        const withoutLocal = current.filter((item) => item.id !== parcel.id);
        const next = [result, ...withoutLocal];
        parcelService.saveAll(next);
        return next;
      });
      setSelectedParcelId(result.id);
    }
    if (operation === 'update' && result && typeof result !== 'boolean') {
      setParcels((current) => {
        const next = current.map((item) => item.id === parcel.id ? { ...parcel, ...result } : item);
        parcelService.saveAll(next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const retry = () => {
      if (pendingSync) void syncParcel(pendingSync.operation, pendingSync.parcel);
    };
    window.addEventListener('agroterra:retry-parcel-sync', retry);
    return () => window.removeEventListener('agroterra:retry-parcel-sync', retry);
  }, [pendingSync, syncParcel]);

  const selectedParcel = useMemo(() => {
    return parcels.find((p) => p.id === selectedParcelId) ?? parcels[0] ?? null;
  }, [parcels, selectedParcelId]);

  const selectedParcelFingerprint = selectedParcel ? JSON.stringify(selectedParcel) : null;
  const analysisIsStale = backendAnalysis !== null && analysisFingerprint !== selectedParcelFingerprint;

  const detailParcel = useMemo(() => {
    if (!detailParcelId) return null;
    return parcels.find((p) => p.id === detailParcelId) ?? null;
  }, [parcels, detailParcelId]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(
      (a) => !a.read && (preferences.notifications[a.category] ?? true)
    ).length;
  }, [alerts, preferences.notifications]);

  useEffect(() => {
    const handlePopState = () => {
      const next = readNavigationUrl();
      setActiveTab(next.activeTab);
      setAnalysisSubTab(next.analysisSubTab);
      if (next.selectedParcelId) setSelectedParcelId(next.selectedParcelId);
      setDetailParcelId(next.detailParcelId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((tab: NavTab, subTab?: AnalysisSubTab) => {
    const nextSubTab = subTab ?? analysisSubTab;
    setDetailParcelId(null);
    setActiveTab(tab);
    setAnalysisSubTab(nextSubTab);
    writeNavigationUrl({ activeTab: tab, analysisSubTab: nextSubTab, selectedParcelId, detailParcelId: null }, 'push');
  }, [analysisSubTab, detailParcelId, selectedParcelId]);

  const selectAnalysisSubTab = useCallback((subTab: AnalysisSubTab) => {
    setAnalysisSubTab(subTab);
    writeNavigationUrl({ activeTab, analysisSubTab: subTab, selectedParcelId, detailParcelId }, 'push');
  }, [activeTab, detailParcelId, selectedParcelId]);

  const selectParcel = useCallback((parcelId: string) => {
    setSelectedParcelId(parcelId);
    writeNavigationUrl({ activeTab, analysisSubTab, selectedParcelId: parcelId, detailParcelId }, 'replace');
  }, [activeTab, analysisSubTab, detailParcelId]);

  const openParcelDetail = useCallback((parcelId: string) => {
    setSelectedParcelId(parcelId);
    setDetailParcelId(parcelId);
    writeNavigationUrl({ activeTab, analysisSubTab, selectedParcelId: parcelId, detailParcelId: parcelId }, 'push');
  }, [activeTab, analysisSubTab]);

  const closeParcelDetail = useCallback(() => {
    setDetailParcelId(null);
    writeNavigationUrl({ activeTab, analysisSubTab, selectedParcelId, detailParcelId: null }, 'replace');
  }, [activeTab, analysisSubTab, selectedParcelId]);

  const createParcel = useCallback((parcel: Parcel) => {
    const updated = parcelService.create(parcel);
    setParcels(updated);
    setSelectedParcelId(parcel.id);
    void syncParcel('create', parcel);
  }, [syncParcel]);

  const updateParcel = useCallback((parcel: Parcel) => {
    const updated = parcelService.update(parcel);
    setParcels(updated);
    void syncParcel('update', parcel);
  }, [syncParcel]);

  const deleteParcel = useCallback(
    (parcelId: string) => {
      const parcelToDelete = parcels.find((item) => item.id === parcelId);
      const updated = parcelService.remove(parcelId);
      setParcels(updated);
      if (parcelToDelete) {
        void syncParcel('delete', parcelToDelete);
      }
      if (selectedParcelId === parcelId) {
        setSelectedParcelId(updated[0]?.id ?? '');
      }
      if (detailParcelId === parcelId) {
        setDetailParcelId(null);
        writeNavigationUrl({ activeTab, analysisSubTab, selectedParcelId, detailParcelId: null }, 'replace');
      }
    },
    [parcels, selectedParcelId, detailParcelId, activeTab, analysisSubTab, syncParcel]
  );

  const runBackendAnalysis = useCallback(async (parcelId: string, priorities = { water: 40, soil: 40, income: 20 }) => {
    const parcel = parcels.find((item) => item.id === parcelId);
    if (!parcel?.backendId) {
      setAnalysisError('Esta parcela todavía no está registrada en el backend.');
      setAnalysisStatus('error');
      return;
    }
    setAnalysisStatus('loading');
    setAnalysisError(null);
    try {
      const result = await backendApi.analyzeField(parcel.backendId, priorities);
      setBackendAnalysis(result);
      setAnalysisFingerprint(JSON.stringify(parcel));
      setAnalysisStatus('ready');
    } catch (error) {
      setAnalysisStatus('error');
      setAnalysisError(error instanceof Error ? error.message : 'No se pudo completar el análisis.');
    }
  }, [parcels]);

  const addObservation = useCallback((parcelId: string, obs: FieldObservation) => {
    const updated = parcelService.addObservation(parcelId, obs);
    setParcels(updated);
  }, []);

  const deleteObservation = useCallback((parcelId: string, obsId: string) => {
    const updated = parcelService.deleteObservation(parcelId, obsId);
    setParcels(updated);
  }, []);

  const addHistoryRecord = useCallback((record: CropHistoryRecord) => {
    const updated = historyService.addRecord(record);
    setHistoryRecords(updated);
  }, []);

  const markAlertRead = useCallback((alertId: string) => {
    setAlerts(alertService.markAsRead(alertId));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts(alertService.markAllRead());
  }, []);

  const resetAllDemoData = useCallback(() => {
    const freshParcels = parcelService.resetDemo();
    setParcels(freshParcels);
    setSelectedParcelId(freshParcels[0]?.id ?? 'parcela-norte');
    setDetailParcelId(null);
    writeNavigationUrl({ activeTab: 'inicio', analysisSubTab, selectedParcelId: freshParcels[0]?.id ?? 'parcela-norte', detailParcelId: null }, 'replace');
    setHistoryRecords(historyService.resetDemo());
    setAlerts(alertService.resetDemo());
    setPreferences(DEFAULT_PREFERENCES);
    setUserProfile(DEFAULT_USER_PROFILE);
  }, [analysisSubTab]);

  return {
    activeTab,
    analysisSubTab,
    setAnalysisSubTab: selectAnalysisSubTab,
    navigateTo,
    parcels,
    selectedParcel,
    selectedParcelId,
    setSelectedParcelId: selectParcel,
    detailParcel,
    openParcelDetail,
    closeParcelDetail,
    createParcel,
    updateParcel,
    deleteParcel,
    addObservation,
    deleteObservation,
    historyRecords,
    addHistoryRecord,
    alerts,
    unreadAlertsCount,
    alertsDrawerOpen,
    setAlertsDrawerOpen,
    markAlertRead,
    markAllAlertsRead,
    preferences,
    setPreferences,
    userProfile,
    setUserProfile,
    resetAllDemoData,
    backendStatus,
    dataSource,
    syncStatus,
    analysisStatus,
    backendAnalysis,
    analysisIsStale,
    analysisError,
    runBackendAnalysis,
  };
}
