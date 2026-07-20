import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tempRoot = path.join(projectRoot, ".tmp-static-demo");
const outputDir = path.join(projectRoot, "out-static-demo");

async function safeRm(target) {
  await rm(target, { recursive: true, force: true });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function prepareWorkspace() {
  await safeRm(tempRoot);
  await safeRm(outputDir);
  await mkdir(tempRoot, { recursive: true });

  const entriesToCopy = [
    "app",
    "components",
    "hooks",
    "lib",
    "public",
    "types",
    "aaa.png",
    "ubf-icon.png",
    "components.json",
    "next-env.d.ts",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "postcss.config.mjs",
    "tsconfig.json",
  ];

  for (const entry of entriesToCopy) {
    await cp(path.join(projectRoot, entry), path.join(tempRoot, entry), { recursive: true });
  }

  await safeRm(path.join(tempRoot, "app", "api"));
  await safeRm(path.join(tempRoot, ".next"));
  await symlink(path.join(projectRoot, "node_modules"), path.join(tempRoot, "node_modules"), "dir");

  const packageJsonPath = path.join(tempRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.scripts.build = "next build";
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function main() {
  await prepareWorkspace();

  await run("npm", ["run", "build"], {
    cwd: tempRoot,
    env: {
      STATIC_EXPORT: "true",
      NEXT_PUBLIC_UI_DEMO: "true",
    },
  });

  await cp(path.join(tempRoot, "out"), outputDir, { recursive: true });
  console.log(`\nStatic demo exported to: ${outputDir}`);
}

main().catch(async (error) => {
  console.error("\nStatic demo build failed.");
  console.error(error);
  process.exitCode = 1;
});
