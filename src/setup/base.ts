/**
 * Setup command — generates infrastructure deployment scripts.
 * Scripts are written to disk for user review, not auto-executed.
 */

export type Provider = "local" | "hetzner" | "do";

export interface SetupOptions {
  projectDir: string;
  provider: Provider;
  agentId?: string;
  registryUrl?: string;
  region?: string; // hetzner: nbg1, fsn1; do: fra1, nyc1
  sshKey?: string; // path to public key
}

export interface SetupOutput {
  filesWritten: string[];
  instructions: string;
}

export function isProvider(s: string): s is Provider {
  return ["local", "hetzner", "do"].includes(s);
}
