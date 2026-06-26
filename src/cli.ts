#!/usr/bin/env node
/**
 * wwa-cli — Make your agent framework WWA-compatible.
 *
 * Usage:
 *   wwa init          Detect framework + language, generate adapters
 *   wwa gen <comp>    Generate specific adapter component
 *   wwa check         Validate WWA compliance
 *   wwa setup         Infra setup (Phase 2)
 */

import { Command } from "commander";

const program = new Command();

program
  .name("wwa")
  .description("Works With Agents CLI — make your agent framework WWA-compatible")
  .version("0.1.0");

// ── wwa init ──────────────────────────────────────────────────────
program
  .command("init")
  .description("Detect framework + language, generate WWA adapter files")
  .option("--project-dir <path>", "Path to project directory", ".")
  .option(
    "--framework <name>",
    "Framework override: langgraph, openai, autogen, crewai, mcp",
  )
  .option("--agent-id <id>", "Agent identifier for registration")
  .option("--endpoint <host:port>", "IACP endpoint address", "0.0.0.0:8787")
  .option("--no-register", "Disable auto-registration with WWA registry")
  .option("--register-url <url>", "Override registry URL", "https://registry.workswithagents.dev")
  .option("--no-check", "Skip compliance check after generation")
  .option("--manifest", "Generate Capability Manifest only (recommended for all agents)")
  .option("--handoff", "Generate Handoff Protocol adapter")
  .option("--iacp", "Generate IACP (Inter-Agent Communication) adapter")
  .option("--identity", "Generate Identity Protocol declarations")
  .option("--all", "Generate all capabilities (default if no capability flags given)")
  .action(async (options) => {
    // Determine selected capabilities
    const flags: Record<string, boolean> = {
      manifest: options.manifest,
      handoff: options.handoff,
      iacp: options.iacp,
      identity: options.identity,
      all: options.all,
    };
    const hasAnyCapFlag = Object.values(flags).some(Boolean);
    const capabilities = hasAnyCapFlag
      ? (["manifest", "handoff", "iacp", "identity"] as const).filter((c) => flags[c] || flags.all)
      : undefined; // undefined = interactive

    const { initProject } = await import("./commands/init");
    await initProject({
      projectDir: options.projectDir,
      framework: options.framework,
      agentId: options.agentId,
      endpoint: options.endpoint,
      register: options.register !== false,
      registerUrl: options.registerUrl,
      runCheck: options.check !== false,
      capabilities,
    });
  });

// ── wwa gen ───────────────────────────────────────────────────────
program
  .command("gen <component>")
  .description("Generate a specific WWA adapter component")
  .option("--project-dir <path>", "Path to project directory", ".")
  .option("--framework <name>", "Target framework")
  .option("--language <lang>", "Target language: python or typescript")
  .action(async (component, options) => {
    const { generateComponent } = await import("./commands/gen");
    await generateComponent(component, options);
  });

// ── wwa check ────────────────────────────────────────────────────
program
  .command("check [project-path]")
  .description("Validate a project for WWA compliance")
  .option("--json", "Output as JSON")
  .action(async (projectPath, options) => {
    const { checkProject } = await import("./commands/check");
    await checkProject(projectPath || ".", options);
  });

// ── wwa setup ────────────────────────────────────────────────────
const setup = program
  .command("setup")
  .description("Generate infrastructure deployment scripts for the WWA stack");

setup
  .command("local")
  .description("Generate Docker Compose setup for local development")
  .option("--project-dir <path>", "Output directory", ".")
  .option("--agent-id <id>", "Agent identifier", "my-agent")
  .option("--registry-url <url>", "Registry URL", "http://localhost:3210")
  .action(async (options) => {
    const { runSetup } = await import("./setup");
    const result = await runSetup({
      provider: "local",
      projectDir: options.projectDir,
      agentId: options.agentId,
      registryUrl: options.registryUrl,
    });
    for (const f of result.filesWritten) console.log(`  ✅ Created: ${f}`);
    console.log(`\n${result.instructions}`);
  });

setup
  .command("hetzner")
  .description("Generate Hetzner Cloud provisioning script")
  .option("--project-dir <path>", "Output directory", ".")
  .option("--agent-id <id>", "Server name", "wwa-registry")
  .option("--region <region>", "Hetzner location (nbg1, fsn1, hel1)", "nbg1")
  .option("--ssh-key <name>", "SSH key name in Hetzner Cloud")
  .action(async (options) => {
    const { runSetup } = await import("./setup");
    const result = await runSetup({
      provider: "hetzner",
      projectDir: options.projectDir,
      agentId: options.agentId,
      region: options.region,
      sshKey: options.sshKey,
    });
    for (const f of result.filesWritten) console.log(`  ✅ Created: ${f}`);
    console.log(`\n${result.instructions}`);
  });

setup
  .command("do")
  .description("Generate DigitalOcean provisioning script")
  .option("--project-dir <path>", "Output directory", ".")
  .option("--agent-id <id>", "Droplet name", "wwa-registry")
  .option("--region <region>", "DO region (fra1, nyc1, sfo3, ams3)", "fra1")
  .option("--ssh-key <fingerprint>", "SSH key fingerprint in DO account")
  .action(async (options) => {
    const { runSetup } = await import("./setup");
    const result = await runSetup({
      provider: "do",
      projectDir: options.projectDir,
      agentId: options.agentId,
      region: options.region,
      sshKey: options.sshKey,
    });
    for (const f of result.filesWritten) console.log(`  ✅ Created: ${f}`);
    console.log(`\n${result.instructions}`);
  });

// ── wwa agentsmd ─────────────────────────────────────────────────
const agentsmd = program
  .command("agentsmd")
  .description("Generate and maintain AGENTS.md for AI coding agents");

agentsmd
  .command("init")
  .description("Scan project and generate AGENTS.md + one-line CLAUDE.md/GEMINI.md")
  .option("--project-dir <path>", "Path to project directory", ".")
  .option("--agent-name <name>", "Name for the agent (default: project name)")
  .action(async (options) => {
    const { initAgentsMd } = await import("./commands/agentsmd");
    const result = await initAgentsMd({
      projectDir: options.projectDir,
      agentName: options.agentName,
    });
    console.log(`\n✅ AGENTS.md: ${result.agentsmd}`);
    if (result.claude) console.log(`✅ CLAUDE.md:  ${result.claude}`);
    if (result.gemini) console.log(`✅ GEMINI.md:  ${result.gemini}`);
    if (!result.changed) console.log("   (no changes needed — already up to date)")
    console.log("");
  });

agentsmd
  .command("update")
  .description("Re-scan project and update auto-sections in AGENTS.md")
  .option("--project-dir <path>", "Path to project directory", ".")
  .action(async (options) => {
    const { updateAgentsMd } = await import("./commands/agentsmd");
    const result = await updateAgentsMd({
      projectDir: options.projectDir,
    });
    if (result.changed) {
      console.log(`\n✅ Updated ${result.agentsmd}`);
      console.log("   (auto-sections refreshed — custom sections preserved)");
    } else {
      console.log("\n✅ Already up to date — no changes needed.\n");
    }
  });

agentsmd
  .command("validate")
  .description("Check AGENTS.md is current (CI-friendly, exit code 0/1)")
  .argument("[project-path]", "Path to project directory", ".")
  .action(async (projectPath) => {
    const { validateAgentsMd } = await import("./commands/agentsmd");
    const result = validateAgentsMd(projectPath || ".");
    console.log(result.report);
    if (!result.pass) process.exit(1);
  });

program.parse(process.argv);
