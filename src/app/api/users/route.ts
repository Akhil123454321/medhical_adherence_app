import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { User } from "@/lib/types";

export async function GET() {
  const users = readDB<User>("users");
  return NextResponse.json(users);
}
