import { contentQualityGate } from './src/core/artifact-validator.js';
import fs from 'fs';
import path from 'path';

const archiveDir = 'examples/full-flow-demo/.taiyi/archive/full-flow-demo';

const phases = [
  { id: 'change', file: 'CHANGE.md' },
  { id: 'requirement', file: 'REQUIREMENT.md' },
  { id: 'design', file: 'DESIGN.md' },
  { id: 'ui-design', file: 'UI-DESIGN.md' },
  { id: 'task', file: 'TASK.md' },
  { id: 'test', file: 'TEST.md' },
  { id: 'review', file: 'REVIEW.md' },
  { id: 'integration', file: 'CHANGELOG.md' },
];

let totalIssues = 0;
let passed = 0;

for (const phase of phases) {
  const filePath = path.join(archiveDir, phase.file);
  if (!fs.existsSync(filePath)) { console.log('SKIP', phase.file); continue; }
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = contentQualityGate(phase.id, content);
  if (issues.length === 0) {
    console.log('PASS', phase.file);
    passed++;
  } else {
    console.log('FAIL', phase.file);
    for (const i of issues) console.log('  -', i);
    totalIssues += issues.length;
  }
}
console.log(`\n通过: ${passed}/${phases.filter(p => fs.existsSync(path.join(archiveDir, p.file))).length}`);
console.log(`门控问题: ${totalIssues}`);
