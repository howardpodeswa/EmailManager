# What Claude does when you start a new project, and why

**Audience: you, the Creator.** You're a business analyst (or product owner) with requirements: use cases, user
stories, business rules. You want a working application without writing code. This guide explains, in plain language,
each step Claude takes when you ask it to follow the
[new-project playbook](./NEW_PROJECT_PLAYBOOK.md). The step numbers (P0.1, P4.3, …) match the playbook, so you can
follow along.

## How to start

1. Open Claude Code in a folder where your projects live.
2. Type something like:

   > Read https://github.com/howardpodeswa/EmailManager/blob/main/docs/creator-kit/NEW_PROJECT_PLAYBOOK.md and start a
   > new project from my requirements in `~/Documents/MyRequirements.md`.

3. Answer Claude's questions. Most have a suggested answer: reply "OK to all" or change the ones you disagree with.

You'll be asked to do things yourself only when they need your accounts, passwords or approval (for example, creating
sign-in credentials in Google Cloud). Claude walks you through those one screen at a time.

## What you'll be asked, and when

| When                                   | What Claude asks                                                                                                                                                                        | Why it asks                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Start (P0.2)                           | Project name, where your requirements are, which folder to use, whether to create a GitHub repository (public or private), who signs in, which personal email addresses to keep private | These are business choices, not technical ones    |
| After reading your requirements (P2.4) | Questions about anything unclear, each with a suggested answer                                                                                                                          | So the rules are built the way you mean them      |
| Before building (P3.3)                 | Approval of the milestone plan                                                                                                                                                          | You stay in control of scope and order            |
| During setup (P5)                      | Create credentials in an external console (e.g. Google), then run one script that asks for them                                                                                         | Only you can create accounts and see your secrets |
| After each milestone (P6.3)            | "Go" for the next milestone                                                                                                                                                             | You review a working result before more is built  |

---

## The steps

### P0. Intake: getting ready

| Step                                  | What happens                                                                                             | What it achieves for you                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
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

| Step                    | What happens                                                                                                                                                                             | What it achieves for you                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P3.1 Milestones         | The build is split into small, demonstrable stages. The first is always "set up, sign in, and see real data". The business rules come next, fully tested before they touch anything real | You see progress early, and the riskiest logic is proven safely |
| P3.2 Detail milestone 1 | A numbered task list, including anything you'll need to set up externally                                                                                                                | No surprises about what's being built or what you need to do    |
| P3.3 Wait for approval  | You approve or adjust the plan                                                                                                                                                           | Scope stays yours                                               |

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

- Double-click **Start <Name>.command** in the project folder. It starts everything and opens the app in your browser.
- Double-click **Stop <Name>.command** when you're done (optional).
- To continue building, open Claude Code in the project folder and say "Continue the project". Claude reads its
  resume note (`CLAUDE.md`) and picks up where you left off.
