# Documentation Conventions

> Rules for maintaining the `.agent/` documentation system.

---

## Core Principle

**Every code change that modifies behavior MUST be reflected in `.agent/` files.**

Documentation is code. It is versioned, reviewed, and kept in sync.

## Update Matrix

| Code change              | Files to update                                  |
| ------------------------ | ------------------------------------------------ |
| New feature              | `spec/requirements.md` + `spec/features/*.feature` |
| Bug fix                  | Relevant `.feature` if behavior changed          |
| New domain concept       | `wiki/domain.md`                                 |
| Architecture change      | `spec/design.md`                                 |
| New dependency           | `tech/stack.md`                                  |
| CI/CD change             | `spec/cicd.md`                                   |
| New external resource    | `links/resources.md`                             |
| Convention change        | Relevant `conventions/*.md`                      |
| Any modification         | `history/CHANGELOG.md` (always)                  |
| Architectural decision   | `history/DECISIONS.md`                           |

## Changelog Entry Rules

Every agent MUST append to `history/CHANGELOG.md`:

```markdown
- [YYYY-MM-DD HH:MM] <agent-id> | <type>(<scope>): <description>
```

- Use the current date and time
- Use your agent ID (`claude-code`, `codex`, `gemini`, `copilot`, `human`)
- Use the same type/scope as your commit
- Group entries by date (most recent date on top)
- NEVER edit or delete existing entries

## Decision Log Rules

Append to `history/DECISIONS.md` when:
- Choosing between multiple valid approaches
- Adding or removing a dependency
- Changing architecture or data flow
- Overriding a convention for a specific reason

## Writing Guidelines

- Be concise and structured
- Use tables and lists over prose
- Use Mermaid for diagrams
- No implicit context — write as if the reader has zero prior knowledge
- Use the exact terms from `wiki/domain.md`

## Existing Project Documentation

The `Documents/` directory at the project root contains the original specifications:
- `cahierdescharges.md` — Functional requirements (v2.1)
- `api.md` — REST API documentation
- `MLD.md` — Database schema specifications

These are reference documents. The `.agent/` files are the living, synchronized source of truth.

## File Size Guidelines

Keep files under 10 KB when possible. If a file grows too large:
- Split into sub-files (e.g., `spec/features/auth.feature`, `spec/features/sync.feature`)
- Reference sub-files from the parent document
- Keep the parent as an index/summary
