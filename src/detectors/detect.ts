/**
 * Framework + Language detector.
 *
 * Reads project files (package.json, pyproject.toml, requirements.txt)
 * to determine what language and framework a project uses.
 */

import * as fs from "fs";
import * as path from "path";

export type Framework =
  | "langgraph"
  | "openai_agents"
  | "autogen"
  | "crewai"
  | "mcp"
  | null;

export type DetectedLanguage = "python" | "typescript" | null;

export interface ProjectInfo {
  language: DetectedLanguage;
  framework: Framework;
  projectName: string;
  rootPath: string;
  /** All detected frameworks (edge case: multiple frameworks) */
  possibleFrameworks: Framework[];
}

/**
 * Detect the project language and framework from the given path.
 */
export function detect(projectPath: string): ProjectInfo {
  const rootPath = path.resolve(projectPath);
  const info: ProjectInfo = {
    language: null,
    framework: null,
    projectName: path.basename(rootPath),
    rootPath,
    possibleFrameworks: [],
  };

  const hasPyproject = fs.existsSync(path.join(rootPath, "pyproject.toml"));
  const hasRequirements = fs.existsSync(path.join(rootPath, "requirements.txt"));
  const hasPackageJson = fs.existsSync(path.join(rootPath, "package.json"));

  // ── Language detection ──────────────────────────────────────────
  if (hasPyproject || (hasRequirements && !hasPackageJson)) {
    info.language = "python";
  } else if (hasPackageJson) {
    info.language = "typescript";
  }

  // ── Project name ────────────────────────────────────────────────
  if (hasPyproject) {
    const name = readProjectNameFromPyproject(rootPath);
    if (name) info.projectName = name;
  } else if (hasPackageJson) {
    const name = readProjectNameFromPackageJson(rootPath);
    if (name) info.projectName = name;
  }

  // ── Framework detection ─────────────────────────────────────────
  const frameworks = detectFrameworks(rootPath, info.language);

  // Also check for MCP-specific files
  const mcpFiles = ["mcp.json", ".mcp.json", "mcp-config.json", "iacp-mcp-bridge.py"];
  for (const f of mcpFiles) {
    if (fs.existsSync(path.join(rootPath, f)) && !frameworks.includes("mcp")) {
      frameworks.push("mcp");
    }
  }
  info.possibleFrameworks = frameworks;

  if (frameworks.length === 1) {
    info.framework = frameworks[0];
  } else if (frameworks.length > 1) {
    // Multiple frameworks? Pick the first one (user can override with --framework)
    info.framework = frameworks[0];
  }

  return info;
}

/**
 * Detect which framework(s) are used in the project.
 */
function detectFrameworks(rootPath: string, language: DetectedLanguage): Framework[] {
  const found: Framework[] = [];

  if (language === "python") {
    const tomlPath = path.join(rootPath, "pyproject.toml");
    const reqPath = path.join(rootPath, "requirements.txt");

    let deps = "";
    if (fs.existsSync(tomlPath)) {
      deps += fs.readFileSync(tomlPath, "utf-8");
    }
    if (fs.existsSync(reqPath)) {
      deps += fs.readFileSync(reqPath, "utf-8");
    }

    const depL = deps.toLowerCase();

    if (depL.includes("langgraph")) found.push("langgraph");
    if (depL.includes("openai-agents") || depL.includes("openai_agents")) found.push("openai_agents");
    if (depL.includes("pyautogen") || depL.includes("autogen-agentchat")) found.push("autogen");
    if (depL.includes("crewai")) found.push("crewai");
    // MCP detection: look for mcp package or bridge files
    if (depL.includes("mcp") || depL.includes("iacp-mcp")) found.push("mcp");
  } else if (language === "typescript") {
    const pkgPath = path.join(rootPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        const depNames = Object.keys(deps).map((d) => d.toLowerCase());

        if (depNames.some((d) => d.includes("langgraph"))) found.push("langgraph");
        if (depNames.includes("openai") || depNames.includes("@openai/agents")) found.push("openai_agents");
        if (depNames.some((d) => d.includes("mcp") || d.includes("@modelcontextprotocol"))) found.push("mcp");
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  return found;
}

/**
 * Read project name from pyproject.toml.
 */
function readProjectNameFromPyproject(projectPath: string): string | null {
  try {
    const tomlPath = path.join(projectPath, "pyproject.toml");
    const content = fs.readFileSync(tomlPath, "utf-8");
    // Simple regex-based name extraction (avoids needing a TOML parser dependency)
    const match = content.match(/^name\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
    // Fallback to [project] table
    const projMatch = content.match(/\[project\]\s*\nname\s*=\s*"([^"]+)"/m);
    if (projMatch) return projMatch[1];
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Read project name from package.json.
 */
function readProjectNameFromPackageJson(projectPath: string): string | null {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.name || null;
  } catch {
    return null;
  }
}

export default detect;
