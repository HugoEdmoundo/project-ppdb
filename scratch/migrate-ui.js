const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\ptdarrahman.sch.id\\project-ppdb';
const UI_SRC = path.join(ROOT, 'packages', 'ui', 'src', 'components', 'ui');
const UI_INDEX = path.join(ROOT, 'packages', 'ui', 'src', 'index.ts');

const SOURCES_TO_EXTRACT = [
    path.join(ROOT, 'apps', 'ppdb', 'src', 'components', 'ui'),
    path.join(ROOT, 'apps', 'superadmin', 'src', 'components', 'ui')
];

const TARGET_REPLACE_DIRS = [
    path.join(ROOT, 'apps', 'ppdb', 'src'),
    path.join(ROOT, 'apps', 'superadmin', 'src'),
    path.join(ROOT, 'apps', 'companyprofile', 'app', 'admin'),
    path.join(ROOT, 'apps', 'companyprofile', 'components', 'admin') // Just in case
];

// 1. Extract and Copy Components
if (!fs.existsSync(UI_SRC)) {
    fs.mkdirSync(UI_SRC, { recursive: true });
}

let exportedComponents = new Set();
// We already manually created button.tsx and utils.ts, keep them in index.
exportedComponents.add('button');

SOURCES_TO_EXTRACT.forEach(srcDir => {
    if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        files.forEach(file => {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                if (file.toLowerCase() === 'index.ts') return; // skip index

                const srcPath = path.join(srcDir, file);
                const destName = file.toLowerCase(); // standardizing to lowercase
                const destPath = path.join(UI_SRC, destName);

                // Copy if not exist or overwrite (assuming shadcn is standard)
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }

                const compName = destName.replace(/\.tsx?$/, '');
                exportedComponents.add(compName);
            }
        });
    }
});

// Generate index.ts
let indexContent = `export * from "./lib/utils";\n`;
exportedComponents.forEach(comp => {
    indexContent += `export * from "./components/ui/${comp}";\n`;
});
fs.writeFileSync(UI_INDEX, indexContent);

// 2. Replace Imports in Apps
function traverseAndReplace(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            traverseAndReplace(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Regex to match imports like: import { Button } from "@/components/ui/button"
            // or import { Card } from "../../../components/ui/card"
            // We want to replace the FROM part with "@repo/ui"

            // Matches: import { ... } from "@/components/ui/..."
            const regex1 = /from\s+["']@\/components\/ui\/[^"']+["']/g;
            if (regex1.test(content)) {
                content = content.replace(regex1, 'from "@repo/ui"');
                modified = true;
            }

            // Matches relative imports: import { ... } from "../../components/ui/..."
            const regex2 = /from\s+["'](?:\.\.\/)+components\/ui\/[^"']+["']/g;
            if (regex2.test(content)) {
                content = content.replace(regex2, 'from "@repo/ui"');
                modified = true;
            }

            if (modified) {
                // If there are multiple imports from "@repo/ui" now, it's fine, bundlers handle it.
                // But ideally we'd collapse them. For now, this works.
                fs.writeFileSync(fullPath, content);
                console.log(`Updated imports in: ${fullPath}`);
            }
        }
    }
}

TARGET_REPLACE_DIRS.forEach(dir => traverseAndReplace(dir));
console.log("Migration script completed.");
