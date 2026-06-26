/**
 * wwa agentsmd — Generate project guide for AI coding agents.
 *
 * Scans a project directory, detects language/framework/tooling,
 * and generates an AGENTS.md that tells any AI agent how to work
 * with this project. Also generates one-line CLAUDE.md and GEMINI.md
 * that point to the canonical AGENTS.md.
 *
 * Uses HTML-comment markers (<!-- agentsmd:start:... -->) to demarcate
 * auto-generated sections. Manual edits outside markers are preserved
 * on `wwa agentsmd update`.
 */

import * as fs from "fs";
import * as path from "path";

// ── Types ───────────────────────────────────────────────────────────

export interface AgentMdOptions {
  projectDir: string;
  projectName?: string;
  agentName?: string;
}

export interface ProjectScan {
  language: "typescript" | "javascript" | "python" | "rust" | "unknown";
  framework: string | null;
  frameworkSpecific: "react" | "nextjs" | "spfx" | "fastify" | "express" | "flask" | "fastapi" | "svelte" | "vue" | null;
  packageManager: "npm" | "yarn" | "pnpm" | "uv" | "pip" | "cargo" | "unknown";
  scripts: Record<string, string>;
  testFramework: string | null;
  linter: string | null;
  formatter: string | null;
  nodeVersion: string | null;
  hasTypescript: boolean;
  hasDockerfile: boolean;
  hasCi: boolean;
  hasReadme: boolean;
  existingDocs: string[];
  projectName: string;
  srcDirs: string[];
  projectDir: string;
}

export interface UpdateResult {
  changed: boolean;
  sectionsUpdated: string[];
  sectionsPreserved: string[];
}

// ── Marker constants ────────────────────────────────────────────────

const M = {
  start: "<!-- agentsmd:generated -->",
  end: "<!-- agentsmd:end-generated -->",
  s: (section: string) => `<!-- agentsmd:start:${section} -->`,
  e: (section: string) => `<!-- agentsmd:end:${section} -->`,
};

type AutoSection = "commands" | "overview" | "layout" | "style";

// ── Scanner ─────────────────────────────────────────────────────────

/**
 * Scan a project directory and return structured metadata about it.
 * Dumb by design — file existence checks and regex, no AST.
 */
export function scanProject(projectPath: string): ProjectScan {
  const root = path.resolve(projectPath);
  const pkgJsonPath = path.join(root, "package.json");
  const pyprojectPath = path.join(root, "pyproject.toml");
  const cargoPath = path.join(root, "Cargo.toml");
  const tsconfigPath = path.join(root, "tsconfig.json");

  let language: ProjectScan["language"] = "unknown";
  let framework: string | null = null;
  let frameworkSpecific: ProjectScan["frameworkSpecific"] = null;
  let packageManager: ProjectScan["packageManager"] = "unknown";
  let scripts: Record<string, string> = {};
  let testFramework: string | null = null;
  let linter: string | null = null;
  let formatter: string | null = null;
  let nodeVersion: string | null = null;
  let hasTypescript = false;
  let projectName = path.basename(root);

  // ── TypeScript/JavaScript ────────────────────────────────────────
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      projectName = pkg.name || projectName;
      scripts = pkg.scripts || {};
      nodeVersion = pkg.engines?.node || null;
      hasTypescript = !!(
        pkg.devDependencies?.typescript ||
        pkg.dependencies?.typescript
      );

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const depNames = Object.keys(allDeps);

      // Language
      language = hasTypescript ? "typescript" : "javascript";

      // Package manager
      if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
        packageManager = "pnpm";
      } else if (fs.existsSync(path.join(root, "yarn.lock"))) {
        packageManager = "yarn";
      } else {
        packageManager = "npm";
      }

      // Framework detection
      if (depNames.some((d) => d === "react" || d.startsWith("@fluentui/react"))) {
        framework = "React";
        frameworkSpecific = "react";
      }
      if (depNames.some((d) => d === "next" || d === "next.js" || d === "nextjs")) {
        framework = "Next.js";
        frameworkSpecific = "nextjs";
      }
      if (
        depNames.some(
          (d) =>
            d.includes("@microsoft/sp") ||
            d === "@microsoft/sp-core-library"
        )
      ) {
        framework = "SPFx";
        frameworkSpecific = "spfx";
      }
      if (depNames.some((d) => d === "fastify")) {
        framework = "Fastify";
        frameworkSpecific = "fastify";
      }
      if (depNames.some((d) => d === "express")) {
        framework = "Express" + (framework ? ` + ${framework}` : "");
        if (!frameworkSpecific) frameworkSpecific = "express";
      }
      if (depNames.some((d) => d === "svelte" || d === "sveltekit")) {
        frameworkSpecific = "svelte";
        if (!framework) framework = "Svelte";
      }
      if (depNames.some((d) => d.includes("vue"))) {
        frameworkSpecific = "vue";
        if (!framework) framework = "Vue";
      }

      // Test framework
      if (
        depNames.includes("vitest") ||
        depNames.includes("@vitest/coverage-v8")
      ) {
        testFramework = "vitest";
      } else if (
        depNames.includes("jest") ||
        depNames.includes("@jest/globals")
      ) {
        testFramework = "jest";
      } else if (depNames.includes("mocha")) {
        testFramework = "mocha";
      } else if (depNames.includes("playwright")) {
        testFramework = "playwright";
      }

      // Linter
      if (
        depNames.includes("eslint") ||
        depNames.some((d) => d.startsWith("@typescript-eslint"))
      ) {
        linter = "eslint";
      }
      if (depNames.includes("biome")) {
        linter = "biome";
      }

      // Formatter
      if (depNames.includes("prettier")) {
        formatter = "prettier";
      }
      if (depNames.includes("biome")) {
        formatter = "biome";
      }
    } catch {
      // Invalid JSON
    }
  }

  // ── Python ────────────────────────────────────────────────────────
  if (fs.existsSync(pyprojectPath)) {
    language = "python";
    packageManager = "uv"; // assume uv for modern projects
    try {
      const content = fs.readFileSync(pyprojectPath, "utf-8");
      const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) projectName = nameMatch[1];

      const depL = content.toLowerCase();
      if (
        depL.includes("flask") ||
        depL.includes("flask")
      ) {
        framework = "Flask";
        frameworkSpecific = "flask";
      }
      if (
        depL.includes("fastapi") ||
        depL.includes("starlette")
      ) {
        framework = "FastAPI";
        frameworkSpecific = "fastapi";
      }
      if (depL.includes("pytest") || depL.includes("pytest-")) {
        testFramework = "pytest";
      }
      if (depL.includes("ruff")) {
        linter = "ruff";
        formatter = "ruff";
      }
      if (depL.includes("black")) {
        formatter = "black";
      }
      if (depL.includes("mypy") || depL.includes("pyright")) {
        if (depL.includes("pyright")) linter = "pyright";
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (
    language === "unknown" &&
    fs.existsSync(path.join(root, "requirements.txt"))
  ) {
    language = "python";
    packageManager = "pip";
    const req = fs.readFileSync(
      path.join(root, "requirements.txt"),
      "utf-8"
    ).toLowerCase();
    if (req.includes("flask")) {
      framework = "Flask";
      frameworkSpecific = "flask";
    }
    if (req.includes("fastapi")) {
      framework = "FastAPI";
      frameworkSpecific = "fastapi";
    }
    if (req.includes("pytest")) testFramework = "pytest";
  }

  // ── Rust ─────────────────────────────────────────────────────────
  if (fs.existsSync(cargoPath)) {
    language = "rust";
    packageManager = "cargo";
    testFramework = "cargo test";
    linter = "clippy";
    formatter = "rustfmt";
    try {
      const content = fs.readFileSync(cargoPath, "utf-8");
      const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) projectName = nameMatch[1];
    } catch {
      // Ignore
    }
  }

  // ── Infrastructure probes ─────────────────────────────────────────
  const hasDockerfile = fs.existsSync(path.join(root, "Dockerfile"));
  const hasCi =
    fs.existsSync(path.join(root, ".github/workflows")) ||
    fs.existsSync(path.join(root, ".gitlab-ci.yml"));
  const hasReadme =
    fs.existsSync(path.join(root, "README.md")) ||
    fs.existsSync(path.join(root, "README.rst"));

  // Discover doc files
  const existingDocs: string[] = [];
  const docDir = path.join(root, "docs");
  if (fs.existsSync(docDir)) {
    try {
      const entries = fs.readdirSync(docDir);
      for (const e of entries) {
        if (e.endsWith(".md") && e !== "AGENTS.md") {
          existingDocs.push(`docs/${e}`);
        }
      }
    } catch {
      // Ignore
    }
  }
  for (const f of ["CONTRIBUTING.md", "BUGS.md", "CHANGELOG.md", "TECH-DEBT.md"]) {
    if (fs.existsSync(path.join(root, f))) existingDocs.push(f);
  }

  // Discover source directories
  const srcDirs: string[] = [];
  for (const d of ["src", "app", "lib", "packages", "services"]) {
    if (fs.existsSync(path.join(root, d)) && fs.statSync(path.join(root, d)).isDirectory()) {
      srcDirs.push(d);
    }
  }

  return {
    language,
    framework,
    frameworkSpecific,
    packageManager,
    scripts,
    testFramework,
    linter,
    formatter,
    nodeVersion,
    hasTypescript,
    hasDockerfile,
    hasCi,
    hasReadme,
    existingDocs,
    projectName,
    srcDirs,
    projectDir: projectPath,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function detectScript(scripts: Record<string, string>, names: string[]): string | null {
  for (const name of names) {
    if (scripts[name]) return `npm run ${name}`;
  }
  return null;
}

function detectCommands(project: ProjectScan): Record<string, string> {
  const s = project.scripts;
  const isNpm = project.packageManager === "npm";
  const run = isNpm ? "npm run" : project.packageManager === "yarn" ? "yarn" : "pnpm";
  const install = project.packageManager === "uv" ? "uv sync" :
    project.packageManager === "cargo" ? "cargo build" :
    project.packageManager === "pip" ? "pip install -r requirements.txt" :
    `${project.packageManager} install`;

  const cmds: Record<string, string> = {
    "Install dependencies": install,
  };

  // Dev
  if (s.dev || s.serve || s.devserve) {
    cmds["Dev server"] = `${run} ${s.dev ? "dev" : s.serve ? "serve" : "devserve"}`;
  } else if (s.start && !s.build) {
    cmds["Run"] = `${run} start`;
  }

  // Build
  if (s.build) {
    cmds["Build"] = `${run} build`;
  } else if (project.language === "rust") {
    cmds["Build"] = "cargo build";
  } else if (project.language === "python") {
    // Build isn't a standard python concept unless there's a build system
  }

  // Test
  if (s.test || s["test:jest"]) {
    cmds["Test"] = s["test:jest"] ? `${run} test:jest` : `${run} test`;
  } else if (project.testFramework === "cargo test") {
    cmds["Test"] = "cargo test";
  } else if (project.testFramework === "pytest") {
    cmds["Test"] = project.packageManager === "uv" ? "uv run pytest" : "pytest";
  } else if (project.hasTypescript) {
    cmds["Test"] = `${run} test`;
  }

  // Lint
  if (s.lint) {
    cmds["Lint"] = `${run} lint`;
  } else if (project.linter === "eslint" && s.eslint) {
    cmds["Lint"] = `${run} eslint`;
  } else if (project.linter === "ruff") {
    cmds["Lint"] = project.packageManager === "uv" ? "uv run ruff check ." : "ruff check .";
  } else if (project.linter === "clippy") {
    cmds["Lint"] = "cargo clippy";
  }

  // Format
  if (s.format) {
    cmds["Format"] = `${run} format`;
  } else if (project.formatter === "prettier" && !s.format) {
    cmds["Format"] = `${run} format`; // assume prettier script exists
  } else if (project.formatter === "ruff") {
    cmds["Format"] = project.packageManager === "uv" ? "uv run ruff format ." : "ruff format .";
  }

  // Type-check
  if (s["type-check"] || s["typecheck"]) {
    cmds["Type check"] = `${run} ${s["type-check"] ? "type-check" : "typecheck"}`;
  } else if (project.hasTypescript) {
    cmds["Type check"] = "npx tsc --noEmit";
  }

  // Clean
  if (s.clean) {
    cmds["Clean"] = `${run} clean`;
  }

  return cmds;
}

function detectLayout(project: ProjectScan): string[] {
  const root = project.projectDir;
  const dirs: string[] = [];
  const inspectDirs = ["src", "app", "lib", "tests", "docs", "config", "scripts", "public"];

  for (const d of inspectDirs) {
    const full = path.join(root, d);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      dirs.push(d);
    }
  }

  return dirs;
}

function generateCommandsTable(commands: Record<string, string>): string {
  const entries = Object.entries(commands);
  if (entries.length === 0) return "No commands detected.";
  return [
    "| Purpose | Command |",
    "|---------|---------|",
    ...entries.map(([p, c]) => `| ${p} | \`${c}\` |`),
  ].join("\n");
}

function generateOneLiner(target: string): string {
  const displayName = target.replace(".md", "").replace("_", ".").toUpperCase();
  return `See [\`AGENTS.md\`](./AGENTS.md) — canonical agent guide for this repository.\n`;
}

// ── Template ────────────────────────────────────────────────────────

function renderAgentsMd(project: ProjectScan, projectDir: string): string {
  const commands = detectCommands(project);
  const layoutDirs = detectLayout(project);
  const stackParts: string[] = [];

  if (project.language) {
    const langLabel =
      project.language === "typescript"
        ? `TypeScript${project.hasTypescript ? "" : " (any)"}`
        : project.language === "javascript"
          ? "JavaScript"
          : project.language === "python"
            ? "Python"
            : project.language === "rust"
              ? "Rust"
              : null;
    if (langLabel) stackParts.push(langLabel);
  }
  if (project.framework) stackParts.push(project.framework);
  if (project.testFramework) {
    const tf =
      project.testFramework === "cargo test" ? "Cargo" :
      project.testFramework === "pytest" ? "pytest" :
      project.testFramework === "vitest" ? "Vitest" :
      project.testFramework === "jest" ? "Jest" :
      project.testFramework === "mocha" ? "Mocha" :
      project.testFramework === "playwright" ? "Playwright" :
      project.testFramework;
    stackParts.push(tf);
  }
  if (project.linter) {
    const l =
      project.linter === "eslint" ? "ESLint" :
      project.linter === "ruff" ? "Ruff" :
      project.linter === "clippy" ? "Clippy" :
      project.linter === "biome" ? "Biome" :
      project.linter === "pyright" ? "Pyright" :
      project.linter;
    stackParts.push(l);
  }
  if (project.packageManager && project.packageManager !== "unknown") {
    stackParts.push(project.packageManager);
  }

  const stackLine = stackParts.join(" · ");

  // ── Style rules per stack ──────────────────────────────────────
  const styleRules: string[] = [];

  if (project.language === "typescript") {
    styleRules.push("- **TypeScript strict mode** — enable `strict: true` in tsconfig.json");
    styleRules.push("- **ES modules** — use `import`/`export`, avoid `require()`");
    styleRules.push("- **Naming:** PascalCase for types/components, camelCase for variables/functions, kebab-case for files");
    styleRules.push("- **Types over interfaces** where possible (more composable)");
    if (project.linter === "eslint") styleRules.push("- ESLint rules are enforced — run lint before committing");
    if (project.formatter === "prettier") styleRules.push("- Prettier handles formatting — no style discussions in PRs");
    if (project.formatter === "biome") styleRules.push("- Biome handles formatting and linting");
  }

  if (project.language === "python") {
    styleRules.push("- **Type hints required** on all public functions and classes");
    styleRules.push("- **Naming:** snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants");
    styleRules.push("- **Imports:** standard library first, third-party second, local third — one blank line between groups");
    styleRules.push("- **Async/await** for I/O-bound operations");
    if (project.formatter === "ruff") styleRules.push("- Ruff handles formatting and linting — `ruff check .` / `ruff format .`");
    if (project.linter === "pyright") styleRules.push("- Pyright type checking enforced");
    if (project.formatter === "black") styleRules.push("- Black handles formatting (88 char lines)");
  }

  if (project.language === "rust") {
    styleRules.push("- **Idiomatic Rust** — prefer `Result` over panics, `Option` over null");
    styleRules.push("- **Naming:** snake_case for functions/vars, PascalCase for types, SCREAMING_SNAKE for constants");
    styleRules.push("- **No unsafe code** unless explicitly justified in a comment");
    styleRules.push("- `cargo clippy` must be clean");
    styleRules.push("- `cargo fmt` before committing");
  }

  // Framework-specific rules
  if (project.frameworkSpecific === "react") {
    styleRules.push("- **Functional components with hooks** — no class components unless touching legacy code");
    styleRules.push("- **Props typed** with TypeScript interfaces/types — no implicit `any`");
    styleRules.push("- **No direct API calls in components** — route through a service layer");
  }
  if (project.frameworkSpecific === "spfx") {
    styleRules.push("- **Service layer pattern** — no direct Graph/SP calls in web part components");
    styleRules.push("- **Delegated permissions only** — web parts run as the signed-in user");
    styleRules.push("- **SPFx-specific:** `onAfterDeserialize` is the hook for property migrations");
    styleRules.push("- **Static imports preferred** for web parts over dynamic imports");
  }
  if (project.frameworkSpecific === "nextjs") {
    styleRules.push("- **Server components by default** — only use `'use client'` when interactivity is needed");
    styleRules.push("- **Data fetching** in server components, not `useEffect`");
    styleRules.push("- **Route handlers** in `app/api/` for API endpoints");
  }
  if (project.frameworkSpecific === "fastify") {
    styleRules.push("- **Plugin-based architecture** — encapsulate logic in plugins");
    styleRules.push("- **Schema validation** for all routes");
    styleRules.push("- **Hooks pattern** for cross-cutting concerns (auth, logging)");
  }

  // Generic agent conduct rules
  const agentRules = [
    "1. **Read this file first.** It supersedes any baked-in conventions.",
    "2. **Run verify checks before reporting done.** Quote real output.",
    "3. **Preserve uncommitted work** — inspect `git status` before editing.",
    "4. **Don't ship by accident.** Never deploy unless explicitly asked.",
    "5. **Keep changes focused.** One concern per PR.",
    "6. **Update this file when project conventions change.**",
  ];

  // ── Build the document ────────────────────────────────────────
  const lines: string[] = [];

  lines.push(
    `# AGENTS.md — Project Guide for ${project.projectName}`,
    "",
    M.start,
    "",
    "This file is the canonical guide for AI coding agents (Claude Code, Copilot, Cursor, Codex, etc.) working in this repository.",
    "",
    "Auto-generated sections are between marker comments. Manual edits outside markers",
    "are preserved on \`wwa agentsmd update\`.",
    "",
    M.end,
    "",
  );

  // Commands section
  lines.push(
    M.s("commands"),
    "",
    "## Commands",
    "",
    generateCommandsTable(commands),
    "",
  );

  if (project.nodeVersion) {
    const ver = project.nodeVersion.replace(/^>=?\s*/, "");
    lines.push(`**Node.js:** \`>= ${ver}\``, "");
  }

  lines.push(M.e("commands"), "");

  // Stack section
  lines.push(
    M.s("overview"),
    "",
    "## Stack",
    "",
    stackLine || "No stack detected.",
    "",
    M.e("overview"),
    "",
  );

  // Layout section
  if (layoutDirs.length > 0) {
    lines.push(
      M.s("layout"),
      "",
      "## Repository Layout",
      "",
      "```",
      ...layoutDirs.map((d) => d + "/"),
      "```",
      "",
      M.e("layout"),
      "",
    );
  }

  // Architecture / Style section
  lines.push(
    M.s("style"),
    "",
    "## Code Style & Conventions",
    "",
    ...styleRules,
    "",
    M.e("style"),
    "",
  );

  // Agent conduct
  lines.push(
    "## Agent Operating Rules",
    "",
    ...agentRules,
    "",
    "## Verify Before Done",
    "",
  );

  const verifyCommands: string[] = [];
  if (commands["Build"]) verifyCommands.push(`- [ ] Build: \`${commands["Build"]}\` passes`);
  if (commands["Test"]) verifyCommands.push(`- [ ] Tests: \`${commands["Test"]}\` passes`);
  if (commands["Lint"]) verifyCommands.push(`- [ ] Lint: \`${commands["Lint"]}\` is clean`);
  if (commands["Type check"]) verifyCommands.push(`- [ ] Type check: \`${commands["Type check"]}\` is clean`);
  if (project.language === "rust") {
    verifyCommands.push("- [ ] `cargo clippy -- -D warnings` is clean");
    verifyCommands.push("- [ ] `cargo fmt --check` passes");
  }

  if (verifyCommands.length === 0) {
    verifyCommands.push("- [ ] No verification commands detected. Add some above.");
  }

  lines.push(...verifyCommands, "");

  // Reference docs
  if (project.existingDocs.length > 0) {
    lines.push(
      "## Reference Documents",
      "",
      ...project.existingDocs.map((d) => `- [${d}](${d})`),
      "",
    );
  }

  // Custom sections placeholder
  lines.push(
    "<!-- @@AGENTSMD:CUSTOM_SECTIONS@@ -->",
    "",
    "## Known Gotchas",
    "",
    "_Add project-specific gotchas here. They persist across \`wwa agentsmd update\`._",
    "",
    "## Architecture Decisions",
    "",
    "_Document important architectural rules here._",
    "",
  );

  return lines.join("\n");
}

// ── File I/O ─────────────────────────────────────────────────────────

function readFileSafe(filepath: string): string | null {
  try {
    return fs.readFileSync(filepath, "utf-8");
  } catch {
    return null;
  }
}

function writeFileSafe(filepath: string, content: string): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, content, "utf-8");
}

// ── Section helpers for update ──────────────────────────────────────

/**
 * Parse an AGENTS.md into sections: auto sections keyed by name, and
 * the "custom" section (everything outside auto markers).
 */
function parseSections(
  content: string,
): { auto: Record<string, string>; custom: string[] } {
  const auto: Record<string, string> = {};
  const custom: string[] = [];

  // Split by markers
  const parts = content.split(/(<!-- agentsmd:(start|end):?\w* -->)/g);
  // This is a simplistic approach. For the real implementation we'll
  // do line-by-line parsing.

  const lines = content.split("\n");
  let currentAuto: string | null = null;
  let currentLines: string[] = [];
  let inCustom = true;
  let customLines: string[] = [];

  for (const line of lines) {
    const startMatch = line.match(/<!-- agentsmd:start:(\w+) -->/);
    const endMatch = line.match(/<!-- agentsmd:end:(\w+) -->/);

    if (startMatch) {
      if (inCustom && customLines.length > 0) {
        custom.push(customLines.join("\n"));
        customLines = [];
      }
      inCustom = false;
      currentAuto = startMatch[1];
      currentLines = [line];
      continue;
    }

    if (endMatch && endMatch[1] === currentAuto) {
      currentLines.push(line);
      if (currentAuto) {
        auto[currentAuto] = currentLines.join("\n");
      }
      currentAuto = null;
      currentLines = [];
      inCustom = true;
      continue;
    }

    if (currentAuto) {
      currentLines.push(line);
    } else if (inCustom) {
      customLines.push(line);
    }
  }

  if (customLines.length > 0) {
    custom.push(customLines.join("\n"));
  }

  return { auto, custom };
}

/**
 * Read existing AGENTS.md, replace auto sections with newly generated
 * ones, preserve custom sections.
 */
function mergeAgentsMd(
  oldContent: string,
  newGenerated: string,
  oldProjectScan: ProjectScan,
): { content: string; updated: string[] } {
  const { auto: oldAuto, custom: oldCustom } = parseSections(oldContent);
  const { auto: newAuto } = parseSections(newGenerated);
  const updated: string[] = [];

  // Reconstruct: custom parts interleaved with new auto sections
  const resultLines: string[] = [];
  const lines = oldContent.split("\n");
  let currentAuto: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const startMatch = line.match(/<!-- agentsmd:start:(\w+) -->/);
    const endMatch = line.match(/<!-- agentsmd:end:(\w+) -->/);

    if (startMatch) {
      const section = startMatch[1];
      if (newAuto[section] && newAuto[section] !== oldAuto[section]) {
        // Emit new version
        resultLines.push(newAuto[section]);
        updated.push(section);
        // Skip old section lines until end marker
        while (i < lines.length && !lines[i].match(/<!-- agentsmd:end:\w+ -->/)) {
          i++;
        }
        // Skip the old end marker (we already emitted it in the new section)
        if (i < lines.length) i++;
      } else {
        // Keep old section
        while (i < lines.length && !lines[i].match(/<!-- agentsmd:end:\w+ -->/)) {
          resultLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          resultLines.push(lines[i]); // end marker
          i++;
        }
      }
    } else if (endMatch) {
      // Shouldn't reach here if we handled start correctly, but just in case
      if (lines[i]) resultLines.push(lines[i]);
      i++;
    } else {
      resultLines.push(line);
      i++;
    }
  }

  return { content: resultLines.join("\n"), updated };
}

// ── Public API ──────────────────────────────────────────────────────

export interface InitResult {
  agentsmd: string;
  claude?: string;
  gemini?: string;
  changed: boolean;
}

/** Check if an AGENTS.md has our auto-generated markers */
function hasAgentsMdMarkers(content: string): boolean {
  return content.includes("<!-- agentsmd:");
}

/**
 * `wwa agentsmd init` — Fresh generation for a project directory.
 * If AGENTS.md already exists with markers, merges into it (preserving custom sections).
 * If AGENTS.md exists WITHOUT markers, overwrites it (the old one was hand-written or
 * from another tool — this becomes the canonical version).
 */
export async function initAgentsMd(options: AgentMdOptions): Promise<InitResult> {
  const projectDir = path.resolve(options.projectDir);
  const project = scanProject(projectDir);
  // Attach projectDir for layout detection
  project.projectDir = projectDir;

  const content = renderAgentsMd(project, projectDir);
  const agentsmdPath = path.join(projectDir, "AGENTS.md");
  const existing = readFileSafe(agentsmdPath);

  let changed = true;

  if (existing) {
    if (hasAgentsMdMarkers(existing)) {
      // Merge: replace auto sections, preserve custom ones
      const { content: merged, updated } = mergeAgentsMd(existing, content, project);
      if (updated.length === 0) {
        changed = false;
        return { agentsmd: agentsmdPath, changed: false };
      }
      writeFileSafe(agentsmdPath, merged);
    } else {
      // Existing AGENTS.md wasn't generated by us — overwrite
      writeFileSafe(agentsmdPath, content);
    }
  } else {
    writeFileSafe(agentsmdPath, content);
  }

  // Generate CLAUDE.md one-liner
  const claudeContent = generateOneLiner("CLAUDE.md");
  const claudePath = path.join(projectDir, "CLAUDE.md");
  if (readFileSafe(claudePath) !== claudeContent) {
    writeFileSafe(claudePath, claudeContent);
  }

  // Generate GEMINI.md one-liner
  const geminiContent = generateOneLiner("GEMINI.md");
  const geminiPath = path.join(projectDir, "GEMINI.md");
  if (readFileSafe(geminiPath) !== geminiContent) {
    writeFileSafe(geminiPath, geminiContent);
  }

  return {
    agentsmd: agentsmdPath,
    claude: readFileSafe(claudePath) ? claudePath : undefined,
    gemini: readFileSafe(geminiPath) ? geminiPath : undefined,
    changed,
  };
}

/**
 * `wwa agentsmd update` — Re-scan and update auto-sections only.
 */
export async function updateAgentsMd(options: AgentMdOptions): Promise<InitResult> {
  const projectDir = path.resolve(options.projectDir);
  const agentsmdPath = path.join(projectDir, "AGENTS.md");
  const existing = readFileSafe(agentsmdPath);

  if (!existing) {
    // No existing file — fall through to init
    return initAgentsMd(options);
  }

  const project = scanProject(projectDir);
  project.projectDir = projectDir;
  const freshContent = renderAgentsMd(project, projectDir);
  const { content: merged, updated } = mergeAgentsMd(existing, freshContent, project);

  if (updated.length === 0) {
    return { agentsmd: agentsmdPath, changed: false };
  }

  writeFileSafe(agentsmdPath, merged);

  return {
    agentsmd: agentsmdPath,
    changed: true,
  };
}

/**
 * `wwa agentsmd validate` — Check AGENTS.md is up to date.
 * Returns exit code 0 (pass) or 1 (fail) and a report string.
 */
export function validateAgentsMd(projectDir: string): { pass: boolean; report: string } {
  const root = path.resolve(projectDir);
  const agentsmdPath = path.join(root, "AGENTS.md");
  const existing = readFileSafe(agentsmdPath);

  if (!existing) {
    return { pass: false, report: "❌ AGENTS.md not found. Run `wwa agentsmd init`.\n" };
  }

  const project = scanProject(root);
  project.projectDir = root;
  const fresh = renderAgentsMd(project, root);
  const { updated } = mergeAgentsMd(existing, fresh, project);

  if (updated.length === 0) {
    return { pass: true, report: "✅ AGENTS.md is up to date.\n" };
  }

  return {
    pass: false,
    report: `❌ AGENTS.md is stale. Sections changed: ${updated.join(", ")}.\n   Run \`wwa agentsmd update\` to refresh.\n`,
  };
}

// No exports below this line
