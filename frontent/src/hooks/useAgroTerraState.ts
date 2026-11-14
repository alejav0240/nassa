import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PREFERENCES, DEFAULT_USER_PROFILE } from '../data/mockData';
import { alertService } from '../services/alertService';
import { historyService } from '../services/historyService';
import { parcelService } from '../services/parcelService';
import {
  AnalysisSubTab,
  AppAlert,
  CropHistoryRecord,
  FieldObservation,
  NavTab,
  Parcel,
  UserPreferences,
  UserProfile,
} from '../types/agroterra';

const PREFS_KEY = 'agroterra_prefs_v1';
const PROFILE_KEY = 'agroterra_profile_v1';

export function useAgroTerraState() {
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [analysisSubTab, setAnalysisSubTab] = useState<AnalysisSubTab>('satelital');
  const [parcels, setParcels] = useState<Parcel[]>(() => parcelService.getAll());
  const [selectedParcelId, setSelectedParcelId] = useState<string>(() => {
    const initial = parcelService.getAll();
    return initial[0]?.id ?? 'parcela-norte';
  });
  const [detailParcelId, setDetailParcelId] = useState<string | null>(null);
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

  const selectedParcel = useMemo(() => {
    return parcels.find((p) => p.id === selectedParcelId) ?? parcels[0] ?? null;
  }, [parcels, selectedParcelId]);

  const detailParcel = useMemo(() => {
    if (!detailParcelId) return null;
    return parcels.find((p) => p.id === detailParcelId) ?? null;
  }, [parcels, detailParcelId]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(
      (a) => !a.read && (preferences.notifications[a.category] ?? true)
    ).length;
  }, [alerts, preferences.notifications]);

  const navigateTo = useCallback((tab: NavTab, subTab?: AnalysisSubTab) => {
    setDetailParcelId(null);
    setActiveTab(tab);
    if (subTab) {
      setAnalysisSubTab(subTab);
    }
  }, []);

  const openParcelDetail = useCallback((parcelId: string) => {
    setSelectedParcelId(parcelId);
    setDetailParcelId(parcelId);
  }, []);

  const closeParcelDetail = useCallback(() => {
    setDetailParcelId(null);
  }, []);

  const createParcel = useCallback((parcel: Parcel) => {
    const updated = parcelService.create(parcel);
    setParcels(updated);
    setSelectedParcelId(parcel.id);
  }, []);

  const updateParcel = useCallback((parcel: Parcel) => {
    const updated = parcelService.update(parcel);
    setParcels(updated);
  }, []);

  const deleteParcel = useCallback(
    (parcelId: string) => {
      const updated = parcelService.remove(parcelId);
      setParcels(updated);
      if (selectedParcelId === parcelId) {
        setSelectedParcelId(updated[0]?.id ?? '');
      }
      if (detailParcelId === parcelId) {
        setDetailParcelId(null);
      }
    },
    [selectedParcelId, detailParcelId]
  );

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
    setHistoryRecords(historyService.resetDemo());
    setAlerts(alertService.resetDemo());
    setPreferences(DEFAULT_PREFERENCES);
    setUserProfile(DEFAULT_USER_PROFILE);
  }, []);

  return {
    activeTab,
    analysisSubTab,
    setAnalysisSubTab,
    navigateTo,
    parcels,
    selectedParcel,
    selectedParcelId,
    setSelectedParcelId,
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
  };
}
