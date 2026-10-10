import { validateEnv } from './env.validation';

/** Lo mínimo para arrancar: sin estas dos variables no hay configuración válida. */
const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://vm:secret@localhost:5432/vm_dev',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('convierte PORT (string en process.env) a número', () => {
    expect(validateEnv({ ...REQUIRED_ENV, PORT: '3101' }).PORT).toBe(3101);
  });

  it('aplica valores por defecto', () => {
    expect(validateEnv(REQUIRED_ENV)).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGIN: ['http://localhost:3000'],
      ...REQUIRED_ENV,
      COOKIE_SECURE: true,
      TRUST_PROXY: false,
    });
  });

  it('separa y recorta los orígenes de CORS', () => {
    expect(
      validateEnv({ ...REQUIRED_ENV, CORS_ORIGIN: 'http://a.test, http://b.test ,' }).CORS_ORIGIN,
    ).toEqual(['http://a.test', 'http://b.test']);
  });

  it('rechaza un PORT inválido', () => {
    expect(() => validateEnv({ ...REQUIRED_ENV, PORT: 'abc' })).toThrow(/PORT/);
  });
});

describe('RF-auth-14 — el proceso no arranca con configuración insegura o incompleta', () => {
  it('rechaza la falta de JWT_SECRET', () => {
    expect(() => validateEnv({ DATABASE_URL: REQUIRED_ENV.DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('rechaza un JWT_SECRET de 31 bytes sin mostrar su valor', () => {
    const shortSecret = 'secreto-corto-de-31-bytes-xxxxx';
    expect(Buffer.byteLength(shortSecret)).toBe(31);

    const run = (): unknown => validateEnv({ ...REQUIRED_ENV, JWT_SECRET: shortSecret });

    expect(run).toThrow(/JWT_SECRET/);
    expect(run).not.toThrow(shortSecret);
  });

  it('rechaza la falta de DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: REQUIRED_ENV.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('rechaza una DATABASE_URL que no es de PostgreSQL sin mostrar su valor', () => {
    const mysqlUrl = 'mysql://root:clave-secreta@localhost/db';
    const run = (): unknown => validateEnv({ ...REQUIRED_ENV, DATABASE_URL: mysqlUrl });

    expect(run).toThrow(/DATABASE_URL/);
    expect(run).not.toThrow(/clave-secreta/);
  });

  it('rechaza COOKIE_SECURE=false con NODE_ENV=production', () => {
    expect(() =>
      validateEnv({ ...REQUIRED_ENV, NODE_ENV: 'production', COOKIE_SECURE: 'false' }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it('acepta COOKIE_SECURE=false fuera de producción', () => {
    expect(validateEnv({ ...REQUIRED_ENV, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });
});
