import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

export const coursesService = {
  async list(query: {
    search?: string;
    category?: string;
    level?: string;
    language?: string;
    priceType?: 'free' | 'paid';
    minRating?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.level ? { level: query.level as any } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.priceType === 'free' ? { isFree: true } : {}),
      ...(query.priceType === 'paid' ? { isFree: false } : {}),
      ...(query.minRating ? { avgRating: { gte: query.minRating } } : {}),
    };

    const orderBy: Prisma.CourseOrderByWithRelationInput =
      query.sort === 'popular'
        ? { totalStudents: 'desc' }
        : query.sort === 'rating'
        ? { avgRating: 'desc' }
        : query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
        ? { price: 'desc' }
        : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: true, instructor: { include: { profile: true } } },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getBySlug(slug: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        instructor: { include: { profile: true } },
        modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
        reviews: { include: { student: { include: { profile: true } } }, take: 10 },
      },
    });
    if (!course || course.status !== 'PUBLISHED') {
      throw new AppError(404, 'Course not found');
    }
    return course;
  },

  /** Instructor's own courses in any status (Draft/Pending/Published/Rejected), for their dashboard. */
  async myCourses(instructorId: string) {
    return prisma.course.findMany({
      where: { instructorId },
      include: { category: true, modules: { include: { lessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Full nested course structure for the course-builder UI — owner/admin only, any status. */
  async getForBuilder(courseId: string, userId: string, isAdmin: boolean) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { video: true, resources: true, quizzes: true, assignments: true },
            },
          },
        },
      },
    });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== userId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return course;
  },

  async submitForReview(courseId: string, instructorId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { modules: { include: { lessons: true } } },
    });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== instructorId) throw new AppError(403, 'You do not own this course');
    if (course.status !== 'DRAFT' && course.status !== 'REJECTED') {
      throw new AppError(409, 'Only draft or rejected courses can be submitted for review');
    }
    const totalLessons = course.modules.reduce((sum: number, m: any) => sum + m.lessons.length, 0);
    if (course.modules.length === 0 || totalLessons === 0) {
      throw new AppError(422, 'Add at least one module with at least one lesson before submitting for review');
    }
    return prisma.course.update({ where: { id: courseId }, data: { status: 'PENDING_REVIEW' } });
  },

  async create(instructorId: string, input: any) {
    return prisma.course.create({
      data: {
        title: input.title,
        slug: slugify(input.title),
        description: input.description,
        categoryId: input.categoryId,
        instructorId,
        level: input.level,
        language: input.language,
        price: input.price,
        isFree: input.isFree,
        learningOutcomes: input.learningOutcomes,
        requirements: input.requirements,
        thumbnailUrl: input.thumbnailUrl,
        promoVideoUrl: input.promoVideoUrl,
        status: 'DRAFT',
      },
    });
  },

  async update(courseId: string, instructorId: string, isAdmin: boolean, input: any) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return prisma.course.update({ where: { id: courseId }, data: input });
  },

  async publish(courseId: string, isAdmin: boolean) {
    if (!isAdmin) throw new AppError(403, 'Only admins can publish courses');
    return prisma.course.update({ where: { id: courseId }, data: { status: 'PUBLISHED' } });
  },

  async remove(courseId: string, instructorId: string, isAdmin: boolean) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    await prisma.course.delete({ where: { id: courseId } });
  },
};
