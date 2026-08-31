# FKRH Control Desk

FKRH Control Desk is a server-backed defensive operations workspace for authorized control checks, public vulnerability intelligence, evidence tracking, and Markdown reporting. It is intentionally limited to read-only public DNS and HTTP security-header checks, the public CISA Known Exploited Vulnerabilities catalog, operation/task records, and review templates.

## Boundaries

Every control check requires an explicit authorization confirmation in the request. DNS and HTTP checks accept public destinations only; private and reserved addresses are rejected, and HTTP checks do not accept credentials or custom ports. The application does not generate payloads, scan for exploits, bypass access controls or CDNs, handle credentials, perform breach searches, run system commands, or provide offensive automation.

## Requirements

Use Node.js 20 or later and npm 10 or later. The application stores records in `.data/dashboard.json`, which is created with restrictive permissions at first start. Do not place regulated, sensitive, or customer data in a development instance without adding authentication, authorization, encryption, retention, and audit controls appropriate to the deployment.

## Local development

```bash
npm install
npm run lint
npm run build
npm run dev
```

The development server listens on `http://127.0.0.1:3000` by default. Set `HOST` and `PORT` in the environment when a different binding is required. Keep the default loopback binding unless a trusted reverse proxy is in front of the application.

## Production

Build and start the server from the repository root:

```bash
npm ci
npm run lint
npm run build
NODE_ENV=production npm start
```

The production server serves the compiled `dist/` directory and uses the same API routes as development. Terminate the process through the host service manager rather than running a second copy against the same `.data` file.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Process health check |
| `GET` | `/api/dashboard` | Current metrics, operations, tasks, and intelligence records |
| `GET` | `/api/operations` | List operation records |
| `POST` | `/api/operations` | Create a validated operation record |
| `PATCH` | `/api/operations/:id` | Update a validated operation record |
| `GET` | `/api/tasks` | List task records |
| `POST` | `/api/tasks` | Create a validated task |
| `PATCH` | `/api/tasks/:id` | Change a task phase |
| `GET` | `/api/intelligence` | Read the server-cached CISA KEV records |
| `POST` | `/api/intelligence/refresh` | Fetch and validate the public CISA KEV feed |
| `POST` | `/api/checks/dns` | Authorized public DNS lookup; body includes `domain` and `authorized: true` |
| `POST` | `/api/checks/headers` | Authorized public HTTP header audit; body includes `url` and `authorized: true` |

## Verification

The repository uses `npm run lint` for TypeScript validation and `npm run build` for the production bundle. Add integration tests for the API and a browser smoke test before using the service for real engagement records.
