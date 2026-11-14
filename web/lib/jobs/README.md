# lib/jobs

Staff manage jobs through `POST` and `PATCH /api/jobs`. Staff access requires the
`content_manager` or `admin` role. Publishing creates or refreshes the job's
knowledge chunk; closing a job removes it from published knowledge. Simple rules
flag posts that request applicant payments or have no employer for review.

`GET /api/jobs?query=...&location=...&type=...&offset=0` returns up to `limit` results (default 10, max 50) per
request. Pass the returned `nextOffset` as `offset` to read the next page. `GET /api/jobs/:id` returns
the job text in title, employer, place, requirements, how to apply, deadline order.
