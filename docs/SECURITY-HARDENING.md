# Security hardening

This fork treats Minions as a privileged local control plane for Hermes. A
compromise can reach agent tools with the operating-system privileges of the
Minions process.

## Threat model

Relevant attackers are another host on the LAN, a malicious website opened by
the operator, an untrusted local process, and a crafted path or upload intended
to escape the workspace.

## Enforced guarantees

- The HTTP server binds to `127.0.0.1` unless `MINIONS_HOST` is explicitly set.
- A non-loopback bind requires HTTP Basic authentication.
- Cross-origin requests require an exact `MINIONS_CORS_ORIGINS` match.
- The file API resolves existing paths and new destinations inside
  `MINIONS_HOME/workspace`; lexical traversal and symlink escapes are rejected.
- File uploads are capped at 10 files, 10 MiB per file, and 100 MiB combined.
- Hermes receives `HERMES_YOLO_MODE=0` by default. YOLO requires
  `MINIONS_YOLO=true`.
- Remote bind plus YOLO fails closed unless the operator also sets
  `MINIONS_ALLOW_REMOTE_YOLO=true`.

## Remaining risks

- Basic authentication must be carried over HTTPS when traffic leaves the host.
  Use a private overlay network or an authenticated TLS reverse proxy.
- The filesystem sandbox protects the Minions file API, not tools executed by
  Hermes. Strong worker isolation still requires a container, VM, sandbox, or
  dedicated OS user.
- Upload containment checks are fail-closed against existing symlinks, but
  complete resistance to local time-of-check/time-of-use races requires
  descriptor-relative OS APIs or process isolation.
- Skills ZIP import has separate validation and needs dedicated regression tests
  for compression bombs, duplicate normalized names, and special entries.
- Authentication is single-user. Multi-user roles, session revocation, CSRF
  tokens for cookie-based deployments, and append-only audit events remain
  future work.

## Verification gates

Run before publishing or merging:

```bash
npm test
npm run build:server
npm run build:client
npm audit --omit=dev
```

A release candidate should additionally be started with a temporary
`MINIONS_HOME` and checked for loopback-only binding, `401` without credentials,
allowed authenticated access, denied hostile origins, and blocked reads outside
the workspace.
