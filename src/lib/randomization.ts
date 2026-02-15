import { DosingRegimen, RandomizationResult, UserRole } from "./types";

interface StudentInput {
  firstName: string;
  lastName: string;
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function randomizeStudents(
  students: StudentInput[]
): RandomizationResult[] {
  const shuffled = shuffle(students);
  const total = shuffled.length;

  // Split: 1/3 patients without CHW, 1/3 patients with CHW, 1/3 CHWs
  const patientsWithChwCount = Math.floor(total / 3);
  const chwCount = patientsWithChwCount;
  const patientsWithoutChwCount = total - patientsWithChwCount - chwCount;

  const patientsWithoutChw = shuffled.slice(0, patientsWithoutChwCount);
  const patientsWithChw = shuffled.slice(
    patientsWithoutChwCount,
    patientsWithoutChwCount + patientsWithChwCount
  );
  const chws = shuffled.slice(patientsWithoutChwCount + patientsWithChwCount);

  const dosingOptions: DosingRegimen[] = ["1x", "2x", "3x"];

  function assignDosing(index: number): DosingRegimen {
    return dosingOptions[index % dosingOptions.length];
  }

  const results: RandomizationResult[] = [];

  // Patients without CHW
  patientsWithoutChw.forEach((student, i) => {
    results.push({
      firstName: student.firstName,
      lastName: student.lastName,
      role: "patient" as UserRole,
      dosingRegimen: assignDosing(i),
      pairedWith: null,
    });
  });

  // Patients with CHW + their CHWs
  patientsWithChw.forEach((student, i) => {
    const chw = chws[i];
    const chwName = `${chw.firstName} ${chw.lastName}`;
    const patientName = `${student.firstName} ${student.lastName}`;

    results.push({
      firstName: student.firstName,
      lastName: student.lastName,
      role: "patient" as UserRole,
      dosingRegimen: assignDosing(patientsWithoutChwCount + i),
      pairedWith: chwName,
    });

    results.push({
      firstName: chw.firstName,
      lastName: chw.lastName,
      role: "chw" as UserRole,
      dosingRegimen: null,
      pairedWith: patientName,
    });
  });

  return results;
}
