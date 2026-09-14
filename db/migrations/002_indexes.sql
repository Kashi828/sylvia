create index if not exists project_members_user_idx on project_members(user_id);
create index if not exists devices_project_idx on devices(project_id);
create index if not exists datastreams_device_idx on datastreams(device_id);
create index if not exists devices_last_seen_idx on devices(last_seen desc);
