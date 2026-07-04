import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { certificatesService } from '../certificates/certificates.routes';

async function getModuleWithCourse(moduleId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
  if (!mod) throw new AppError(404, 'Module not found');
  return mod;
}

async function assertInstructorOwnsLesson(lessonId: string, userId: string, isAdmin: boolean) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError(404, 'Lesson not found');
  if (lesson.module.course.instructorId !== userId && !isAdmin) {
    throw new AppError(403, 'You do not own this course');
  }
  return lesson;
}

async function assertStudentCanAccessLesson(lessonId: string, studentId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError(404, 'Lesson not found');
  if (lesson.isPreview) return lesson;

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: lesson.module.courseId } },
  });
  if (!enrollment || enrollment.status !== 'ACTIVE') {
    throw new AppError(403, 'You must be enrolled in this course to access this lesson');
  }
  return lesson;
}

export const lessonsService = {
  async create(
    userId: string,
    isAdmin: boolean,
    input: {
      moduleId: string;
      title: string;
      order: number;
      contentType: string;
      videoUrl?: string;
      videoFormat?: string;
      transcript?: string;
      isPreview: boolean;
      durationSeconds: number;
    },
  ) {
    const mod = await getModuleWithCourse(input.moduleId);
    if (mod.course.instructorId !== userId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }

    let videoId: string | undefined;
    if (input.videoUrl) {
      const video = await prisma.video.create({
        data: {
          originalUrl: input.videoUrl,
          format: input.videoFormat || 'mp4',
          durationSecs: input.durationSeconds,
        },
      });
      videoId = video.id;
    }

    return prisma.lesson.create({
      data: {
        moduleId: input.moduleId,
        title: input.title,
        order: input.order,
        contentType: input.contentType,
        transcript: input.transcript,
        isPreview: input.isPreview,
        durationSeconds: input.durationSeconds,
        videoId,
      },
    });
  },

  async getById(lessonId: string, studentId: string | undefined) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { video: true, resources: true, assignments: true, quizzes: true, module: true },
    });
    if (!lesson) throw new AppError(404, 'Lesson not found');

    if (studentId) {
      await assertStudentCanAccessLesson(lessonId, studentId);
    } else if (!lesson.isPreview) {
      throw new AppError(401, 'Authentication required to view this lesson');
    }

    return lesson;
  },

  async update(lessonId: string, userId: string, isAdmin: boolean, input: Record<string, unknown>) {
    await assertInstructorOwnsLesson(lessonId, userId, isAdmin);
    return prisma.lesson.update({ where: { id: lessonId }, data: input });
  },

  async remove(lessonId: string, userId: string, isAdmin: boolean) {
    await assertInstructorOwnsLesson(lessonId, userId, isAdmin);
    await prisma.lesson.delete({ where: { id: lessonId } });
  },

  async addResource(lessonId: string, userId: string, isAdmin: boolean, input: { title: string; fileUrl: string; fileType: string }) {
    await assertInstructorOwnsLesson(lessonId, userId, isAdmin);
    return prisma.resource.create({ data: { lessonId, ...input } });
  },

  async reorder(userId: string, isAdmin: boolean, moduleId: string, orderedLessonIds: string[]) {
    const mod = await getModuleWithCourse(moduleId);
    if (mod.course.instructorId !== userId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    const lessons = await prisma.lesson.findMany({ where: { moduleId } });
    if (lessons.length !== orderedLessonIds.length || !lessons.every((l: any) => orderedLessonIds.includes(l.id))) {
      throw new AppError(422, 'orderedLessonIds must contain exactly the lessons belonging to this module');
    }
    await prisma.$transaction(
      orderedLessonIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index } })),
    );
    return prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: 'asc' } });
  },

  async recordProgress(
    lessonId: string,
    studentId: string,
    input: { watchedSecs: number; lastPositionSecs: number; isCompleted?: boolean },
  ) {
    await assertStudentCanAccessLesson(lessonId, studentId);

    const progress = await prisma.studentProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        watchedSecs: input.watchedSecs,
        lastPositionSecs: input.lastPositionSecs,
        ...(input.isCompleted !== undefined ? { isCompleted: input.isCompleted } : {}),
      },
      create: {
        studentId,
        lessonId,
        watchedSecs: input.watchedSecs,
        lastPositionSecs: input.lastPositionSecs,
        isCompleted: input.isCompleted ?? false,
      },
    });

    await recalculateEnrollmentProgress(lessonId, studentId);
    return progress;
  },
};

async function recalculateEnrollmentProgress(lessonId: string, studentId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson) return;
  const courseId = lesson.module.courseId;

  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId } } }),
    prisma.studentProgress.count({
      where: { studentId, isCompleted: true, lesson: { module: { courseId } } },
    }),
  ]);

  const progressPc = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const isFullyComplete = totalLessons > 0 && completedLessons === totalLessons;

  await prisma.enrollment.updateMany({
    where: { studentId, courseId },
    data: {
      progressPc,
      ...(isFullyComplete ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  });

  if (isFullyComplete) {
    await certificatesService.issueForCompletedCourse(studentId, courseId);
  }
}
