/**
 * wwa check — WWA Compliance Validator
 *
 * Validates a project against the WWA spec requirements and
 * produces a compatibility score (0–10).
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Recursively find all files with matching extensions.
 */
function findAllFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Skip node_modules, .git, dist
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", "dist", ".wwa", "__pycache__"].includes(entry.name)) {
          results.push(...findAllFiles(fullPath, extensions));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(path.relative(dir, fullPath));
        }
      }
    }
  } catch {
    // Permission denied or other error
  }
  return results;
}

export interface CheckResult {
  /** Spec area being checked */
  spec: string;
  /** pass | fail | missing */
  status: "pass" | "fail" | "missing";
  /** Human-readable detail */
  detail: string;
  /** File that was checked (if any) */
  file: string | null;
}

export interface ComplianceReport {
  checks: CheckResult[];
  score: number;
  maxScore: number;
  rating: string;
  projectPath: string;
}

/**
 * Run all WWA compliance checks against a project.
 */
export function checkCompliance(projectPath: string): ComplianceReport {
  const rootPath = path.resolve(projectPath);
  const checks: CheckResult[] = [];

  // ── Check 1: Capability Manifest ─────────────────────────────────
  const manifestPaths = ["manifest.yaml", "manifest.yml", "wwa-manifest.yaml"];
  const manifestFile = manifestPaths.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (manifestFile) {
    const content = fs.readFileSync(path.join(rootPath, manifestFile), "utf-8");
    // Basic validation: contains required keys
    const hasAgentId = content.includes("agent_id") || content.includes("agent-id");
    const hasCapabilities = content.includes("capabilities") || content.includes("capability");
    if (hasAgentId && hasCapabilities) {
      checks.push({
        spec: "Capability Manifest",
        status: "pass",
        detail: `Found valid ${manifestFile}`,
        file: manifestFile,
      });
    } else {
      checks.push({
        spec: "Capability Manifest",
        status: "fail",
        detail: `${manifestFile} exists but missing agent_id or capabilities`,
        file: manifestFile,
      });
    }
  } else {
    checks.push({
      spec: "Capability Manifest",
      status: "missing",
      detail: "No manifest.yaml found — run 'wwa init' to generate one",
      file: null,
    });
  }

  // ── Check 2: Agent Identity ────────────────────────────────────
  const identityPatterns = [
    "wwa_identity.py",
    "wwa_identity.ts",
    "identity.py",
    "identity.ts",
    "wwa-identity.ts",
  ];
  const identityFile = identityPatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (identityFile) {
    checks.push({
      spec: "Identity Protocol",
      status: "pass",
      detail: `Found ${identityFile}`,
      file: identityFile,
    });
  } else {
    // Check if manifest has identity info
    if (manifestFile) {
      const content = fs.readFileSync(
        path.join(rootPath, manifestFile),
        "utf-8",
      );
      if (content.includes("identity")) {
        checks.push({
          spec: "Identity Protocol",
          status: "pass",
          detail: "Identity declared in manifest",
          file: manifestFile,
        });
      } else {
        checks.push({
          spec: "Identity Protocol",
          status: "missing",
          detail: "No identity file or manifest identity declaration found",
          file: null,
        });
      }
    } else {
      checks.push({
        spec: "Identity Protocol",
        status: "missing",
        detail: "No identity file found",
        file: null,
      });
    }
  }

  // ── Check 3: IACP Endpoint ─────────────────────────────────────
  const iacpPatterns = [
    "wwa_handoff.py",
    "wwa_handoff.ts",
    "wwa-handoff.ts",
    "wwa_agent.py",
    "wwa_crew_adapter.py",
    "iacp_server.py",
    "iacp_server.ts",
  ];
  const iacpFile = iacpPatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (iacpFile) {
    const content = fs.readFileSync(path.join(rootPath, iacpFile), "utf-8");
    // Check for POST /iacp/message or HTTP listener pattern
    const hasListener =
      content.includes("iacp/message") ||
      content.includes("IACP") ||
      content.includes("handle_iacp") ||
      content.includes("handleIacp") ||
      content.includes("app.post") ||
      content.includes("app.route");

    if (hasListener) {
      checks.push({
        spec: "IACP Endpoint",
        status: "pass",
        detail: `${iacpFile} has IACP message handler`,
        file: iacpFile,
      });
    } else {
      checks.push({
        spec: "IACP Endpoint",
        status: "fail",
        detail: `${iacpFile} found but missing IACP handler`,
        file: iacpFile,
      });
    }
  } else {
    checks.push({
      spec: "IACP Endpoint",
      status: "missing",
      detail: "No IACP handler file found",
      file: null,
    });
  }

  // ── Check 4: Handoff Handler ────────────────────────────────────
  if (iacpFile) {
    const content = fs.readFileSync(path.join(rootPath, iacpFile), "utf-8");
    const hasHandoff =
      content.includes("handoff") ||
      content.includes("HANDOFF") ||
      content.includes("request_handoff") ||
      content.includes("requestHandoff") ||
      content.includes("handle_iacp_message") ||
      content.includes("handleIacpMessage");

    checks.push({
      spec: "Handoff Protocol",
      status: hasHandoff ? "pass" : "fail",
      detail: hasHandoff
        ? "Handoff handler detected in IACP adapter"
        : "IACP adapter exists but no handoff handler found",
      file: iacpFile,
    });
  } else {
    checks.push({
      spec: "Handoff Protocol",
      status: "missing",
      detail: "No handoff handler (depends on IACP adapter)",
      file: null,
    });
  }

  // ── Check 5: Deployment Metadata ─────────────────────────────────
  const deployPatterns = [
    "deployment.yaml",
    "deployment.yml",
    "wwa-deployment.yaml",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Dockerfile",
  ];
  const deployFile = deployPatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (deployFile) {
    checks.push({
      spec: "Deployment Manifest",
      status: "pass",
      detail: `Found ${deployFile}`,
      file: deployFile,
    });
  } else {
    checks.push({
      spec: "Deployment Manifest",
      status: "missing",
      detail: "No deployment manifest or Dockerfile found",
      file: null,
    });
  }

  // ── Check 6: Attestation Protocol ────────────────────────────────
  const attestationPatterns = ["attestation.yaml", "attestation.yml", "macaroon.json", "macaroon.yaml"];
  const attestationFile = attestationPatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (attestationFile) {
    const content = fs.readFileSync(path.join(rootPath, attestationFile), "utf-8");
    const hasAttestation =
      content.includes("attestation") ||
      content.includes("macaroon") ||
      content.includes("caveat");
    if (hasAttestation) {
      checks.push({
        spec: "Attestation Protocol",
        status: "pass",
        detail: `Found valid ${attestationFile}`,
        file: attestationFile,
      });
    } else {
      checks.push({
        spec: "Attestation Protocol",
        status: "fail",
        detail: `${attestationFile} exists but missing attestation/macaroon/caveat patterns`,
        file: attestationFile,
      });
    }
  } else {
    // Check if any source files contain attestation patterns
    const allFiles = findAllFiles(rootPath, [".py", ".ts", ".yaml", ".yml", ".json"]);
    let hasAnyAttestation = false;
    for (const f of allFiles) {
      try {
        const content = fs.readFileSync(path.join(rootPath, f), "utf-8");
        if (
          content.includes("attestation") ||
          content.includes("macaroon") ||
          content.includes("caveat")
        ) {
          hasAnyAttestation = true;
          break;
        }
      } catch {
        // skip binary/non-readable files
      }
    }
    if (hasAnyAttestation) {
      checks.push({
        spec: "Attestation Protocol",
        status: "pass",
        detail: "Attestation patterns found in source files",
        file: null,
      });
    } else {
      checks.push({
        spec: "Attestation Protocol",
        status: "missing",
        detail: "No attestation token handling found",
        file: null,
      });
    }
  }

  // ── Check 7: MCP Bridge ─────────────────────────────────────────
  const mcpBridgeFiles = ["iacp-mcp-bridge.py", "mcp-bridge.json", "mcp-bridge.yaml"];
  const mcpBridgeFile = mcpBridgeFiles.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (mcpBridgeFile) {
    const content = fs.readFileSync(path.join(rootPath, mcpBridgeFile), "utf-8");
    const hasMCPBridge =
      content.includes("mcp") ||
      content.includes("bridge") ||
      content.includes("transport");
    if (hasMCPBridge) {
      checks.push({
        spec: "MCP Bridge",
        status: "pass",
        detail: `Found ${mcpBridgeFile}`,
        file: mcpBridgeFile,
      });
    } else {
      checks.push({
        spec: "MCP Bridge",
        status: "fail",
        detail: `${mcpBridgeFile} exists but missing MCP bridge config`,
        file: mcpBridgeFile,
      });
    }
  } else {
    // Check manifest for mcp-bridge config
    if (manifestFile) {
      const content = fs.readFileSync(path.join(rootPath, manifestFile), "utf-8");
      if (content.includes("mcp_bridge") || content.includes("mcp-bridge")) {
        checks.push({
          spec: "MCP Bridge",
          status: "pass",
          detail: "MCP bridge declared in manifest",
          file: manifestFile,
        });
      } else {
        checks.push({
          spec: "MCP Bridge",
          status: "missing",
          detail: "No MCP→IACP bridge files or config found",
          file: null,
        });
      }
    } else {
      checks.push({
        spec: "MCP Bridge",
        status: "missing",
        detail: "No MCP→IACP bridge files found",
        file: null,
      });
    }
  }

  // ── Check 8: Compliance-as-Code ──────────────────────────────────
  const compliancePatterns = ["compliance.yaml", "compliance.yml", "policy.yaml", "policy.yml"];
  const complianceFile = compliancePatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (complianceFile) {
    const content = fs.readFileSync(path.join(rootPath, complianceFile), "utf-8");
    const hasPolicy =
      content.includes("policy") ||
      content.includes("rule") ||
      content.includes("compliance") ||
      content.includes("audit");
    if (hasPolicy) {
      checks.push({
        spec: "Compliance-as-Code",
        status: "pass",
        detail: `Found valid ${complianceFile}`,
        file: complianceFile,
      });
    } else {
      checks.push({
        spec: "Compliance-as-Code",
        status: "fail",
        detail: `${complianceFile} exists but missing policy rules`,
        file: complianceFile,
      });
    }
  } else {
    // Check manifest for compliance references
    if (manifestFile) {
      const content = fs.readFileSync(path.join(rootPath, manifestFile), "utf-8");
      if (content.includes("compliance") || content.includes("policy")) {
        checks.push({
          spec: "Compliance-as-Code",
          status: "pass",
          detail: "Compliance declared in manifest",
          file: manifestFile,
        });
      } else {
        checks.push({
          spec: "Compliance-as-Code",
          status: "missing",
          detail: "No compliance policy files found",
          file: null,
        });
      }
    } else {
      checks.push({
        spec: "Compliance-as-Code",
        status: "missing",
        detail: "No compliance policy files found",
        file: null,
      });
    }
  }

  // ── Check 9: Agent Registry ──────────────────────────────────────
  const registryPatterns = ["agent-registry.yaml", "agent-registry.yml", "registry.yaml", "registry.yml"];
  const registryFile = registryPatterns.find((p) =>
    fs.existsSync(path.join(rootPath, p)),
  );
  if (registryFile) {
    const content = fs.readFileSync(path.join(rootPath, registryFile), "utf-8");
    const hasRegistry =
      content.includes("registry") ||
      content.includes("register") ||
      content.includes("agent_id") ||
      content.includes("agent-id");
    if (hasRegistry) {
      checks.push({
        spec: "Agent Registry",
        status: "pass",
        detail: `Found valid ${registryFile}`,
        file: registryFile,
      });
    } else {
      checks.push({
        spec: "Agent Registry",
        status: "fail",
        detail: `${registryFile} exists but missing registry config`,
        file: registryFile,
      });
    }
  } else {
    // Check manifest for registry config
    if (manifestFile) {
      const content = fs.readFileSync(path.join(rootPath, manifestFile), "utf-8");
      if (content.includes("registry") && content.includes("register")) {
        checks.push({
          spec: "Agent Registry",
          status: "pass",
          detail: "Registry config found in manifest",
          file: manifestFile,
        });
      } else {
        checks.push({
          spec: "Agent Registry",
          status: "missing",
          detail: "No agent registry file or config found",
          file: null,
        });
      }
    } else {
      checks.push({
        spec: "Agent Registry",
        status: "missing",
        detail: "No agent registry file found",
        file: null,
      });
    }
  }

  // ── Scoring ─────────────────────────────────────────────────────
  const score = checks.filter((c) => c.status === "pass").length * 2;
  const maxScore = checks.length * 2;

  let rating: string;
  if (score <= 3) rating = "Minimal — consider 'wwa init'";
  else if (score <= 6) rating = "Partial — missing handoff/discovery";
  else if (score <= 9) rating = "Good — near WWA-compatible";
  else rating = "Full — WWA-compatible";

  return {
    checks,
    score,
    maxScore,
    rating,
    projectPath: rootPath,
  };
}

export default checkCompliance;
