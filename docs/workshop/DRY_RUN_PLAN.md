# Dry run: emailmanager_BA

Before the real workshop, go through it yourself exactly as an attendee would, with a project called
**EmailManager_BA**. The goals: confirm that every step works and that the wording in the guides matches what you
see, time each phase, and measure how much of a seat's usage one build consumes.

Your Mac already runs EmailManager. The dry-run app uses different ports (web 5190, API 3701, database 5460/5461)
and its own database, so the two can run side by side.

## Best: simulate a brand-new attendee

Your Mac already has the developer tools, so the readiness check will be all green. For a truer test, create a second
macOS user (System Settings → Users & Groups → Add User) and do the dry run there. That user starts with nothing
installed, like most attendees. Docker Desktop is shared between users on the Mac, but nvm and Node aren't.

If you skip that, run it as yourself. Everything else still applies.

## Steps (follow ATTENDEE_GUIDE.md as written)

Record the start and end time of each phase.

| #   | Phase                                                                                             | Start | End | Notes |
| --- | ------------------------------------------------------------------------------------------------- | ----- | --- | ----- |
| 1   | Accept the Team invitation; sign in to the Claude app with it (if you've set up the Team already) |       |     |       |
| 2   | Docker Desktop (if it isn't already installed for this user)                                      |       |     |       |
| 3   | Readiness check (paste the one line in Terminal)                                                  |       |     |       |
| 4   | Put a requirements file in `~/Workshop` (e.g. copy `EMAILMANAGER_BUSINESS_REQUIREMENTS.md`)       |       |     |       |
| 5   | Claude app → **Code** tab → Workshop folder → paste the start sentence                            |       |     |       |
| 6   | Claude checks the Mac, asks the two questions; you answer **EmailManager_BA**                     |       |     |       |
| 7   | Requirements summary and questions; you reply OK                                                  |       |     |       |
| 8   | Plan checkpoint; you reply OK                                                                     |       |     |       |
| 9   | Build: scaffold, install, database, personalization, checks                                       |       |     |       |
| 10  | The app opens; "Try with the demo mailbox"; tour                                                  |       |     |       |
| 11  | Stop / Start with the double-click files                                                          |       |     |       |
| 12  | (Optional) Session 2: "Continue the workshop: session 2", milestone 2                             |       |     |       |

**Targets for session 1:**

- Phases 5–8 take under 30 minutes.
- Phase 9 takes under 90 minutes.
- Phases 1–4 are done before the day.

## Things to confirm, and fix in the guides

- [ ] The Claude app's tab is called **Code**, and you choose a folder the way the attendee guide says.
- [ ] The wording of the permission prompts, and whether there's an "always allow for this folder" option.
- [ ] Team admin: where to enable Claude Code, invite members and remove seats.
- [ ] Team seat usage: after phase 9, how much of the limit was used? Is there room for session 2 the same day?
- [ ] Docker Desktop's first-run screens (password, sign-in, survey): note which ones attendees can skip.
- [ ] macOS opens `Start EmailManager_BA.command` on the first double-click, or needs right-click → Open.
- [ ] Nothing in `~/Workshop/EmailManager_BA` contains a personal email address (Claude checks this, but look).
- [ ] What would confuse a non-technical attendee? Write it down; it becomes a line in "Stuck?".

## Afterwards

- Tell Claude (in this EmailManager project) what you found, and it updates ATTENDEE_GUIDE.md, WORKSHOP_START.md and
  FACILITATOR_GUIDE.md.
- To remove the dry-run app completely:
  1. double-click **Stop EmailManager_BA** (or ask Claude to stop it with the database)
  2. delete the `~/Workshop/EmailManager_BA` folder
  3. ask Claude to remove its Docker containers
