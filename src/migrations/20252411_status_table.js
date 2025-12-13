import db from '../config/db.js';

// 1. Seed demo/status data for all modules in a single batch insert
export async function seedStatusTable() {
  try {
    await db.query(`
      INSERT INTO status (status_name) VALUES
        -- General/Universal statuses
        ('Active'),
        ('Inactive'),
        ('Suspended'),
        ('On Leave'),
        ('Pending'),
        ('Completed'),
        ('Incomplete'),
        ('Rejected'),
        ('Approved'),
        ('Draft'),
        ('Cancelled'),
        -- Student-specific
        ('Expelled'),
        ('Graduated'),
        -- Staff-specific
        ('On Duty'),
        -- Admin-specific
        ('Super Admin'),
        -- Event/Meeting
        ('Scheduled'),
        ('Postponed'),
        ('In Progress'),
        -- Exam/Assignment
        ('Published'),
        ('Checked'),
        ('Unpublished')
      ON CONFLICT DO NOTHING -- if you use a unique constraint on name, this prevents duplicates
    `);
    console.log('Status table seeded with demo data!');
  } catch (error) {
    console.log('seedStatusTable error:', error);
  }
}

// Uncomment the line below when you want to run the seed
seedStatusTable();
