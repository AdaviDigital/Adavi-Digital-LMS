# Postman Collection — Adavi Digital Institute LMS

## Import
1. Open Postman → **Import** → select `Adavi-LMS.postman_collection.json`.
2. Also import `Adavi-LMS.postman_environment.json` and select it as your active environment (top-right).

## Typical flow
1. **Auth → Register** or **Auth → Login** — copy the `accessToken` from the response into the
   `accessToken` environment variable (or add a small test script to do this automatically — see below).
2. **Courses → List Courses** — copy a course `id` into the `courseId` variable.
3. **Modules & Lessons → Create Module / Create Lesson** (as an instructor account) to build content.
4. **Enrollments → Enroll** (free course) or **Orders → Create Order** + **Payments → Initiate Payment**
   (paid course) to gain access, then **Lessons → Get Lesson** and **Lessons → Record Progress**.
5. Explore **Quizzes**, **Exams**, **Assignments**, **Certificates**, **AI**, **Admin**, and **Analytics**
   folders as needed.

## Auto-capturing the access token
Add this to the **Tests** tab of the `Auth → Login` (and `Register`) requests to automatically populate
`accessToken` for all subsequent requests in the collection:

```javascript
const data = pm.response.json();
if (data?.data?.accessToken) {
  pm.environment.set('accessToken', data.data.accessToken);
}
```

## Notes
- All protected routes read the token from the `Authorization: Bearer {{accessToken}}` header, already
  wired into every relevant request in this collection.
- Placeholder path segments like `<questionId>`, `<userId>`, `<moduleId>` need to be replaced with real
  IDs from prior responses — Postman's environment variables are used for the ones you'll reuse most
  (`courseId`, `lessonId`, `orderId`).
