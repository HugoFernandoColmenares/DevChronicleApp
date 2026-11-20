import {
  isOfflineSnapshot,
  OFFLINE_SNAPSHOT_URL,
  OfflineSnapshotService,
} from './offline-snapshot.service';

const valid = {
  version: 1,
  generatedAt: '2026-11-20T17:00:00.000Z',
  entries: [
    {
      slug: 'nota',
      title: 'Nota',
      author: 'Hugo Colmenares',
      summary: 'Resumen',
      tags: ['angular'],
      category: 'diario',
      series: 'diario',
      publishedAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z',
      status: 'published',
      readingTimeMinutes: 1,
      markdown: '# Nota',
    },
  ],
};

describe('OfflineSnapshotService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('validates the snapshot shape', () => {
    expect(isOfflineSnapshot(valid)).toBe(true);
    expect(isOfflineSnapshot(null)).toBe(false);
    expect(isOfflineSnapshot({ ...valid, generatedAt: 'ayer' })).toBe(false);
    expect(
      isOfflineSnapshot({ ...valid, entries: [{ ...valid.entries[0], status: 'draft' }] }),
    ).toBe(false);
  });

  it('downloads the copy once and splits metadata from markdown', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify(valid), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new OfflineSnapshotService();

    const list = await service.list();
    const single = await service.entry('nota');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(OFFLINE_SNAPSHOT_URL, expect.anything());
    expect(list?.entries[0]).not.toHaveProperty('markdown');
    expect(single?.body.markdown).toBe('# Nota');
    expect(await service.entry('otra')).toBeNull();
  });

  it('returns null and retries later when the copy is missing', async () => {
    const fetchMock = vi.fn(async () => new Response('no', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new OfflineSnapshotService();

    expect(await service.list()).toBeNull();
    expect(await service.list()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
