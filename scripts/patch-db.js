const fs = require('fs');
const dbPath = './database';

const users = JSON.parse(fs.readFileSync(dbPath + '/users.json', 'utf-8'));
const updated = users.map(u => ({
  ...u,
  passwordHash: u.passwordHash || 'bdbb487b139cfeea533e166183eb723db7d2dacd54f0deca3428fc96518e833e',
  firstLoginComplete: u.firstLoginComplete != null ? u.firstLoginComplete : false,
}));
fs.writeFileSync(dbPath + '/users.json', JSON.stringify(updated, null, 2));
console.log('Updated', updated.length, 'users with passwordHash + firstLoginComplete');

const cohorts = JSON.parse(fs.readFileSync(dbPath + '/cohorts.json', 'utf-8'));
const uc = cohorts.map(c => ({ ...c, emails: c.emails || [] }));
fs.writeFileSync(dbPath + '/cohorts.json', JSON.stringify(uc, null, 2));
console.log('Updated', uc.length, 'cohorts with emails field');

fs.writeFileSync(dbPath + '/survey-responses.json', '[]');
console.log('Created survey-responses.json');
