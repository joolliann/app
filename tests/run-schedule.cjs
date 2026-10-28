const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const output = mkdtempSync(path.join(tmpdir(), "kjhk-schedule-"));
try {
  const compile = spawnSync(
    process.execPath,
    [
      require.resolve("typescript/bin/tsc"),
      "-p",
      "tests/tsconfig.schedule.json",
      "--outDir",
      output,
    ],
    { stdio: "inherit" },
  );
  if (compile.status !== 0) process.exitCode = compile.status || 1;
  else {
    const test = spawnSync(
      process.execPath,
      ["--test", "tests/schedule.test.cjs"],
      {
        stdio: "inherit",
        env: { ...process.env, SCHEDULE_BUILD_DIR: output },
      },
    );
    process.exitCode = test.status || (test.error ? 1 : 0);
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
