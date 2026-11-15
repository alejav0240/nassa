import { BarChart3, Home, Layers, Map as MapIcon, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { NavTab } from '../types/agroshift';

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

const sectionLabel = (tab: NavTab) => NAV_ITEMS.find((item) => item.id === tab)?.label ?? 'Inicio';

export function BottomNav({ activeTab, onSelect, isSimulatedFrame }: BottomNavProps) {
  const reduceMotion = useReducedMotion();
  return (
    <nav
      aria-label="Navegación principal"
      className={`agro-bottom-nav ${
        isSimulatedFrame
          ? 'sticky bottom-0 left-0 right-0'
          : 'fixed bottom-0 left-0 right-0 lg:hidden'
      } z-40 px-1 pb-[env(safe-area-inset-bottom)]`}
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="agro-nav-link agro-nav-link--mobile"
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              {isActive && <motion.span layoutId={reduceMotion ? undefined : 'agro-nav-active-mobile'} className="agro-nav-indicator agro-nav-indicator--mobile" transition={{ type: 'spring', stiffness: 480, damping: 38 }} aria-hidden="true" />}
              <div
                className="agro-nav-icon"
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span className="agro-nav-label">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNavRail({ activeTab, onSelect }: { activeTab: NavTab; onSelect: (tab: NavTab) => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <aside
      aria-label="Navegación de escritorio"
      className="agro-side-nav hidden lg:flex flex-col w-60 shrink-0 min-h-screen sticky top-0 h-screen p-4 justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5 px-3 py-2 mb-7">
          <div className="agro-brand-mark w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-sm tracking-tight" aria-hidden="true">
            AS
          </div>
          <div>
            <p className="text-base font-bold text-[var(--agro-text)] leading-tight whitespace-nowrap">
              AgroShift AI
            </p>
            <p className="text-[11px] text-[var(--agro-muted)] whitespace-nowrap">
              Inteligencia agrícola
            </p>
          </div>
        </div>

        <p className="agro-nav-eyebrow px-3 mb-2">ESPACIO DE TRABAJO</p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="agro-nav-link agro-nav-link--desktop w-full"
                whileHover={reduceMotion ? undefined : { x: 3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
              >
                {isActive && <motion.span layoutId={reduceMotion ? undefined : 'agro-nav-active-desktop'} className="agro-nav-indicator agro-nav-indicator--desktop" transition={{ type: 'spring', stiffness: 480, damping: 38 }} aria-hidden="true" />}
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="whitespace-nowrap">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="agro-nav-context p-3.5 rounded-2xl text-xs leading-relaxed">
        <p className="agro-nav-eyebrow mb-1">UBICACIÓN ACTUAL</p>
        <p className="font-semibold text-[var(--agro-text)] mb-2">{sectionLabel(activeTab)}</p>
        <p>
          El análisis distingue datos disponibles, pendientes de integración y validación local. Los indicadores demostrativos se identifican junto a sus datos.
        </p>
      </div>
    </aside>
  );
}
