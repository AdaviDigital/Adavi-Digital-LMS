import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Adavi Digital Institute LMS...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ---- Users ----
  const admin = await prisma.user.upsert({
    where: { email: 'admin@adavidigitalinstitute.com' },
    update: {},
    create: {
      email: 'admin@adavidigitalinstitute.com',
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      profile: { create: { firstName: 'Adavi', lastName: 'Admin' } },
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@adavidigitalinstitute.com' },
    update: {},
    create: {
      email: 'instructor@adavidigitalinstitute.com',
      passwordHash,
      role: 'INSTRUCTOR',
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'Ngozi',
          lastName: 'Eze',
          headline: 'Senior Full-Stack Instructor',
          bio: '10+ years building and teaching web applications.',
        },
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@adavidigitalinstitute.com' },
    update: {},
    create: {
      email: 'student@adavidigitalinstitute.com',
      passwordHash,
      role: 'STUDENT',
      isEmailVerified: true,
      profile: { create: { firstName: 'Chidi', lastName: 'Okafor' } },
    },
  });

  // ---- Categories ----
  const categoryNames = ['Web Development', 'Data Science', 'Digital Marketing', 'Graphic Design', 'Business'];
  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
      }),
    ),
  );

  // ---- Course ----
  const course = await prisma.course.upsert({
    where: { slug: 'complete-web-development-bootcamp' },
    update: {},
    create: {
      title: 'Complete Web Development Bootcamp',
      slug: 'complete-web-development-bootcamp',
      description:
        'Learn full-stack web development from scratch — HTML, CSS, JavaScript, React, Node.js, and PostgreSQL — with hands-on projects.',
      categoryId: categories[0].id,
      instructorId: instructor.id,
      level: 'BEGINNER',
      language: 'English',
      price: 25000,
      isFree: false,
      status: 'PUBLISHED',
      learningOutcomes: [
        'Build responsive websites with HTML, CSS, and JavaScript',
        'Create full-stack applications with React and Node.js',
        'Work with PostgreSQL databases',
        'Deploy applications to production',
      ],
      requirements: ['A computer with internet access', 'No prior programming experience required'],
    },
  });

  const freeCourse = await prisma.course.upsert({
    where: { slug: 'intro-to-digital-marketing' },
    update: {},
    create: {
      title: 'Intro to Digital Marketing',
      slug: 'intro-to-digital-marketing',
      description: 'A free introduction to SEO, social media marketing, and content strategy.',
      categoryId: categories[2].id,
      instructorId: instructor.id,
      level: 'BEGINNER',
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
    },
  });

  // ---- Modules & Lessons ----
  const module1 = await prisma.module.create({
    data: { courseId: course.id, title: 'Getting Started with HTML & CSS', order: 1 },
  });

  await prisma.lesson.createMany({
    data: [
      {
        moduleId: module1.id,
        title: 'Introduction to HTML',
        order: 1,
        contentType: 'video',
        isPreview: true,
        durationSeconds: 600,
        transcript:
          'In this lesson we introduce HTML, the standard markup language for creating web pages. We cover tags, elements, and document structure.',
      },
      {
        moduleId: module1.id,
        title: 'Styling with CSS',
        order: 2,
        contentType: 'video',
        durationSeconds: 900,
        transcript: 'This lesson covers CSS selectors, the box model, flexbox, and responsive design basics.',
      },
    ],
  });

  const module2 = await prisma.module.create({
    data: { courseId: course.id, title: 'JavaScript Fundamentals', order: 2 },
  });

  await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      title: 'Variables, Functions, and Loops',
      order: 1,
      contentType: 'video',
      durationSeconds: 1200,
      transcript: 'We cover JavaScript variables, functions, loops, and basic DOM manipulation.',
    },
  });

  // ---- FAQ ----
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'How do I get a certificate?',
        answer: 'Certificates are automatically issued once you complete 100% of a course\'s lessons.',
        order: 1,
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept Paystack, Flutterwave, Stripe, and PayPal.',
        order: 2,
      },
      {
        question: 'Can I get a refund?',
        answer: 'Contact support within 7 days of purchase for refund eligibility.',
        order: 3,
      },
    ],
  });

  console.log('Seed complete:');
  console.log(`  Admin:      admin@adavidigitalinstitute.com / Password123!`);
  console.log(`  Instructor: instructor@adavidigitalinstitute.com / Password123!`);
  console.log(`  Student:    student@adavidigitalinstitute.com / Password123!`);
  console.log(`  Courses:    ${course.title}, ${freeCourse.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
