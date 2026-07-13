import { countFiles } from "../count.js";

function main(argv) {
  const useJson = argv.includes("--json");

  if (!useJson) {
    console.log("src/:", countFiles(["src/", "test/"]).src || 0);
    console.log("test/:", countFiles(["src/", "test/"]).test || 0);
    return 0;
  }

  const counts = countFiles(["src/", "test/"]);
  process.stdout.write(JSON.stringify(counts) + "\n");
  return 0;
}

export default main;
