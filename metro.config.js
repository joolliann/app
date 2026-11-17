const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");

const config = getDefaultConfig(process.cwd());

// Tamagui ships both an ESM build (dist/esm) and a CJS build (dist/cjs) for
// React Native. Metro can load *both*: it picks the `import` condition (ESM)
// for `import` statements and the `require` condition (CJS) for `require()`
// calls. When both are loaded, @tamagui/web (and other core packages) exist as
// two separate module instances, each with its own module-level `conf` and its
// own `ThemeStateContext`. createTamagui() writes to one instance; useTheme() /
// updateTheme() read from the other (empty) and throw "Can't find Tamagui
// configuration" — Tamagui Error 001, "duplicate Tamagui sub-dependencies".
//
// Fix: for every tamagui / @tamagui/* import, resolve it (via Expo's existing
// resolver, which keeps tsconfig baseUrl/paths working for bare imports) and
// then rewrite the dist/esm path to the matching dist/cjs path, so every
// consumer loads the same single CJS instance. This is non-circular — each
// package keeps its own file; we only swap esm -> cjs within the same package.
const priorResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = priorResolveRequest
    ? priorResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);

  const isTamagui =
    moduleName === "tamagui" || moduleName.startsWith("@tamagui/");

  if (
    isTamagui &&
    resolved &&
    resolved.type === "sourceFile" &&
    resolved.filePath &&
    resolved.filePath.includes("/node_modules/") &&
    resolved.filePath.includes("/dist/esm/")
  ) {
    const cjsPath = resolved.filePath.replace("/dist/esm/", "/dist/cjs/");
    if (fs.existsSync(cjsPath)) {
      return { ...resolved, filePath: cjsPath };
    }
  }

  return resolved;
};

module.exports = config;
