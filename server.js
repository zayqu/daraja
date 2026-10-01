const path = require("node:path");

const runtimeDirectory = path.join(__dirname, "runtime");

process.chdir(runtimeDirectory);
require(path.join(runtimeDirectory, "server.js"));
