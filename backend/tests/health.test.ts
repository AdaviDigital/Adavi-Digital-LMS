import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  it('returns 200 and a healthy status payload', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/healthy/i);
  });
});

describe('GET /api/v1/unknown-route', () => {
  it('returns 404 for unmatched routes', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
