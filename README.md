# wwa-cli

**One command to make your agent framework WWA-compatible.**

[![npm version](https://img.shields.io/npm/v/@workswithagents/wwa-cli)](https://www.npmjs.com/package/@workswithagents/wwa-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`wwa-cli` generates WWA-compatible adapter code for popular agent frameworks: **LangGraph**, **OpenAI Agents SDK**, **AutoGen**, and **CrewAI**. It auto-detects your project's language (Python or TypeScript) and framework, then generates the integration layer so your agents can participate in the WWA interoperability network.

## Install

```bash
npm install -g @workswithagents/wwa-cli

# or run directly without installing:
npx @workswithagents/wwa-cli init
```

Requires Node.js ≥ 18.

## Quick Start

```bash
# In any supported agent project directory:
cd my-langgraph-agent
wwa init
```

That's it. `wwa init` will:
1. Detect your framework (LangGraph, OpenAI, AutoGen, CrewAI) and language (Python/TypeScript)
2. Generate a WWA adapter file with IACP message handler
3. Generate a `manifest.yaml` with capability declarations
4. Run a compliance check and show your WWA compatibility score

## Commands

| Command | Description |
|---------|-------------|
| `wwa init` | Detect framework + language, generate WWA adapter files |
| `wwa gen <component>` | Generate a specific adapter component (handoff, manifest, identity) |
| `wwa check [path]` | Validate an existing project for WWA compliance |
| `wwa setup <provider>` | Infra setup (Phase 2 — placeholder) |

### `wwa init` options

```bash
wwa init [options]

Options:
  --project-dir <path>   Path to project directory (default: ".")
  --framework <name>     Framework override: langgraph, openai, autogen, crewai
  --agent-id <id>        Agent identifier for WWA registration
  --endpoint <host:port> IACP endpoint address (default: "0.0.0.0:8787")
  --no-register          Disable auto-registration with WWA registry
  --register-url <url>   Override registry URL
  --no-check             Skip compliance check after generation
```

### `wwa check` options

```bash
wwa check [project-path] [options]

Options:
  --json                 Output as JSON
```

## Supported Frameworks

| Framework | Python | TypeScript | Adapter File |
|-----------|--------|------------|--------------|
| **LangGraph** | ✅ | ✅ (via `@langchain/langgraph`) | `wwa_handoff.py` / `wwa_handoff.ts` |
| **OpenAI Agents SDK** | ✅ | ✅ | `wwa_handoff.py` / `wwa_handoff.ts` |
| **AutoGen** | ✅ | ❌ (Python-only) | `wwa_agent.py` |
| **CrewAI** | ✅ | ❌ (Python-only) | `wwa_crew_adapter.py` |

## How It Works

### Architecture

```
wwa-cli/                     # Node.js CLI
├── src/
│   ├── cli.ts               # Commander CLI entry point
│   ├── commands/            # init, gen, check command handlers
│   ├── generators/          # Framework-specific adapters
│   │   ├── langgraph.ts     # LangGraph → WWA (Python + TS)
│   │   ├── openai_agents.ts # OpenAI Agents SDK → WWA
│   │   ├── autogen.ts       # AutoGen → WWA (Python only)
│   │   └── crewai.ts        # CrewAI → WWA (Python only)
│   ├── detectors/           # Language + framework detection
│   └── validators/          # WWA compliance checker
└── templates/               # Jinja2-style templates
```

### Registration

By default, generated adapters auto-register with the WWA registry (`https://registry.workswithagents.dev`) on startup and deregister on shutdown. Control this behavior:

```bash
# Disable registration entirely
wwa init --no-register

# Override registry URL
wwa init --register-url https://my-registry.example.com

# At runtime, set env var to disable (even if compiled-in)
WWA_REGISTRY_URL="" python wwa_handoff.py
```

### Generated Files

| File | Purpose |
|------|---------|
| `wwa_handoff.py` / `.ts` | HTTP server with `POST /iacp/message` endpoint. Handles IACP messages and routes to your framework. |
| `wwa_agent.py` | AutoGen ConversableAgent subclass that speaks IACP. |
| `wwa_crew_adapter.py` | CrewAI adapter wrapping `Crew.kickoff()` in an IACP listener. |
| `manifest.yaml` | Capability manifest declaring your agent's capabilities, endpoint, and registered intents. |

### Compliance Scoring

`wwa check` validates 5 spec requirements and scores your project 0–10:

- **0–3:** Minimal — consider `wwa init`
- **4–6:** Partial — missing handoff/discovery
- **7–9:** Good — near WWA-compatible
- **10:** Full — WWA-compatible

Checks performed:
1. ✅ Capability Manifest (`manifest.yaml`)
2. ✅ Identity Protocol
3. ✅ IACP Endpoint (`POST /iacp/message`)
4. ✅ Handoff Protocol handler
5. ⬜ Deployment Manifest (Dockerfile, docker-compose, etc.)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode (watch)
npm run dev
```

## Roadmap

### Phase 1 (current)
- [x] CLI scaffold with Commander
- [x] Framework + language detection
- [x] LangGraph adapter (Python + TypeScript)
- [x] OpenAI Agents SDK adapter (Python + TypeScript)
- [x] AutoGen adapter (Python)
- [x] CrewAI adapter (Python)
- [x] `wwa check` compliance validator
- [x] Auto-registration with WWA registry

### Phase 2 (planned)
- [ ] Infra setup scripts (`wwa setup hetzner|aws|local`)
- [ ] `wwa gen handoff|manifest|identity` individual component generation
- [ ] Support for additional frameworks (Microsoft Agent Framework, etc.)
- [ ] Template customization (`wwa init --template custom`)
- [ ] CI/CD integration (GitHub Actions for compliance checks)

## License

MIT — See [LICENSE](LICENSE) file.

---

**Works With Agents** — Building the interoperable agent economy.
