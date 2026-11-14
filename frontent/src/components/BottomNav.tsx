import { BarChart3, Home, Layers, Map as MapIcon, User } from 'lucide-react';
import { NavTab } from '../types/agroterra';

interface BottomNavProps {
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
  isSimulatedFrame?: boolean;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'parcelas', label: 'Mis parcelas', icon: Layers },
  { id: 'analisis', label: 'Análisis', icon: BarChart3 },
  { id: 'perfil', label: 'Perfil', icon: User },
];

export function BottomNav({ activeTab, onSelect, isSimulatedFrame }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={`${
        isSimulatedFrame
          ? 'sticky bottom-0 left-0 right-0'
          : 'fixed bottom-0 left-0 right-0 lg:hidden'
      } z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 pb-[env(safe-area-inset-bottom)]`}
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl ${
                isActive ? 'text-[#166534]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-transparent'
                }`}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span
                className={`text-[10px] tracking-tight whitespace-nowrap truncate max-w-full ${
                  isActive ? 'font-semibold text-[#166534]' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNavRail({ activeTab, onSelect }: { activeTab: NavTab; onSelect: (tab: NavTab) => void }) {
  return (
    <aside
      aria-label="Navegación de escritorio"
      className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen sticky top-0 h-screen p-4 justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            AT
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 leading-tight whitespace-nowrap">
              AgroTerra AI
            </p>
            <p className="text-[11px] text-slate-500 whitespace-nowrap">
              Monitoreo Geoespacial
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  isActive
                    ? 'bg-[#DCFCE7] text-[#166534] font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-1">Prototipo demostrativo</p>
        <p>
          Series ambientales y capas temáticas simuladas para evaluación de flujo móvil en Bolivia.
        </p>
      </div>
    </aside>
  );
}
