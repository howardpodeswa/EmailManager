# Workshop start (for Claude)

**Audience: Claude.** You're helping an attendee at an EmailManager workshop build their own version of the app from
their business requirements. Attendees are business analysts, not developers. Read this file first. It overrides the
Creator Playbook wherever they differ; for everything else, follow the playbook.

**Workshop shape:**

- **Session 1** (3–4 hours): a running app on the demo mailbox (playbook milestone 1).
- **Session 2** (optional, 3–4 hours): the business rules with tests (milestone 2), then Categorize (milestone 3),
  then, optionally, real Gmail.

## How to talk to the attendee

- Plain business language only. Say what each step achieves, never how it's coded. No jargon without a one-line
  explanation.
- **The attendee never types a command.** You run everything. The only things they do: approve your permission
  requests, type their Mac password when **macOS itself** asks, click buttons in apps you open, and answer your
  questions.
- Before your first action, tell them: _"I'll ask permission before running things on your Mac. Choose Allow. If it
  offers to always allow for this folder, choose that, so I ask less often."_
- Give a one-line progress note at least every 10 minutes during long steps ("Installing the building blocks, about
  2 minutes").
- If something blocks you for more than 10 minutes, say so plainly and suggest they ask the facilitator.
- Keep each checkpoint to a short summary and one question. "OK" must be enough to continue.

## W0. Load the kit (silently, about 1 minute)

Download into your scratch/temp directory, never into the attendee's project, with `curl` (not a web-fetch tool that
summarizes):

```bash
KIT=https://raw.githubusercontent.com/howardpodeswa/EmailManager/main
for f in docs/creator-kit/CREATOR_PLAYBOOK.md docs/creator-kit/CREATOR_TEMPLATES.md \
  docs/creator-kit/scaffold_from_templates.mjs docs/creator-kit/EMAILMANAGER_BUSINESS_REQUIREMENTS.md \
  docs/creator-kit/CREATOR_GUIDE.md docs/workshop/check_mac.sh pnpm-lock.yaml; do
  curl -fsSL "$KIT/$f" -o "$SCRATCH/$(basename "$f")"
done
```

Read `CREATOR_PLAYBOOK.md` (its safety rules apply in full).

## W1. Check the Mac (5–15 minutes)

Run `bash "$SCRATCH/check_mac.sh"` and summarize the result in one or two sentences.

- **All green:** go on.
- **Docker Desktop missing:** ask them to download it from docker.com (Apple chip or Intel chip), drag it to
  Applications, open it and accept the terms. Wait, then run the check again. If it's installed but stopped, the check
  opens it. When Docker asks for their Mac password to finish setup, that's expected.
- **Command Line Tools:** a macOS window opens. They click **Install** and wait. Run the check again afterwards.
- **Anything else:** explain in one sentence and suggest asking the facilitator.

Then use Node from nvm for everything: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.19.0`.

## W2. Two questions only (replaces playbook P0.2)

Ask, in one message:

1. **"What should your app be called?"** Suggest `EmailManager_<their initials>`. It may contain only letters, digits
   and underscores, and must start with a letter. If they give spaces or dashes, offer the nearest valid name.
2. **"Which file has your requirements?"** If they attached a file or named one in their first message, confirm it
   instead of asking. Otherwise list the documents in `~/Workshop` and `~/Documents`, and offer the EmailManager
   example requirements if they don't have their own.

**Pre-answered** (don't ask):

| Playbook question        | Workshop answer                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project folder           | `~/Workshop/<AppName>`                                                                                                                                                            |
| GitHub                   | Skip. Git stays on this Mac only. Offer GitHub only if they ask                                                                                                                   |
| Who signs in             | Google accounts, but the session uses **demo mode** (`DEMO_MODE=true`, `EMAIL_PROVIDER=fake`): "Try with the demo mailbox", no Google setup. Real Gmail is optional homework (W8) |
| Personal email addresses | Never written into the project. Commits use a repo-local identity: `git config user.name "<AppName> workshop"` and `git config user.email "workshop@example.com"`                 |
| Push without asking      | Not applicable (no GitHub)                                                                                                                                                        |
| Ports                    | Web 5190, API 3701, Postgres 5460 / 5461, fixtures 4799. If the check reported one of them in use, add 10 to each and say so                                                      |

## W3. Requirements (about 15 minutes)

1. Copy their file into `docs/original/` unchanged.
2. Make the working copy `docs/REQUIREMENTS.md`:
   - `.md` or `.txt`: copy it.
   - `.docx`, `.doc`, `.rtf`, `.pages`: convert with `textutil -convert txt` (built into macOS), then tidy the
     headings into Markdown.
   - `.pdf`: read it and transcribe it.

   Keep their wording. Add a version line.

3. Read it, then write **one short message**: 5–8 bullets on what the app does, then **at most 5 questions**, and only
   ones that change what gets built in session 1. Give each a suggested answer, so "OK" accepts them all.
4. Anything the spec leaves open: use the decisions in `EMAILMANAGER_BUSINESS_REQUIREMENTS.md` (section 13 and the
   defaults in section 12). Record them in `docs/STEP2_ANSWERS.md` under "Workshop defaults".

## W4. Plan checkpoint (2 minutes)

Tell them what session 1 delivers, in 4–6 bullets:

- the project set up on their Mac
- the Sign in screen with "Try with the demo mailbox"
- their Inbox with paging
- their app's name and navigation from their requirements
- automated checks passing
- a double-click Start/Stop

Say that the business rules come in session 2. Ask "OK to build?". This replaces playbook P3 (no plan page in the
workshop).

## W5. Build session 1 (45–90 minutes)

Work in `~/Workshop/<AppName>`.

1. **Scaffold** (2 minutes):

   ```bash
   node "$SCRATCH/scaffold_from_templates.mjs" --name <AppName> --out ~/Workshop/<AppName> \
     --ports 5190,3701,5460,5461,4799 --templates "$SCRATCH/CREATOR_TEMPLATES.md" --lockfile "$SCRATCH/pnpm-lock.yaml"
   ```

   Then set the repo-local git identity (W2). Copy their requirements into `docs/`.

2. **Install and tidy:** `pnpm install --frozen-lockfile`, then `pnpm exec prettier --write .`.
3. **Database:** `pnpm --filter @<slug>/<slug>-core db:generate-migration init`, then `pnpm db:migrate-up` and
   `pnpm db:migrate-up:test`. Docker must be running; the scripts create the containers.
4. **Demo settings:** create `.env` containing exactly `DEMO_MODE=true` and `EMAIL_PROVIDER=fake`.
5. **Make it theirs.** Keep this small; session 1 is about a running app:
   - the app's display name, and the screen and navigation names from their requirements (the placeholders stay as
     "Coming in a later milestone")
   - the AI notice wording, if their requirements say something different
   - `README.md`, and `CLAUDE.md` "Where we are" (this is a workshop project; session 1 done; next is milestone 2)
   - `docs/REQUIREMENTS.md`, plus any extra fields their Inbox needs, _only if_ the fake provider already has the
     data; otherwise note it for session 2
6. **Verify** (playbook P4.9, minus the external parts):
   - `pnpm lint`
   - `pnpm test`
   - `pnpm --filter @<slug>/e2e-tests-web exec playwright install chromium`, then `pnpm test:e2e:web`
   - grep for any personal email address the attendee mentioned
     Fix anything red before going on.
7. **Commit** in two or three steps (scaffold, their changes). Local only.

**If time is short** (the facilitator's checkpoint says they're behind): skip step 5 except the display name, run
step 6, start the app.

## W6. Show them their app (10 minutes)

Run `./start.sh`. It opens the browser. Ask them to click **Try with the demo mailbox**, look at the Inbox, click
**Load more**, open a placeholder screen and click **Sign out**. Then explain in 3–4 lines:

- Next time, they open the project folder (`~/Workshop/<AppName>`) in Finder and double-click **Start <AppName>**.
  **Stop <AppName>** shuts it down.
- The mailbox is made up. Connecting real Gmail is optional homework.
- Session 2 adds their business rules.

## W7. Session 2 (optional)

Re-read `CLAUDE.md` and `docs/REQUIREMENTS.md`, then follow playbook P7 for:

1. **Milestone 2:** the rules engine as a pure module, with a test for every decision-table row and acceptance scenario
   in their requirements. It's the core of the session: show them the test list in business terms.
2. **Milestone 3:** Categorize. It needs an Anthropic API key from the facilitator or the attendee, stored with a
   helper script that asks for it (never in chat). Without a key, build the rules-only parts and note what's missing.

Same rules: plain language, short checkpoints, commit after each milestone.

## W8. Optional homework: real Gmail

Follow playbook P5 with `docs/GOOGLE_SETUP.md`, using their spare Gmail account as the QA account. Give them the exact
redirect URI (`http://localhost:<API port>/<slug>-core/auth/google/callback`). When the credentials are saved, turn
demo mode off: remove `DEMO_MODE` and `EMAIL_PROVIDER` from `.env`. The app refuses to start if demo mode and Google
credentials are both set, and its message says why.
