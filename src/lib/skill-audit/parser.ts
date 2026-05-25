export type ParsedSkillMd = {
  name: string
  description: string
  author: string
  version: string
  permissions: string[]
  detectedAccess: {
    network: boolean
    filesystem: boolean
    shell: boolean
    envVars: boolean
  }
}

function parseSimpleYaml(yamlText: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = yamlText.split("\n");
  let currentKey: string | null = null;
  let inList = false;
  const currentList: string[] = [];

  for (const line of lines) {
    const listItemMatch = line.match(/^\s+-\s+(.+)$/);
    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);

    if (listItemMatch && currentKey && inList) {
      currentList.push(listItemMatch[1].trim());
      continue;
    }

    if (currentKey && inList && currentList.length > 0 && !listItemMatch) {
      result[currentKey] = [...currentList];
      currentList.length = 0;
      inList = false;
      currentKey = null;
    }

    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2].trim();

      if (value === "" || value === "|" || value === ">") {
        currentKey = key;
        inList = true;
        currentList.length = 0;
      } else {
        // Remove surrounding quotes if present
        const unquoted = value.replace(/^["']|["']$/g, "");
        result[key] = unquoted;
        currentKey = null;
        inList = false;
      }
    }
  }

  // Flush any remaining list
  if (currentKey && inList && currentList.length > 0) {
    result[currentKey] = [...currentList];
  }

  return result;
}

export function parseSkillMdOptional(content: string | null): ParsedSkillMd {
  if (!content) {
    return {
      name: "",
      description: "",
      author: "",
      version: "",
      permissions: [],
      detectedAccess: {
        network: false,
        filesystem: false,
        shell: false,
        envVars: false,
      },
    };
  }
  return parseSkillMd(content);
}

export function parseSkillMd(content: string): ParsedSkillMd {
  let frontmatter = "";
  let bodyContent = content;

  // Extract frontmatter between --- delimiters
  const parts = content.split("---");
  if (parts.length >= 3) {
    // parts[0] is empty (before first ---), parts[1] is frontmatter, parts[2+] is body
    frontmatter = parts[1];
    bodyContent = parts.slice(2).join("---");
  }

  const yaml = parseSimpleYaml(frontmatter);

  const name = typeof yaml.name === "string" ? yaml.name : "";
  const description =
    typeof yaml.description === "string" ? yaml.description : "";
  const author = typeof yaml.author === "string" ? yaml.author : "";
  const version = typeof yaml.version === "string" ? yaml.version : "";
  const permissions = Array.isArray(yaml.permissions)
    ? yaml.permissions
    : typeof yaml.permissions === "string"
    ? [yaml.permissions]
    : [];

  const lower = bodyContent.toLowerCase();

  const networkPatterns = [
    "http",
    "api",
    "fetch",
    "request",
    "download",
    "webhook",
    "endpoint",
    "url",
    "curl",
    "wget",
  ];
  const filesystemPatterns = [
    "file",
    "read",
    "write",
    "directory",
    "path",
    "~/",
    "folder",
    "disk",
    "storage",
  ];
  const shellPatterns = [
    "bash",
    "shell",
    "terminal",
    "command",
    "exec",
    "run",
    "script",
    "subprocess",
  ];
  const envVarPatterns = [
    " $",
    "env",
    "environment",
    "variable",
    "token",
    "secret",
    "key",
    "credential",
    "api_key",
  ];

  return {
    name,
    description,
    author,
    version,
    permissions,
    detectedAccess: {
      network: networkPatterns.some((p) => lower.includes(p)),
      filesystem: filesystemPatterns.some((p) => lower.includes(p)),
      shell: shellPatterns.some((p) => lower.includes(p)),
      envVars: envVarPatterns.some((p) => lower.includes(p)),
    },
  };
}
