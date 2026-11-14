import { AnimatePresence, motion } from 'motion/react';
import { Smartphone, Monitor } from 'lucide-react';
import { AlertsDrawer } from './components/AlertsDrawer';
import { BottomNav, SideNavRail } from './components/BottomNav';
import { useAgroTerraState } from './hooks/useAgroTerraState';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MapScreen } from './screens/MapScreen';
import { ParcelDetailScreen } from './screens/ParcelDetailScreen';
import { ParcelsScreen } from './screens/ParcelsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DesignSystemScreen } from './screens/DesignSystemScreen';

export default function App() {
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
    syncStatus,
    analysisStatus,
    backendAnalysis,
    analysisError,
    runBackendAnalysis,
  } = useAgroTerraState();

  const isSimulated = preferences.simulateDeviceFrame;

  if (window.location.hash === '#design-system') {
    return <DesignSystemScreen />;
  }

  const renderScreen = () => {
    if (detailParcel) {
      return (
        <ParcelDetailScreen
          parcel={detailParcel}
          historyRecords={historyRecords}
          preferences={preferences}
          onBack={closeParcelDetail}
          onAddObservation={addObservation}
          onDeleteObservation={deleteObservation}
          onOpenAnalysis={() => {
            setSelectedParcelId(detailParcel.id);
            navigateTo('analisis', 'satelital');
          }}
        />
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
            syncStatus={syncStatus}
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
            analysisError={analysisError}
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
      <div className="min-h-screen bg-slate-200/80 flex flex-col items-center justify-center p-4 gap-3">
        <div className="hidden lg:flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-300 shadow-xs text-xs">
          <Smartphone className="w-3.5 h-3.5 text-[#166534]" />
          <span className="font-semibold text-slate-800">Vista Móvil (390 × 844 px)</span>
          <button
            type="button"
            onClick={() => setPreferences({ ...preferences, simulateDeviceFrame: false })}
            className="ml-2 text-[#16A34A] hover:underline font-semibold inline-flex items-center gap-1"
          >
            <Monitor className="w-3.5 h-3.5" /> Cambiar a adaptable
          </button>
        </div>

        <div className="w-[390px] max-w-full h-[844px] max-h-[88vh] bg-[#F8FAFC] rounded-[36px] border-[8px] border-slate-900 shadow-2xl overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={screenKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                {renderScreen()}
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      <SideNavRail activeTab={activeTab} onSelect={(tab) => navigateTo(tab)} />

      <main className="flex-1 min-w-0 pb-20 lg:pb-6 lg:p-5">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={screenKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              {renderScreen()}
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
