# EmailManager workshop: facilitator guide

You run a workshop in which business analysts each build their own EmailManager from a requirements document,
using Claude in the Claude app's Code tab. Attendees follow [ATTENDEE_GUIDE.md](./ATTENDEE_GUIDE.md); Claude follows
[WORKSHOP_START.md](./WORKSHOP_START.md). Before running the real workshop, do the [dry run](./DRY_RUN_PLAN.md).

Items marked **(confirm in dry run)** are app or admin wording I couldn't verify; check them on the day of your dry
run and correct this guide and the attendee guide.

## Format

| Session          | Length    | Goal                                                                                                               |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| **1**            | 3–4 hours | Each attendee has their app running on the demo mailbox (milestone 1)                                              |
| **2** (optional) | 3–4 hours | Their business rules with automated tests (milestone 2), then Categorize (milestone 3), then optionally real Gmail |

_Full-day variant:_ run session 2 straight after lunch. Everything else stays the same.

## 4–6 weeks before: Claude Team seats

Attendees use seats in a **Claude Team** plan that you pay for, so they don't need their own subscription.

1. Buy a Team plan at <https://claude.com/pricing>. Per the coordinator's check (confirm when you buy): Team
   Standard seats include Claude Code; about $25 per seat per month billed monthly, or $20 billed annually; 2 to 150
   seats. Buy one seat per attendee, plus yours.
2. In the Team's admin settings, make sure **Claude Code is enabled** for members. **(confirm in dry run:** the
   menu's exact name)
3. Invite each attendee by email from the admin settings ("Members" or similar). **(confirm in dry run)**
4. **Check the usage limits.** In your dry run, note how much of a seat's usage a full session-1 build consumes (see
   DRY_RUN_PLAN.md). If one build gets close to the limit, plan a short break or a lighter build for session 1.

## 2 weeks before: attendee preparation

1. Send each attendee:
   - [ATTENDEE_GUIDE.md](./ATTENDEE_GUIDE.md) (or its GitHub link)
   - the example requirements, if they don't bring their own: `docs/creator-kit/EMAILMANAGER_BUSINESS_REQUIREMENTS.md`
   - the date by which the "Before the workshop" steps must be done (suggest 3 days before)
2. Ask each attendee to send you the last lines of the readiness check, or a screenshot. "Your Mac is ready for the
   workshop" is what you want to see.
3. Chase anyone who hasn't accepted their invitation or finished the check.

## On the day: session 1 agenda (about 3.5 hours)

| Time | What                                                                                                                                                                      | Checkpoint                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0:00 | Welcome. What we'll build. Show your finished app from the dry run                                                                                                        | —                                                             |
| 0:15 | Concepts in 10 minutes: requirements → Claude → running app; what runs on your Mac (see `docs/creator-kit/TECHNICAL_DECISIONS_EXPLAINED.md`); demo mailbox vs. real Gmail | —                                                             |
| 0:25 | Everyone opens the Claude app → **Code** tab → Workshop folder, and pastes the start sentence                                                                             | **0:40:** everyone has seen Claude's two questions            |
| 0:40 | Claude checks the Mac, attendees answer the questions, Claude summarizes the requirements                                                                                 | **1:00:** everyone has replied "OK to build"                  |
| 1:00 | Build (Claude works; attendees watch and approve permissions). Talk through what's happening on screen                                                                    | **1:45:** most attendees are past "installing" and "database" |
| 1:45 | Break                                                                                                                                                                     | —                                                             |
| 2:00 | Build finishes; automated checks run                                                                                                                                      | **2:30:** the app opens in the browser for everyone           |
| 2:30 | Tour your own app: demo mailbox, Load more, placeholder screens, Sign out. Stop/Start with the double-click files                                                         | —                                                             |
| 3:00 | Walk through the business rules in the requirements (decision tables) as a preview of session 2                                                                           | —                                                             |
| 3:20 | Wrap-up: what was built, homework (optional real Gmail), feedback                                                                                                         | —                                                             |

## Session 2 agenda (optional, about 3.5 hours)

| Time | What                                                                                                  | Checkpoint                             |
| ---- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 0:00 | Everyone double-clicks **Start**, then tells Claude: "Continue the workshop: session 2"               | **0:10:** apps running                 |
| 0:10 | Milestone 2: the rules engine. Claude builds the rules and a test per decision-table row and scenario | **1:30:** tests listed and passing     |
| 1:30 | Review the tests as a business analyst: is every rule covered? Ask Claude to add the ones missing     | —                                      |
| 2:00 | Break                                                                                                 | —                                      |
| 2:15 | Milestone 3: Categorize (needs an Anthropic API key; decide in advance whether you provide one)       | **3:15:** categories and reasons shown |
| 3:15 | Wrap-up; optional homework: connect real Gmail (WORKSHOP_START W8)                                    | —                                      |

## Demo points worth pausing on

- **Claude's two questions:** everything else was decided in advance. That's the creator kit doing its job.
- **The requirements summary:** compare it with the attendee's own document. Did Claude get it right?
- **Permission requests:** the attendee is always in control of what runs on their Mac.
- **The automated checks:** dozens of checks run in seconds, every time.
- **Demo mode:** realistic data without touching anyone's real mailbox.
- **Start/Stop:** coming back later takes a double-click.

## Fallback if someone is behind

- **At the 1:00 checkpoint, no "OK to build" yet:** look at the conversation together. Usually Claude is waiting for
  an answer, or Docker isn't running.
- **At the 1:45 checkpoint, still installing:** tell Claude: _"We're short on time: do the minimal build."_
  WORKSHOP_START tells it to skip the personalization and just get the app running.
- **At 2:30, no running app:** pair them with a neighbor for the tour. Their own build can finish in the background,
  or after the session.
- **Mac problems** (old macOS, no disk space, Docker won't install): pair them with someone. Have them redo the
  readiness check at home.

## Common snags

| Snag                                               | Fix                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Docker isn't running                               | Open Docker from Applications and wait for "running". Tell Claude it's running                |
| The Command Line Tools window                      | Click Install and wait (5–15 minutes)                                                         |
| Lots of permission requests                        | Choose "always allow for this folder" if offered **(confirm in dry run)**                     |
| The attendee typed into Terminal instead of Claude | Nothing breaks; return to the Claude app                                                      |
| The Mac slept mid-build                            | Wake it and tell Claude "continue"                                                            |
| Usage limit reached                                | Wait for the limit to reset, or switch to the "minimal build" fallback **(check in dry run)** |
| Wi-Fi is slow                                      | The first install downloads a lot; ask attendees to complete the readiness check at home      |
| "Port in use"                                      | Claude picks other ports automatically                                                        |

## After the workshop

- Remove the attendees' seats in the Team admin settings to stop billing **(confirm in dry run)**, or keep them for
  session 2.
- Attendees keep their apps. Everything is on their own Mac, in `~/Workshop/<AppName>`.
- Collect feedback, and update ATTENDEE_GUIDE.md, WORKSHOP_START.md and this guide.
