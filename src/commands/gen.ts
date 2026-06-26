/**
 * wwa gen command — Generate specific WWA components.
 */

import * as path from "path";
import * as fs from "fs";
import { detect } from "../detectors/detect";

export interface GenOptions {
  projectDir: string;
  framework?: string;
  language?: string;
}

export async function generateComponent(component: string, options: GenOptions): Promise<void> {
  const projectPath = path.resolve(options.projectDir);
  console.log(`\n🔧 Generating '${component}' for ${projectPath}...\n`);

  const validComponents = ["handoff", "manifest", "identity", "all"];
  if (!validComponents.includes(component)) {
    console.log(`❌ Invalid component: '${component}'`);
    console.log(`   Valid components: ${validComponents.join(", ")}\n`);
    return;
  }

  const info = detect(projectPath);
  console.log(`   Detected: ${info.language || "?"} / ${info.framework || "?"}\n`);

  // Placeholder — full generation is handled by wwa init
  // wwa gen individual components can be added in v1.1
  console.log("⚠️  Individual component generation coming in v1.1.");
  console.log("   Use 'wwa init' for full adapter generation.\n");
}
