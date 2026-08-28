import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { JWT_SECRET } from '../config/env.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { cleanText } from '../utils/text.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email });
const makeToken = (user) => jwt.sign({ id: user._id.toString(), name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
router.post('/register', async (req, res, next) => {
  try {
    const name = cleanText(req.body?.name, 28), email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with that email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Your account was not found.' });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});
export default router;
