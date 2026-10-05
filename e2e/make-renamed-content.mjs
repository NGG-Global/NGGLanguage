// Builds e2e/.tmp/content-renamed.json: same content with every language renamed,
// to prove that a term change in content.json reaches every screen and the card.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const c = JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
const RENAMED = { C: 'כיוון', M: 'תודעה', S: 'תשתית', P: 'הטמעה' };
for (const [k, name] of Object.entries(RENAMED)) c.languages[k].name = name;
c.ui.result.save = 'שמרו את המפה';
mkdirSync(new URL('./.tmp/', import.meta.url), { recursive: true });
writeFileSync(new URL('./.tmp/content-renamed.json', import.meta.url), JSON.stringify(c, null, 2));
console.log('renamed content written');
