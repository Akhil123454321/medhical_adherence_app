import { NextRequest, NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User } from "@/lib/types";

export async function GET(request: NextRequest) {
	const token = request.cookies.get(AUTH_COOKIE)?.value;
	const payload = token ? await verifyToken(token) : null;
    	if (!payload || payload.role !== "admin") {
      		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   	}
    	const users = readDB<User>("users");
    	return NextResponse.json(users);
}
