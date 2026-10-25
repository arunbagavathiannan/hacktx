const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// three's "require" export (build/three.cjs) calls process.emitWarning, which React Native
// doesn't have, so the globe crashes on Android/Expo Go. Always resolve the ES module build.
const threeModule = path.join(path.dirname(require.resolve("three")), "three.module.js");
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three") return { type: "sourceFile", filePath: threeModule };
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
