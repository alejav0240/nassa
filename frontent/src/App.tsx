import { lazy, Suspense, useState } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { AnimatePresence, motion } from 'motion/react';
import { Smartphone, Monitor } from 'lucide-react';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { BottomNav, SideNavRail } from './components/BottomNav';
import { ParcelFormModal } from './components/ParcelFormModal';
import { useAgroTerraState } from './hooks/useAgroTerraState';
const AnalysisScreen = lazy(() => import('./screens/AnalysisScreen').then(m => ({ default: m.AnalysisScreen })));
import { HomeScreen } from './screens/HomeScreen';
const MapScreen = lazy(() => import('./screens/MapScreen').then(m => ({ default: m.MapScreen })));
const ParcelDetailScreen = lazy(() => import('./screens/ParcelDetailScreen').then(m => ({ default: m.ParcelDetailScreen })));
const ParcelsScreen = lazy(() => import('./screens/ParcelsScreen').then(m => ({ default: m.ParcelsScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const DesignSystemScreen = lazy(() => import('./screens/DesignSystemScreen').then(m => ({ default: m.DesignSystemScreen })));
import { Parcel } from './types/agroterra';

export default function App() {
  const [editingDetailParcel, setEditingDetailParcel] = useState<Parcel | null>(null);
  const [deletingDetailParcel, setDeletingDetailParcel] = useState<Parcel | null>(null);
  const {
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
    backendStatus,
    dataSource,
    syncStatus,
    analysisStatus,
    backendAnalysis,
    analysisIsStale,
    analysisError,
    runBackendAnalysis,
  } = useAgroTerraState();

  const isSimulated = preferences.simulateDeviceFrame;

  if (window.location.hash === '#design-system') {
    return <Suspense fallback={<p role="status">Cargando…</p>}><DesignSystemScreen /></Suspense>;
  }

  const renderScreen = () => {
    if (detailParcel) {
      return (
        <>
          <ParcelDetailScreen
            parcel={detailParcel}
            historyRecords={historyRecords}
            preferences={preferences}
            onBack={closeParcelDetail}
            onAddObservation={addObservation}
            onDeleteObservation={deleteObservation}
            onEdit={() => setEditingDetailParcel(detailParcel)}
            onDelete={() => setDeletingDetailParcel(detailParcel)}
            onOpenAnalysis={() => {
              setSelectedParcelId(detailParcel.id);
              navigateTo('analisis', 'satelital');
            }}
            onOpenHistory={() => {
              setSelectedParcelId(detailParcel.id);
              navigateTo('analisis', 'historial');
            }}
          />
          <ParcelFormModal
            open={Boolean(editingDetailParcel)}
            initialParcel={editingDetailParcel}
            onClose={() => setEditingDetailParcel(null)}
            onSave={(saved) => {
              updateParcel(saved);
              setEditingDetailParcel(null);
            }}
          />
          <ConfirmDialog
            open={Boolean(deletingDetailParcel)}
            title="Eliminar parcela"
            message={
              deletingDetailParcel
                ? `¿Deseas eliminar "${deletingDetailParcel.name}"? Esta acción solo afecta el almacenamiento local del prototipo.`
                : ''
            }
            onCancel={() => setDeletingDetailParcel(null)}
            onConfirm={() => {
              if (deletingDetailParcel) deleteParcel(deletingDetailParcel.id);
              setDeletingDetailParcel(null);
            }}
          />
        </>
      );
    }

    switch (activeTab) {
      case 'inicio':
        return (
          <HomeScreen
            parcels={parcels}
            selectedParcel={selectedParcel}
            unreadAlertsCount={unreadAlertsCount}
            preferences={preferences}
            backendStatus={backendStatus}
            dataSource={dataSource}
            syncStatus={syncStatus}
            analysisStatus={analysisStatus}
            backendAnalysis={backendAnalysis}
            analysisIsStale={analysisIsStale}
            analysisError={analysisError}
            onRunAnalysis={runBackendAnalysis}
            onSelectParcel={setSelectedParcelId}
            onOpenParcelDetail={openParcelDetail}
            onNavigate={navigateTo}
            onOpenAlerts={() => setAlertsDrawerOpen(true)}
          />
        );
      case 'mapa':
        return (
          <MapScreen
            parcels={parcels}
            selectedParcel={selectedParcel}
            preferences={preferences}
            isSimulatedFrame={isSimulated}
            syncStatus={syncStatus}
            onSelectParcel={setSelectedParcelId}
            onCreateParcel={createParcel}
            onUpdateParcel={updateParcel}
            onOpenParcelDetail={openParcelDetail}
            onAnalyzeParcel={(id) => {
              setSelectedParcelId(id);
              void runBackendAnalysis(id);
              navigateTo('analisis', 'satelital');
            }}
            onOpenParcelHistory={(id) => {
              setSelectedParcelId(id);
              navigateTo('analisis', 'historial');
            }}
          />
        );
      case 'parcelas':
        return (
          <ParcelsScreen
            parcels={parcels}
            selectedParcelId={selectedParcelId}
            onSelectParcel={setSelectedParcelId}
            onOpenParcelDetail={openParcelDetail}
            onCreateParcel={createParcel}
            onUpdateParcel={updateParcel}
            onDeleteParcel={deleteParcel}
            onNavigate={navigateTo}
          />
        );
      case 'analisis':
        return (
          <AnalysisScreen
            subTab={analysisSubTab}
            onChangeSubTab={setAnalysisSubTab}
            parcels={parcels}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcelId}
            historyRecords={historyRecords}
            onAddHistory={addHistoryRecord}
            preferences={preferences}
            analysisStatus={analysisStatus}
            backendAnalysis={backendAnalysis}
            analysisIsStale={analysisIsStale}
            analysisError={analysisError}
            onRunAnalysis={runBackendAnalysis}
          />
        );
      case 'perfil':
        return (
          <ProfileScreen
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            preferences={preferences}
            onUpdatePreferences={setPreferences}
            parcels={parcels}
            onResetDemo={resetAllDemoData}
            onOpenParcelDetail={openParcelDetail}
          />
        );
    }
  };

  const screenKey = detailParcel ? `detail-${detailParcel.id}` : `${activeTab}-${analysisSubTab}`;

  if (isSimulated) {
    return (
      <div className="agro-theme min-h-screen bg-[var(--agro-canvas)] flex flex-col items-center justify-center p-4 gap-3">
        <div className="hidden lg:flex items-center gap-2 bg-[var(--agro-surface)] px-3.5 py-1.5 rounded-full border border-[var(--agro-line)] shadow-xs text-xs">
          <Smartphone className="w-3.5 h-3.5 text-[var(--agro-lime)]" />
          <span className="font-semibold text-[var(--agro-text)]">Vista Móvil (390 × 844 px)</span>
          <button
            type="button"
            onClick={() => setPreferences({ ...preferences, simulateDeviceFrame: false })}
            className="ml-2 text-[var(--agro-lime)] hover:underline font-semibold inline-flex items-center gap-1"
          >
            <Monitor className="w-3.5 h-3.5" /> Cambiar a adaptable
          </button>
        </div>

        <div className="w-[390px] max-w-full h-[844px] max-h-[88vh] bg-[var(--agro-canvas)] rounded-[36px] border-[8px] border-slate-900 shadow-2xl overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <ThemeToggle />
            <AnimatePresence mode="wait">
              <motion.div
                key={screenKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <Suspense fallback={<p role="status" className="p-6">Cargando…</p>}>{renderScreen()}</Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
          <BottomNav
            activeTab={activeTab}
            onSelect={(tab) => navigateTo(tab)}
            isSimulatedFrame
          />
        </div>

        <AlertsDrawer
          open={alertsDrawerOpen}
          alerts={alerts}
          preferences={preferences}
          onClose={() => setAlertsDrawerOpen(false)}
          onMarkRead={markAlertRead}
          onMarkAllRead={markAllAlertsRead}
          onSelectParcel={(parcelId) => openParcelDetail(parcelId)}
        />
      </div>
    );
  }

  return (
    <div className="agro-theme min-h-screen bg-[var(--agro-canvas)] text-[var(--agro-text)] flex">
      <SideNavRail activeTab={activeTab} onSelect={(tab) => navigateTo(tab)} />

      <main className="flex-1 min-w-0 pb-20 lg:pb-6 lg:p-5">
        <div className="max-w-5xl mx-auto">
          <ThemeToggle />
            <AnimatePresence mode="wait">
            <motion.div
              key={screenKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <Suspense fallback={<p role="status" className="p-6">Cargando…</p>}>{renderScreen()}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onSelect={(tab) => navigateTo(tab)} />

      <AlertsDrawer
        open={alertsDrawerOpen}
        alerts={alerts}
        preferences={preferences}
        onClose={() => setAlertsDrawerOpen(false)}
        onMarkRead={markAlertRead}
        onMarkAllRead={markAllAlertsRead}
        onSelectParcel={(parcelId) => openParcelDetail(parcelId)}
      />
    </div>
  );
}
