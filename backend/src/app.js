import express from 'express';
import cors from 'cors';
import { createToken, hashPassword, requireAdmin, requireAuth, verifyPassword } from './auth.js';
import { createDatabase } from './db.js';

export function createApp(db = createDatabase()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
  const vehicleFields = ['make', 'model', 'category', 'price', 'quantity'];

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email, and a password of at least 6 characters are required' });
    try {
      const role = email.toLowerCase() === 'admin@autohub.test' ? 'admin' : 'user';
      const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name.trim(), email.toLowerCase(), hashPassword(password), role);
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json({ user: publicUser(user), token: createToken(user) });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email is already registered' });
      return res.status(500).json({ error: 'Could not create account' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase());
    if (!user || !verifyPassword(password || '', user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ user: publicUser(user), token: createToken(user) });
  });

  const listVehicles = (query = {}) => {
    const conditions = ['quantity > 0'];
    const params = {};
    if (query.make) { conditions.push('LOWER(make) LIKE LOWER(@make)'); params.make = `%${query.make}%`; }
    if (query.model) { conditions.push('LOWER(model) LIKE LOWER(@model)'); params.model = `%${query.model}%`; }
    if (query.category) { conditions.push('LOWER(category) = LOWER(@category)'); params.category = query.category; }
    if (query.minPrice) { conditions.push('price >= @minPrice'); params.minPrice = Number(query.minPrice); }
    if (query.maxPrice) { conditions.push('price <= @maxPrice'); params.maxPrice = Number(query.maxPrice); }
    return db.prepare(`SELECT * FROM vehicles WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`).all(params);
  };

  app.get('/api/vehicles', requireAuth, (req, res) => res.json({ vehicles: listVehicles(req.query) }));
  app.get('/api/vehicles/search', requireAuth, (req, res) => res.json({ vehicles: listVehicles(req.query) }));

  app.post('/api/vehicles', requireAuth, requireAdmin, (req, res) => {
    const { make, model, category, price, quantity } = req.body;
    if (!make || !model || !category || Number(price) < 0 || Number(quantity) < 0 || price === undefined || quantity === undefined) return res.status(400).json({ error: 'Make, model, category, price, and quantity are required' });
    const result = db.prepare('INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)').run(make.trim(), model.trim(), category.trim(), Number(price), Number(quantity));
    return res.status(201).json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid) });
  });

  app.put('/api/vehicles/:id', requireAuth, requireAdmin, (req, res) => {
    const current = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Vehicle not found' });
    const values = vehicleFields.map((field) => req.body[field] ?? current[field]);
    if (values[3] < 0 || values[4] < 0) return res.status(400).json({ error: 'Price and quantity cannot be negative' });
    db.prepare('UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, quantity = ? WHERE id = ?').run(...values, req.params.id);
    return res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) });
  });

  app.delete('/api/vehicles/:id', requireAuth, requireAdmin, (req, res) => {
    const result = db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Vehicle not found' });
    return res.status(204).send();
  });

  app.post('/api/vehicles/:id/purchase', requireAuth, (req, res) => {
    const result = db.prepare('UPDATE vehicles SET quantity = quantity - 1 WHERE id = ? AND quantity > 0').run(req.params.id);
    if (!result.changes) return res.status(409).json({ error: 'Vehicle is out of stock or does not exist' });
    return res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) });
  });

  app.post('/api/vehicles/:id/restock', requireAuth, requireAdmin, (req, res) => {
    const amount = Number(req.body.quantity);
    if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'Restock quantity must be a positive integer' });
    const result = db.prepare('UPDATE vehicles SET quantity = quantity + ? WHERE id = ?').run(amount, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Vehicle not found' });
    return res.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id) });
  });

  return app;
}
