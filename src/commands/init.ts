/**
 * wwa init command — À la carte capability selection.
 *
 * Each capability maps to specific generated files:
 *   - manifest    → manifest.yaml (recommended for ALL agents)
 *   - handoff     → manifest.yaml + wwa_handoff (task handoff)
 *   - iacp        → manifest.yaml + wwa_handoff (full IACP, includes handoff)
 *   - identity    → identity section in manifest
 *
 * Flow:
 * 1. Detect framework + language
 * 2. Select capabilities (interactive or flags)
 * 3. Generate adapter files for selected capabilities
 * 4. Optionally run wwa check
 */

import * as path from "path";
import * as fs from "fs";
import { createInterface } from "readline";
import { detect } from "../detectors/detect";
import type { Generator, GeneratorOptions, SupportedLanguage } from "../generators/base";

export type Capability = "manifest" | "handoff" | "iacp" | "identity";

export const CAPABILITIES: Capability[] = ["manifest", "handoff", "iacp", "identity"];

export const CAPABILITY_INFO: Record<Capability, {
  label: string;
  desc: string;
  whenToUse: string;
  whenNotToUse: string;
  recommended: boolean;
}> = {
  manifest: {
    label: "Capability Manifest",
    desc: "Declare what your agent can do. Like package.json for agents.",
    whenToUse: "Every agent should declare its capabilities — even a solo specialist.",
    whenNotToUse: "Never. This is lightweight and always useful.",
    recommended: true,
  },
  handoff: {
    label: "Handoff Protocol",
    desc: "Receive task handoffs from other agents with full context.",
    whenToUse: "Your agent is part of a pipeline — it receives work from upstream agents.",
    whenNotToUse: "Solo agent doing isolated work. Human assigns tasks directly.",
    recommended: false,
  },
  iacp: {
    label: "IACP — Inter-Agent Communication",
    desc: "Full-duplex agent-to-agent messaging, peer discovery, and negotiation.",
    whenToUse: "2+ agents need to discover each other and exchange messages dynamically.",
    whenNotToUse: "Single agent. Or agent-to-tool only (use MCP). Or just one-shot handoffs (use Handoff).",
    recommended: false,
  },
  identity: {
    label: "Identity Protocol",
    desc: "Cryptographic agent identity. Sign messages, verify senders.",
    whenToUse: "Agents from different owners need to verify each other. Audit trails required.",
    whenNotToUse: "All agents run under one trust boundary. No external agents.",
    recommended: false,
  },
};

export interface InitOptions {
  projectDir: string;
  framework?: string;
  agentId?: string;
  endpoint: string;
  register: boolean;
  registerUrl: string;
  runCheck: boolean;
  capabilities?: Capability[];  // undefined = interactive
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

async function selectCapabilitiesInteractive(): Promise<Capability[]> {
  const selected: Capability[] = ["manifest"]; // manifest always on by default
  console.log("\n📋 Select WWA capabilities for your agent (default: manifest only):");
  console.log("");

  for (const cap of CAPABILITIES) {
    const info = CAPABILITY_INFO[cap];
    const tag = info.recommended ? " [recommended]" : "";
    const yn = await prompt(`  Include ${info.label}?${tag} (y/N): `);
    if (yn.toLowerCase() === "y" || yn.toLowerCase() === "yes") {
      if (!selected.includes(cap)) selected.push(cap);
    }
  }

  console.log("");
  return selected;
}

export async function initProject(options: InitOptions): Promise<void> {
  const projectPath = path.resolve(options.projectDir);
  console.log(`\n🔍 Scanning ${projectPath}...\n`);

  // 1. Detect project info
  const info = detect(projectPath);
  console.log(`   Language:   ${info.language || "unknown"}`);
  console.log(`   Framework:  ${info.framework || "none detected"}`);
  console.log(`   Project:    ${info.projectName}`);

  // 2. Determine framework
  let framework = options.framework || info.framework;
  if (!framework) {
    console.log("\n⚠️  No framework detected. Supported:");
    console.log("   - langgraph (Python + TypeScript)");
    console.log("   - openai    (OpenAI Agents SDK, Python + TypeScript)");
    console.log("   - autogen   (AutoGen, Python only)");
    console.log("   - crewai    (CrewAI, Python only)");
    console.log("   - mcp       (MCP-based agents, Python + TypeScript)");
    console.log("\n   Use --framework <name> to specify.\n");
    return;
  }

  // 3. Determine language
  let language: SupportedLanguage = info.language === "typescript" ? "typescript" : "python";
  if (framework === "autogen" || framework === "crewai") {
    if (language === "typescript") {
      console.log(`\n⚠️  ${framework} is Python-only. Generating Python adapter.\n`);
      language = "python";
    }
  }

  // 4. Load generator
  const generator = await loadGenerator(framework);
  if (!generator) {
    console.log(`\n❌ No generator found for framework: ${framework}\n`);
    return;
  }

  if (!generator.supportedLanguages.includes(language)) {
    console.log(`\n⚠️  ${framework} does not support ${language}. Falling back to ${generator.supportedLanguages[0]}\n`);
    language = generator.supportedLanguages[0];
  }

  // 5. Capability selection
  let capabilities = options.capabilities;
  if (!capabilities || capabilities.length === 0) {
    capabilities = await selectCapabilitiesInteractive();
  }

  // 6. Print what we're generating
  const agentId = options.agentId || info.projectName;
  const registryUrl = options.register ? options.registerUrl : "";

  console.log(`\n📦 Generating ${framework} adapter (${language})...`);
  console.log(`   Agent ID:   ${agentId}`);
  console.log(`   Endpoint:   ${options.endpoint}`);
  console.log(`   Registry:   ${registryUrl || "(disabled)"}`);
  console.log(`   Capabilities:`);
  for (const cap of capabilities) {
    const info = CAPABILITY_INFO[cap];
    console.log(`     • ${info.label} — ${info.desc}`);
  }
  console.log("");

  // 7. Generate
  const genOptions: GeneratorOptions = {
    agentId,
    endpoint: options.endpoint,
    registryUrl,
    projectName: info.projectName,
    capabilities,
  };

  const results = await generator.generate(projectPath, language, genOptions);

  console.log("✅ Generated files:");
  for (const result of results) {
    const fullPath = path.join(projectPath, result.file);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, result.content);
    console.log(`   • ${result.file}`);
  }

  // 8. Optionally run check
  if (options.runCheck) {
    console.log("\n🔍 Running compliance check...\n");
    const { checkCompliance } = await import("../validators/check");
    const report = checkCompliance(projectPath);
    printCheckReport(report);
  }

  console.log("\n✨ Done! Next steps:");
  console.log("   1. Review the generated files");
  console.log("   2. Install any new dependencies (see adapter header comments)");
  console.log("   3. Start your agent — it will auto-register with the WWA network\n");
}

async function loadGenerator(framework: string): Promise<Generator | null> {
  try {
    switch (framework) {
      case "langgraph":
        return new (await import("../generators/langgraph")).LangGraphGenerator();
      case "openai":
      case "openai_agents":
        return new (await import("../generators/openai_agents")).OpenAIAgentsGenerator();
      case "autogen":
        return new (await import("../generators/autogen")).AutoGenGenerator();
      case "crewai":
        return new (await import("../generators/crewai")).CrewAIGenerator();
      case "mcp":
        return new (await import("../generators/mcp")).MCPGenerator();
      default:
        return null;
    }
  } catch (e: any) {
    console.error(`Error loading generator for ${framework}:`, e.message);
    return null;
  }
}

function printCheckReport(report: any): void {
  console.log("   ┌──────────────────────────────────────────────────┐");
  for (const check of report.checks) {
    const icon = check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⬜";
    console.log(`   │ ${icon} ${check.spec.padEnd(20)} ${check.detail.slice(0, 30)}`);
  }
  console.log("   └──────────────────────────────────────────────────┘");
  console.log(`   Score: ${report.score}/${report.maxScore} — ${report.rating}\n`);
}
