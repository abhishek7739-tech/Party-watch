import 'dotenv/config';

export const PORT = Number(process.env.PORT || 3001);
export const CLIENT_ORIGINS = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || true;
export const MONGODB_URI = process.env.MONGODB_URI;
export const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) throw new Error('MONGODB_URI must be set in .env');
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in .env');