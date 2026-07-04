import { Router } from 'express';
import { coursesController } from './courses.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { listCoursesSchema, createCourseSchema, updateCourseSchema } from './courses.schema';

const router = Router();

/**
 * @openapi
 * /courses:
 *   get:
 *     summary: List published courses with search, filters, and pagination
 *     tags: [Courses]
 */
router.get('/', validate(listCoursesSchema), coursesController.list);

/**
 * @openapi
 * /courses/mine:
 *   get:
 *     summary: List the current instructor's own courses in any status
 *     tags: [Courses]
 */
router.get('/mine', authenticate, authorize('INSTRUCTOR', 'ADMIN'), coursesController.myCourses);

/**
 * @openapi
 * /courses/{slug}:
 *   get:
 *     summary: Get course detail by slug
 *     tags: [Courses]
 */
router.get('/:slug', coursesController.getBySlug);

/**
 * @openapi
 * /courses:
 *   post:
 *     summary: Create a new course (Instructor/Admin)
 *     tags: [Courses]
 */
router.post(
  '/',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(createCourseSchema),
  coursesController.create,
);

router.patch(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(updateCourseSchema),
  coursesController.update,
);

/**
 * @openapi
 * /courses/{id}/builder:
 *   get:
 *     summary: Get full nested course structure for the course-builder UI (owner/admin, any status)
 *     tags: [Courses]
 */
router.get('/:id/builder', authenticate, authorize('INSTRUCTOR', 'ADMIN'), coursesController.getForBuilder);

/**
 * @openapi
 * /courses/{id}/submit-for-review:
 *   post:
 *     summary: Instructor submits a draft/rejected course for admin review
 *     tags: [Courses]
 */
router.post(
  '/:id/submit-for-review',
  authenticate,
  authorize('INSTRUCTOR'),
  coursesController.submitForReview,
);

router.post('/:id/publish', authenticate, authorize('ADMIN'), coursesController.publish);

router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN'), coursesController.remove);

export default router;
