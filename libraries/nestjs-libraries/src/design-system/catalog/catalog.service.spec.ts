import { DesignSystemCatalogService } from './catalog.service';

describe('DesignSystemCatalogService', () => {
  it('loads palettes, fonts, directions, templates and sizes from disk', () => {
    const catalog = new DesignSystemCatalogService();
    catalog.reload();
    const summary = catalog.getSummary();
    expect(summary.counts.palettes).toBeGreaterThan(5);
    expect(summary.counts.fonts).toBeGreaterThan(5);
    expect(summary.counts.directions).toBeGreaterThan(5);
    expect(summary.counts.templates).toBeGreaterThan(10);
    expect(summary.counts.sizes).toBeGreaterThan(3);
    expect(catalog.requireSize('ig-portrait').width).toBe(1080);
    expect(catalog.requirePalette('ocean-deep').bg).toBeTruthy();
  });
});
