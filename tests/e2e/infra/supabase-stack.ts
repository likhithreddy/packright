import { GenericContainer, Network, Wait } from 'testcontainers';
import path from 'path';
import { generateSupabaseKeys } from './jwt-utils';

export interface SupabaseStack {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string;
  stop: () => Promise<void>;
}

export async function startSupabaseStack(): Promise<SupabaseStack> {
  const network = await new Network().start();
  const jwtSecret = 'super-secret-jwt-token-with-32-chars-length'; // Robust secret for local tests
  const { anonKey, serviceRoleKey } = generateSupabaseKeys(jwtSecret);

  console.log('[SupabaseStack] Starting PostgreSQL...');
  const schemaPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260311234500_full_schema_dump.sql'
  );

  const postgresContainer = await new GenericContainer('supabase/postgres:15.1.1.78')
    .withNetwork(network)
    .withNetworkAliases('db')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'postgres',
      POSTGRES_USER: 'postgres',
      POSTGRES_HOST_AUTH_METHOD: 'trust',
    })
    .withWaitStrategy(Wait.forListeningPorts().withStartupTimeout(120000))
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[Postgres] ${line}`)));

  const startedPostgres = await postgresContainer.start();

  console.log('[SupabaseStack] Applying schema dump...');
  // We exec manually to avoid conflicts with image's internal init scripts
  await startedPostgres.copyFilesToContainer([
    {
      source: schemaPath,
      target: '/tmp/schema.sql',
    },
  ]);
  const { exitCode, stderr } = await startedPostgres.exec([
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-f',
    '/tmp/schema.sql',
  ]);

  if (exitCode !== 0) {
    console.error(`[SupabaseStack] Schema application failed: ${stderr}`);
  }

  const dbUrl = `postgresql://postgres:postgres@localhost:${startedPostgres.getMappedPort(5432)}/postgres`;

  console.log('[SupabaseStack] Starting GoTrue (Auth)...');
  const gotrueContainer = await new GenericContainer('supabase/gotrue:v2.132.3')
    .withNetwork(network)
    .withNetworkAliases('auth')
    .withExposedPorts(8081)
    .withEnvironment({
      GOTRUE_DB_DRIVER: 'postgres',
      GOTRUE_DB_DATABASE_URL:
        'postgresql://postgres:postgres@db:5432/postgres?sslmode=disable&search_path=auth,public',
      GOTRUE_SITE_URL: 'http://localhost:3000',
      GOTRUE_JWT_SECRET: jwtSecret,
      GOTRUE_JWT_EXP: '3600',
      GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
      GOTRUE_MAILER_AUTOCONFIRM: 'true',
      GOTRUE_DB_MAX_POOL_SIZE: '20',
      GOTRUE_DB_NAMESPACE: 'auth',
      GOTRUE_LOG_LEVEL: 'debug',
      GOTRUE_API_HOST: '0.0.0.0',
      GOTRUE_API_PORT: '8081',
      GOTRUE_API_EXTERNAL_URL: 'http://localhost:8081',
      API_EXTERNAL_URL: 'http://localhost:8081',
    })
    .withWaitStrategy(Wait.forHttp('/health', 8081).withStartupTimeout(60000))
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[GoTrue] ${line}`)));

  const startedGotrue = await gotrueContainer.start();

  console.log('[SupabaseStack] Starting PostgREST...');
  const postgrestContainer = await new GenericContainer('postgrest/postgrest:v10.1.1')
    .withNetwork(network)
    .withNetworkAliases('rest')
    .withExposedPorts(3000)
    .withEnvironment({
      PGRST_DB_URI: 'postgresql://postgres:postgres@db:5432/postgres?sslmode=disable',
      PGRST_DB_SCHEMA: 'public,auth,extensions',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: jwtSecret,
      PGRST_SERVER_PORT: '3000',
      PGRST_DB_CONFIG: 'true',
      PGRST_DB_SCHEMAS: 'public,auth,extensions',
    })
    .withWaitStrategy(Wait.forListeningPorts().withStartupTimeout(60000))
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[PostgREST] ${line}`)));

  const startedPostgrest = await postgrestContainer.start();

  console.log('[SupabaseStack] Starting Nginx Proxy...');
  const nginxConfig = `
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        location /auth/v1/ {
            proxy_pass http://auth:8081/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        location /rest/v1/ {
            proxy_pass http://rest:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
`;

  const nginxContainer = await new GenericContainer('nginx:alpine')
    .withNetwork(network)
    .withNetworkAliases('proxy')
    .withExposedPorts(80)
    .withCopyContentToContainer([
      {
        content: nginxConfig,
        target: '/etc/nginx/nginx.conf',
      },
    ])
    .withWaitStrategy(Wait.forListeningPorts())
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[Nginx] ${line}`)));

  const startedNginx = await nginxContainer.start();

  const supabaseUrl = `http://localhost:${startedNginx.getMappedPort(80)}`;

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    dbUrl,
    stop: async () => {
      console.log('[SupabaseStack] Stopping all containers...');
      await startedNginx.stop();
      await startedPostgrest.stop();
      await startedGotrue.stop();
      await startedPostgres.stop();
      await network.stop();
    },
  };
}
