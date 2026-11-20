# Assign Courses to an Organization

In Organizations → Manage Organization, select courses and click **Assign Selected
Courses**. The picker is enabled even when the organization list supplies only a
course count. Each selected course uses the supplied endpoint:

```http
POST /api/courses/{courseId}/assign_to_organization/
Authorization: Bearer <access token>
Content-Type: application/json
```

```json
{ "organization_id": "<organization ID>" }
```

Assignments are added individually. Successful courses are marked assigned;
failed courses remain selected for retry. The organization list and its displayed
course count refresh after successful writes. Known assigned courses cannot be
unchecked because this endpoint supplies no removal operation.

**Save Changes** updates organization details through PATCH and omits `course_ids`.
Creating an organization continues to send selected `course_ids` in the creation
request shown previously. An assignment needs an existing organization ID.

The list response does not return assigned course IDs, so courses assigned before
opening the form can only be marked assigned if IDs are supplied. Confirm the
assigned-ID response and duplicate-assignment behavior with the live backend.
These checks remain in `remaining-work.md`.
