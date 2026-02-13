# AGENT.md — Project Directives

> Version: 1.0.0
> This file is the single source of truth for all AI agents (Claude, Codex, Gemini, Copilot).

---

## 1. Before Any Action

1. Read this file (`AGENT.md`) for global rules
2. Read `INDEX.md` for the decision tree ("what should I read for my task?")
3. Read `wiki/domain.md` for correct terminology
4. Read `tech/stack.md` for exact dependency versions
5. Read `conventions/git.md` and `conventions/code.md` for standards

## 2. After Any Modification

Every code change MUST trigger:

| Change type             | Files to update                             |
| ----------------------- | ------------------------------------------- |
| New feature             | `spec/requirements.md` + new `.feature`     |
| Architecture change     | `spec/design.md`                            |
| New domain term         | `wiki/domain.md`                            |
| New dependency          | `tech/stack.md`                             |
| New external resource   | `links/resources.md`                        |
| Any code/doc change     | `history/CHANGELOG.md` (append entry)       |
| Architectural decision  | `history/DECISIONS.md` (append entry)       |

## 3. Agent Traceability (Mandatory)

Every agent MUST log its actions in `history/CHANGELOG.md`:
- After every `git commit`
- After every `.agent/` file modification
- Before ending its session

Format: `[YYYY-MM-DD HH:MM] <agent-id> | <type>(<scope>): <description>`

Valid agent IDs: `claude-code`, `codex`, `gemini`, `copilot`, `human`

## 4. Project Identity

- **Name**: Hooked
- **Description**: PWA offline-first de suivi de projets tricot et crochet, auto-hebergee via Docker
- **Type**: mobile-app (PWA)
- **Philosophy**: Offline-First — l'app fonctionne 100% localement par defaut, synchronisation cloud optionnelle
- **Visual Identity**: Dark Soft (Anthracite `#1E1E1E`) + Violet Pastel (`#C4B5FD`)

## 5. Core Principles

- **Machine Readability First**: Documentation must be structured, semantically dense, with no implicit context
- **Documentation-as-Code**: Docs are versioned, reviewed, and synchronized with code
- **Ubiquitous Language**: Every domain term has one exact definition (see `wiki/domain.md`)
- **Conventional Commits**: All commits follow `<type>(<scope>): <lowercase description>`
- **Agent-Agnostic**: All instructions work identically across Claude, Codex, Gemini, Copilot
- **Offline-First**: Local data (IndexedDB) is the source of truth; server is a backup
- **Self-Hosted**: No external SaaS dependency; everything runs on user's Docker infrastructure

## 6. Mandatory Checklist (Every Task)

- [ ] I read the relevant `.agent/` files
- [ ] My code respects `tech/stack.md` (exact versions)
- [ ] My naming respects `wiki/domain.md` (Ubiquitous Language)
- [ ] I updated `.agent/` if I modified behavior
- [ ] I added/modified the relevant `.feature` if applicable
- [ ] I appended to `history/CHANGELOG.md`
- [ ] I ran `git add` and `git commit` with conventional commit format
- [ ] I asked permission before `git checkout` and `git push`

## 7. Quick Reference

| Topic              | File                      |
| ------------------ | ------------------------- |
| Decision tree      | `INDEX.md`                |
| Requirements       | `spec/requirements.md`    |
| Architecture       | `spec/design.md`          |
| CI/CD              | `spec/cicd.md`            |
| BDD scenarios      | `spec/features/*.feature` |
| Domain glossary    | `wiki/domain.md`          |
| Tech stack         | `tech/stack.md`           |
| Git conventions    | `conventions/git.md`      |
| Code conventions   | `conventions/code.md`     |
| Doc update rules   | `conventions/docs.md`     |
| External links     | `links/resources.md`      |
| Agent action log   | `history/CHANGELOG.md`    |
| Decision log       | `history/DECISIONS.md`    |
