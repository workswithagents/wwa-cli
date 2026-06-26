# Framework Support

Detailed reference for each supported framework's WWA adapter.

## LangGraph

**URL:** [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
**Stars:** 31k+
**Languages:** Python, TypeScript
**Adapter files:** `wwa_handoff.py` / `wwa_handoff.ts`

### What it does

Wraps a LangGraph `CompiledGraph` in an IACP HTTP listener. Inbound `handoff` requests are routed to `graph.invoke()` with the task context extracted from the IACP envelope.

### Generated endpoints

| Method | Path | Handler |
|--------|------|---------|
| `POST` | `/iacp/message` | `handle_iacp_message()` |
| `GET` | `/health` | Returns `{ status: "healthy", agent_id }` |

### Python adapter structure

```python
# wwa_handoff.py
from your_module import graph  # Update this import

def handle_iacp_message(envelope: dict) -> dict:
    intent = envelope.get("intent", "handoff")
    if intent == "handoff":
        result = graph.invoke({ ... })
        return { "type": "response", "status": "completed", "payload": { "result": result } }
    ...

# FastAPI app instance available as 'app'
# Start with: uvicorn wwa_handoff:app --host 0.0.0.0 --port 8787
```

### TypeScript adapter structure

```typescript
// wwa_handoff.ts
function handleIacpMessage(envelope: IACPEnvelope): IACPResponse {
  // Route to your LangGraph
}

// Node.js http server created automatically
// Start with: npx ts-node wwa_handoff.ts
```

---

## OpenAI Agents SDK

**URL:** [github.com/openai/openai-agents-python](https://github.com/openai/openai-agents-python)
**Languages:** Python, TypeScript
**Adapter files:** `wwa_handoff.py` / `wwa_handoff.ts`

### What it does

Wraps OpenAI's `Runner.run()` in an IACP listener. Simpler than LangGraph — the OpenAI SDK already provides a runner loop, so the adapter just maps IACP requests → `Runner.run(agent, input)` and agent output → IACP response.

### Key difference from LangGraph

Both Python and TS OpenAI SDKs already have a `Runner` loop. The adapter maps:
- Inbound IACP request → `Runner.run(agent, input)` or `openai.beta.chat.completions.run()`
- Agent output → IACP response

### Python adapter

```python
from agents import Runner, Agent

def handle_iacp_message(envelope):
    agent = Agent(name=AGENT_ID, instructions=task_description, model="gpt-4o")
    result = Runner.run_sync(agent, task_description)
    return { "type": "response", "payload": { "result": result.final_output } }
```

### TypeScript adapter

Uses Node.js `http` module. Integrate your OpenAI SDK in the `handleIacpMessage` function.

---

## AutoGen

**URL:** [github.com/microsoft/autogen](https://github.com/microsoft/autogen)
**Stars:** 40k+
**Languages:** Python only
**Adapter files:** `wwa_agent.py`

### What it does

Creates an AutoGen `WWAConversableAgent` subclass that speaks IACP. AutoGen's `GroupChat` manages multi-agent conversations, so the adapter:
- Registers each agent in the group as a separate WWA agent
- Forwards IACP messages to the correct agent
- Maps AutoGen's message types to IACP intents

### Generated endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/iacp/message` | Handle IACP messages via WWAConversableAgent |
| `GET` | `/health` | Health check |
| `POST` | `/register-agent` | Dynamically register an AutoGen agent at runtime |

### Python adapter structure

```python
from autogen import ConversableAgent

class WWAConversableAgent(ConversableAgent):
    def handle_iacp(self, envelope: dict) -> dict:
        # Route to AutoGen chat
        reply = self.generate_reply(...)
        return { "type": "response", "payload": { "result": reply } }

# Register at runtime:
# POST /register-agent {"name": "my-agent", "system_message": "...", "llm_config": {...}}
```

---

## CrewAI

**URL:** [github.com/crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)
**Stars:** 31k+
**Languages:** Python only
**Adapter files:** `wwa_crew_adapter.py`

### What it does

Wraps CrewAI's `Crew.kickoff()` in an IACP listener. Maps CrewAI's role-based agents to WWA capability manifests:
- Each agent role (researcher, writer, reviewer, coder, analyst) → distinct capability declaration
- Handles task delegation via WWA Delegation Framework
- Exposes role listing at `/agents/roles`

### Generated endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/iacp/message` | Handle IACP messages via CrewAI crew |
| `GET` | `/health` | Health check |
| `GET` | `/agents/roles` | List agent roles with WWA capability mappings |

### Python adapter structure

```python
from crewai import Crew, Agent, Task, Process

def create_wwa_crew(task_description, context=None):
    researcher = Agent(role="Researcher", goal="...", backstory="...")
    writer = Agent(role="Writer", goal="...", backstory="...")
    crew = Crew(agents=[researcher, writer], tasks=[task], process=Process.sequential)
    return crew

def handle_iacp_message(envelope):
    crew = create_wwa_crew(task_description)
    result = crew.kickoff()
    return { "type": "response", "payload": { "result": str(result) } }
```

### Role-to-capability mapping

| CrewAI Role | WWA Capability | Action | Target |
|-------------|---------------|--------|--------|
| Researcher | Research | `research` | `knowledge` |
| Writer | Documentation | `write` | `documentation` |
| Reviewer | Quality Review | `review` | `quality` |
| Coder | Software Development | `code` | `software` |
| Analyst | Data Analysis | `analyze` | `data` |

## Adding New Frameworks

To add support for a new framework:

1. Create a generator class in `src/generators/` extending the `Generator` base class
2. Implement `detect()`, `generate()`, and `supportedLanguages`
3. Register it in `src/commands/init.ts` in the `loadGenerator()` function
4. Add framework detection in `src/detectors/detect.ts`

Example skeleton:

```typescript
import { Generator, GeneratorOptions, GeneratorResult, SupportedLanguage } from "./base";
import { detect } from "../detectors/detect";

export class MyFrameworkGenerator extends Generator {
  readonly framework = "my_framework";

  get supportedLanguages(): SupportedLanguage[] {
    return ["python"];
  }

  async detect(projectPath: string): Promise<boolean> { /* ... */ }

  async generate(
    projectPath: string,
    language: SupportedLanguage,
    options: GeneratorOptions,
  ): Promise<GeneratorResult[]> { /* ... */ }
}
```
