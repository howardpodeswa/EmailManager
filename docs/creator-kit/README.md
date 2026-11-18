# Creator kit

For turning business requirements into a running application with Claude, the way EmailManager was built.

| File                                                                             | For               | What it is                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [CREATOR_PLAYBOOK.md](./CREATOR_PLAYBOOK.md)                                     | Claude            | Step-by-step instructions with every technical decision already made. Claude asks you only for what it can't decide                   |
| [CREATOR_GUIDE.md](./CREATOR_GUIDE.md)                                           | You (the Creator) | The same steps in plain language: what each achieves, and what you'll be asked                                                        |
| [CREATOR_TEMPLATES.md](./CREATOR_TEMPLATES.md)                                   | Claude            | The full contents of every file the playbook creates, with placeholders, so no other project is needed                                |
| [EMAILMANAGER_BUSINESS_REQUIREMENTS.md](./EMAILMANAGER_BUSINESS_REQUIREMENTS.md) | You and Claude    | EmailManager's business requirements only (use cases, user stories, rules, decision tables, diagrams), ready to build another version |

## Start a new project

In Claude Code, in the folder where you keep projects, say:

> Read https://github.com/howardpodeswa/EmailManager/blob/main/docs/creator-kit/CREATOR_PLAYBOOK.md and build an
> application from my requirements in `<path to your requirements file>`.

Or, in a Claude project: add your requirements and `CREATOR_PLAYBOOK.md` to the project and say "Read
CREATOR_PLAYBOOK.md and build an application from my requirements."

To build another EmailManager, point it at `EMAILMANAGER_BUSINESS_REQUIREMENTS.md` instead.
