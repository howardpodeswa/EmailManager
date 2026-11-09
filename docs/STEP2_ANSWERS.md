# EmailManager: Step 2 answers

**Date:** 2026-11-09

These are Howard's answers to the step 2 review questions. Questions listed under
"Answers" were answered directly. For every other question Howard answered "OK to the
rest", so the suggested default was accepted; those are listed under "Accepted defaults".

> **Where this file and `docs/REQUIREMENTS.md` v1.4 differ, REQUIREMENTS.md v1.4 wins.**
> In particular, any Google account can sign in (D12). The earlier "single-user" wording
> and the `ALLOWED_GOOGLE_EMAIL` idea from Q3 no longer apply.

## Answers

| # | Topic | Answer |
|---|---|---|
| Q1 | Unit of categorization | The Gmail **thread** (see D11). |
| Q2 | Where to build | On Howard's Mac. |
| TR-01 | QA account | Manual QA and testing use the QA account (its address is set locally in `.env` as `QA_ACCOUNT_EMAIL`). The owner's personal account is never used (D13). |
| Q3 | Who can sign in | Any Google account; all data is scoped per user (D12). |
| Q4 | Link-text check | Compare main (registrable) domains; links through a trusted click-tracker list count as matching (D14). |
| Q5 | Text the rules check | Only the new text of a message, not quoted or forwarded content (D15). |
| Q7 | Body source | The plain-text part, or text extracted from HTML; links are taken from the HTML. |
| Q13 | Deadlines | AI deadline detection, with a date-parser backup. |
| Q14 | Category changes | As in D17: remove the old label, star and app-written draft and apply the new category's actions; keep a draft the user edited and tell the user. |
| Q15 | Manual change to Read and respond | As in D17: apply the label, star and draft immediately. |
| Q18 | AI calls | One structured AI call per thread (D16). |
| Q19 | Models | Claude Haiku 4.5 for assessments, Claude Sonnet 5.5 for drafts, set by `ANTHROPIC_ASSESSMENT_MODEL` and `ANTHROPIC_DRAFT_MODEL`. No cost ceiling. |
| Q32 | Impersonated brands | No banks. Default brand list: paypal, apple, google, microsoft, amazon, netflix. |
| Q36 | Storing email | No email bodies are stored (D18). |
| Q37 | Tests | Fake providers and a sign-in route that exists only when `NODE_ENV=test` (D19). |
| Q38 | Repository | Public GitHub repo `howardpodeswa/EmailManager`. |

## Accepted defaults

- **Q6** Keep "unsubscribe" and "do not reply" in the automated-phrase list.
- **Q8** Blocking a domain also blocks its subdomains.
- **Q9** Lookalike domain = edit distance ≤ 2 on the name part, plus 1↔l, 0↔o and rn↔m
  swaps, plus a brand name embedded in a different domain. Exact matches aren't flagged.
- **Q10** Known sender = exact address, found with a cached Sent-mail search. Domains don't count.
- **Q11** Spam signal = DMARC fail, or SPF and DKIM both failing.
- **Q12** Priority is computed for all categories but shown and sorted only on Inbox and To Respond.
- **Q16** If a draft is edited in both the app and Gmail, show both and let the user pick before confirming.
- **Q17** Cancelling a run keeps Gmail changes already applied.
- **Q20** The AI gets the first 8,000 characters of the new text, no attachments, and only the
  From/To/CC/Subject/Date headers.
- **Q21** No cap on drafts per run.
- **Q22** Undo covers archive only.
- **Q23** Inbox is newest first; category screens sort by priority.
- **Q24** `config.ts` plus `.env.example` and `.env` loading.
- **Q25** React 19.
- **Q26** Lean package split.
- **Q27** git init: already done via GitHub.
- **Q28** Discard deletes the app's Gmail draft.
- **Q29** A draft deleted or replied to in Gmail is marked "handled outside the app".
- **Q30** Deselected items stay pending on To Archive.
- **Q31** Auto-archive happens during the run and can be undone.
- **Q33** Known-sender lookback is all time, cached.
- **Q34** Gmail Promotions/Social/Updates count as a 5th automated signal.
- **Q35** Priority words are editable in Settings.
- **Q39** Keep tactica's major versions; React 19 only for web.
- **Q40** Dev mode with two terminals.

## Ports

Web 5180 · API 3601 · Postgres dev 5450 / test 5451 · e2e fixtures 4699 · OAuth redirect
`http://localhost:3601/emailmanager-core/auth/google/callback`.
