import { getSessionUserAsync, sessionCookie, type User } from "@/lib/auth";
import { authenticateProjectApiKey, extractApiKey } from "@/lib/project-api-keys";
import { DEFAULT_PROJECT_ID, requestedProjectId, requireProjectMembership } from "@/lib/workspace-projects";

export type RequestPrincipal={
  ownerId:string;
  projectId:string;
  method:"session"|"api_key";
  role:User["role"];
  userId?:string;
  user?:User;
};

export async function requestPrincipal(request:Request):Promise<RequestPrincipal|null>{
  const projectId=requestedProjectId(request);
  const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="));
  const token=cookie?.slice(sessionCookie.length+1);
  const session=await getSessionUserAsync(token);
  if(session){
    const project=await requireProjectMembership(session,projectId);
    if(!project)return null;
    return {ownerId:session.id,projectId,method:"session",role:project.role||session.role,userId:session.id,user:session};
  }
  const api=await authenticateProjectApiKey(extractApiKey(request));
  if(api){
    if(api.projectId !== projectId && projectId !== DEFAULT_PROJECT_ID)return null;
    if(api.projectId !== projectId)return null;
    return {ownerId:api.ownerId,projectId:api.projectId,method:"api_key",role:"Owner"};
  }
  return null;
}

export async function requestOwnerId(request:Request){
  const principal=await requestPrincipal(request);
  return principal?{ownerId:principal.ownerId,method:principal.method}:null;
}
