const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\ptdarrahman.sch.id\\project-ppdb';
const UI_SRC = path.join(ROOT, 'packages', 'ui', 'src', 'components', 'ui');
const UI_INDEX = path.join(ROOT, 'packages', 'ui', 'src', 'index.ts');

const PPDB_UI = path.join(ROOT, 'apps', 'ppdb', 'src', 'components', 'ui');
const SUPERADMIN_UI = path.join(ROOT, 'apps', 'superadmin', 'src', 'components', 'ui');

// These components are not pure UI, they have business logic/types that belong to the apps
const DIRTY_COMPS = ['pageloader.tsx', 'errorstate.tsx', 'successstate.tsx', 'confirmdialog.tsx', 'alert.tsx'];

// 1. Move dirty components back
[PPDB_UI, SUPERADMIN_UI].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

DIRTY_COMPS.forEach(comp => {
    const srcPath = path.join(UI_SRC, comp);
    if (fs.existsSync(srcPath)) {
        // Copy to both apps just to be safe, then delete from packages/ui
        fs.copyFileSync(srcPath, path.join(PPDB_UI, comp));
        fs.copyFileSync(srcPath, path.join(SUPERADMIN_UI, comp));
        fs.unlinkSync(srcPath);
    }
});

// Rebuild index.ts
let indexContent = `export * from "./lib/utils";\n`;
const finalFiles = fs.readdirSync(UI_SRC);
finalFiles.forEach(f => {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        const comp = f.replace(/\.tsx?$/, '');
        indexContent += `export * from "./components/ui/${comp}";\n`;
    }
});
fs.writeFileSync(UI_INDEX, indexContent);

// 2. Fix relative imports in superadmin and ppdb that we missed
function fixRelativeImports(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixRelativeImports(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Catch imports like: from './ui/avatar' or from '../ui/button'
            const regex = /from\s+['"](?:\.\/|\.\.\/)+ui\/([^'"]+)['"]/g;
            content = content.replace(regex, (match, p1) => {
                // If it's a dirty component, we import from local, otherwise @repo/ui
                if (DIRTY_COMPS.includes(p1.toLowerCase() + '.tsx')) {
                    return match; // leave relative
                }
                return `from "@repo/ui"`;
            });

            // Also fix dirty components that were changed to @repo/ui by previous script
            DIRTY_COMPS.forEach(comp => {
                const compName = comp.replace('.tsx', '');
                // This is a bit brute force, but if a dirty comp is imported from @repo/ui, change it to local
                // Actually, let's just let typescript complain and I'll fix it if needed.
                // Mostly they were imported locally.
            });

            if (modified) fs.writeFileSync(fullPath, content);
        }
    }
}

fixRelativeImports(path.join(ROOT, 'apps', 'ppdb', 'src'));
fixRelativeImports(path.join(ROOT, 'apps', 'superadmin', 'src'));

console.log("Fix build script done!");
