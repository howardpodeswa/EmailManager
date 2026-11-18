# Creator Guide: building an app from requirements with Claude

**Audience: you, the Creator.** You're a business analyst (or product owner) with requirements: use cases, user
stories, business rules, decision tables. You want a working application on your Mac without writing code. Claude
builds it and stops for your review at each milestone.

This guide explains, in plain language, every step Claude takes when it follows the
[Creator Playbook](./CREATOR_PLAYBOOK.md), its companion written for Claude. Step numbers (P0.1, P4.3, …) match the
playbook, so you can follow along.

Claude makes all the technical choices itself (programming languages, database, testing tools, folder layout). You
decide only what a business owner should: names, accounts, scope, and how the rules behave.

## How to start

### Two places you can work with Claude

You can start a project from either place. Both are in the **Claude app**, the same app you chat with Claude in.

**A. A Claude project** (simplest; it's what EmailManager used)

A _project_ is a named workspace in the Claude app that keeps your files and conversations together.

1. Open the Claude app (or claude.ai in a browser).
2. In the left sidebar, click **Projects**, then **+ New project**. Give it the app's name and click **Create**.
3. Inside the project, find the area for adding files (labelled e.g. **Files**, **Project knowledge** or **+ Add
   content**) and upload your requirements document.
4. Type your request in the **message box at the bottom of the project page**, the same box you'd use to chat, and
   press Return.
5. When Claude needs to work on your Mac, a card appears asking you to allow it. Click **Allow** and choose (or
   accept) the folder.

**B. Claude Code** (when you're working directly on your Mac)

1. Open the Claude app and switch to the **Code** tab at the top of the window.
2. Start a new session and choose the folder where you keep your projects (for example
   `~/Noble/projectcode`).
3. Type your request in the **prompt box at the bottom** and press Return.

In both cases, "type" means typing into Claude's message box, **not** into Terminal. Terminal is used only when Claude
gives you a command in a grey box with a **Run** or copy button.

### Main path: with the skill installed

**One-time setup** (do whichever you use, or both):

- **Claude on your Mac** (Claude Code or the desktop app): in Terminal, run

  ```bash
  cd ~/Noble/projectcode/EmailManager && ./tools/scripts/install_creator_skill.sh
  ```

  then restart Claude.

- **claude.ai** (projects on the web or in the app): upload
  `EmailManager/docs/creator-kit/skill/build-app-from-requirements.zip` under **Settings → Capabilities → Skills**.

**Each new project:**

- **In a Claude project:** create the project, add **only your requirements file**, and say **"Build an application
  from my requirements."** Approve the card that lets Claude work in a folder on your Mac.
- **In Claude Code:** open it in the folder where you keep projects and say **"Build an application from my
  requirements in ~/Documents/MyRequirements.md"**.

The skill loads the latest playbook, templates and this guide by itself, so you never attach them.

### Fallback: without the skill

- **In a Claude project:** add your requirements file plus `CREATOR_PLAYBOOK.md` and `CREATOR_TEMPLATES.md`, and say
  "Read CREATOR_PLAYBOOK.md and build an application from my requirements."
- **In Claude Code:** say "Read
  https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/creator-kit/CREATOR_PLAYBOOK.md and build an
  application from my requirements in ~/Documents/MyRequirements.md".

### Either way

Answer Claude's questions as they come. Most have a suggested answer, so "OK" or "OK to the rest" is usually enough.

To build another EmailManager, use [EMAILMANAGER_BUSINESS_REQUIREMENTS.md](./EMAILMANAGER_BUSINESS_REQUIREMENTS.md) as
the requirements.

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
