import { toNextJsHandler } from "better-auth/next-js";
import { authFor, originFromHeaders } from "@/lib/auth/server";

function handler(request: Request) {
  return toNextJsHandler(authFor(originFromHeaders(request.headers)));
}

export const GET = (request: Request) => handler(request).GET(request);
export const POST = (request: Request) => handler(request).POST(request);
