import { getSessionUserAsync, sessionCookie, type User } from "@/lib/auth";
import { authenticateProjectApiKey, extractApiKey } from "@/lib/project-api-keys";

export type RequestPrincipal={
  ownerId:string;
  method:"session"|"api_key";
  role:User["role"];
  userId?:string;
};

export async function requestPrincipal(request:Request):Promise<RequestPrincipal|null>{
  const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="));
  const token=cookie?.slice(sessionCookie.length+1);
  const session=await getSessionUserAsync(token);
  if(session)return {ownerId:session.id,method:"session",role:session.role,userId:session.id};
  const api=await authenticateProjectApiKey(extractApiKey(request));
  if(api)return {ownerId:api.ownerId,method:"api_key",role:"Owner"};
  return null;
}

export async function requestOwnerId(request:Request){
  const principal=await requestPrincipal(request);
  return principal?{ownerId:principal.ownerId,method:principal.method}:null;
}
