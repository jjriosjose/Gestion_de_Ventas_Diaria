-- Logistics & Delivery V1
-- Restrict POD document-link reads to logistics viewers or the assigned internal driver.

drop policy if exists delivery_proof_documents_select on public.delivery_proof_documents;

create policy delivery_proof_documents_select on public.delivery_proof_documents
for select to authenticated
using (
  exists (
    select 1
    from public.delivery_proofs p
    join public.delivery_trips t on t.id = p.trip_id
    left join public.delivery_drivers d on d.id = t.driver_id
    where p.id = delivery_proof_documents.proof_id
      and (
        private.current_user_can_view_logistics()
        or d.employee_id = private.current_employee_id()
      )
  )
);
