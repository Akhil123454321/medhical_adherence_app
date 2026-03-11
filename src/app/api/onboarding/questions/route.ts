import { NextRequest, NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, Cohort, Question } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = readDB<User>("users");
  const user = users.find((u) => u.id === payload.id);

  if (!user || !user.cohortId) {
    return NextResponse.json([]);
  }

  const cohorts = readDB<Cohort>("cohorts");
  const cohort = cohorts.find((c) => c.id === user.cohortId);

  if (!cohort || cohort.questionIds.length === 0) {
    return NextResponse.json([]);
  }

  const questions = readDB<Question>("questions");
  const cohortQuestions = questions.filter((q) =>
    cohort.questionIds.includes(q.id)
  );

  return NextResponse.json(cohortQuestions);
}
