# Regenerates docs/creator-kit/CREATOR_TEMPLATES.md from the working code (name and ports become placeholders).
# Run from the repo root after changing any templated file:  python3 tools/scripts/generate_creator_templates.py .
import os, re, subprocess, sys
ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'docs/creator-kit/CREATOR_TEMPLATES.md')

def tok(s):
    for a, b in [('EMAILMANAGER', '{{SLUG_UPPER}}'), ('EmailManager', '{{Name}}'), ('emailManager', '{{nameCamel}}'),
                 ('emailmanager', '{{slug}}'), ('5180', '{{WEB_PORT}}'), ('3601', '{{API_PORT}}'),
                 ('5450', '{{DB_PORT}}'), ('5451', '{{DB_TEST_PORT}}'), ('4699', '{{FIXTURE_PORT}}')]:
        s = s.replace(a, b)
    return s

LANG = {'.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.sh': 'bash',
        '.css': 'css', '.html': 'html', '.md': 'markdown', '.command': 'bash'}

def lang(path):
    base = os.path.basename(path)
    if base in ('.nvmrc', '.prettierignore', '.gitignore', '.env.example'): return 'text'
    if base == '.prettierrc': return 'json'
    return LANG.get(os.path.splitext(path)[1], 'text')

SECTIONS = [
 ('T1', 'Root configuration', 'Monorepo setup: pnpm workspaces + Turborepo, Node version, formatting, ignore rules, settings template, start/stop and CI. Create these first (playbook P4.1, P4.8).',
  ['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'tsconfig.base.json', '.nvmrc', '.prettierrc', '.prettierignore', '.gitignore', '.env.example',
   'start.sh', 'stop.sh', 'Start EmailManager.command', 'Stop EmailManager.command', '.github/workflows/ci.yml']),
 ('T2', 'Tool scripts', 'Postgres-in-Docker helpers (one container each for dev and test, a database and user per backend), migration generators and the credentials helper (P4.8, P5.3). Make every script executable with `chmod +x`.',
  ['tools/scripts/db_utils.sh', 'tools/scripts/ensure_postgres_up.sh', 'tools/scripts/ensure_postgres_db.sh', 'tools/scripts/ensure_postgres_user.sh',
   'tools/scripts/drop_db.sh', 'tools/scripts/drop_user.sh', 'tools/scripts/generate_db_migration.sh', 'tools/scripts/generate_custom_db_migration.sh',
   'tools/scripts/set_google_credentials.sh']),
 ('T3', 'Shared configuration packages', 'TypeScript presets and ESLint configs (Node, plus a browser/React variant) used by every package (P4.2).',
  ['packages/tsconfig/package.json', 'packages/tsconfig/base.json', 'packages/tsconfig/library.json', 'packages/tsconfig/library.build.json',
   'packages/tsconfig/node-app.json', 'packages/tsconfig/node-app.build.json', 'packages/tsconfig/web-app.json',
   'packages/eslint-config/package.json', 'packages/eslint-config/index.js', 'packages/eslint-config/react.js']),
 ('T4', 'Shared code packages', 'Errors with HTTP status codes, logging with correlation IDs, Fastify app builder with cookie sessions, database helpers and the typed API-client helpers (P4.2). Every package exports its TypeScript source under the `"development"` condition, so no build is needed in development. Each package also has an `eslint.config.js` (one line: export the shared config) and `tsconfig.json` / `tsconfig.build.json` like the errors package.',
  ['packages/errors/package.json', 'packages/errors/tsconfig.json', 'packages/errors/tsconfig.build.json', 'packages/errors/eslint.config.js',
   'packages/errors/src/index.ts', 'packages/errors/src/lib/BaseError.ts', 'packages/errors/src/lib/ServerError.ts', 'packages/errors/src/lib/serverErrors.ts',
   'packages/errors/src/lib/required.ts', 'packages/errors/src/lib/universalErrors.ts', 'packages/errors/src/lib/ServerError.spec.ts',
   'packages/logging/package.json', 'packages/logging/src/index.ts', 'packages/logging/src/lib/ContextPropagator.ts',
   'packages/logging/src/lib/CorrelationIdPropagator.ts', 'packages/logging/src/lib/Logger.ts',
   'packages/fastify-utils/package.json', 'packages/fastify-utils/vitest.config.ts', 'packages/fastify-utils/src/index.ts',
   'packages/fastify-utils/src/test/setup.ts', 'packages/fastify-utils/src/lib/FastifyAppBuilder.ts', 'packages/fastify-utils/src/lib/auth.ts',
   'packages/fastify-utils/src/lib/correlationIdPlugin.ts', 'packages/fastify-utils/src/lib/errorHandler.ts',
   'packages/fastify-utils/src/lib/httpLoggingPlugin.ts', 'packages/fastify-utils/src/lib/requestValidationErrorHandler.ts',
   'packages/fastify-utils/src/lib/FastifyAppBuilder.spec.ts',
   'packages/drizzle-utils/package.json', 'packages/drizzle-utils/src/index.ts', 'packages/drizzle-utils/src/lib/dbClient.ts',
   'packages/drizzle-utils/src/lib/standardFields.ts',
   'packages/api-client-utils/package.json', 'packages/api-client-utils/src/index.ts', 'packages/api-client-utils/src/lib/ApiClientBuilder.ts',
   'packages/api-client-utils/src/lib/AxiosInstanceBuilder.ts', 'packages/api-client-utils/src/lib/ContractBuilder.ts',
   'packages/api-client-utils/src/lib/ServerErrorSchema.ts', 'packages/api-client-utils/src/lib/responseExtraction.ts']),
 ('T5', 'API contract and client', 'The typed contract shared by server and web app, and the client the web app uses (P4.3). The `inbox` part is EmailManager-specific: replace it with your own resources, keeping the same shape.',
  ['packages/emailmanager-core-contract/package.json', 'packages/emailmanager-core-contract/src/index.ts',
   'packages/emailmanager-core-contract/src/lib/contract/root.ts', 'packages/emailmanager-core-contract/src/lib/contract/session.ts',
   'packages/emailmanager-core-contract/src/lib/contract/auth.ts', 'packages/emailmanager-core-contract/src/lib/contract/inbox.ts',
   'packages/emailmanager-core-client/package.json', 'packages/emailmanager-core-client/src/index.ts',
   'packages/emailmanager-core-client/src/lib/EmailManagerCoreClient.ts']),
 ('T6', 'Provider seam (worked example: email)', 'The pattern for any outside data source (P4.4): an interface, a real read-only provider that talks to the service over HTTP, a deterministic fake for tests, and tests (including the real provider against a local stub server). Rename to your own `<Thing>Provider`.',
  ['packages/email-provider/package.json', 'packages/email-provider/vitest.config.ts', 'packages/email-provider/src/index.ts',
   'packages/email-provider/src/lib/EmailProvider.ts', 'packages/email-provider/src/lib/FakeEmailProvider.ts',
   'packages/email-provider/src/lib/GmailProvider.ts', 'packages/email-provider/src/lib/parseEmailAddress.ts',
   'packages/email-provider/src/lib/FakeEmailProvider.spec.ts', 'packages/email-provider/src/lib/GmailProvider.spec.ts']),
 ('T7', 'Backend', 'The API server (P4.5): configuration with start-up safety checks, database schema and migrations, encrypted tokens, cookie sessions, Google sign-in, the test-only sign-in route, dependency-injected app factory and tests. The inbox and Google-account parts are EmailManager-specific examples.',
  ['backends/emailmanager-core/package.json', 'backends/emailmanager-core/tsconfig.json', 'backends/emailmanager-core/tsconfig.build.json',
   'backends/emailmanager-core/eslint.config.js', 'backends/emailmanager-core/vitest.config.ts', 'backends/emailmanager-core/drizzle.config.ts',
   'backends/emailmanager-core/src/test/setup.ts', 'backends/emailmanager-core/src/config.ts', 'backends/emailmanager-core/src/config.spec.ts',
   'backends/emailmanager-core/src/db/schema.ts', 'backends/emailmanager-core/src/db/client.ts', 'backends/emailmanager-core/src/db/migrate.ts',
   'backends/emailmanager-core/src/crypto/TokenCipher.ts', 'backends/emailmanager-core/src/crypto/TokenCipher.spec.ts',
   'backends/emailmanager-core/src/domain/user/UserRepository.ts', 'backends/emailmanager-core/src/domain/googleAccount/GoogleAccountRepository.ts',
   'backends/emailmanager-core/src/domain/session/SessionRepository.ts', 'backends/emailmanager-core/src/domain/session/SessionService.ts',
   'backends/emailmanager-core/src/domain/session/SessionService.spec.ts', 'backends/emailmanager-core/src/domain/session/registerSessionRoutes.ts',
   'backends/emailmanager-core/src/domain/auth/registerGoogleAuthRoutes.ts', 'backends/emailmanager-core/src/domain/auth/registerTestAuthRoutes.ts',
   'backends/emailmanager-core/src/domain/auth/registerDemoAuthRoutes.ts',
   'backends/emailmanager-core/src/domain/inbox/MailboxAccess.ts', 'backends/emailmanager-core/src/domain/inbox/registerInboxRoutes.ts',
   'backends/emailmanager-core/src/buildApp.ts', 'backends/emailmanager-core/src/buildApp.spec.ts', 'backends/emailmanager-core/src/main.ts']),
 ('T8', 'Web app', 'React 19 + Vite web app (P4.6): proxy to the API, typed client, session handling, layout with navigation, sign-in and a paged data screen. The inbox screen is the EmailManager example.',
  ['frontends/emailmanager-web/package.json', 'frontends/emailmanager-web/tsconfig.json', 'frontends/emailmanager-web/eslint.config.js',
   'frontends/emailmanager-web/vite.config.ts', 'frontends/emailmanager-web/index.html', 'frontends/emailmanager-web/src/main.tsx',
   'frontends/emailmanager-web/src/App.tsx', 'frontends/emailmanager-web/src/api/client.ts', 'frontends/emailmanager-web/src/api/session.ts',
   'frontends/emailmanager-web/src/api/inbox.ts', 'frontends/emailmanager-web/src/components/Layout.tsx',
   'frontends/emailmanager-web/src/components/RequireSession.tsx', 'frontends/emailmanager-web/src/components/ErrorMessage.tsx',
   'frontends/emailmanager-web/src/components/AiNotice.tsx', 'frontends/emailmanager-web/src/screens/SignInScreen.tsx',
   'frontends/emailmanager-web/src/screens/InboxScreen.tsx', 'frontends/emailmanager-web/src/screens/PlaceholderScreen.tsx',
   'frontends/emailmanager-web/src/styles.css']),
 ('T9', 'End-to-end tests', 'Playwright tests that start their own servers in test mode (P4.7).',
  ['e2e-tests-web/package.json', 'e2e-tests-web/tsconfig.json', 'e2e-tests-web/eslint.config.js', 'e2e-tests-web/playwright.config.ts',
   'e2e-tests-web/src/inbox.spec.ts', 'e2e-tests-web/README.md']),
 ('T10', 'Project documents', 'The README, the builds-and-dependencies explainer, the Google setup guide and the resume note for Claude (P4.8). Adapt the wording to the new project.',
  ['README.md', 'docs/BUILDS_AND_DEPS.md', 'docs/GOOGLE_SETUP.md', 'CLAUDE.md']),
]

# Every tracked file under a section's folders is included, even if not listed above, so nothing is missed.
PREFIXES = {
    'T1': ['.github/', 'package.json', 'pnpm-workspace.yaml', 'turbo.json', 'tsconfig.base.json', '.nvmrc', '.prettierrc',
           '.prettierignore', '.gitignore', '.env.example', 'start.sh', 'stop.sh', 'Start ', 'Stop '],
    'T2': ['tools/scripts/'],
    'T3': ['packages/tsconfig/', 'packages/eslint-config/'],
    'T4': ['packages/errors/', 'packages/logging/', 'packages/fastify-utils/', 'packages/drizzle-utils/', 'packages/api-client-utils/'],
    'T5': ['packages/emailmanager-core-contract/', 'packages/emailmanager-core-client/'],
    'T6': ['packages/email-provider/'],
    'T7': ['backends/emailmanager-core/'],
    'T8': ['frontends/emailmanager-web/'],
    'T9': ['e2e-tests-web/'],
}
EXCLUDE = re.compile(r'(^|/)drizzle/|\.py$|^tools/scripts/install_creator_skill\.sh$')
tracked = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
listed = {f for _, _, _, fs in SECTIONS for f in fs}
for sid, _, _, fs in SECTIONS:
    for f in tracked:
        if f and f not in listed and not EXCLUDE.search(f) and any(f == pre or f.startswith(pre) for pre in PREFIXES.get(sid, [])):
            fs.append(f)
            listed.add(f)

seen = set()
out = []
out.append('''# Creator Templates (for Claude)

Every file the [Creator Playbook](./CREATOR_PLAYBOOK.md) tells you to create, with its full contents. With this file
and the playbook you need no other project: no reference repository, no downloads beyond the npm packages named here.

These templates are the working files from EmailManager (verified: lint, 66 unit and integration tests, Playwright
e2e, build), with the project name and ports turned into placeholders. Sections T5–T8 contain some
EmailManager-specific code (inbox, Gmail, Google accounts) as worked examples; keep the structure and replace the
domain parts with the new project's own.

## Placeholders

Replace these everywhere, including in file and folder names:

| Placeholder | Meaning | EmailManager value |
| --- | --- | --- |
| `{{Name}}` | Project name, as the Creator writes it | `EmailManager` |
| `{{slug}}` | Lowercase, no spaces; used in package names (`@{{slug}}/errors`), folders, containers, URLs | `emailmanager` |
| `{{SLUG_UPPER}}` | Upper-case slug for environment variables | `EMAILMANAGER` |
| `{{nameCamel}}` | camelCase name for code identifiers | `emailManager` |
| `{{WEB_PORT}}` | Web app (Vite) port | `5180` |
| `{{API_PORT}}` | API port | `3601` |
| `{{DB_PORT}}` / `{{DB_TEST_PORT}}` | Postgres dev / test ports | `5450` / `5451` |
| `{{FIXTURE_PORT}}` | Reserved e2e fixture-server port | `4699` |

Then:

1. Run `pnpm install`. Versions resolve within the ranges given, subject to the 2-day minimum release age.
2. Generate the first database migration with `pnpm --filter @{{slug}}/{{slug}}-core db:generate-migration init`.
   Don't hand-write migrations.
3. Run `chmod +x` on `start.sh`, `stop.sh`, the two `.command` files and `tools/scripts/*.sh`.

## Contents

''')
for sid, title, _, _ in SECTIONS:
    out.append(f'- [{sid}. {title}](#{sid.lower()}-{re.sub(r"[^a-z0-9 -]", "", title.lower()).replace(" ", "-")})\n')
out.append('\n')
for sid, title, desc, files in SECTIONS:
    out.append(f'## {sid}. {title}\n\n{desc}\n\n')
    for f in files:
        full = os.path.join(ROOT, f)
        if not os.path.exists(full):
            raise SystemExit(f'missing {f}')
        seen.add(f)
        content = open(full).read()
        if f == 'CLAUDE.md':
            content = content.replace('Built to the conventions of the read-only reference project `../tactica`.', 'Built with the Creator Playbook.')
            content = content.replace("- `../tactica` is read-only: copy its conventions, never edit it. Don't change files outside this folder.", "- Don't change files outside this folder.")
        if f == 'CLAUDE.md':
            content = re.sub(r'## Creator kit\n.*?(?=\n## )', '', content, flags=re.S)
        if f == '.prettierignore':
            content = re.sub(r'\n# Generated from the code[^\n]*\n[^\n]*CREATOR_TEMPLATES\.md\n?', '\n', content)
        if f == 'README.md':
            content = content.replace("Chosen so they don't clash with tactica.", "Chosen so they don't clash with other local projects.")
        content = content.replace("on tactica's `GameSource`: a provider yields", 'on a "source" pattern: a provider yields')
        content = content.replace('to not clash with local PG (or tactica)', 'to not clash with a local Postgres or other projects')
        content = tok(content)
        fence = '````' if '```' in content else '```'
        out.append(f'### `{tok(f)}`\n\n{fence}{lang(f)}\n{content.rstrip()}\n{fence}\n\n')
text = ''.join(out)
if 'tactica' in text.lower():
    bad = [l for l in text.splitlines() if 'tactica' in l.lower()]
    raise SystemExit('tactica still present: ' + repr(bad[:5]))
open(OUT, 'w').write(text)
print('wrote', OUT, len(text.splitlines()), 'lines,', len(seen), 'files')
