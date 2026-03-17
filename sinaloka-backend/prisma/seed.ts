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
    },
  });
  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@prima.id',
      password_hash: hash('password'),
      name: 'Admin Prima',
      role: 'ADMIN',
      institution_id: inst2.id,
    },
  });
  console.log('Users created');

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
          subjects:
            i % 2 === 0
              ? ['Matematika', 'Fisika']
              : ['Bahasa Inggris', 'Bahasa Indonesia'],
          experience_years: 2 + i,
          is_verified: true,
          ...(i === 3 ? { monthly_salary: 5000000 } : {}),
        },
      }),
    ),
  );
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
          grade: `Grade ${(i % 3) + 7}`,
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
        subject: 'Matematika',
        capacity: 10,
        fee: 500000,
        tutor_fee: 150000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst1.id,
        tutor_id: tutors[1].id,
        name: 'English SMP',
        subject: 'Bahasa Inggris',
        capacity: 8,
        fee: 450000,
        tutor_fee: 130000,
        tutor_fee_mode: 'PER_STUDENT_ATTENDANCE',
        tutor_fee_per_student: 40000,
        schedule_days: ['Tuesday', 'Thursday'],
        schedule_start_time: '16:00',
        schedule_end_time: '17:30',
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst2.id,
        tutor_id: tutors[2].id,
        name: 'Fisika SMA',
        subject: 'Fisika',
        capacity: 12,
        fee: 600000,
        tutor_fee: 180000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        schedule_days: ['Monday', 'Friday'],
        schedule_start_time: '09:00',
        schedule_end_time: '10:30',
        status: 'ACTIVE',
      },
    }),
    prisma.class.create({
      data: {
        institution_id: inst2.id,
        tutor_id: tutors[3].id,
        name: 'B. Indonesia SMA',
        subject: 'Bahasa Indonesia',
        capacity: 10,
        fee: 400000,
        tutor_fee: 120000,
        tutor_fee_mode: 'MONTHLY_SALARY',
        schedule_days: ['Wednesday', 'Saturday'],
        schedule_start_time: '10:00',
        schedule_end_time: '11:30',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('Classes created');

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
  const sessions = await Promise.all(
    classes.flatMap((c, ci) =>
      [0, 7].map((dayOffset) =>
        prisma.session.create({
          data: {
            institution_id: ci < 2 ? inst1.id : inst2.id,
            class_id: c.id,
            date: new Date(Date.now() - dayOffset * 86400000),
            start_time: c.schedule_start_time,
            end_time: c.schedule_end_time,
            status: dayOffset === 7 ? 'COMPLETED' : 'SCHEDULED',
            topic_covered: dayOffset === 7 ? 'Review chapter 1' : null,
            created_by: ci < 2 ? admin1.id : admin2.id,
          },
        }),
      ),
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

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
