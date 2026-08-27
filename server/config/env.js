export const PORT = Number(process.env.PORT || 3001);
export const CLIENT_ORIGINS = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || true;
