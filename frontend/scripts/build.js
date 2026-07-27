process.env.CI = "false";
process.env.DISABLE_ESLINT_PLUGIN = "true";
process.env.GENERATE_SOURCEMAP = "false";

require("@craco/craco/dist/scripts/build");
