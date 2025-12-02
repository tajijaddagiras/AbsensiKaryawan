import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true,
    },
  });

  console.log({ admin });

  // 2. Create Default Office Location
  const office = await prisma.officeLocation.create({
    data: {
      name: 'Kantor Pusat',
      address: 'Jakarta, Indonesia',
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
    },
  });

  console.log({ office });

  // 3. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { settingKey: 'face_recognition_threshold', settingValue: '80', description: 'Minimum similarity score (%) for face verification to pass' },
      { settingKey: 'gps_accuracy_radius', settingValue: '3000', description: 'Maximum GPS radius (meters) for location verification' },
    ],
  });

  // 4. Create Work Schedules (Senin - Minggu)
  await prisma.workSchedule.createMany({
    data: [
      { dayOfWeek: 1, dayName: 'Senin', startTime: '09:00', endTime: '17:00', isActive: true, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 2, dayName: 'Selasa', startTime: '09:00', endTime: '17:00', isActive: true, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 3, dayName: 'Rabu', startTime: '09:00', endTime: '17:00', isActive: true, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 4, dayName: 'Kamis', startTime: '09:00', endTime: '17:00', isActive: true, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 5, dayName: 'Jumat', startTime: '09:00', endTime: '17:00', isActive: true, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 6, dayName: 'Sabtu', startTime: '09:00', endTime: '13:00', isActive: false, lateToleranceMinutes: 15, onTimeEndTime: '09:15', toleranceStartTime: '09:15', toleranceEndTime: '09:30' },
      { dayOfWeek: 0, dayName: 'Minggu', startTime: '00:00', endTime: '00:00', isActive: false, lateToleranceMinutes: 0 },
    ],
  });

  // 5. Create Holidays
  await prisma.holiday.createMany({
    data: [
      { name: 'Tahun Baru 2025', date: new Date('2025-01-01'), type: 'national', description: 'Hari Tahun Baru Masehi' },
      { name: 'Imlek 2576', date: new Date('2025-01-29'), type: 'national', description: 'Tahun Baru Imlek' },
      { name: 'Hari Raya Nyepi', date: new Date('2025-03-22'), type: 'national', description: 'Tahun Baru Saka' },
      { name: 'Waisak 2569', date: new Date('2025-05-12'), type: 'national', description: 'Hari Raya Waisak' },
      { name: 'Hari Kemerdekaan RI', date: new Date('2025-08-17'), type: 'national', description: 'HUT Kemerdekaan RI ke-80' },
      { name: 'Natal', date: new Date('2025-12-25'), type: 'national', description: 'Hari Raya Natal' },
    ],
  });

  // 6. Create Policies
  await prisma.policy.createMany({
    data: [
      { title: 'Cuti Tahunan', description: 'Setiap karyawan berhak mendapat 12 hari cuti tahunan yang bisa diambil setelah masa kerja 1 tahun.', category: 'leave', policyData: JSON.stringify({ annual_leave_days: 12, min_employment_months: 12 }) },
      { title: 'Cuti Sakit', description: 'Cuti sakit dengan surat dokter maksimal 3 hari berturut-turut tanpa potongan gaji. Lebih dari 3 hari memerlukan persetujuan khusus.', category: 'leave', policyData: JSON.stringify({ max_consecutive_days: 3, requires_medical_certificate: true }) },
      { title: 'Dress Code', description: 'Senin-Kamis: Formal (kemeja + celana bahan). Jumat: Smart Casual. Sabtu (jika masuk): Casual rapi.', category: 'general', policyData: JSON.stringify({ weekday: 'formal', friday: 'smart_casual', saturday: 'casual' }) },
      { title: 'Absensi Wajib', description: 'Karyawan wajib melakukan absensi check-in dan check-out setiap hari kerja menggunakan verifikasi wajah dan GPS.', category: 'attendance', policyData: JSON.stringify({ requires_face_verification: true, requires_gps: true }) },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
