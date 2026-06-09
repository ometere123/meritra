import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/backend/supabase-server";
import { getIdentityFromHeaders } from "@/lib/backend/identity";

export async function GET(request: Request) {
  const identity = getIdentityFromHeaders(request.headers);
  if (!identity || !supabaseServer) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("*")
    .eq("privy_user_id", identity.privyUserId)
    .maybeSingle();
  return NextResponse.json({ profile, identity });
}
