# Creator Guide: building an app from requirements with Claude

**Audience: you, the Creator.** You're a business analyst (or product owner) with requirements: use cases, user
stories, business rules, decision tables. You want a working application on your Mac without writing code. Claude
builds it and stops for your review at each milestone.

This guide explains, in plain language, every step Claude takes when it follows the
[Creator Playbook](./CREATOR_PLAYBOOK.md), its companion written for Claude. Step numbers (P0.1, P4.3, …) match the
playbook, so you can follow along.

Claude makes all the technical choices itself (programming languages, database, testing tools, folder layout). Each
one is explained in plain language in [TECHNICAL_DECISIONS_EXPLAINED.md](./TECHNICAL_DECISIONS_EXPLAINED.md). You
decide only what a business owner should: names, accounts, scope, and how the rules behave.

## How to start

There are two ways to start a new app. Pick one. Both use the **build-app-from-requirements** skill, which has to be
set up once (see "Before the first time" in each option).

### Option 1: in the Claude app (easiest)

A Claude project is a workspace in the Claude app, like the one used for EmailManager.

**Before the first time:** the skill must be uploaded once.

1. In the Claude app, click your name or initials (bottom left), then **Settings**.
2. Click **Capabilities**, find **Skills**, and click **Upload skill** (or **+**).
3. Choose the file `build-app-from-requirements.zip` from the folder
   `EmailManager/docs/creator-kit/skill` (in your copy of EmailManager) and confirm.

**Every new app:**

1. Open the Claude app.
2. In the left sidebar, click **Projects**.
3. Click **+ New project**, type the app's name (for example "TimesheetTracker"), and click **Create project**.
4. In the message box at the bottom of the project page, click the **paperclip** or **+** button and attach your
   requirements file.
5. In the same message box, type: **Build an application from my requirements**
6. Press **Enter**.
7. A card appears asking to let Claude work in a folder on your Mac. Click **Allow**.
8. Answer Claude's questions in the same message box as they come. Most have a suggested answer, so typing **OK** is
   usually enough.

### Option 2: in Terminal (Claude Code)

The examples below assume your projects live in `~/Projects` and you have a copy of EmailManager there. Use
your own folder names if they're different.

**Before the first time:** the skill must be installed once.

1. Open **Terminal**: press **Command + Space**, type `Terminal`, and press **Enter**.
2. Type this line exactly, then press **Enter**:

   ```bash
   cd ~/Projects/EmailManager && ./tools/scripts/install_creator_skill.sh
   ```

3. You should see "Installed: …". You can close Terminal.

**Every new app:**

1. Open **Terminal**: press **Command + Space**, type `Terminal`, and press **Enter**.
2. Type `cd ~/Projects` and press **Enter**. This goes to the folder that holds your projects (use your own
   folder's name if it's different).
3. Type `claude` and press **Enter**. Claude starts inside the Terminal window.
4. Type the following, using the real location of your requirements file, and press **Enter**:

   **Build an application from my requirements in ~/Documents/MyRequirements.md**

   Tip: instead of typing the location, you can drag the requirements file from Finder into the Terminal window.

5. Answer Claude's questions in the same window as they come. Typing **OK** is usually enough.

### If the skill isn't set up

Follow the same steps, but give Claude the two kit files as well:

- **Option 1:** in step 4, also attach `CREATOR_PLAYBOOK.md` and `CREATOR_TEMPLATES.md` (from
  `EmailManager/docs/creator-kit`). In step 5, type: **Read CREATOR_PLAYBOOK.md and build an
  application from my requirements**
- **Option 2:** in step 4, type: **Read
  https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/creator-kit/CREATOR_PLAYBOOK.md and build an application from my requirements in
  ~/Documents/MyRequirements.md**

### Rebuilding EmailManager

To build another EmailManager, use
[EMAILMANAGER_BUSINESS_REQUIREMENTS.md](./EMAILMANAGER_BUSINESS_REQUIREMENTS.md) as your requirements file.

## Before you start

You need a Mac, about an hour for the first session, and some accounts Claude can't create for you:

| What                                                                                              | Why it's needed                                                | Cost                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A Mac you can leave on while Claude works                                                         | The app is built and runs on your own computer                 | —                                                                      |
| The Claude desktop app, signed in                                                                 | Lets Claude work in one folder on your Mac                     | Your Claude plan                                                       |
| Docker Desktop                                                                                    | Runs the app's database on your Mac                            | Free for personal use                                                  |
| A GitHub account                                                                                  | Keeps a safe, versioned copy of the code online                | Free                                                                   |
| A separate test account for each outside service the app uses (for example a spare Gmail address) | The app is tried out on test data, never on your real accounts | Free                                                                   |
| Accounts for outside services named in your requirements (for example Google Cloud, Anthropic)    | The app connects to them                                       | Usually free to set up; no free trial or billing is needed for testing |

The only questions Claude asks up front (P0.2), each with a suggested answer:

1. What is the application called?
2. Where are the requirements? (Usually: the file you added or named.)
3. Which folder on your Mac should hold it? (Suggested: a new folder named after the app, next to your other projects.)
4. Your GitHub username, and should the code be public or private? (Suggested: private.)
5. Who signs in to the app (nobody, Google accounts, …)? (Suggested from your requirements.)
6. Which test accounts may the app use, and which personal email addresses must never be used or appear in the code?
7. May Claude save its work to GitHub without asking each time? (Suggested: yes, but never overwrite history without
   asking.)

## What you'll be asked, and when

| When                                   | What Claude asks                                                                                                                                                                                                                          | Why it asks                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Start (P0.2)                           | Project name, where your requirements are, which folder to use, whether to create a GitHub repository (public or private), who signs in, which personal email addresses to keep private, whether Claude may save to GitHub without asking | These are business choices, not technical ones    |
| After reading your requirements (P2.4) | Questions about anything unclear, each with a suggested answer                                                                                                                                                                            | So the rules are built the way you mean them      |
| Before building (P3.4)                 | Approval of the milestone plan                                                                                                                                                                                                            | You stay in control of scope and order            |
| During setup (P5)                      | Create credentials in an external console (e.g. Google), then run one script that asks for them                                                                                                                                           | Only you can create accounts and see your secrets |
| After each milestone (P6.3)            | "Go" for the next milestone                                                                                                                                                                                                               | You review a working result before more is built  |

---

## The steps

### P0. Intake: getting ready

| Step                                  | What happens                                                                                             | What it achieves for you                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| P0.0 Get access to your Mac           | If you started from a Claude project, a card asks you to let Claude work in one folder on your Mac       | Claude can create files and run programs in that folder, and nowhere else. Tap **Allow**                                                  |
| P0.1 Check the toolchain              | Claude checks that the building tools are on your Mac (Git, the GitHub tool, Node, pnpm, Docker Desktop) | Avoids failures halfway through. If something is missing, you get one exact command or download link                                      |
| P0.2 Ask the basics                   | The handful of questions in the table above                                                              | Everything else is decided for you, so you type very little                                                                               |
| P0.3 Create the folder and repository | A project folder, version history (Git), and optionally a GitHub repository                              | Every change is saved and can be reviewed or undone. Your commits use a private GitHub address, so your real email never appears publicly |

### P1. Requirements: making them the source of truth

| Step                       | What happens                                                                                                                               | What it achieves for you                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| P1.1 Save the requirements | Your document becomes `docs/REQUIREMENTS.md` with a version number. Its formatting is never auto-changed                                   | One agreed source of truth that Claude re-reads before each milestone       |
| P1.2 Add the build section | If your spec is purely business, Claude adds a short "how to build it" part (technology, safety rules, milestones) and marks what it added | You can see and approve the technical promises without having to write them |
| P1.3 Check quality         | Claude looks for rules without IDs, untestable wording, gaps and contradictions                                                            | Problems are found on paper, where they're cheap to fix                     |

### P2. Understand and ask (checkpoint)

| Step                                  | What happens                                                                                                                                     | What it achieves for you                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| P2.1 Summary                          | Claude restates the product in your language                                                                                                     | You can spot misunderstandings before any code exists             |
| P2.2 Questions with suggested answers | Numbered questions (Q1, Q2…), each with a recommended answer                                                                                     | You can say "OK to the rest" and only discuss what matters to you |
| P2.3 Technology overview              | A short table of what will be used and why, in one line each                                                                                     | Transparency without needing to make technical decisions          |
| P2.4 Wait for you                     | Nothing is built until you answer                                                                                                                | You stay in control                                               |
| P2.5 Record the answers               | Your answers are saved (`docs/STEP2_ANSWERS.md`) and the important ones become numbered decisions in the requirements, with a new version number | Decisions don't get lost or re-argued later                       |

### P3. Plan (checkpoint)

| Step                    | What happens                                                                                                                                                                             | What it achieves for you                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P3.1 Milestones         | The build is split into small, demonstrable stages. The first is always "set up, sign in, and see real data". The business rules come next, fully tested before they touch anything real | You see progress early, and the riskiest logic is proven safely   |
| P3.2 Plan page          | A web page (when available) showing how the parts fit together, mock-ups of each screen, and the milestones                                                                              | You can see the app before it's built and ask for changes cheaply |
| P3.3 Detail milestone 1 | A numbered task list, including anything you'll need to set up externally                                                                                                                | No surprises about what's being built or what you need to do      |
| P3.4 Wait for approval  | You approve or adjust the plan                                                                                                                                                           | Scope stays yours                                                 |

### P4. Milestone 1: building the foundation

| Step                                     | What happens                                                                                                                                 | What it achieves for you                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| P4.1 Project structure                   | Standard project files and folders, the same proven layout as earlier projects                                                               | Consistency; any future developer or Claude session can find their way around          |
| P4.2 Shared building blocks              | Reusable pieces for error messages, logging, security and the database                                                                       | Quality and security come built in, not reinvented                                     |
| P4.3 Contract between screens and server | A precise, shared definition of what the screens can ask the server for                                                                      | Fewer bugs where the two sides disagree                                                |
| P4.4 Connector to outside systems        | The connection to e.g. Gmail sits behind a "plug", with a fake version for testing                                                           | Another system (e.g. Outlook) can be added later, and tests never touch your real data |
| P4.5 Server                              | Sign-in, sessions, your data kept separate per user, safety checks that stop the app starting with unsafe settings                           | Security and privacy are enforced automatically                                        |
| P4.6 Screens                             | The sign-in screen, the first real data screen with "Load more", and placeholders for later screens                                          | You can click through the app from day one                                             |
| P4.7 Automated tests                     | Tests that check the building blocks, the server and a full click-through in a real browser, all with fake data                              | Every later change is checked automatically, and nothing touches your real data        |
| P4.8 Tooling and documents               | Start/Stop files you double-click, a credentials helper, a README, a setup guide for outside services, and a note for future Claude sessions | Coming back after weeks takes one double-click                                         |
| P4.9 Verify                              | Claude runs every check and test, and confirms no personal email address is in the files                                                     | You get a result that's been proven, not just written                                  |
| P4.10 Save and publish                   | The work is saved in clear steps and pushed to GitHub                                                                                        | A full history you can review, and a backup                                            |

### P5. External setup, done together

| Step                                   | What happens                                                                                                                                             | What it achieves for you                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| P5.1 Setup guide and walkthrough       | Claude writes the guide and then walks you through it, one screen at a time, with direct links                                                           | You don't need to know the console. Just follow the links |
| P5.2 Known pitfalls                    | Claude already knows the confusing spots (e.g. no billing needed, where menus moved, "ineligible test user" errors)                                      | Fewer dead ends                                           |
| P5.3 Credentials without editing files | Claude creates the settings file and its own encryption key. You run one command that asks for your ID and secret (the secret stays hidden as you paste) | No hand-editing, and your secret never appears in chat    |
| P5.4 First real run                    | Claude starts the app and checks it, then you sign in with your test account                                                                             | The first use with real data is controlled and confirmed  |

### P6. Hand-off (checkpoint)

| Step                      | What happens                                                                      | What it achieves for you                               |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| P6.1 Plain-English report | What works, how to start and stop, what recurs, what wasn't verified, what's next | You know exactly where things stand                    |
| P6.2 Update the notes     | The project's "where we are" note and README are updated and saved                | The next session (yours or Claude's) resumes instantly |
| P6.3 Wait for "go"        | Nothing more is built until you say so                                            | You pace the project                                   |

### P7. Later milestones

Each later milestone repeats the cycle:

1. re-read the requirements
2. build
3. test every business rule and scenario with fake data
4. run all the checks
5. save and publish
6. report in plain English
7. wait for your "go"

Anything that changes real data (archiving, sending) only ever happens after you approve it in the app, and tests
prove nothing happens without that approval.

---

## Safety promises (always on)

- **Your real data is never used in tests.** Tests use fake mailboxes and fake users.
- **Your personal email addresses stay out of the project files** and out of GitHub.
- **Secrets stay on your Mac** in a private settings file that's never uploaded, and they're never shown in chat.
- **Nothing irreversible happens without your OK:** no rewriting history, no publishing, no sending.
- **You approve every stage** before the next one starts.

## Coming back later

- Double-click **Start <Name>.command** in the project folder. It starts everything (including Docker Desktop) and
  opens the app in your browser.
- Double-click **Stop <Name>.command** when you're done (optional; it's fine to leave the app running).
- To continue building, say "continue" in the project (or open Claude Code in the project folder). Claude reads its
  resume note (`CLAUDE.md`) and picks up where you left off.

## Common snags and what to do

These came up while building EmailManager. Each has a simple fix.

| What you see                                                 | What it means                                                                               | What to do                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A card asking to allow access to your Mac                    | Claude needs your OK to work in the project folder; access lapses after a while without use | Tap **Allow**                                              |
| "Your Mac went offline"                                      | The Mac slept or restarted, so work paused                                                  | Wake the Mac; the work carries on                          |
| Claude asks you to start Docker                              | The database runs inside Docker Desktop                                                     | Open Docker Desktop, or double-click **Start**             |
| "Your Google sign-in has expired"                            | Google signs test apps out every 7 days                                                     | Click **Sign in with Google again**                        |
| "Ineligible account" when adding a test user in Google Cloud | Usually a typo, a hidden pasted character, or an account that doesn't exist yet             | Retype the address by hand; check you can sign in to it    |
| A cloud console offers a free trial or asks for billing      | Not needed for local testing                                                                | Dismiss it; tell Claude if a screen won't let you continue |
| A menu Claude mentions isn't there                           | Consoles rename their menus                                                                 | Ask Claude for the direct link                             |
| Text typed into Terminal gives "command not found"           | Something meant for a file or prompt went into Terminal                                     | Nothing breaks; ask Claude for the exact command or helper |
| macOS won't open a `.command` file                           | First-time safety check                                                                     | Right-click it and choose **Open**                         |

Your code is public on GitHub only if you chose public. Either way, Claude keeps email addresses and keys out of it.
