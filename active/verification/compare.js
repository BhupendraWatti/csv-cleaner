import fs from 'fs';

const origPath = 'd:/Personal Projects/New folder/csv-cleaner/active/verification/makeup.csv';
const cleanPath = 'd:/Personal Projects/New folder/csv-cleaner/active/verification/makeup_cleaned.csv';

const origContent = fs.readFileSync(origPath, 'utf8');
const cleanContent = fs.readFileSync(cleanPath, 'utf8');

const origLines = origContent.split(/\r?\n/).filter(l => l.length > 0);
const cleanLines = cleanContent.split(/\r?\n/).filter(l => l.length > 0);

console.log('=== FILE COMPARISON SUMMARY ===');
console.log('Original File Size:', fs.statSync(origPath).size, 'bytes');
console.log('Cleaned File Size :', fs.statSync(cleanPath).size, 'bytes');
console.log('Original Line Count:', origLines.length);
console.log('Cleaned Line Count :', cleanLines.length);

console.log('\n=== HEADERS COMPARISON ===');
console.log('Original Header:', origLines[0]);
console.log('Cleaned Header :', cleanLines[0]);

let diffLinesCount = 0;
const sampleDiffs = [];
let whitespaceDiffs = 0;

const maxLen = Math.max(origLines.length, cleanLines.length);

for (let i = 1; i < maxLen; i++) {
  const orig = origLines[i];
  const clean = cleanLines[i];

  if (orig !== clean) {
    diffLinesCount++;
    if (orig && clean && orig.trim() === clean.trim()) {
      whitespaceDiffs++;
    }
    if (sampleDiffs.length < 20) {
      sampleDiffs.push({
        row: i,
        orig: orig || '[LINE REMOVED / MISSING]',
        clean: clean || '[LINE REMOVED / MISSING]'
      });
    }
  }
}

console.log('\n=== STATS ===');
console.log('Total Modified Lines:', diffLinesCount);
console.log('Whitespace-only Line Modifications:', whitespaceDiffs);

console.log('\n=== SAMPLE LINE DIFFERENCES (First 20) ===');
sampleDiffs.forEach(d => {
  console.log(`\nRow ${d.row}:`);
  console.log(`  OLD: "${d.orig}"`);
  console.log(`  NEW: "${d.clean}"`);
});
