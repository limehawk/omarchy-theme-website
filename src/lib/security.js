import { escapeHtml } from "./escape.js";

export function securityHtml(theme) {
  if (!theme.security_warnings) return "";
  try {
    const warnings = JSON.parse(theme.security_warnings);
    const scripts = warnings.filter((w) => w.startsWith("suspicious file:")).map((w) => w.replace("suspicious file: ", ""));
    const exts = warnings.filter((w) => w.startsWith("vscode.json installs extension:")).map((w) => w.replace("vscode.json installs extension: ", ""));
    const dangerousLua = warnings.some((w) => w.startsWith("dangerous lua"));
    if (!(scripts.length || exts.length || dangerousLua)) return "";
    const branch = theme.default_branch ?? "main";
    const repoBase = `${theme.github_url}/blob/${branch}`;
    const blocks = [];
    if (scripts.length > 0) {
      blocks.push(`<div class="border border-blue-500/20 bg-blue-500/5 rounded-xl p-5 space-y-3 text-sm">
            <div class="font-mono text-xs text-blue-400 uppercase tracking-wider">includes extras</div>
            <p class="text-muted-foreground leading-relaxed">This theme ships optional scripts for additional setup.</p>
            <ul class="space-y-1">${scripts.map((f) => `<li><a href="${escapeHtml(`${repoBase}/${f}`)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30">${escapeHtml(f)}</a></li>`).join("")}</ul>
          </div>`);
    }
    if (exts.length > 0) {
      blocks.push(`<div class="border border-blue-500/20 bg-blue-500/5 rounded-xl p-5 space-y-3 text-sm">
            <div class="font-mono text-xs text-blue-400 uppercase tracking-wider">installs vscode extension</div>
            <p class="text-muted-foreground leading-relaxed">Installing this theme will install the following VS Code extension:</p>
            <ul class="space-y-1">${exts.map((e) => `<li><a href="${escapeHtml(`https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(e)}`)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30">${escapeHtml(e)}</a></li>`).join("")}</ul>
          </div>`);
    }
    blocks.push(`<div class="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-5 space-y-2 text-sm">
          <div class="flex items-center gap-2 font-mono text-xs text-yellow-500 uppercase tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            heads up
          </div>
          <p class="text-muted-foreground leading-relaxed">${dangerousLua ? "This theme includes code that can run commands on your machine. Review it before installing." : "Never run scripts from the internet without reading them first. Community themes are not audited and may contain anything. You are responsible for what you execute on your machine."}</p>
        </div>`);
    return `<div class="space-y-3">${blocks.join("")}</div>`;
  } catch {
    return "";
  }
}
