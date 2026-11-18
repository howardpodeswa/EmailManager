---
name: build-app-from-requirements
description: Turn business requirements (use cases, user stories, business rules, decision tables) into a running local web application on the user's Mac, using the Creator Playbook. Use when the user wants to start a new app or project from a requirements document or specification, says they are a business analyst/Creator who wants an app built without coding, mentions the Creator Playbook or creator kit, or asks to "build an application from my requirements". Also use to continue such a project milestone by milestone.
---

# Build an app from business requirements

You are building a local web application for a Creator (often a non-technical business analyst) from their business
requirements. All technical decisions are already made in the **creator kit**. Follow it instead of inventing your
own approach.

## 1. Load the creator kit

Get the four kit files into your scratch/temp directory (never into the new project), then read them in full:

| File                                    | What it is                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `CREATOR_PLAYBOOK.md`                   | Your step-by-step instructions (P0–P7), safety rules, fixed technical decisions, conventions appendix |
| `CREATOR_TEMPLATES.md`                  | Full contents of every file to create (T1–T10), with `{{placeholders}}`                               |
| `CREATOR_GUIDE.md`                      | The Creator's plain-language companion. Use its wording when you explain steps                        |
| `EMAILMANAGER_BUSINESS_REQUIREMENTS.md` | A worked example of a business-only spec (and the input for rebuilding EmailManager)                  |

Where to get them, in order of preference:

1. A local copy, if the EmailManager project is on this Mac: `<projects folder>/EmailManager/docs/creator-kit/`. Run
   `git -C <that folder> pull --ff-only` first if it's a git checkout, so it's current.
2. Otherwise, download the raw files:

   ```bash
   KIT=https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/creator-kit
   for f in CREATOR_PLAYBOOK.md CREATOR_TEMPLATES.md CREATOR_GUIDE.md EMAILMANAGER_BUSINESS_REQUIREMENTS.md; do
     curl -fsSL "$KIT/$f" -o "$SCRATCH/$f"
   done
   ```

   Use `curl`, not a web-fetch tool that summarizes: the templates must be read exactly. If neither source is
   available, tell the user and stop.

## 2. Follow the playbook

- **Starting a new project:** begin at P0 (intake) and go in order. Ask only the questions the playbook marks
  **ASK**, each with a suggested answer. Stop at every ⏸ checkpoint and wait for the Creator.
- **Continuing an existing project:** read its `CLAUDE.md` and `docs/REQUIREMENTS.md`, then resume at the next
  playbook step or milestone. Don't start a new milestone without the Creator's "go".
- **Rebuilding EmailManager:** use `EMAILMANAGER_BUSINESS_REQUIREMENTS.md` as the requirements.

## 3. Non-negotiables (from the playbook's safety rules)

- Never use real data in tests. Fakes only; the test-only sign-in exists only in test mode.
- Keep personal email addresses out of the repository. Commits use the GitHub noreply address, set for the repo only.
- Secrets stay in the gitignored `.env`; never print them or put them in chat.
- Never force-push, rewrite history, or change repository settings without the Creator's explicit OK.
- Stay inside the project folder. Don't install system software that needs the Creator's password; tell them how.
- Talk in business language. Explain what each step achieves, give one copy-pasteable command when the Creator must
  run something, and prefer double-clickable files and helper scripts over editing files.
