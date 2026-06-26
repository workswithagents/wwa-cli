# wwa-cli Usage Guide

Full CLI reference with all flags, examples per framework, and configuration options.

## Installation

```bash
npm install -g @workswithagents/wwa-cli
```

Or use without installing:

```bash
npx @workswithagents/wwa-cli init
```

## Core Workflow

### 1. Initialize a project

Navigate to your agent project and run:

```bash
cd my-agent-project
wwa init
```

The CLI automatically detects:
- **Language:** Python (via `pyproject.toml` or `requirements.txt`) or TypeScript (`package.json`)
- **Framework:** LangGraph, OpenAI Agents SDK, AutoGen, or CrewAI

### 2. Review generated files

```
my-agent-project/
├── wwa_handoff.py          # IACP message handler + HTTP server
├── manifest.yaml           # Capability manifest
└── ...your existing files
```

### 3. Start your agent

```bash
# Install dependencies if needed
pip install fastapi uvicorn    # Python
# or
npm install                    # TypeScript

# Start the IACP listener
python wwa_handoff.py --host 0.0.0.0 --port 8787
# or
npx ts-node wwa_handoff.ts
```

Your agent is now WWA-compatible and will auto-register with the network.

## Framework-Specific Examples

### LangGraph (Python)

```bash
# Create a LangGraph project
mkdir my-langgraph-agent && cd my-langgraph-agent
echo '[project]
name = "my-langgraph-agent"
dependencies = ["langgraph"]
' > pyproject.toml

# Generate WWA adapter
wwa init --agent-id my-agent --endpoint 0.0.0.0:8787

# Generated: wwa_handoff.py, manifest.yaml
# Starts a FastAPI HTTP server at POST /iacp/message
# Routes IACP handoff requests to graph.invoke()
```

### LangGraph (TypeScript)

```bash
mkdir my-ts-langgraph-agent && cd my-ts-langgraph-agent
echo '{"name":"my-ts-agent","dependencies":{"@langchain/langgraph":"latest"}}' > package.json
npm install

wwa init --agent-id my-ts-agent

# Generated: wwa_handoff.ts, manifest.yaml
# Uses Node.js http module for IACP server
```

### OpenAI Agents SDK (Python)

```bash
mkdir my-openai-agent && cd my-openai-agent
echo '[project]
name = "my-openai-agent"
dependencies = ["openai-agents"]
' > pyproject.toml

wwa init --agent-id openai-agent

# Generated: wwa_handoff.py (with agents.Runner integration), manifest.yaml
```

### AutoGen (Python only)

```bash
mkdir my-autogen-crew && cd my-autogen-crew
echo '[project]
name = "my-autogen-crew"
dependencies = ["pyautogen"]
' > pyproject.toml

wwa init --agent-id autogen-crew

# Generated: wwa_agent.py (WWAConversableAgent subclass), manifest.yaml
# Provides POST /register-agent to dynamically register AutoGen agents
```

### CrewAI (Python only)

```bash
mkdir my-crewai-project && cd my-crewai-project
echo '[project]
name = "my-crewai-project"
dependencies = ["crewai"]
' > pyproject.toml

wwa init --agent-id crewai-agent

# Generated: wwa_crew_adapter.py, manifest.yaml
# Wraps Crew.kickoff() in IACP listener
# Exposes role-based delegation via /agents/roles endpoint
```

## Registration Control

### Auto-registration (default)

```bash
wwa init  # Registers with https://registry.workswithagents.dev
```

### Disable registration

```bash
wwa init --no-register
```

### Custom registry

```bash
wwa init --register-url https://my-registry.example.com
```

### Runtime override

```bash
# Even if registration URL is compiled in, env var can override:
WWA_REGISTRY_URL="" python wwa_handoff.py     # Disable
WWA_REGISTRY_URL="https://custom.reg" python wwa_handoff.py  # Override
```

## Compliance Checking

### Full check

```bash
wwa check

# Output:
# ┌──────────────────────────────────────────────────────────────┐
# │ ✅ Capability Manifest    Found valid manifest.yaml           │
# │ ✅ Identity Protocol      Identity declared in manifest       │
# │ ✅ IACP Endpoint          wwa_handoff.py has IACP handler     │
# │ ✅ Handoff Protocol       Handoff handler detected            │
# │ ⬜ Deployment Manifest    No deployment manifest found        │
# └──────────────────────────────────────────────────────────────┘
# Score: 8/10 — Good — near WWA-compatible
```

### JSON output (for CI/CD)

```bash
wwa check --json
```

### Check a different directory

```bash
wwa check /path/to/another/project
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `WWA_REGISTRY_URL` | Override registry URL at runtime. Empty string disables. | (from init) |

## IACP Endpoints

Generated adapters expose these HTTP endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/iacp/message` | Accept IACP envelopes, route to agent |
| `GET` | `/health` | Health check |
| `GET` | `/agents/roles` | (CrewAI only) List agent roles + capabilities |
| `POST` | `/register-agent` | (AutoGen only) Register agent at runtime |

## Troubleshooting

### "No framework detected"

Run `wwa init --framework <name>` to manually specify the framework. Supported: `langgraph`, `openai`, `autogen`, `crewai`.

### "FastAPI not installed" (Python)

```bash
pip install fastapi uvicorn
```

### "Registration skipped (registry unreachable)"

The WWA registry is not accessible. Your adapter will still work — IACP messages are handled locally. Use `--no-register` to skip the registration attempt entirely.

### TypeScript adapters — "Cannot find module"

```bash
npm install @types/node
```
