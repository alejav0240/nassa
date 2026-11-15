export type CropKey = 'papa' | 'quinua' | 'haba' | 'cebada';

export const cropWindFlexibility: Record<CropKey, number> = {
  papa: .82,
  quinua: 1,
  haba: .88,
  cebada: 1.08,
};

export function getWindMotion(time: number, wind: number, sway: boolean, reducedMotion: boolean, seed: number, flexibility: number) {
  const windPower = Math.max(0, Math.min(80, wind)) / 80 * (sway && !reducedMotion ? 1 : 0);
  const gust = .78 + .22 * (.5 + .5 * Math.sin(time * .65 + seed * .013));
  const response = windPower * flexibility * gust;
  const phase = .45 + seed * .021;
  if (response === 0) return { x: 0, z: 0 };
  return {
    x: Math.sin(time * (1.05 + response * 1.7) + phase * 2) * (.01 + response * .16),
    z: Math.sin(time * (1.2 + response * 2) + phase) * (.012 + response * .23),
  };
}
