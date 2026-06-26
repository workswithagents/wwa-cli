/**
 * Base Generator class for all framework adapters.
 *
 * Each framework generator extends this and implements:
 *   - detect() — can this generator handle this project?
 *   - generate() — produce adapter files for the given language
 */

import * as path from "path";

export type SupportedLanguage = "python" | "typescript";

export interface GeneratorResult {
  /** File path relative to project root */
  file: string;
  /** Generated file content */
  content: string;
}

export type Capability = "manifest" | "handoff" | "iacp" | "identity";

export interface GeneratorOptions {
  /** Agent identifier for registration */
  agentId: string;
  /** IACP endpoint address (host:port) */
  endpoint: string;
  /** WWA registry URL (empty string to disable registration) */
  registryUrl: string;
  /** Project name (from package.json or pyproject.toml) */
  projectName: string;
  /** Graph/module import path for the user's compiled graph */
  graphImportPath?: string;
  /** Selected capabilities (undefined = all) */
  capabilities?: Capability[];
}

export abstract class Generator {
  abstract readonly framework: string;

  /**
   * Detect if this generator can handle the given project.
   * This is called before generate() — if detect() returns false,
   * the CLI will try the next generator or prompt the user.
   */
  abstract detect(projectPath: string): Promise<boolean>;

  /**
   * Generate adapter files for the project.
   * Returns a list of { file, content } objects for each generated file.
   */
  abstract generate(
    projectPath: string,
    language: SupportedLanguage,
    options: GeneratorOptions,
  ): Promise<GeneratorResult[]>;

  /**
   * Supported languages for this framework.
   * LangGraph & OpenAI: both. AutoGen & CrewAI: python only.
   */
  abstract get supportedLanguages(): SupportedLanguage[];

  /**
   * Returns the path to templates directory for the given language.
   */
  protected templatesPath(language: SupportedLanguage): string {
    return path.join(__dirname, "..", "..", "templates", language);
  }
}
