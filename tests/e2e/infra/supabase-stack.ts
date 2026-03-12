import { GenericContainer, Network, Wait } from 'testcontainers';
import path from 'path';
import { generateSupabaseKeys } from './jwt-utils.js';

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
    .withNetworkAliases('postgres')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_PASSWORD: 'postgres',
    })
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2).withStartupTimeout(
        120000
      )
    )
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[Postgres] ${line}`)));

  // Wait for Postgres to be fully ready
  const startedPostgres = await postgresContainer.start();
  console.log('[SupabaseStack] Injecting utility functions...');

  // Custom functions that might be missing or need to be overridden in ephemeral stack
  const utilsSql = `
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.email() RETURNS text AS $$
      SELECT nullif(current_setting('request.jwt.claims', true)::json->>'email', '')::text;
    $$ LANGUAGE sql STABLE;
  `;
  await startedPostgres.exec(['psql', '-U', 'postgres', '-d', 'postgres', '-c', utilsSql]);

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
    throw new Error(`[SupabaseStack] Schema application failed: ${stderr}`);
  }

  const dbIp = startedPostgres.getIpAddress(network.getName());
  const dbUrl = `postgresql://postgres:postgres@localhost:${startedPostgres.getMappedPort(5432)}/postgres`;

  console.log('[SupabaseStack] Starting GoTrue (Auth)...');
  const gotrueContainer = await new GenericContainer('supabase/gotrue:v2.132.3')
    .withNetwork(network)
    .withNetworkAliases('auth')
    .withExposedPorts(8081)
    .withEnvironment({
      GOTRUE_DB_DRIVER: 'postgres',
      GOTRUE_DB_DATABASE_URL: `postgresql://postgres:postgres@${dbIp}:5432/postgres?sslmode=disable&search_path=auth,public`,
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
      GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
    })
    .withWaitStrategy(Wait.forHttp('/health', 8081).withStartupTimeout(120000))
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[GoTrue] ${line}`)));

  const startedGotrue = await gotrueContainer.start();

  console.log('[SupabaseStack] Starting PostgREST...');
  const postgrestContainer = await new GenericContainer('postgrest/postgrest:v12.2.0')
    .withNetwork(network)
    .withNetworkAliases('rest')
    .withExposedPorts(3000)
    .withEnvironment({
      PGRST_DB_URI: `postgresql://postgres:postgres@${dbIp}:5432/postgres?sslmode=disable`,
      PGRST_DB_SCHEMA: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: jwtSecret,
      PGRST_SERVER_PORT: '3000',
      PGRST_DB_CONFIG: 'true',
      PGRST_DB_SCHEMAS: 'public,auth',
    })
    .withWaitStrategy(Wait.forHttp('/', 3000).withStartupTimeout(120000))
    .withLogConsumer((stream) => stream.on('data', (line) => console.log(`[PostgREST] ${line}`)));

  const startedPostgrest = await postgrestContainer.start();
  const restIp = startedPostgrest.getIpAddress(network.getName());
  const authIp = startedGotrue.getIpAddress(network.getName());

  console.log('[SupabaseStack] Starting Nginx Proxy...');
  const nginxConfig = `
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        
        # Health check
        location /health {
            return 200 'ok';
        }

        location /auth/v1/ {
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey,x-client-info,Accept-Profile,Content-Profile,Prefer' always;
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }
            add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey,x-client-info,Accept-Profile,Content-Profile,Prefer' always;

            proxy_hide_header 'Access-Control-Allow-Origin';
            proxy_hide_header 'Access-Control-Allow-Methods';
            proxy_hide_header 'Access-Control-Allow-Headers';
            proxy_pass http://${authIp}:8081/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        location /rest/v1/ {
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey,x-client-info,Accept-Profile,Content-Profile,Prefer' always;
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }
            add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey,x-client-info,Accept-Profile,Content-Profile,Prefer' always;

            proxy_hide_header 'Access-Control-Allow-Origin';
            proxy_hide_header 'Access-Control-Allow-Methods';
            proxy_hide_header 'Access-Control-Allow-Headers';
            proxy_pass http://${restIp}:3000/;
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
    .withWaitStrategy(Wait.forHttp('/health', 80).withStartupTimeout(120000))
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
