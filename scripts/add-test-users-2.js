const fs = require('fs');
const dbPath = './database';

const users = JSON.parse(fs.readFileSync(dbPath + '/users.json', 'utf-8'));

const newUsers = [
  {
    id: 'test-patient-2',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@test.com',
    role: 'patient',
    cohortId: 'cohort-1',
    capId: null,
    dosingRegimen: '2x',           // BID patient
    assignedChwId: 'test-chw-2',
    assignedPatientId: null,
    firstLoginComplete: false,
  },
  {
    id: 'test-chw-2',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@test.com',
    role: 'chw',
    cohortId: 'cohort-1',
    capId: null,
    dosingRegimen: null,
    assignedChwId: null,
    assignedPatientId: 'test-patient-2',
    firstLoginComplete: false,
  },
];

for (const u of newUsers) {
  const idx = users.findIndex(x => x.email === u.email || x.id === u.id);
  if (idx >= 0) {
    users[idx] = u;
    console.log('Updated:', u.email);
  } else {
    users.push(u);
    console.log('Created:', u.email, '(' + u.role + ')');
  }
}

fs.writeFileSync(dbPath + '/users.json', JSON.stringify(users, null, 2));
console.log('Done. Total users:', users.length);
