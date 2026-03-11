const fs = require('fs');
const dbPath = './database';

const users = JSON.parse(fs.readFileSync(dbPath + '/users.json', 'utf-8'));

const testUsers = [
  {
    id: 'test-patient-1',
    firstName: 'Test',
    lastName: 'Patient',
    email: 'patient@test.com',
    role: 'patient',
    cohortId: 'cohort-1',
    capId: null,
    dosingRegimen: null,
    assignedChwId: 'test-chw-1',
    assignedPatientId: null,
    firstLoginComplete: false,
  },
  {
    id: 'test-chw-1',
    firstName: 'Test',
    lastName: 'CHW',
    email: 'chw@test.com',
    role: 'chw',
    cohortId: 'cohort-1',
    capId: null,
    dosingRegimen: null,
    assignedChwId: null,
    assignedPatientId: 'test-patient-1',
    firstLoginComplete: false,
  },
];

for (const testUser of testUsers) {
  const existing = users.findIndex(u => u.email === testUser.email);
  if (existing >= 0) {
    users[existing] = testUser;
    console.log('Updated', testUser.email);
  } else {
    users.push(testUser);
    console.log('Created', testUser.email, '(' + testUser.role + ')');
  }
}

fs.writeFileSync(dbPath + '/users.json', JSON.stringify(users, null, 2));
console.log('Done. Total users:', users.length);
