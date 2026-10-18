// One rule for every place a staff password is set: at least 8 characters with an uppercase
// letter, a lowercase letter, a digit and a symbol. Mirrors /auth/setup and POST /api/employees.
export const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
