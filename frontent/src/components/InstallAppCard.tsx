import { Check, Download, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [validInstallOrigin, setValidInstallOrigin] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const isAppleStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(standalone || isAppleStandalone === true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsAndroid(/Android/i.test(navigator.userAgent));
    const isLocalDevelopmentOrigin =
      window.location.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    setValidInstallOrigin(window.location.protocol === 'https:' || isLocalDevelopmentOrigin);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--agro-selected)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--agro-text)]">AgroTerra en tu dispositivo</h3>
          <p className="mt-1 text-xs text-[var(--agro-muted)] leading-relaxed">
            Instala la aplicación web para abrirla desde tu pantalla de inicio, en una ventana propia.
          </p>
        </div>
      </div>

      {installed ? (
        <p className="text-xs font-semibold text-[var(--agro-lime)] flex items-center gap-1.5">
          <Check className="w-4 h-4" /> AgroTerra ya está instalada en este dispositivo.
        </p>
      ) : installPrompt ? (
        <button
          type="button"
          onClick={install}
          className="w-full h-10 rounded-xl agro-primary text-white text-xs font-semibold flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Instalar aplicación
        </button>
      ) : !validInstallOrigin ? (
        <p className="text-[11px] text-[var(--agro-muted)] bg-[var(--agro-surface-soft)] p-2.5 rounded-xl leading-relaxed">
          Para instalarla en Android, abre AgroTerra desde una dirección HTTPS en Chrome. La vista como archivo local no permite instalarla.
        </p>
      ) : (
        <p className="text-[11px] text-[var(--agro-muted)] bg-[var(--agro-surface-soft)] p-2.5 rounded-xl leading-relaxed">
          {isIOS
            ? 'En Safari, toca Compartir y elige “Añadir a pantalla de inicio”.'
            : isAndroid
              ? 'En Chrome para Android, abre ⋮ y toca “Instalar aplicación” o “Añadir a pantalla de inicio”.'
              : 'Abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.'}
        </p>
      )}
    </section>
  );
}
