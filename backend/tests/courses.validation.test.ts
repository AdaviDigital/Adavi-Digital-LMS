import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('GET /api/v1/courses — query validation', () => {
  it('rejects an invalid level filter', async () => {
    const res = await request(app).get('/api/v1/courses').query({ level: 'EXPERT' });
    expect(res.status).toBe(422);
  });

  it('rejects a page limit above the max', async () => {
    const res = await request(app).get('/api/v1/courses').query({ limit: '999' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/courses — authorization', () => {
  it('rejects course creation with no auth token', async () => {
    const res = await request(app).post('/api/v1/courses').send({
      title: 'Test Course',
      description: 'A test course description that is long enough.',
      categoryId: '11111111-1111-1111-1111-111111111111',
    });
    expect(res.status).toBe(401);
  });
});
