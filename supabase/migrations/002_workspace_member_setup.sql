-- Allow a signed-in workspace owner to add themselves as the initial owner-member.
drop policy if exists "owner add initial workspace member" on public.workspace_members;
create policy "owner add initial workspace member" on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );
