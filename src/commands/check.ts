/**
 * wwa check command — CLI wrapper for checkCompliance.
 */

import * as path from "path";
import { checkCompliance } from "../validators/check";

export interface CheckOptions {
  json?: boolean;
}

export async function checkProject(projectPath: string, options: CheckOptions): Promise<void> {
  const rootPath = path.resolve(projectPath);
  console.log(`\n🔍 Checking WWA compliance for ${rootPath}...\n`);

  const report = checkCompliance(rootPath);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("   ┌──────────────────────────────────────────────────────────────┐");
    for (const check of report.checks) {
      const icon =
        check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⬜";
      const file = check.file ? ` (${check.file})` : "";
      console.log(
        `   │ ${icon} ${check.spec.padEnd(22)} ${check.detail.slice(0, 35).padEnd(35)} │`,
      );
    }
    console.log("   └──────────────────────────────────────────────────────────────┘");
    console.log(`\n   Score: ${report.score}/${report.maxScore} — ${report.rating}\n`);
  }
}
