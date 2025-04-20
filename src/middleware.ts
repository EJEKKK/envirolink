import { NextResponse, type NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);

  if (
    request.headers.get("User-Agent")?.includes("facebookexternalhit") &&
    request.headers.has("Range")
  ) {
    headers.delete("Range");
  }

  return NextResponse.next({ request: { headers } });
}
