# Admin User Manual — Adavi Digital Institute

## Accessing the Admin Panel
Log in with an account with the `ADMIN` role, then navigate to **Admin Panel**. The first admin account
is created via the database seed script (`admin@adavidigitalinstitute.com` in the demo seed) — change
this password immediately in production, or create your real admin account directly in the database.

## User Management
- **View all users**: paginated list with role and status filters (`GET /api/v1/admin/users`)
- **Deactivate/reactivate a user**: toggles login access without deleting their data or history
  (`PATCH /api/v1/admin/users/:id/status`)

## Course Approval Workflow
New instructor courses start as `DRAFT`, then move to `PENDING_REVIEW` when submitted. As an admin:
1. Go to **Admin Panel → Pending Course Approvals**.
2. Review the course content.
3. Click **Approve** (course becomes `PUBLISHED` and appears in the public catalog) or **Reject**
   (with a reason, visible to the instructor).

## Coupons
Create discount codes for marketing campaigns or partnerships:
```
POST /api/v1/coupons
{ "code": "LAUNCH20", "discountPct": 20, "maxUses": 500, "expiresAt": "2026-12-31T23:59:59Z" }
```
Coupons can be platform-wide or scoped to a single course (`courseId`).

## Payments & Refunds
- All successful/failed payments are recorded per order.
- Issue a refund: `POST /api/v1/payments/:id/refund` (marks the payment as refunded; actually returning
  funds requires calling your payment gateway's refund API directly with your gateway dashboard/API
  credentials — this endpoint currently updates platform records so refunded courses can be revoked from
  a student's access in a future release).

## Platform Analytics
**Admin Panel** shows platform-wide metrics: total users, published courses, enrollments, completion
rate, and total revenue (`GET /api/v1/analytics/platform`).

## Audit Logs
Every sensitive admin action (user deactivation, course approval/rejection) is recorded with the
acting admin, timestamp, and IP address: `GET /api/v1/admin/audit-logs`.

## Site Content
- **Blog**: create/edit/delete posts (`/api/v1/blog`) — visible on the public Blog page once published.
- **FAQ**: manage frequently asked questions (`/api/v1/faq`) — visible on the public FAQ page.
- **Settings**: key-value platform settings (`/api/v1/admin/settings`) for future configurable options
  (e.g. featured courses, homepage banner text).

## Notifications
Broadcast a message to a set of users across email/SMS/WhatsApp/in-app channels:
```
POST /api/v1/notifications/broadcast
{ "userIds": ["..."], "channels": ["EMAIL", "IN_APP"], "title": "Platform Maintenance", "body": "..." }
```

## Security Notes
- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` periodically; this invalidates all existing sessions.
- Review audit logs regularly for unexpected admin-level actions.
- Keep payment gateway secret keys out of version control — only in your server's `.env`.
