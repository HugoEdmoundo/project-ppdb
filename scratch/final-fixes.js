const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\ptdarrahman.sch.id\\project-ppdb';

// 1. Remove incorrect files from superadmin
const SUPERADMIN_UI = path.join(ROOT, 'apps', 'superadmin', 'src', 'components', 'ui');
if (fs.existsSync(SUPERADMIN_UI)) {
    ['alert.tsx', 'pageloader.tsx'].forEach(file => {
        const p = path.join(SUPERADMIN_UI, file);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    });
}

// 2. Fix imports inside dirty components (ppdb & superadmin)
function fixDirtyComponentImports(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.tsx')) {
            const p = path.join(dir, file);
            let content = fs.readFileSync(p, 'utf8');
            let modified = false;

            // They try to import from './modal', './button'
            // We should replace with '@repo/ui'
            const regex = /from\s+['"]\.\/(modal|button|avatar|dropdown-menu|card|sonner|alert|label)['"]/g;
            if (regex.test(content)) {
                content = content.replace(regex, 'from "@repo/ui"');
                modified = true;
            }

            if (modified) fs.writeFileSync(p, content);
        }
    }
}
fixDirtyComponentImports(path.join(ROOT, 'apps', 'ppdb', 'src', 'components', 'ui'));
fixDirtyComponentImports(SUPERADMIN_UI);

// 3. Fix pages in superadmin that import ConfirmDialog, ErrorState from @repo/ui
const pagesToFix = [
    { file: 'NotFoundPage.tsx', comp: 'ErrorState', path: '../components/ui/errorstate' },
    { file: 'NotificationsPage.tsx', comp: 'ConfirmDialog', path: '../components/ui/confirmdialog' },
    { file: 'RolesPage.tsx', comp: 'ConfirmDialog', path: '../components/ui/confirmdialog' },
    { file: 'UserFormPage.tsx', comp: 'ConfirmDialog', path: '../components/ui/confirmdialog' },
    { file: 'UsersPage.tsx', comp: 'ConfirmDialog', path: '../components/ui/confirmdialog' }
];

pagesToFix.forEach(p => {
    const fullPath = path.join(ROOT, 'apps', 'superadmin', 'src', 'pages', p.file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Simple string replace to avoid regex issues
        content = content.split(`import { ${p.comp} } from "@repo/ui"`).join(`import { ${p.comp} } from "${p.path}"`);
        content = content.split(`import { ${p.comp} } from '@repo/ui'`).join(`import { ${p.comp} } from '${p.path}'`);
        fs.writeFileSync(fullPath, content);
    }
});

console.log('Final fixes applied!');
