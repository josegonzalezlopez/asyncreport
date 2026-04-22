import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] ?? "audit-output.json";
const outputJsonPath = process.argv[3] ?? "dependency-audit-report.json";
const outputMdPath = process.argv[4] ?? "dependency-audit-report.md";

const severityOrder = ["critical", "high", "moderate", "low", "info"];

function getTopSeverity(via) {
  if (!Array.isArray(via)) return "info";

  let best = "info";
  for (const item of via) {
    if (typeof item === "string") continue;
    const sev = item?.severity ?? "info";
    if (
      severityOrder.indexOf(sev) >= 0 &&
      severityOrder.indexOf(sev) < severityOrder.indexOf(best)
    ) {
      best = sev;
    }
  }
  return best;
}

function normalizeVulnerability(name, vulnerability) {
  const severity =
    vulnerability?.severity ?? getTopSeverity(vulnerability?.via) ?? "info";
  const isDev = vulnerability?.dev === true;
  const fixAvailable = vulnerability?.fixAvailable ?? false;
  const effects = Array.isArray(vulnerability?.effects)
    ? vulnerability.effects
    : [];

  return {
    package: name,
    severity,
    isDev,
    isDirect: vulnerability?.isDirect === true,
    range: vulnerability?.range ?? "",
    fixAvailable:
      typeof fixAvailable === "object" ? fixAvailable?.name ?? true : fixAvailable,
    effects,
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Dependency Security Report");
  lines.push("");
  lines.push(`- GeneratedAt: ${report.generatedAt}`);
  lines.push(`- RuntimeTotal: ${report.summary.runtime.total}`);
  lines.push(`- RuntimeCritical: ${report.summary.runtime.critical}`);
  lines.push(`- RuntimeHigh: ${report.summary.runtime.high}`);
  lines.push(`- RuntimeModerate: ${report.summary.runtime.moderate}`);
  lines.push(`- RuntimeLow: ${report.summary.runtime.low}`);
  lines.push(`- DevTotal: ${report.summary.dev.total}`);
  lines.push("");

  lines.push("## Policy Evaluation");
  lines.push(
    `- MainPolicy: warning-only (findings detected: ${report.summary.runtime.total > 0 ? "yes" : "no"})`,
  );
  lines.push(
    `- ReleasePolicy: fail if runtime high/critical > 0 (current: ${report.summary.runtime.high + report.summary.runtime.critical})`,
  );
  lines.push("");

  lines.push("## Top Runtime Findings");
  const topRuntime = report.runtimeFindings.slice(0, 20);
  if (topRuntime.length === 0) {
    lines.push("- No runtime vulnerabilities detected.");
  } else {
    for (const finding of topRuntime) {
      lines.push(
        `- ${finding.package} | severity=${finding.severity} | direct=${finding.isDirect} | fix=${String(finding.fixAvailable)}`,
      );
    }
  }

  lines.push("");
  lines.push("## Remediation Strategy");
  lines.push("1. Upgrade direct runtime packages with critical/high severity first.");
  lines.push("2. Regenerate lockfile and run test suite (`npm test` + smoke e2e).");
  lines.push(
    "3. For transitive vulnerabilities, pin parent dependencies to fixed ranges.",
  );
  lines.push(
    "4. Avoid `npm audit fix --force` in mainline; use dedicated remediation PRs.",
  );

  return `${lines.join("\n")}\n`;
}

const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
const parsed = JSON.parse(raw);
const vulnerabilities = parsed?.vulnerabilities ?? {};

const normalized = Object.entries(vulnerabilities).map(([name, vulnerability]) =>
  normalizeVulnerability(name, vulnerability),
);

const runtimeFindings = normalized.filter((finding) => !finding.isDev);
const devFindings = normalized.filter((finding) => finding.isDev);

function countBySeverity(findings, severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

const report = {
  generatedAt: new Date().toISOString(),
  inputFile: inputPath,
  summary: {
    runtime: {
      total: runtimeFindings.length,
      critical: countBySeverity(runtimeFindings, "critical"),
      high: countBySeverity(runtimeFindings, "high"),
      moderate: countBySeverity(runtimeFindings, "moderate"),
      low: countBySeverity(runtimeFindings, "low"),
      info: countBySeverity(runtimeFindings, "info"),
    },
    dev: {
      total: devFindings.length,
      critical: countBySeverity(devFindings, "critical"),
      high: countBySeverity(devFindings, "high"),
      moderate: countBySeverity(devFindings, "moderate"),
      low: countBySeverity(devFindings, "low"),
      info: countBySeverity(devFindings, "info"),
    },
  },
  runtimeFindings: runtimeFindings.sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  ),
  devFindings: devFindings.sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  ),
};

const markdown = buildMarkdown(report);
fs.writeFileSync(path.resolve(outputJsonPath), JSON.stringify(report, null, 2));
fs.writeFileSync(path.resolve(outputMdPath), markdown);

console.log(
  `Dependency report generated: ${outputJsonPath}, ${outputMdPath} (runtime=${report.summary.runtime.total}, high+critical=${report.summary.runtime.high + report.summary.runtime.critical})`,
);
