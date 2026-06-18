import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../src/services/api.js';

describe('ApiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the correct URL for animation init', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })
    );
    global.fetch = fetchMock;

    await api.animation.init({ width: 100, height: 200 });
    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/animation/init');
  });

  it('throws an error on non-ok response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    );
    global.fetch = fetchMock;

    await expect(api.animation.init({})).rejects.toThrow('API Error');
  });
});
