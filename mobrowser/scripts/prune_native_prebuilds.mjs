// Keeps only the exifcleaner-node prebuild for the platform being built.
//
// exifcleaner-node ships publication.node for six platform/arch pairs in one
// package. MōBrowser's `nodeModules` packaging (mobrowser.conf.json) refuses a
// package holding a .node add-on for another architecture than the build
// target, so the others are removed from node_modules after every install.
//
// ponytail: prunes node_modules in place; building for another arch means
// reinstalling with npm_config_arch=<arch> (or --cpu/--os). Drop this script
// once exifcleaner-node publishes per-platform optional packages.
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";

const prebuilds = path.resolve(
	import.meta.dirname,
	"../node_modules/exifcleaner-node/prebuilds",
);
const platform = process.env["npm_config_platform"] ?? process.platform;
const arch = process.env["npm_config_arch"] ?? process.arch;
const keep = `${platform}-${arch}`;

const tuples = readdirSync(prebuilds);
if (!tuples.includes(keep)) {
	throw new Error(`exifcleaner-node has no prebuild for ${keep}`);
}
for (const tuple of tuples) {
	if (tuple !== keep) {
		rmSync(path.join(prebuilds, tuple), { recursive: true, force: true });
	}
}
console.log(`exifcleaner-node: kept the ${keep} prebuild`);
