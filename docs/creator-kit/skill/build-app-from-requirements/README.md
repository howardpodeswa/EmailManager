# Skill: build-app-from-requirements

A Claude skill that runs the [Creator Playbook](../../CREATOR_PLAYBOOK.md). It always uses the latest kit files from
this folder's parent, or from GitHub, so the skill and the kit can't drift apart.

## Install

**Claude Code / Claude desktop app on your Mac:** from the EmailManager folder, run:

```bash
./tools/scripts/install_creator_skill.sh
```

This links the skill into `~/.claude/skills/`, so it updates whenever this folder updates. Restart Claude afterwards.

**claude.ai (web or app, "Capabilities → Skills"):** upload `build-app-from-requirements.zip` from this folder (create
it with `./tools/scripts/install_creator_skill.sh --zip`).

## Use

Say "build an application from my requirements in …", or "use the build-app-from-requirements skill". Claude loads the
kit and starts at the playbook's intake step.
