import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Parcel } from '../types/agroterra';
import { Parcel3DView } from './Parcel3DView';
import { cropWindFlexibility, getWindMotion } from './terrainWind';

vi.mock('./TerrainScene', () => ({
  TerrainScene: () => <div data-testid="terrain-scene" aria-label="mock terrain" />,
}));

afterEach(cleanup);

const parcel = {
  id: 'parcel-1', name: 'Parcela piloto', location: 'Viacha', department: 'La Paz', areaHa: 1.8,
  crop: 'quinua', plantingDate: '2026-01-01', estimatedHarvestDate: '2026-06-01', registeredAt: '2026-01-01',
  monitoringStatus: 'active', centroid: { lat: -16.65, lng: -68.3 }, polygon: [], elevationM: 3800,
  indicators: { moisturePct: 40, moistureVolumetric: 0.2, temperatureC: 12, precipitationMm: 1, ndvi: .4, soilOrganicCarbon: '2%', soilTexture: 'franco', soilPh: 6.5, biomassMgHa: 1 }, observations: [],
} as unknown as Parcel;

describe('Parcel3DView', () => {
  it('uses the parcel crop as the initial simulation crop', async () => {
    render(<Parcel3DView parcel={parcel} />);
    expect(screen.getAllByText('Quinua', { selector: 'strong' })[0]).toBeInTheDocument();
    expect(await screen.findByTestId('terrain-scene')).toBeInTheDocument();
  });

  it('updates the crop and environmental controls', async () => {
    render(<Parcel3DView parcel={parcel} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Haba/i })[0]);
    expect(screen.getAllByText('Haba', { selector: 'strong' })[0]).toBeInTheDocument();
    const growth = screen.getAllByRole('slider', { name: /Etapa de crecimiento/i })[0];
    fireEvent.change(growth, { target: { value: '80' } });
    expect(screen.getByText('80%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar lluvia' }));
    expect(screen.getByRole('switch', { name: 'Mostrar lluvia' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('TerrainScene wind motion', () => {
  it('keeps wind motion disabled when sway or reduced motion is active', () => {
    expect(getWindMotion(2, 80, false, false, 7, cropWindFlexibility.papa)).toEqual({ x: 0, z: 0 });
    expect(getWindMotion(2, 80, true, true, 7, cropWindFlexibility.papa)).toEqual({ x: 0, z: 0 });
  });

  it('varies plant response by flexibility and gust phase', () => {
    const rigid = getWindMotion(2, 80, true, false, 7, .5);
    const flexible = getWindMotion(2, 80, true, false, 7, 1.2);
    const later = getWindMotion(3, 80, true, false, 7, 1.2);
    expect(Math.abs(flexible.z)).toBeGreaterThan(Math.abs(rigid.z));
    expect(later).not.toEqual(flexible);
  });
});
