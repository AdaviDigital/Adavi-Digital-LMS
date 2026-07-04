import { Router } from 'express';
import { lessonsController } from './lessons.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.middleware';
import { createLessonSchema, updateLessonSchema, progressSchema, addResourceSchema, reorderLessonsSchema } from './lessons.schema';

const router = Router();

/**
 * @openapi
 * /lessons:
 *   post:
 *     summary: Create a lesson within a module (Instructor/Admin)
 *     tags: [Lessons]
 */
router.post(
  '/',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(createLessonSchema),
  lessonsController.create,
);

/**
 * @openapi
 * /lessons/reorder:
 *   patch:
 *     summary: Reorder all lessons within a module (drag-and-drop course builder)
 *     tags: [Lessons]
 */
router.patch(
  '/reorder',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(reorderLessonsSchema),
  lessonsController.reorder,
);

/**
 * @openapi
 * /lessons/{id}:
 *   get:
 *     summary: Get lesson detail (video, transcript, resources, quiz, assignment) — enrolled students only, unless preview
 *     tags: [Lessons]
 */
router.get('/:id', optionalAuthenticate, lessonsController.getById);

router.patch(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(updateLessonSchema),
  lessonsController.update,
);

router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN'), lessonsController.remove);

router.post(
  '/:id/resources',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(addResourceSchema),
  lessonsController.addResource,
);

/**
 * @openapi
 * /lessons/{id}/progress:
 *   post:
 *     summary: Record student watch progress / mark lesson complete
 *     tags: [Lessons]
 */
router.post(
  '/:id/progress',
  authenticate,
  authorize('STUDENT'),
  validate(progressSchema),
  lessonsController.recordProgress,
);

export default router;
