# EmailManager: Build Instructions and Requirements

**Version:** 1.3 · **Date:** 2026-10-01 · **Product owner:** Howard Podeswa

---

# Part A: Instructions for Claude Code

## A1. Your task

Build **EmailManager**, a web application that lets a user view their email, have it
categorized and prioritized by business rules, and review the results before anything is
changed in their mailbox.

Work in the following order and **stop at each checkpoint** marked ⏸ for my review.

1. **Investigate.** Read the reference project (section A3) and this entire document.
2. **Ask.** ⏸ Before writing any code, give me:
   - a summary of your understanding of the product and the categorization rules,
   - the tech stack you plan to use, showing what you're reusing from the reference project
     and what you're changing,
   - a list of questions about anything unclear, missing or contradictory. The decisions
     in Part D have already been made. Don't ask about them again unless you find a
     problem with one.
3. **Plan.** ⏸ After I answer, propose a step-by-step build plan based on the milestones in A5.
4. **Build** one milestone at a time. ⏸ Stop after each milestone and tell me how to run
   and test it.

## A2. Project location

- Project directory (already created): `/Users/howardpodeswa/Noble/projectcode/EmailManager`
- This document is saved in the project as `docs/REQUIREMENTS.md`. Keep it there and
  treat it as the source of truth.
- Don't create or change any files outside this directory. The reference project in A3
  is **read-only**.

## A3. Reference project and technical choices

- Reference project: `/Users/howardpodeswa/Noble/projectcode/tactica` (a chess app).
- Read `tactica/README.md` and `tactica/docs/BUILDS_AND_DEPS.md`, and look at the
  project's code and configuration.
- **Use the same technical choices and conventions as tactica** (folder structure, code
  style, Prettier/ESLint/TypeScript settings, pnpm supply-chain settings, scripts, CI),
  with the decided stack below:

| Area | tactica | EmailManager (decided) |
|---|---|---|
| Type of app | Mobile app (and web via Expo) | **Website** that runs in a desktop web browser |
| Monorepo, language | pnpm workspaces + Turborepo, TypeScript, Node 22 | **Same** |
| Backend | Fastify + ts-rest + Drizzle, Postgres in Docker | **Same.** Postgres stores categorization results, settings, the activity log and the user's Google tokens. |
| Background jobs | pg-boss | **Same.** Use it for Categorize runs, so the UI can show progress and the user can cancel. |
| Pluggable data source | `GameSource` interface, `ChessComGameSource` | **Same pattern:** `EmailProvider` interface, `GmailProvider` |
| UI framework | React Native + Expo + Expo Router | **React + Vite + React Router.** Do **not** use React Native, React Native for Web or Expo. |
| Front-end data | TanStack Query + axios | **Same** |
| Sign-in | SuperTokens | **No SuperTokens.** The backend handles Google OAuth directly (see TR-01). |
| AI | None | **Claude API (Anthropic)** (see TR-04) |
| Tests | Vitest, Playwright (web E2E), Maestro (mobile E2E) | **Vitest and Playwright.** No Maestro. |
| Not needed | Xcode, cmake, Stockfish, iOS/Android tooling | Leave out |

## A4. Technical requirements

- **TR-01 Email provider and sign-in: Gmail.** The first and only supported account is
  `howardpodeswa@gmail.com`. Use the Gmail API. The backend runs the Google OAuth 2.0 flow
  itself (no SuperTokens), stores the refresh token **encrypted** in Postgres, and keeps the
  user signed in with a secure, HTTP-only session cookie. Don't store the user's Google
  password, and don't hard-code the email address in the code.
- **TR-02 Gmail permissions:** Use the `gmail.modify` scope, which is the smallest Gmail
  permission that allows reading, labeling, starring, archiving, creating drafts and
  sending. Don't request permanent deletion (`https://mail.google.com/`) or Google Contacts.
  Because `gmail.modify` also allows sending, the rule that email is only sent after the
  user approves it (FR-08, FR-15) must be enforced in the app's code: there must be exactly
  one code path that sends email, and it must require an approval record.
  Give me step-by-step instructions for setting up the Google Cloud project, OAuth consent
  screen (Testing mode) and test user. I'll do that part myself. Note: in Testing mode,
  Google expires the sign-in after 7 days, so the app must handle an expired token by
  asking me to sign in again.
- **TR-03 Multiple providers later:** Put all Gmail-specific code behind a provider
  interface (e.g., `EmailProvider`), so that other providers (e.g., Outlook) and more
  accounts can be added later without changing the rules engine or the user interface.
- **TR-04 AI:** Use the Claude API (Anthropic) for the AI assessments in Part C and for
  writing draft replies. Call it only from the backend. Make the model name configurable.
  Ask the model for structured (JSON) output that includes the decision, confidence and
  reason described in C1.
- **TR-05 Secrets:** API keys, the OAuth client secret and the token-encryption key must
  never be sent to the browser or committed to source control. Keep them in environment
  variables on the backend, provide an `.env.example`, and keep `.env` in `.gitignore`
  (as tactica does).
- **TR-06 Rules engine:** Implement the categorization rules as a separate module with no
  dependency on Gmail, the AI service or the user interface. Each rule is an object with an
  ID, a condition and a resulting category, kept in an ordered list.
- **TR-07 Testing:** Write unit tests for every row of the decision table (C5) and every
  scenario in C7, using mocked email, AI and URL checks. Write these tests before
  connecting the rules engine to Gmail.
- **TR-08 Running locally:** The app runs only on my Mac (localhost) for a single user,
  with Postgres in Docker Desktop as in tactica. Give me the commands to install, run and
  test it, and update the project README the way tactica's README is written. Use ports
  that don't clash with tactica's (see its README).
- **TR-09 Link checking:** Use the Google Safe Browsing API for BR-03 check 1 when a
  `SAFE_BROWSING_API_KEY` is set. If it isn't set, skip that check, run the other three, and
  record that it was skipped (FR-06).
- **TR-10 Testing with real email:** Automated tests must never send email or change my
  real mailbox. Use mocked providers in tests.

## A5. Suggested milestones

1. Project setup, sign in with Google, and show the inbox (read-only).
2. Rules engine and unit tests (no Gmail changes).
3. "Categorize" run that shows proposed categories and reasons, without changing Gmail.
4. Review screens: labels and stars, and archiving after the user approves.
5. AI draft replies, and **Approve & send** (FR-15).
6. Settings screen for the configurable lists and thresholds.

---

# Part B: Product requirements

## B1. Users and scope

- One user (the product owner), using one Gmail account, on a desktop web browser.
- Out of scope for this version: other email providers, more than one account, mobile
  layout, hosting on a server, sending any email the user hasn't approved, sending new
  emails (only replies), and permanently deleting email.

## B2. User workflow

1. The user signs in with their Google account.
2. The app shows the user's inbox.
3. The user clicks **Categorize** to run the business rules (Part C) on the emails in the
   inbox that haven't been categorized yet.
4. The app assigns each email a **category** and a **priority**, and shows why.
5. The user reviews the results on the review screens (B3) and approves or changes them.
6. The app carries out the approved actions in Gmail: archiving approved emails, and
   sending each reply the user approves.

## B3. Screens

| Screen | Purpose |
|---|---|
| **Sign in** | Sign in with Google. |
| **Inbox** | List of emails (sender, subject, date, snippet, category, priority). Click an email to read it. Button to start **Categorize**. Filter by category. |
| **To Archive** | Emails categorized as Archive, with the rule and reason for each. The user can deselect emails or change their category, then click **Archive selected**. |
| **To Respond** | Emails categorized as Read and respond, sorted by priority. For each one, the user can read the email, read and edit the AI draft, regenerate it, discard it, or click **Approve & send** (FR-15). |
| **To Read** | Emails categorized as Read and do not respond. The user can mark them as read. |
| **Settings** | Edit the blocked-sender list, keyword and phrase lists, impersonated-brand domain list, AI confidence threshold, and whether archiving needs approval (FR-11). |
| **Activity log** | List of categorize runs and the actions taken (including archived emails and sent replies), with date, email and result. |

## B4. Functional requirements: application

- **FR-09 Show email:** The Inbox screen shall load the most recent inbox emails, with
  paging to load more.
- **FR-10 On-demand categorization:** Categorization shall run when the user clicks
  **Categorize**. It shall skip emails that have already been categorized, unless the user
  chooses **Recategorize**. Emails the user has manually changed (BR-07) are always skipped.
  Each run covers at most the **200 most recent** inbox emails (configurable in Settings).
- **FR-11 Review before archiving:** Emails categorized as Archive shall not be archived
  until the user approves them on the To Archive screen. A setting can switch to automatic
  archiving. It is off by default.
- **FR-12 Gmail actions for each category:**

| Category | Gmail action |
|---|---|
| Archive | After approval: add the label `EmailManager/Archive` and remove the email from the inbox. |
| Read and respond | Add the label `EmailManager/Read and respond`, star the email, and save the AI draft reply in Gmail Drafts in the same thread. The reply is sent only after approval (FR-15). |
| Read and do not respond | Add the label `EmailManager/Read and do not respond`. Leave it in the inbox. |

  The labels, stars and drafts are applied when Categorize runs. Archiving and sending wait
  for the user's approval.

- **FR-13 Priority:** Each email shall be given a priority of **High** or **Normal**.
  An email is High if it contains "urgent", "ASAP" or "time-sensitive", if it mentions a
  deadline within the next 2 days, or if an AI assessment finds it urgent. Lists are sorted
  by priority first, then by date (newest first).
- **FR-14 Undo:** The user shall be able to undo an archive action from the Activity log
  (move the email back to the inbox and remove the label).
- **FR-15 Approve & send:** A draft reply shall be sent only when the user clicks
  **Approve & send** for that specific reply.
  - Before sending, the app shows a confirmation with the final recipients, subject and
    body, and states that sending can't be undone.
  - Edits the user makes in the app are saved to the Gmail draft before it is sent.
  - The app sends one reply per approval. There is no "send all" or bulk send.
  - The reply goes only to the original sender by default. Adding other recipients (e.g.,
    reply-all) requires the user to choose it.
  - After sending, the email's `EmailManager/Read and respond` label and star are removed,
    and the sent reply is recorded in the Activity log.
  - If the user edited the draft in Gmail, the app uses the latest version from Gmail.

---

# Part C: Email categorization rules

## C1. Glossary

| Term | Definition |
|---|---|
| **Email** | A single message received in the user's inbox, including sender, recipients, subject, body, links and headers. |
| **Category** | The one label assigned to an email by this feature. Each email has exactly one category. |
| **Priority** | High or Normal, as defined in FR-13. |
| **Known sender** | A sender whom the user has sent email to before (found in the user's Sent mail). |
| **Blocked sender** | A sender address or domain that the user has added to the blocked list in settings. |
| **Spam assessment** | A judgment that an email is unsolicited or junk, based on the email provider's spam signals and/or an AI evaluation. |
| **Suspicious URL** | A link that meets at least one criterion in BR-03. |
| **Automated email** | An email sent by a system rather than written by a person, as defined in BR-04 (e.g., receipts, account alerts, newsletters, shipping updates). |
| **Reply-needed keyword** | A phrase in the configurable list in BR-05. |
| **AI assessment** | A result from the AI model that includes a yes/no decision, a confidence score (0–1) and a one-sentence reason. |
| **Draft reply** | A reply that the AI writes and saves in the user's Gmail Drafts folder. It is sent only after the user approves it (FR-15). |

## C2. Categories

| Category | Meaning |
|---|---|
| **Archive** | The email is junk, unwanted or a security risk. The user does not need to see it. The email is archived, not deleted, and the user can still find it by searching. |
| **Read and respond** | The email is from a person and needs a reply from the user. **The draft reply is sent only after the user approves it (FR-15).** |
| **Read and do not respond** | The email has information the user may want to read, but no reply is needed. This is also the **default** category. |

The Gmail action for each category is in FR-12.

## C3. Evaluation order

Rules are written in RuleSpeak style. They are **evaluated in the order listed**, and the
**first rule that matches decides the category**. Later rules are not evaluated.

Why this order:
- Rules 1–3 (Archive) come first because spam and phishing often use words like "urgent"
  to pressure the reader.
- Rule 4 (automated email) comes before rule 5 (reply needed), because replying to an
  automated sender is pointless even when it says "urgent" or "action required".

## C4. Business rules

### BR-01: Blocked sender
An email **must** be categorized as **Archive** if its sender address or sender domain is
on the user's blocked list.

### BR-02: Junk mail
An email **must** be categorized as **Archive** if it is assessed as spam, **unless** it is
from a known sender.

- The spam assessment uses the email provider's spam signals (e.g., a provider spam label,
  or failed SPF/DKIM/DMARC results in the `Authentication-Results` header) **and/or** an
  AI assessment of the sender and content.
- Known senders are exempt so that email from real contacts is never hidden by a
  mistaken spam judgment. (Known senders are still checked by BR-03.)
- Note: Gmail moves most spam to its Spam folder before it reaches the inbox, and the app
  doesn't read the Spam folder. So in practice this rule mainly relies on failed
  authentication results and the AI assessment.

### BR-03: Suspicious email
An email **must** be categorized as **Archive** if it contains at least one suspicious URL.
This rule applies to **all** senders, including known senders, because a contact's account
can be hacked.

A URL is suspicious if **any** of these is true:
1. Google Safe Browsing flags it (when configured, see TR-09).
2. The visible link text shows a web address with a different domain than the real link.
3. The host is a raw IP address (e.g., `http://192.168.4.20/login`).
4. The domain is a close misspelling of a domain on a configurable list of commonly
   impersonated brands (e.g., `paypa1.com` vs. `paypal.com`).

### BR-04: Automated email
An email **must** be categorized as **Read and do not respond** if it is an automated email.

An email is automated if **any** of these is true:
1. The sender address is a no-reply address (local part contains `noreply`, `no-reply`,
   `donotreply` or `do-not-reply`).
2. The email has a header that marks it as bulk or automatic: `List-Unsubscribe`,
   `List-Id`, `Precedence: bulk` or `Precedence: list`, or `Auto-Submitted` with any value
   other than `no`.
3. The body contains a phrase from the configurable automated-email phrase list
   (default: "do not reply", "do not respond", "this is an automated message",
   "this email was sent automatically", "you are receiving this email because",
   "unsubscribe", "manage your notification settings").
4. An AI assessment determines that the email was sent by an automated system rather than
   written by a person.

### BR-05: Reply needed
An email **must** be categorized as **Read and respond** if **any** of these is true:
1. The subject or body contains a reply-needed keyword (default list: "urgent", "ASAP",
   "respond by", "reply by", "RSVP", "let me know by", "time-sensitive").
2. An AI assessment determines that the sender is asking the user a question or making a
   request that expects a reply from the user. The AI should give more weight to emails
   where the user is in the **To** field than where the user is only in **CC**.

### BR-06: Default
An email that matches none of BR-01 to BR-05 **must** be categorized as
**Read and do not respond**.

### BR-07: Manual override
If the user manually changes an email's category, the system **must not** recategorize
that email automatically.

## C5. Decision table

The first matching row wins. "–" means the condition doesn't matter.

| # | Blocked sender? | Spam and not a known sender? | Suspicious URL? | Automated? | Reply needed? | Category | Rule |
|---|---|---|---|---|---|---|---|
| 1 | Yes | – | – | – | – | Archive | BR-01 |
| 2 | No | Yes | – | – | – | Archive | BR-02 |
| 3 | No | No | Yes | – | – | Archive | BR-03 |
| 4 | No | No | No | Yes | – | Read and do not respond | BR-04 |
| 5 | No | No | No | No | Yes | Read and respond | BR-05 |
| 6 | No | No | No | No | No | Read and do not respond | BR-06 |

## C6. Functional requirements: categorization

- **FR-01** Categorization runs on demand, as described in FR-10.
- **FR-02** Keyword and phrase matching shall ignore case, apply to the subject and body,
  and match whole words or phrases only (e.g., "urgent" does not match "urgently").
- **FR-03** The blocked-sender list, the impersonated-brand domain list, the automated-email
  phrase list and the reply-needed keyword list shall be editable in Settings and must not
  be hard-coded.
- **FR-04** An AI assessment shall count only if its confidence is at or above a
  configurable threshold (default 0.7). Below the threshold, the condition is treated as false.
- **FR-05** For each email, the system shall store and show the category, the priority,
  the rule ID that decided the category (e.g., "BR-05"), and a short reason
  (e.g., "Contains keyword 'RSVP'").
- **FR-06** If the AI service or a URL reputation service is unavailable, the system shall
  still apply the rules that don't depend on it, record which check was skipped, and allow
  the email to be recategorized later.
- **FR-07** A draft reply shall be written in the same language as the email it answers and
  shall be saved as a reply in the same thread.
- **FR-08** The system shall send an email only when the user approves that specific
  reply (FR-15). It shall never send automatically, in bulk, or as part of a Categorize run.

## C7. Acceptance criteria

```gherkin
Scenario: Email from a blocked sender is proposed for archiving
  Given "deals@shop.example" is on the blocked list
  And an email arrives from "deals@shop.example"
  When the user clicks Categorize
  Then its category is "Archive" with rule "BR-01"
  And it appears on the To Archive screen
  And it is still in the Gmail inbox

Scenario: Approved archive is carried out
  Given an email is on the To Archive screen
  When the user selects it and clicks "Archive selected"
  Then it is removed from the Gmail inbox
  And it has the label "EmailManager/Archive"
  And the action appears in the Activity log with an Undo option

Scenario: Spam from an unknown sender is archived
  Given an email from an unknown sender that the email provider has flagged as spam
  When the user clicks Categorize
  Then its category is "Archive" with rule "BR-02"

Scenario: Known sender is not archived as spam
  Given an email from a sender the user has emailed before
  And the AI assesses the email as spam
  And the email contains no suspicious URLs
  When the user clicks Categorize
  Then its category is not "Archive"

Scenario: Urgent phishing email is archived, not answered
  Given an email with subject "URGENT: verify your account"
  And the email has a link whose text shows "paypal.com" but points to "paypa1-login.net"
  When the user clicks Categorize
  Then its category is "Archive" with rule "BR-03"
  And no draft reply is created

Scenario: Automated email with "urgent" is not answered
  Given a non-spam email from "alerts@bank.example" with a "List-Unsubscribe" header
  And the subject is "Urgent: your card expires soon"
  When the user clicks Categorize
  Then its category is "Read and do not respond" with rule "BR-04"
  And no draft reply is created

Scenario: A person asks for a reply
  Given a non-spam email from a person with no suspicious URLs
  And the body says "Can you RSVP by Friday for the team dinner?"
  When the user clicks Categorize
  Then its category is "Read and respond" with rule "BR-05"
  And the email is starred in Gmail
  And a draft reply is saved in the same thread
  And no email is sent

Scenario: Approved reply is sent
  Given an email on the To Respond screen with a draft reply
  When the user edits the draft and clicks "Approve & send"
  And confirms the recipients, subject and body
  Then exactly one reply, with the user's edits, is sent in the same thread
  And only to the original sender
  And the email's "EmailManager/Read and respond" label and star are removed
  And the sent reply appears in the Activity log

Scenario: Nothing is sent without approval
  Given 5 emails are categorized as "Read and respond"
  When the Categorize run finishes
  Then 5 draft replies exist in Gmail Drafts
  And no email has been sent

Scenario: Urgent request is high priority
  Given a non-spam email from a person that says "Urgent: please send the contract today"
  When the user clicks Categorize
  Then its category is "Read and respond"
  And its priority is "High"
  And it appears at the top of the To Respond screen

Scenario: Personal FYI email
  Given a non-spam email from a person saying "Here are the photos from the weekend"
  And the AI determines no reply is expected
  When the user clicks Categorize
  Then its category is "Read and do not respond" with rule "BR-06"

Scenario: Manual override is kept
  Given the user changed an email's category to "Read and respond"
  When the user clicks Recategorize
  Then the email's category is still "Read and respond"
```

## C8. Non-functional requirements

- **NFR-01 Privacy:** Email content sent to the Claude API must be limited to what the
  check needs (e.g., strip attachments and trim long bodies). Tell the user in the app
  that their email content is analyzed by AI.
- **NFR-02 Testability:** See TR-06 and TR-07.
- **NFR-03 Performance:** Categorizing 100 emails should take under 2 minutes. Show a
  progress indicator during a run, and let the user cancel it.

---

# Part D: Decisions already made

| # | Question | Decision | Where it's reflected |
|---|---|---|---|
| D1 | Sign-in | Backend handles Google OAuth directly; no SuperTokens. | A3, TR-01 |
| D2 | AI service | Claude API (Anthropic). | A3, TR-04 |
| D3 | First run size | 200 most recent inbox emails, configurable. | FR-10 |
| D4 | Hosting | Runs only on my Mac (localhost) for now. | TR-08, B1 |
| D5 | Storage | Postgres in Docker, as in tactica. | A3, TR-08 |
| D6 | Link checking | Google Safe Browsing, optional (used when an API key is set). | TR-09, BR-03 |
| D7 | Known sender | Based on the user's Sent mail only, not Google Contacts. | C1 |
| D8 | When Gmail changes happen | Labels, stars and drafts are applied when Categorize runs. Archiving and sending wait for my approval. | FR-11, FR-12 |
| D9 | Sending replies | The app sends a reply only after I click Approve & send for that reply. | FR-08, FR-15 |
| D10 | Gmail permission | `gmail.modify`, with approval-only sending enforced in code. | TR-02 |

---

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-10-01 | First draft of categorization rules. |
| 1.1 | 2026-10-01 | Archive confirmed (not Trash). Default category set to "Read and do not respond". Keywords "important" and "update" removed. Notification rule replaced by automated-email rule (BR-04) and moved ahead of the reply rule. Added blocked-sender rule (BR-01) and known-sender exemption from spam (BR-02). Reply rule (BR-05) broadened from "urgent" to "reply needed". Lookalike-domain check limited to a configurable list. Added FR-07. |
| 1.2 | 2026-10-01 | Added Part A (instructions for Claude Code, project location, reference project, technical requirements, milestones) and Part B (users, workflow, screens, application requirements). Categorization now runs on demand. Archiving requires user approval by default. Added priority (FR-13), undo (FR-14), NFR-03 and Part D. Gmail selected as the first provider. |
| 1.3 | 2026-10-01 | Reviewed against the tactica project. Stack decided (A3). Part D open questions replaced by decisions D1–D10. The app may now send a reply after the user approves it (FR-08, new FR-15), replacing "never send". Google OAuth handled by the backend (TR-01); `gmail.modify` scope (TR-02); Claude API (TR-04); Safe Browsing optional (TR-09); no real email in tests (TR-10). First run limited to 200 emails. Known sender based on Sent mail only. Fixed project paths. Added scenarios for approving and sending replies. |
