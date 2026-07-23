/**
 * Database Seed Script
 * Populates the database with initial data for development and testing.
 * 
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User, { IUser } from '../modules/users/User.model';
import Department from '../modules/assignments/Department.model';

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mla_grievance');
    console.log('Connected to MongoDB');

    // // Clear existing data
    // await User.deleteMany({});
    // await Department.deleteMany({});

    // ─── Create Departments ──────────────────────────────────
    const departments = await Department.insertMany([
      {
        name: 'Roads & Infrastructure',
        code: 'ROADS',
        categories: ['roads', 'street_lights'],
      },
      {
        name: 'Water & Drainage',
        code: 'WATER',
        categories: ['water_supply', 'drainage'],
      },
      {
        name: 'Electricity',
        code: 'ELEC',
        categories: ['electricity'],
      },
      {
        name: 'Sanitation & Health',
        code: 'SANIT',
        categories: ['garbage', 'public_health'],
      },
      {
        name: 'Parks & Environment',
        code: 'PARKS',
        categories: ['parks', 'noise_pollution'],
      },
      {
        name: 'Urban Planning',
        code: 'URBAN',
        categories: ['encroachment', 'building_violation'],
      },
      {
        name: 'Public Safety',
        code: 'SAFETY',
        categories: ['public_safety'],
      },
      {
        name: 'General Services',
        code: 'GENERAL',
        categories: ['other'],
      },
    ]);
    console.log(`✓ ${departments.length} departments created`);

    // ─── Create MLA ────────────────────────────────────────
    const mla = await User.create({
      name: 'MLA Admin',
      phone: '9000000001',
      pin: '1234',
      role: 'mla',
      ward: 1,
      isVerified: true,
    });
    console.log(`✓ MLA created: ${mla.phone}`);

    // ─── Create Ward Councillors ────────────────────────────
    const councillors: IUser[] = [];
    for (let ward = 1; ward <= 4; ward++) { // Ward 5 intentionally left vacant
      const councillor = await User.create({
        name: `Ward ${ward} Councillor`,
        phone: `90000001${String(ward).padStart(2, '0')}`,
        pin: '1234',
        role: 'ward_councillor',
        ward,
        isVerified: true,
      });
      councillors.push(councillor);
    }
    console.log(`✓ ${councillors.length} ward councillors created (Ward 5 left vacant)`);

    // ─── Create Deputy ──────────────────────────────────────
    const deputy = await User.create({
      name: 'Deputy Admin',
      phone: '9000000002',
      pin: '1234',
      role: 'deputy',
      permissions: ['edit:schemes', 'manage:councillors', 'view:vacant_wards', 'transfer:councillor'],
      isVerified: true,
    });
    console.log(`✓ Deputy created: ${deputy.phone}`);

    // ─── Create Service Officers ────────────────────────────
    const officers: IUser[] = [];
    for (let ward = 1; ward <= 5; ward++) {
      for (let dept = 0; dept < departments.length; dept++) {
        const officer = await User.create({
          name: `Officer W${ward}-${departments[dept].code}`,
          phone: `90000${String(ward).padStart(2, '0')}${String(dept + 1).padStart(3, '0')}`,
          pin: '1234',
          role: 'service_officer',
          ward,
          department: departments[dept].name,
          isVerified: true,
        });
        officers.push(officer);
      }
    }
    console.log(`✓ ${officers.length} service officers created`);

    // ─── Create Test Citizens ───────────────────────────────
    const citizens: IUser[] = [];
    for (let i = 1; i <= 10; i++) {
      const citizen = await User.create({
        name: `Test Citizen ${i}`,
        phone: `98765432${String(i).padStart(2, '0')}`,
        pin: '1234',
        role: 'citizen',
        ward: (i % 5) + 1,
        isVerified: true,
        address: {
          area: `Area ${i}`,
          city: 'Test City',
          pincode: `50000${i}`,
        },
      });
      citizens.push(citizen);
    }
    console.log(`✓ ${citizens.length} test citizens created`);

    console.log('\n═══════════════════════════════════════');
    console.log('Database seeded successfully!');
    console.log('═══════════════════════════════════════');
    console.log('\nDefault PIN for all users: 1234');
    console.log(`MLA: ${mla.phone}`);
    console.log(`Deputy: ${deputy.phone}`);
    console.log(`Councillors: ${councillors.map(c => c.phone).join(', ')}`);
    console.log(`Citizens: ${citizens.map(c => c.phone).join(', ')}`);
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
