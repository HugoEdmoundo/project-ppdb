const fs = require('fs');
const path = require('path');

const UI_SRC = 'C:\\ptdarrahman.sch.id\\project-ppdb\\packages\\ui\\src\\components\\ui';
const UI_INDEX = 'C:\\ptdarrahman.sch.id\\project-ppdb\\packages\\ui\\src\\index.ts';

// 1. Delete duplicates
if (fs.existsSync(path.join(UI_SRC, 'dropdownmenu.tsx'))) {
    fs.unlinkSync(path.join(UI_SRC, 'dropdownmenu.tsx'));
}

// 2. Read all files and fix internal imports
const files = fs.readdirSync(UI_SRC);
files.forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const fullPath = path.join(UI_SRC, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        // Fix casing in internal imports
        // Example: import { Label } from './Label' -> import { Label } from './label'
        const importRegex = /(from\s+['"]\.\/[^'"]+['"])/g;
        content = content.replace(importRegex, (match) => {
            if (match.includes('utils')) return match; // Keep utils as is if any
            return match.toLowerCase();
        });

        // Some components might import from "@/components/ui/..." because they were copied over
        // We should change them to "./..."
        const aliasRegex = /from\s+['"]@\/components\/ui\/([^'"]+)['"]/g;
        content = content.replace(aliasRegex, (match, p1) => {
            return `from "./${p1.toLowerCase()}"`;
        });

        // Also fix lucide-react icon imports if they are incorrectly named or missing?
        // Actually, typescript error said:
        // 'Icon' cannot be used as a JSX component.
        // That's a React 18 / 19 typescript definition mismatch with Lucide.
        // It's a known issue where Lucide icons are used as <Icon /> and TS thinks it returns a bigint.
        // It happens when React versions conflict.

        fs.writeFileSync(fullPath, content);
    }
});

// 3. Rebuild index.ts
let indexContent = `export * from "./lib/utils";\n`;
const finalFiles = fs.readdirSync(UI_SRC);
finalFiles.forEach(f => {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        const comp = f.replace(/\.tsx?$/, '');
        indexContent += `export * from "./components/ui/${comp}";\n`;
    }
});
fs.writeFileSync(UI_INDEX, indexContent);

console.log("Cleanup complete!");
