# Creator kit

For turning business requirements into a running application with Claude, the way EmailManager was built.

| File                                                                             | For               | What it is                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [CREATOR_PLAYBOOK.md](./CREATOR_PLAYBOOK.md)                                     | Claude            | Step-by-step instructions with every technical decision already made. Claude asks you only for what it can't decide                   |
| [CREATOR_GUIDE.md](./CREATOR_GUIDE.md)                                           | You (the Creator) | The same steps in plain language: what each achieves, and what you'll be asked                                                        |
| [CREATOR_TEMPLATES.md](./CREATOR_TEMPLATES.md)                                   | Claude            | The full contents of every file the playbook creates, with placeholders, so no other project is needed                                |
| [EMAILMANAGER_BUSINESS_REQUIREMENTS.md](./EMAILMANAGER_BUSINESS_REQUIREMENTS.md) | You and Claude    | EmailManager's business requirements only (use cases, user stories, rules, decision tables, diagrams), ready to build another version |

## Start a new project

**With the skill (main path).** Install it once:

- On this Mac: run `./tools/scripts/install_creator_skill.sh` from the EmailManager folder, then restart Claude.
- For claude.ai: run the same script with `--zip`, then upload `skill/build-app-from-requirements.zip` under
  Settings → Capabilities → Skills.

Then add only your requirements file to a Claude project and say "Build an application from my requirements." In
Claude Code, say "Build an application from my requirements in `<path>`". The skill
([skill/build-app-from-requirements](./skill/build-app-from-requirements/)) loads the kit by itself.

**Without the skill (fallback).** Attach `CREATOR_PLAYBOOK.md` and `CREATOR_TEMPLATES.md` with your requirements and
say "Read CREATOR_PLAYBOOK.md and build an application from my requirements." In Claude Code you can link the raw file
instead: `https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/creator-kit/CREATOR_PLAYBOOK.md`.

To build another EmailManager, use `EMAILMANAGER_BUSINESS_REQUIREMENTS.md` as the requirements.
