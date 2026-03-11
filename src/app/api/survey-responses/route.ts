import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, createToken, AUTH_COOKIE, TOKEN_TTL_MS } from "@/lib/auth";
import { SurveyResponse, User } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const surveyType = searchParams.get("surveyType");

  const responses = readDB<SurveyResponse>("survey-responses");
  const userResponses = responses.filter((r) => {
    if (r.userId !== payload.id) return false;
    if (surveyType && r.surveyType !== surveyType) return false;
    return true;
  });

  return NextResponse.json(userResponses);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    surveyType?: "pre" | "post";
    answers?: Record<string, string | number | boolean | string[]>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const surveyType = body.surveyType ?? "pre";
  const answers = body.answers ?? {};

  const users = readDB<User>("users");
  const userIndex = users.findIndex((u) => u.id === payload.id);
  if (userIndex === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = users[userIndex];

  const responses = readDB<SurveyResponse>("survey-responses");
  const newResponse: SurveyResponse = {
    id: `sr-${Date.now()}`,
    userId: payload.id,
    cohortId: user.cohortId || "",
    surveyType,
    answers,
    submittedAt: new Date().toISOString(),
  };
  responses.push(newResponse);
  writeDB("survey-responses", responses);

  // For pre-survey: mark firstLoginComplete=true and reissue token
  if (surveyType === "pre") {
    users[userIndex] = { ...user, firstLoginComplete: true };
    writeDB("users", users);

    const newToken = await createToken({
      ...payload,
      firstLoginComplete: true,
      exp: Date.now() + TOKEN_TTL_MS,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_TTL_MS / 1000,
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ success: true });
}
