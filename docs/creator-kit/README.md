# Creator kit

For turning business requirements into a running application with Claude, the way EmailManager was built.

| File                                                                             | For               | What it is                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [CREATOR_PLAYBOOK.md](./CREATOR_PLAYBOOK.md)                                     | Claude            | Step-by-step instructions with every technical decision already made. Claude asks you only for what it can't decide                   |
| [CREATOR_GUIDE.md](./CREATOR_GUIDE.md)                                           | You (the Creator) | The same steps in plain language: what each achieves, and what you'll be asked                                                        |
| [CREATOR_TEMPLATES.md](./CREATOR_TEMPLATES.md)                                   | Claude            | The full contents of every file the playbook creates, with placeholders, so no other project is needed                                |
| [EMAILMANAGER_BUSINESS_REQUIREMENTS.md](./EMAILMANAGER_BUSINESS_REQUIREMENTS.md) | You and Claude    | EmailManager's business requirements only (use cases, user stories, rules, decision tables, diagrams), ready to build another version |

## Start a new app

Step-by-step, click-by-click instructions are in [CREATOR_GUIDE.md → How to start](./CREATOR_GUIDE.md#how-to-start).
In short:

- **Claude app:** upload `skill/build-app-from-requirements.zip` once under Settings → Capabilities → Skills. Then
  create a new project, attach your requirements file in the message box, type "Build an application from my
  requirements", press Enter, and click Allow on the card that asks to work on your Mac.
- **Terminal:** run `./tools/scripts/install_creator_skill.sh` once from the EmailManager folder. Then type
  `cd ~/Noble/projectcode`, then `claude`, then "Build an application from my requirements in
  ~/Documents/MyRequirements.md".
- **Without the skill:** also attach (or name) `CREATOR_PLAYBOOK.md` and `CREATOR_TEMPLATES.md`, and start with "Read
  CREATOR_PLAYBOOK.md and …".

The skill lives in [skill/build-app-from-requirements](./skill/build-app-from-requirements/). Rebuild the upload file
with `./tools/scripts/install_creator_skill.sh --zip`.
