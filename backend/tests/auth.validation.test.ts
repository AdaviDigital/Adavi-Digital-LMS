import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('POST /api/v1/auth/register — validation', () => {
  it('rejects a missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'password123', firstName: 'Ada', lastName: 'Lovelace' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'short',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(res.status).toBe(422);
    expect(res.body.errors?.[0]?.path).toContain('password');
  });

  it('rejects an invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login — validation', () => {
  it('rejects an empty request body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/auth/me — authentication', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a request with an invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
