import { getSessionUser, sessionCookie } from "@/lib/auth";
import { authenticateProjectApiKey, extractApiKey } from "@/lib/project-api-keys";

export async function requestOwnerId(request:Request){
  const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="));
  const token=cookie?.slice(sessionCookie.length+1);
  const session=getSessionUser(token);
  if(session)return {ownerId:session.id,method:"session" as const};
  const api=await authenticateProjectApiKey(extractApiKey(request));
  if(api)return {ownerId:api.ownerId,method:"api_key" as const};
  return null;
}