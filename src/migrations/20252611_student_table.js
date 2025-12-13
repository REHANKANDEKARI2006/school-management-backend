import db from '../config/db.js';

// 1. Create table
export async function createStudentTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS student (
        student_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        stu_first_name VARCHAR(100),
        stu_middle_name VARCHAR(100),
        stu_last_name VARCHAR(100),
        email VARCHAR(150),
        status VARCHAR(50),
        address TEXT,
        date_of_birth DATE,
        bg_id INTEGER,
        joined_date DATE,
        gender_id INTEGER,
        CONSTRAINT student_bg_id_fkey FOREIGN KEY (bg_id) REFERENCES public.blood_group(bg_id),
        CONSTRAINT student_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.gender(gender_id)
      )
    `);
    console.log('Table `student` ensured.');
  } catch (error) {
    console.log('createStudentTable error:', error);
  }
}

// 2. Drop table
export async function dropStudentTable() {
  try {
    await db.query('DROP TABLE IF EXISTS student');
    console.log('Table `student` dropped.');
  } catch (error) {
    console.log('dropStudentTable error:', error);
  }
}

// 3. Seed all 30 student users
export async function seedStudents() {
  try {
    await db.query(`
      INSERT INTO student (
        user_id, stu_first_name, stu_middle_name, stu_last_name, email, status, address, date_of_birth, bg_id, joined_date, gender_id
      ) VALUES
        ((SELECT user_id FROM "user" WHERE user_name='rahul.sharma' AND institute_id=3), 'Rahul', '', 'Sharma', 'rahul.sharma@demo.edu.in', 'Active', 'Sec 12, Delhi', '2008-01-10', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='priya.patel' AND institute_id=3), 'Priya', '', 'Patel', 'priya.patel@demo.edu.in', 'Active', 'Andheri, Mumbai', '2008-10-19', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='avinash.mehta' AND institute_id=3), 'Avinash', '', 'Mehta', 'avinash.mehta@demo.edu.in', 'Active', 'Bopal, Ahmedabad', '2007-07-02', 1, '2017-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='anjali.singh' AND institute_id=3), 'Anjali', '', 'Singh', 'anjali.singh@demo.edu.in', 'Active', 'Model Town, Amritsar', '2008-11-30', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='deepak.kumar' AND institute_id=3), 'Deepak', '', 'Kumar', 'deepak.kumar@demo.edu.in', 'Active', 'Rajaji, Lucknow', '2008-02-14', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='sneha.desai' AND institute_id=3), 'Sneha', '', 'Desai', 'sneha.desai@demo.edu.in', 'Active', 'MG Rd, Pune', '2008-09-10', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='manish.chopra' AND institute_id=3), 'Manish', '', 'Chopra', 'manish.chopra@demo.edu.in', 'Active', 'Civil Lines, Gurgaon', '2007-12-23', 1, '2017-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='ruchi.pandey' AND institute_id=3), 'Ruchi', '', 'Pandey', 'ruchi.pandey@demo.edu.in', 'Active', 'Lal Kuan, Varanasi', '2008-04-01', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='amit.rao' AND institute_id=3), 'Amit', '', 'Rao', 'amit.rao@demo.edu.in', 'Active', 'Jayanagar, Bangalore', '2008-07-08', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='muskan.goyal' AND institute_id=3), 'Muskan', '', 'Goyal', 'muskan.goyal@demo.edu.in', 'Active', 'Palam, Delhi', '2007-08-12', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='arjun.banerjee' AND institute_id=3), 'Arjun', '', 'Banerjee', 'arjun.banerjee@demo.edu.in', 'Active', 'Salt Lake, Kolkata', '2008-05-17', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='isha.verma' AND institute_id=3), 'Isha', '', 'Verma', 'isha.verma@demo.edu.in', 'Active', 'Sector 29, Noida', '2008-10-20', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='raj.pillai' AND institute_id=3), 'Raj', '', 'Pillai', 'raj.pillai@demo.edu.in', 'Active', 'Marine Drive, Mumbai', '2007-11-11', 1, '2017-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='nikita.yadav' AND institute_id=3), 'Nikita', '', 'Yadav', 'nikita.yadav@demo.edu.in', 'Active', 'Shastri Rd, Faridabad', '2008-02-21', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='vivek.rathi' AND institute_id=3), 'Vivek', '', 'Rathi', 'vivek.rathi@demo.edu.in', 'Active', 'Sector 14, Gurgaon', '2008-01-19', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='megha.bhatt' AND institute_id=3), 'Megha', '', 'Bhatt', 'megha.bhatt@demo.edu.in', 'Active', 'BHEL, Haridwar', '2008-03-05', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='gaurav.kapoor' AND institute_id=3), 'Gaurav', '', 'Kapoor', 'gaurav.kapoor@demo.edu.in', 'Active', 'Tilak Nagar, Delhi', '2008-07-20', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='riya.rastogi' AND institute_id=3), 'Riya', '', 'Rastogi', 'riya.rastogi@demo.edu.in', 'Active', 'Civil Lines, Kanpur', '2007-12-25', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='sarthak.gupta' AND institute_id=3), 'Sarthak', '', 'Gupta', 'sarthak.gupta@demo.edu.in', 'Active', 'Udyog Vihar, Gurgaon', '2008-06-15', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='ananya.seth' AND institute_id=3), 'Ananya', '', 'Seth', 'ananya.seth@demo.edu.in', 'Active', 'Kandivali, Mumbai', '2007-10-08', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='rupesh.sen' AND institute_id=3), 'Rupesh', '', 'Sen', 'rupesh.sen@demo.edu.in', 'Active', 'BTM, Bangalore', '2008-11-08', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='bhavna.jain' AND institute_id=3), 'Bhavna', '', 'Jain', 'bhavna.jain@demo.edu.in', 'Active', 'Hiran Magri, Udaipur', '2007-09-02', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='karan.rana' AND institute_id=3), 'Karan', '', 'Rana', 'karan.rana@demo.edu.in', 'Active', 'Sadar Bazar, Agra', '2008-01-17', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='tanya.bhagat' AND institute_id=3), 'Tanya', '', 'Bhagat', 'tanya.bhagat@demo.edu.in', 'Active', 'Sector 15, Panipat', '2008-05-15', 2, '2018-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='sagar.puri' AND institute_id=3), 'Sagar', '', 'Puri', 'sagar.puri@demo.edu.in', 'Active', 'Phase 3, Mohali', '2008-06-18', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='sejal.kohli' AND institute_id=3), 'Sejal', '', 'Kohli', 'sejal.kohli@demo.edu.in', 'Active', 'Moti Nagar, Delhi', '2007-11-16', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='aditya.shah' AND institute_id=3), 'Aditya', '', 'Shah', 'aditya.shah@demo.edu.in', 'Active', 'Shyambazar, Kolkata', '2008-08-11', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='diya.malhotra' AND institute_id=3), 'Diya', '', 'Malhotra', 'diya.malhotra@demo.edu.in', 'Active', 'SEZ, Chandigarh', '2007-10-17', 2, '2017-06-15', 2),
        ((SELECT user_id FROM "user" WHERE user_name='yash.joshi' AND institute_id=3), 'Yash', '', 'Joshi', 'yash.joshi@demo.edu.in', 'Active', 'Chikuwadi, Vadodara', '2008-05-10', 1, '2018-06-15', 1),
        ((SELECT user_id FROM "user" WHERE user_name='pranav.bhansal' AND institute_id=3), 'Pranav', '', 'Bhansal', 'pranav.bhansal@demo.edu.in', 'Active', 'Sector 80, Noida', '2008-01-01', 1, '2018-06-15', 1)
    `);
    console.log('Demo students inserted!');
  } catch (error) {
    console.log('seedStudents error:', error);
  }
}

// 4. Delete all
export async function removeAllStudents() {
  try {
    await db.query('DELETE FROM student');
    console.log('All student records deleted.');
  } catch (error) {
    console.log('removeAllStudents error:', error);
  }
}

// Uncomment as needed:
// createStudentTable();
seedStudents();
// removeAllStudents();
// dropStudentTable();
