const ROLES = Object.freeze({ HOST: 'host', MODERATOR: 'moderator', PARTICIPANT: 'participant', VIEWER: 'viewer' });
const ROLE_VALUES = new Set(Object.values(ROLES));
const canControlPlayback = (role) => role === ROLES.HOST || role === ROLES.MODERATOR;

export { ROLES, ROLE_VALUES, canControlPlayback };
