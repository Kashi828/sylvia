import { databaseConfigured, query } from "@/lib/db";
import type { User } from "@/lib/auth";
import { ensureWorkspaceMember, getWorkspaceMember, type WorkspaceMember } from "@/lib/workspace-auth";

export const DEFAULT_PROJECT_ID = "sylvia-local-workspace";
export const PROJECT_HEADER = "x-sylvia-project";
export const PROJECT_COOKIE = "sylvia_project";

export type WorkspaceProject = {
  id: string;
  ownerId: string | null;
  name: string;
  slug: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  role?: WorkspaceMember["role"];
};

function normalize(row: Record<string, unknown>): WorkspaceProject {
  return {
    id: String(row.id),
    ownerId: row.owner_id ? String(row.owner_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    status: String(row.status) as WorkspaceProject["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    role: row.role ? String(row.role) as WorkspaceMember["role"] : undefined,
  };
}

export function requestedProjectId(request: Request): string {
  const headerValue = request.headers.get(PROJECT_HEADER)?.trim();
  const cookieRaw = request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(PROJECT_COOKIE+"="))?.slice(PROJECT_COOKIE.length+1);
  const cookieValue = cookieRaw ? decodeURIComponent(cookieRaw) : "";
  const raw = headerValue || cookieValue || "";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(raw)) return DEFAULT_PROJECT_ID;
  return raw;
}

export async function ensureDefaultWorkspaceProject(user: User): Promise<WorkspaceProject> {
  if (!databaseConfigured()) {
    return {
      id: DEFAULT_PROJECT_ID,
      ownerId: user.id,
      name: "SYLVIA Cloud Project",
      slug: "sylvia-cloud-project",
      status: "active",
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
      role: user.role,
    };
  }

  try {
    const result = await query(
      `INSERT INTO public.workspace_projects(id,owner_id,name,slug)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(id) DO UPDATE SET owner_id=COALESCE(public.workspace_projects.owner_id,EXCLUDED.owner_id),updated_at=NOW()
       RETURNING id,owner_id,name,slug,status,created_at,updated_at`,
      [DEFAULT_PROJECT_ID, user.id, "SYLVIA Cloud Project", "sylvia-cloud-project"],
    );
    await ensureWorkspaceMember(user, DEFAULT_PROJECT_ID);
    return normalize(result.rows[0] as Record<string, unknown>);
  } catch {
    return {
      id: DEFAULT_PROJECT_ID,
      ownerId: user.id,
      name: "SYLVIA Cloud Project",
      slug: "sylvia-cloud-project",
      status: "active",
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
      role: user.role,
    };
  }
}

export async function getWorkspaceProjectForUser(projectId: string, userId: string): Promise<WorkspaceProject | null> {
  if (!databaseConfigured()) {
    return projectId === DEFAULT_PROJECT_ID
      ? { id: DEFAULT_PROJECT_ID, ownerId: userId, name: "SYLVIA Cloud Project", slug: "sylvia-cloud-project", status: "active", createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }
      : null;
  }

  const result = await query(
    `SELECT p.id,p.owner_id,p.name,p.slug,p.status,p.created_at,p.updated_at,m.role
     FROM public.workspace_projects p
     JOIN public.workspace_members m ON m.project_id=p.id
     WHERE p.id=$1 AND m.user_id=$2 AND m.status='Active'
     LIMIT 1`,
    [projectId, userId],
  );
  return result.rows[0] ? normalize(result.rows[0] as Record<string, unknown>) : null;
}

export async function listWorkspaceProjects(userId: string) {
  if (!databaseConfigured()) {
    return [{ id: DEFAULT_PROJECT_ID, ownerId: userId, name: "SYLVIA Cloud Project", slug: "sylvia-cloud-project", status: "active" as const, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), role: "Owner" as const }];
  }
  const result = await query(
    `SELECT p.id,p.owner_id,p.name,p.slug,p.status,p.created_at,p.updated_at,m.role
     FROM public.workspace_projects p
     JOIN public.workspace_members m ON m.project_id=p.id
     WHERE m.user_id=$1 AND m.status='Active'
     ORDER BY p.created_at ASC`,
    [userId],
  );
  return result.rows.map(row => normalize(row as Record<string, unknown>));
}

export async function createWorkspaceProject(user: User, name: string) {
  if (!databaseConfigured()) return null;
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) throw new Error("Project name must be 2-80 characters");

  const baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "project";
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const result = await query(
    `INSERT INTO public.workspace_projects(id,owner_id,name,slug)
     VALUES($1,$2,$3,$4)
     RETURNING id,owner_id,name,slug,status,created_at,updated_at`,
    [id, user.id, cleanName, slug],
  );
  await query(
    `INSERT INTO public.workspace_members(id,project_id,user_id,name,email,role,status)
     VALUES($1,$2,$3,$4,$5,'Owner','Active')
     ON CONFLICT(project_id,email) DO UPDATE SET user_id=EXCLUDED.user_id,name=EXCLUDED.name,role='Owner',status='Active',updated_at=NOW()`,
    [`member_${user.id}_${id}`, id, user.id, user.name, user.email],
  );
  return normalize(result.rows[0] as Record<string, unknown>);
}

export async function requireProjectMembership(user: User, projectId: string) {
  if (projectId === DEFAULT_PROJECT_ID) {
    await ensureDefaultWorkspaceProject(user);
  }
  return getWorkspaceProjectForUser(projectId, user.id);
}

export async function projectRole(user: User, projectId: string) {
  const member = projectId === DEFAULT_PROJECT_ID
    ? await ensureWorkspaceMember(user, projectId)
    : await getWorkspaceMember(user.id, projectId);
  return member?.role || null;
}
