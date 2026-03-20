import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Institutions
  const inst1 = await prisma.institution.create({
    data: {
      name: 'Bimbel Cerdas',
      slug: 'bimbel-cerdas',
      email: 'info@cerdas.id',
      phone: '08111111111',
    },
  });
  const inst2 = await prisma.institution.create({
    data: {
      name: 'Tutor Prima',
      slug: 'tutor-prima',
      email: 'info@prima.id',
      phone: '08222222222',
    },
  });
  console.log('Institutions created');

  // Super Admin
  await prisma.user.create({
    data: {
      email: 'super@sinaloka.com',
      password_hash: hash('password'),
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // Admins
  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@cerdas.id',
      password_hash: hash('password'),
      name: 'Admin Cerdas',
      role: 'ADMIN',
      institution_id: inst1.id,
      must_change_password: true,
    },
  });
  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@prima.id',
      password_hash: hash('password'),
      name: 'Admin Prima',
      role: 'ADMIN',
      institution_id: inst2.id,
      must_change_password: true,
    },
  });
  console.log('Users created');

  // Subjects (4 per institution — 8 total)
  const [subj1Math, subj1Physics, subj1English, subj1Indonesian] = await Promise.all([
    prisma.subject.create({ data: { name: 'Matematika', institution_id: inst1.id } }),
    prisma.subject.create({ data: { name: 'Fisika', institution_id: inst1.id } }),
    prisma.subject.create({ data: { name: 'Bahasa Inggris', institution_id: inst1.id } }),
    prisma.subject.create({ data: { name: 'Bahasa Indonesia', institution_id: inst1.id } }),
  ]);
  const [subj2Math, subj2Physics, subj2English, subj2Indonesian] = await Promise.all([
    prisma.subject.create({ data: { name: 'Matematika', institution_id: inst2.id } }),
    prisma.subject.create({ data: { name: 'Fisika', institution_id: inst2.id } }),
    prisma.subject.create({ data: { name: 'Bahasa Inggris', institution_id: inst2.id } }),
    prisma.subject.create({ data: { name: 'Bahasa Indonesia', institution_id: inst2.id } }),
  ]);
  console.log('Subjects created');

  // Tutors (4 total, 2 per institution)
  const tutorUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'tutor1@cerdas.id',
        password_hash: hash('password'),
        name: 'Budi Santoso',
        role: 'TUTOR',
        institution_id: inst1.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'tutor2@cerdas.id',
        password_hash: hash('password'),
        name: 'Siti Rahayu',
        role: 'TUTOR',
        institution_id: inst1.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'tutor1@prima.id',
        password_hash: hash('password'),
        name: 'Andi Wijaya',
        role: 'TUTOR',
        institution_id: inst2.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'tutor2@prima.id',
        password_hash: hash('password'),
        name: 'Dewi Lestari',
        role: 'TUTOR',
        institution_id: inst2.id,
      },
    }),
  ]);
  const tutors = await Promise.all(
    tutorUsers.map((u, i) =>
      prisma.tutor.create({
        data: {
          user_id: u.id,
          institution_id: i < 2 ? inst1.id : inst2.id,
          experience_years: 2 + i,
          is_verified: true,
          ...(i === 3 ? { monthly_salary: 5000000 } : {}),
        },
      }),
    ),
  );

  // TutorSubject mappings
  // tutors[0] = Budi (inst1): Matematika, Fisika
  // tutors[1] = Siti (inst1): Bahasa Inggris, Bahasa Indonesia
  // tutors[2] = Andi (inst2): Matematika, Fisika
  // tutors[3] = Dewi (inst2): Bahasa Inggris, Bahasa Indonesia
  await prisma.tutorSubject.createMany({
    data: [
      { tutor_id: tutors[0].id, subject_id: subj1Math.id },
      { tutor_id: tutors[0].id, subject_id: subj1Physics.id },
      { tutor_id: tutors[1].id, subject_id: subj1English.id },
      { tutor_id: tutors[1].id, subject_id: subj1Indonesian.id },
      { tutor_id: tutors[2].id, subject_id: subj2Math.id },
      { tutor_id: tutors[2].id, subject_id: subj2Physics.id },
      { tutor_id: tutors[3].id, subject_id: subj2English.id },
      { tutor_id: tutors[3].id, subject_id: subj2Indonesian.id },
    ],
  });
  console.log('Tutors created');

  // Students (10 total, 5 per institution)
  const studentNames = [
    'Rina',
    'Dimas',
    'Putri',
    'Fajar',
    'Lina',
    'Arief',
    'Maya',
    'Rizky',
    'Nadia',
    'Yusuf',
  ];
  const students = await Promise.all(
    studentNames.map((name, i) =>
      prisma.student.create({
        data: {
          institution_id: i < 5 ? inst1.id : inst2.id,
          name: `${name} Pelajar`,
          grade: `Kelas ${(i % 3) + 7}`,
          status: 'ACTIVE',
          parent_name: `Parent of ${name}`,
          parent_phone: `0812000000${i}`,
          enrolled_at: new Date(),
        },
      }),
    ),
  );
  console.log('Students created');

  // Classes (4 total, 2 per institution)
  const classes = await Promise.all([
    prisma.class.create({
      data: {
        institution_id: inst1.id,
        tutor_id: tutors[0].id,
        name: 'Matematika SMP',
        subject_id: subj1Math.id,
        capacity: 10,
        fee: 500000,
        tutor_fee: 150000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst1.id,
        tutor_id: tutors[1].id,
        name: 'English SMP',
        subject_id: subj1English.id,
        capacity: 8,
        fee: 450000,
        tutor_fee: 130000,
        tutor_fee_mode: 'PER_STUDENT_ATTENDANCE',
        tutor_fee_per_student: 40000,
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst2.id,
        tutor_id: tutors[2].id,
        name: 'Fisika SMA',
        subject_id: subj2Physics.id,
        capacity: 12,
        fee: 600000,
        tutor_fee: 180000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst2.id,
        tutor_id: tutors[3].id,
        name: 'B. Indonesia SMA',
        subject_id: subj2Indonesian.id,
        capacity: 10,
        fee: 400000,
        tutor_fee: 120000,
        tutor_fee_mode: 'MONTHLY_SALARY',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('Classes created');

  // Class Schedules
  await prisma.classSchedule.createMany({
    data: [
      { class_id: classes[0].id, day: 'Monday', start_time: '14:00', end_time: '15:30' },
      { class_id: classes[0].id, day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
      { class_id: classes[1].id, day: 'Tuesday', start_time: '16:00', end_time: '17:30' },
      { class_id: classes[1].id, day: 'Thursday', start_time: '16:00', end_time: '17:30' },
      { class_id: classes[2].id, day: 'Monday', start_time: '09:00', end_time: '10:30' },
      { class_id: classes[2].id, day: 'Friday', start_time: '09:00', end_time: '10:30' },
      { class_id: classes[3].id, day: 'Wednesday', start_time: '10:00', end_time: '11:30' },
      { class_id: classes[3].id, day: 'Saturday', start_time: '10:00', end_time: '11:30' },
    ],
  });
  console.log('Class schedules created');

  // Enrollments (8 — 2 students per class)
  const enrollments = await Promise.all([
    ...[0, 1].map((s) =>
      prisma.enrollment.create({
        data: {
          institution_id: inst1.id,
          student_id: students[s].id,
          class_id: classes[0].id,
          status: 'ACTIVE',
          payment_status: 'PAID',
          enrolled_at: new Date(),
        },
      }),
    ),
    ...[2, 3].map((s) =>
      prisma.enrollment.create({
        data: {
          institution_id: inst1.id,
          student_id: students[s].id,
          class_id: classes[1].id,
          status: 'ACTIVE',
          payment_status: 'PENDING',
          enrolled_at: new Date(),
        },
      }),
    ),
    ...[5, 6].map((s) =>
      prisma.enrollment.create({
        data: {
          institution_id: inst2.id,
          student_id: students[s].id,
          class_id: classes[2].id,
          status: 'ACTIVE',
          payment_status: 'PAID',
          enrolled_at: new Date(),
        },
      }),
    ),
    ...[7, 8].map((s) =>
      prisma.enrollment.create({
        data: {
          institution_id: inst2.id,
          student_id: students[s].id,
          class_id: classes[3].id,
          status: 'TRIAL',
          payment_status: 'PENDING',
          enrolled_at: new Date(),
        },
      }),
    ),
  ]);
  console.log('Enrollments created');

  // Sessions (8 — 2 per class)
  // Fetch schedules for each class to get start/end times
  const classSchedules = await prisma.classSchedule.findMany({
    where: { class_id: { in: classes.map(c => c.id) } },
  });
  const classTimeMap = new Map<string, { start_time: string; end_time: string }>();
  for (const s of classSchedules) {
    if (!classTimeMap.has(s.class_id)) {
      classTimeMap.set(s.class_id, { start_time: s.start_time, end_time: s.end_time });
    }
  }

  const sessions = await Promise.all(
    classes.flatMap((c, ci) =>
      [0, 7].map((dayOffset) => {
        const times = classTimeMap.get(c.id) ?? { start_time: '14:00', end_time: '15:30' };
        return prisma.session.create({
          data: {
            institution_id: ci < 2 ? inst1.id : inst2.id,
            class_id: c.id,
            date: new Date(Date.now() - dayOffset * 86400000),
            start_time: times.start_time,
            end_time: times.end_time,
            status: dayOffset === 7 ? 'COMPLETED' : 'SCHEDULED',
            topic_covered: dayOffset === 7 ? 'Review chapter 1' : null,
            created_by: ci < 2 ? admin1.id : admin2.id,
          },
        });
      }),
    ),
  );
  console.log('Sessions created');

  // Attendance (for completed sessions — 1 record per enrolled student)
  const completedSessions = sessions.filter((_, i) => i % 2 === 1);
  const attendanceData = completedSessions.flatMap((s, si) => {
    const studentPairs = [
      [0, 1],
      [2, 3],
      [5, 6],
      [7, 8],
    ];
    const pair = studentPairs[si] || studentPairs[0];
    return pair.map((sIdx, j) => ({
      institution_id: sIdx < 5 ? inst1.id : inst2.id,
      session_id: s.id,
      student_id: students[sIdx].id,
      status: j === 0 ? ('PRESENT' as const) : ('LATE' as const),
      homework_done: j === 0,
    }));
  });
  await prisma.attendance.createMany({ data: attendanceData });
  console.log('Attendance created');

  // Payments (4)
  await Promise.all(
    enrollments.slice(0, 4).map((e, i) =>
      prisma.payment.create({
        data: {
          institution_id: e.institution_id,
          student_id: e.student_id,
          enrollment_id: e.id,
          amount: i < 2 ? 500000 : 600000,
          due_date: new Date(),
          paid_date: i % 2 === 0 ? new Date() : null,
          status: i % 2 === 0 ? 'PAID' : 'PENDING',
          method: i % 2 === 0 ? 'TRANSFER' : 'CASH',
        },
      }),
    ),
  );
  console.log('Payments created');

  // Expenses (3 — sample operational expenses)
  await Promise.all([
    prisma.expense.create({
      data: {
        institution_id: inst1.id,
        category: 'SUPPLIES',
        description: 'Whiteboard markers and erasers',
        amount: 150000,
        date: new Date(),
      },
    }),
    prisma.expense.create({
      data: {
        institution_id: inst1.id,
        category: 'RENT',
        description: 'Room rental March',
        amount: 2000000,
        date: new Date(),
      },
    }),
    prisma.expense.create({
      data: {
        institution_id: inst2.id,
        category: 'UTILITIES',
        description: 'Electricity bill March',
        amount: 750000,
        date: new Date(),
      },
    }),
  ]);
  console.log('Expenses created');

  // Payouts (2 — one per institution)
  await Promise.all([
    prisma.payout.create({
      data: {
        institution_id: inst1.id,
        tutor_id: tutors[0].id,
        amount: 1500000,
        date: new Date(),
        status: 'PAID',
        description: 'March payout',
      },
    }),
    prisma.payout.create({
      data: {
        institution_id: inst2.id,
        tutor_id: tutors[2].id,
        amount: 1800000,
        date: new Date(),
        status: 'PENDING',
        description: 'March payout',
      },
    }),
  ]);
  console.log('Payouts created');

  // Parents (2 — one per institution, each linked to 2 students)
  const parentUser1 = await prisma.user.create({
    data: {
      email: 'parent@cerdas.id',
      password_hash: hash('password'),
      name: 'Ibu Rina',
      role: 'PARENT',
      institution_id: inst1.id,
    },
  });
  const parent1 = await prisma.parent.create({
    data: {
      user_id: parentUser1.id,
      institution_id: inst1.id,
    },
  });
  // Link to first 2 students of inst1 (Rina & Dimas)
  await prisma.parentStudent.createMany({
    data: [
      { parent_id: parent1.id, student_id: students[0].id },
      { parent_id: parent1.id, student_id: students[1].id },
    ],
  });
  // Update students with parent_email for consistency
  await prisma.student.updateMany({
    where: { id: { in: [students[0].id, students[1].id] } },
    data: { parent_email: 'parent@cerdas.id' },
  });

  const parentUser2 = await prisma.user.create({
    data: {
      email: 'parent@prima.id',
      password_hash: hash('password'),
      name: 'Bapak Arief',
      role: 'PARENT',
      institution_id: inst2.id,
    },
  });
  const parent2 = await prisma.parent.create({
    data: {
      user_id: parentUser2.id,
      institution_id: inst2.id,
    },
  });
  // Link to first 2 students of inst2 (Arief & Maya)
  await prisma.parentStudent.createMany({
    data: [
      { parent_id: parent2.id, student_id: students[5].id },
      { parent_id: parent2.id, student_id: students[6].id },
    ],
  });
  await prisma.student.updateMany({
    where: { id: { in: [students[5].id, students[6].id] } },
    data: { parent_email: 'parent@prima.id' },
  });
  console.log('Parents created');

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
