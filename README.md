# Minions

**Mission Control for Hermes Agent**

Hermes Agent is powerful, but running real work on it means juggling terminal sessions, losing track of which job finished, and manually checking on long-running tasks. The more you delegate, the harder it gets to manage.

Minions gives you one screen to create, supervise, and review autonomous Hermes Agent work.

Hosted access option on [Agent37](https://www.agent37.com).

## Screenshots

![Kanban board of tasks](screenshots/tasks-board.jpg)

![New task creation screen](screenshots/new-task.jpg)

## Quick Start

**Prerequisites:** Node.js 18+ and [Hermes Agent](https://hermes-agent.nousresearch.com)

```bash
npx minionsai
```

Open [http://localhost:6969](http://localhost:6969).

Local sqllite db is created on first run and state lives in `~/.minions/`

Check the installed version:

```bash
minions --version
npm view minionsai version
```

The Settings page also shows the version of the running Minions server.

## Security defaults

Minions binds to `127.0.0.1` by default. The file browser is confined to
`MINIONS_HOME/workspace`, uploads are limited, and Hermes YOLO mode is disabled
unless explicitly enabled.

For password protection on the local UI:

```bash
MINIONS_AUTH_USERNAME=vhagar \
MINIONS_AUTH_PASSWORD='use-a-long-random-password' \
npx minionsai
```

Remote binding is rejected unless `MINIONS_AUTH_PASSWORD` is set:

```bash
MINIONS_HOST=0.0.0.0 \
MINIONS_AUTH_PASSWORD='use-a-long-random-password' \
MINIONS_CORS_ORIGINS='https://mission.example' \
npx minionsai
```

`MINIONS_CORS_ORIGINS` is a comma-separated exact allowlist. Cross-origin
requests are denied by default. Prefer a private network or authenticated
reverse proxy instead of exposing Minions directly to the public internet.

To deliberately bypass Hermes approval checks, set `MINIONS_YOLO=true`. YOLO
with a non-loopback bind is blocked unless `MINIONS_ALLOW_REMOTE_YOLO=true` is
also set. This override substantially increases risk and should not be used on
an internet-accessible instance.

See [`docs/SECURITY-HARDENING.md`](docs/SECURITY-HARDENING.md) for the threat
model, guarantees, and remaining isolation work.

## Features

- **Kanban board**: see every task at a glance: in progress, in review, done
- **Autonomous execution**: describe what you want in chat, walk away; the agent decides how to get it done
- **Automatic review queue**: successful agent runs move cards to ready for review
- **Live streaming**: watch tool calls, reasoning, and responses in real time
- **Human-in-the-loop**: agents propose completion; you verify and close. Nothing moves to done without your sign-off
- **Per-task model control**: override model and reasoning effort on any task
- **Scheduled Tasks**: create and manage recurring Hermes jobs, history, and output
- **File browser**: see files agents have created in the workspace directory
- **Local-first option**: self-host with SQLite, no account, and no cloud dependency. Your local data stays on your machine

## How It Works

Each task is a persistent Hermes root session. You talk to it, it works, and the board reflects where everything stands. Chat transcripts live in Hermes's session database; Minions stores task metadata, status, and per-task settings in a local SQLite database.

## Who It's For

- **Hermes power users** juggling multiple sessions across projects
- **Indie founders** delegating research, ops, writing, and coding to their agent
- **Anyone running long-lived Hermes work** who needs to know what finished, what's stuck, and what needs attention

## Roadmap

- **Scheduled task supervision**: automatically monitor, recover, and report on scheduled agent jobs
- **Notifications**: get alerted via Telegram, WhatsApp, or webhook when a task needs review
- **Skills library**: pluggable skill templates for common workflows (lead gen, web research, content pipelines, data collection, competitive monitoring, outbound sequences)
- **OpenClaw adapter**: run Minions against OpenClaw-hosted agents

## FAQ

**Can I use this with other agents?**
Not yet. The adapter interface exists, but launch is Hermes-only. OpenClaw is next.

## Contributing

Contributions are welcome. Please open an issue first with the feature or change you have in mind and why it should be added. Once the approach is approved, create a PR. See [CLAUDE.md](CLAUDE.md) for architecture and development details.
