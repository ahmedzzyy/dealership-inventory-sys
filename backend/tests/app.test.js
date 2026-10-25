import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';

let app;
let adminToken;
let userToken;

beforeEach(async () => {
  const db = createDatabase(':memory:');
  app = createApp(db);
  const admin = await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin@autohub.test', password: 'secret123' });
  const user = await request(app).post('/api/auth/register').send({ name: 'Driver', email: 'driver@test.com', password: 'secret123' });
  adminToken = admin.body.token;
  userToken = user.body.token;
});

describe('authentication', () => {
  it('registers users and rejects duplicate email', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Another', email: 'driver@test.com', password: 'secret123' });
    expect(response.status).toBe(409);
  });
  it('logs in with valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'driver@test.com', password: 'secret123' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf('string');
  });
});

describe('inventory', () => {
  it('allows an admin to create, search, purchase, and restock a vehicle', async () => {
    const created = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${adminToken}`).send({ make: 'Toyota', model: 'RAV4', category: 'SUV', price: 32000, quantity: 2 });
    expect(created.status).toBe(201);
    const id = created.body.vehicle.id;
    const search = await request(app).get('/api/vehicles/search?make=toyota').set('Authorization', `Bearer ${userToken}`);
    expect(search.body.vehicles).toHaveLength(1);
    const purchased = await request(app).post(`/api/vehicles/${id}/purchase`).set('Authorization', `Bearer ${userToken}`);
    expect(purchased.body.vehicle.quantity).toBe(1);
    const restocked = await request(app).post(`/api/vehicles/${id}/restock`).set('Authorization', `Bearer ${adminToken}`).send({ quantity: 3 });
    expect(restocked.body.vehicle.quantity).toBe(4);
  });
  it('prevents regular users from managing inventory', async () => {
    const response = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${userToken}`).send({ make: 'Ford', model: 'Bronco', category: 'SUV', price: 40000, quantity: 1 });
    expect(response.status).toBe(403);
  });
  it('rejects purchasing an empty vehicle', async () => {
    const created = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${adminToken}`).send({ make: 'Tesla', model: 'Model 3', category: 'Electric', price: 42000, quantity: 0 });
    const response = await request(app).post(`/api/vehicles/${created.body.vehicle.id}/purchase`).set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(409);
  });
});
