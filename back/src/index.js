import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

await db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);

const setCookie = (res, user) => {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 });
};

app.post('/api/register', async (req, res) => {
  const { username = '', email = '', password = '' } = req.body;
  const errors = {};
  if (username.trim().length < 3) errors.username = 'Минимум 3 символа';
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Некорректный email';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Минимум 8 символов, нужна буква и цифра';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const exists = await db.query('SELECT 1 FROM users WHERE email = $1 OR username = $2', [email, username]);
  if (exists.rowCount) return res.status(409).json({ errors: { form: 'Такой email или имя уже занято' } });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username.trim(), email, hash]
  );
  setCookie(res, rows[0]);
  res.status(201).json(rows[0]);
});

app.post('/api/login', async (req, res) => {
  const { email = '', password = '' } = req.body;
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ errors: { form: 'Неверный email или пароль' } });

  setCookie(res, user);
  res.json({ id: user.id, username: user.username, email: user.email });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie('token');
  res.sendStatus(204);
});

app.get('/api/me', async (req, res) => {
  try {
    const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw new Error('no user');
    res.json(rows[0]);
  } catch {
    res.status(401).json({ errors: { form: 'Не авторизован' } });
  }
});

app.listen(process.env.PORT, () => console.log(`API on :${process.env.PORT}`));
