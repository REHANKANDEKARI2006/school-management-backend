import db from '../config/db.js';

export async function seedUsers() {
  try {
    await db.query(`
      INSERT INTO "user"
        (user_name, institute_id, email, phone, password_hash, user_type, is_active, email_verified, email_token, phone_verified, phone_token, last_login)
      VALUES
        -- Master Admins
        ('masteradmin1', 3, 'masteradmin1@demo.edu.in', '9000000001', 'hash_masteradmin1', 'master_admin', true, true, '', true, '', NOW()),
        ('masteradmin2', 3, 'masteradmin2@demo.edu.in', '9000000002', 'hash_masteradmin2', 'master_admin', true, true, '', true, '', NOW()),

        -- Admins
        ('admin.rahul', 3, 'rahul.admin@demo.edu.in', '9000000010', 'hash_adminr', 'admin', true, true, '', true, '', NOW()),
        ('admin.rita', 3, 'rita.admin@demo.edu.in', '9000000011', 'hash_adminrita', 'admin', true, false, '', true, '', NULL),
        ('admin.jay', 3, 'jay.admin@demo.edu.in', '9000000012', 'hash_adminjay', 'admin', true, true, '', false, '', NULL),

        -- Staff: Teachers (10)
        ('teacher1', 3, 'teacher1@demo.edu.in',  '9100000001', 'hash_teacher1', 'teacher', true, false, '', false, '', NULL),
        ('teacher2', 3, 'teacher2@demo.edu.in',  '9100000002', 'hash_teacher2', 'teacher', true, true, '', true, '', NULL),
        ('teacher3', 3, 'teacher3@demo.edu.in',  '9100000003', 'hash_teacher3', 'teacher', true, false, '', false, '', NULL),
        ('teacher4', 3, 'teacher4@demo.edu.in',  '9100000004', 'hash_teacher4', 'teacher', true, true, '', false, '', NULL),
        ('teacher5', 3, 'teacher5@demo.edu.in',  '9100000005', 'hash_teacher5', 'teacher', true, false, '', true, '', NULL),
        ('teacher6', 3, 'teacher6@demo.edu.in',  '9100000006', 'hash_teacher6', 'teacher', true, true, '', false, '', NULL),
        ('teacher7', 3, 'teacher7@demo.edu.in',  '9100000007', 'hash_teacher7', 'teacher', true, false, '', true, '', NULL),
        ('teacher8', 3, 'teacher8@demo.edu.in',  '9100000008', 'hash_teacher8', 'teacher', true, true, '', false, '', NULL),
        ('teacher9', 3, 'teacher9@demo.edu.in',  '9100000009', 'hash_teacher9', 'teacher', false, false, '', false, '', NULL),
        ('teacher10',3, 'teacher10@demo.edu.in', '9100000010', 'hash_teacher10','teacher', true, false, '', true, '', NULL),

        -- Staff: Cashiers (2)
        ('cashier1', 3, 'cashier1@demo.edu.in',  '9200000001', 'hash_cashier1', 'cashier', true, false, '', false, '', NULL),
        ('cashier2', 3, 'cashier2@demo.edu.in',  '9200000002', 'hash_cashier2', 'cashier', false, false, '', false, '', NULL),

        -- Staff: Librarian (1)
        ('librarian', 3, 'librarian@demo.edu.in', '9300000001', 'hash_librarian','librarian', true, false, '', false, '', NULL),

        -- Staff: Management (1)
        ('management',3, 'management@demo.edu.in','9400000001','hash_management','management',true,false,'',false,'',NULL),

        -- Staff: Sports Manager (1)
        ('sportsmgr', 3, 'sportsmgr@demo.edu.in', '9500000001', 'hash_sportsmgr','sports_manager',true,false,'',false,'',NULL),

     
         -- 30 Students
        ('rahul.sharma', 3, 'rahul.sharma@demo.edu.in', '9610000001', 'hash_rahulsharma', 'student', true, false, '', false, '', NULL),
  ('priya.patel', 3, 'priya.patel@demo.edu.in', '9610000002', 'hash_priyapatel', 'student', true, false, '', false, '', NULL),
  ('avinash.mehta', 3, 'avinash.mehta@demo.edu.in', '9610000003', 'hash_avinashmehta', 'student', true, false, '', false, '', NULL),
  ('anjali.singh', 3, 'anjali.singh@demo.edu.in', '9610000004', 'hash_anjalisingh', 'student', true, false, '', false, '', NULL),
  ('deepak.kumar', 3, 'deepak.kumar@demo.edu.in', '9610000005', 'hash_deepakkumar', 'student', true, false, '', false, '', NULL),
  ('sneha.desai', 3, 'sneha.desai@demo.edu.in', '9610000006', 'hash_snehadesai', 'student', true, false, '', false, '', NULL),
  ('manish.chopra', 3, 'manish.chopra@demo.edu.in', '9610000007', 'hash_manishchopra', 'student', true, false, '', false, '', NULL),
  ('ruchi.pandey', 3, 'ruchi.pandey@demo.edu.in', '9610000008', 'hash_ruchipandey', 'student', true, false, '', false, '', NULL),
  ('amit.rao', 3, 'amit.rao@demo.edu.in', '9610000009', 'hash_amitrao', 'student', true, false, '', false, '', NULL),
  ('muskan.goyal', 3, 'muskan.goyal@demo.edu.in', '9610000010', 'hash_muskangoyal', 'student', true, false, '', false, '', NULL),
  ('arjun.banerjee', 3, 'arjun.banerjee@demo.edu.in', '9610000011', 'hash_arjunbanerjee', 'student', true, false, '', false, '', NULL),
  ('isha.verma', 3, 'isha.verma@demo.edu.in', '9610000012', 'hash_ishaverma', 'student', true, false, '', false, '', NULL),
  ('raj.pillai', 3, 'raj.pillai@demo.edu.in', '9610000013', 'hash_rajpillai', 'student', true, false, '', false, '', NULL),
  ('nikita.yadav', 3, 'nikita.yadav@demo.edu.in', '9610000014', 'hash_nikitayadav', 'student', true, false, '', false, '', NULL),
  ('vivek.rathi', 3, 'vivek.rathi@demo.edu.in', '9610000015', 'hash_vivekrathi', 'student', true, false, '', false, '', NULL),
  ('megha.bhatt', 3, 'megha.bhatt@demo.edu.in', '9610000016', 'hash_meghabhatt', 'student', true, false, '', false, '', NULL),
  ('gaurav.kapoor', 3, 'gaurav.kapoor@demo.edu.in', '9610000017', 'hash_gauravkapoor', 'student', true, false, '', false, '', NULL),
  ('riya.rastogi', 3, 'riya.rastogi@demo.edu.in', '9610000018', 'hash_riyarastogi', 'student', true, false, '', false, '', NULL),
  ('sarthak.gupta', 3, 'sarthak.gupta@demo.edu.in', '9610000019', 'hash_sarthakgupta', 'student', true, false, '', false, '', NULL),
  ('ananya.seth', 3, 'ananya.seth@demo.edu.in', '9610000020', 'hash_ananyaseth', 'student', true, false, '', false, '', NULL),
  ('rupesh.sen', 3, 'rupesh.sen@demo.edu.in', '9610000021', 'hash_rupeshsen', 'student', true, false, '', false, '', NULL),
  ('bhavna.jain', 3, 'bhavna.jain@demo.edu.in', '9610000022', 'hash_bhavnajain', 'student', true, false, '', false, '', NULL),
  ('karan.rana', 3, 'karan.rana@demo.edu.in', '9610000023', 'hash_karanrana', 'student', true, false, '', false, '', NULL),
  ('tanya.bhagat', 3, 'tanya.bhagat@demo.edu.in', '9610000024', 'hash_tanyabhagat', 'student', true, false, '', false, '', NULL),
  ('sagar.puri', 3, 'sagar.puri@demo.edu.in', '9610000025', 'hash_sagarpuri', 'student', true, false, '', false, '', NULL),
  ('sejal.kohli', 3, 'sejal.kohli@demo.edu.in', '9610000026', 'hash_sejalkohli', 'student', true, false, '', false, '', NULL),
  ('aditya.shah', 3, 'aditya.shah@demo.edu.in', '9610000027', 'hash_adityashah', 'student', true, false, '', false, '', NULL),
  ('diya.malhotra', 3, 'diya.malhotra@demo.edu.in', '9610000028', 'hash_diyamalhotra', 'student', true, false, '', false, '', NULL),
  ('yash.joshi', 3, 'yash.joshi@demo.edu.in', '9610000029', 'hash_yashjoshi', 'student', true, false, '', false, '', NULL),
  ('pranav.bhansal', 3, 'pranav.bhansal@demo.edu.in', '9610000030', 'hash_pranavbhansal', 'student', true, false, '', false, '', NULL),

  -- 30 Parents
  ('amit.sharma', 3, 'amit.sharma@demo.edu.in', '9710000001', 'hash_amitsharma', 'parent', true, false, '', false, '', NULL),
  ('sunita.sharma', 3, 'sunita.sharma@demo.edu.in', '9710000002', 'hash_sunitasharma', 'parent', true, false, '', false, '', NULL),
  ('suresh.patel', 3, 'suresh.patel@demo.edu.in', '9710000003', 'hash_sureshpatel', 'parent', true, false, '', false, '', NULL),
  ('kavita.patel', 3, 'kavita.patel@demo.edu.in', '9710000004', 'hash_kavitapatel', 'parent', true, false, '', false, '', NULL),
  ('vijay.singh', 3, 'vijay.singh@demo.edu.in', '9710000005', 'hash_vijaysingh', 'parent', true, false, '', false, '', NULL),
  ('alka.singh', 3, 'alka.singh@demo.edu.in', '9710000006', 'hash_alkasingh', 'parent', true, false, '', false, '', NULL),
  ('rajesh.mehta', 3, 'rajesh.mehta@demo.edu.in', '9710000007', 'hash_rajeshmehta', 'parent', true, false, '', false, '', NULL),
  ('anita.mehta', 3, 'anita.mehta@demo.edu.in', '9710000008', 'hash_anitamehta', 'parent', true, false, '', false, '', NULL),
  ('sanjay.kumar', 3, 'sanjay.kumar@demo.edu.in', '9710000009', 'hash_sanjaykumar', 'parent', true, false, '', false, '', NULL),
  ('rakhi.kumar', 3, 'rakhi.kumar@demo.edu.in', '9710000010', 'hash_rakhikumar', 'parent', true, false, '', false, '', NULL),
  ('veer.desai', 3, 'veer.desai@demo.edu.in', '9710000011', 'hash_veerdesai', 'parent', true, false, '', false, '', NULL),
  ('pooja.desai', 3, 'pooja.desai@demo.edu.in', '9710000012', 'hash_poojadesai', 'parent', true, false, '', false, '', NULL),
  ('dhruv.chopra', 3, 'dhruv.chopra@demo.edu.in', '9710000013', 'hash_dhruvchopra', 'parent', true, false, '', false, '', NULL),
  ('swati.chopra', 3, 'swati.chopra@demo.edu.in', '9710000014', 'hash_swatichopra', 'parent', true, false, '', false, '', NULL),
  ('naveen.raju', 3, 'naveen.raju@demo.edu.in', '9710000015', 'hash_naveenraju', 'parent', true, false, '', false, '', NULL),
  ('preeti.raju', 3, 'preeti.raju@demo.edu.in', '9710000016', 'hash_preetiraju', 'parent', true, false, '', false, '', NULL),
  ('dinesh.yadav', 3, 'dinesh.yadav@demo.edu.in', '9710000017', 'hash_dineshyadav', 'parent', true, false, '', false, '', NULL),
  ('kanchan.yadav', 3, 'kanchan.yadav@demo.edu.in', '9710000018', 'hash_kanchanyadav', 'parent', true, false, '', false, '', NULL),
  ('brijesh.rana', 3, 'brijesh.rana@demo.edu.in', '9710000019', 'hash_brijeshrana', 'parent', true, false, '', false, '', NULL),
  ('shraddha.rana', 3, 'shraddha.rana@demo.edu.in', '9710000020', 'hash_shraddharana', 'parent', true, false, '', false, '', NULL),
  ('harish.shah', 3, 'harish.shah@demo.edu.in', '9710000021', 'hash_harishshah', 'parent', true, false, '', false, '', NULL),
  ('smita.shah', 3, 'smita.shah@demo.edu.in', '9710000022', 'hash_smitashah', 'parent', true, false, '', false, '', NULL),
  ('vinod.goyal', 3, 'vinod.goyal@demo.edu.in', '9710000023', 'hash_vinodgoyal', 'parent', true, false, '', false, '', NULL),
  ('meenakshi.goyal', 3, 'meenakshi.goyal@demo.edu.in', '9710000024', 'hash_meenakshigoyal', 'parent', true, false, '', false, '', NULL),
  ('kamal.rathi', 3, 'kamal.rathi@demo.edu.in', '9710000025', 'hash_kamalrathi', 'parent', true, false, '', false, '', NULL),
  ('rashmi.rathi', 3, 'rashmi.rathi@demo.edu.in', '9710000026', 'hash_rashmirathi', 'parent', true, false, '', false, '', NULL),
  ('alok.kapoor', 3, 'alok.kapoor@demo.edu.in', '9710000027', 'hash_alokkapoor', 'parent', true, false, '', false, '', NULL),
  ('poonam.kapoor', 3, 'poonam.kapoor@demo.edu.in', '9710000028', 'hash_poonamkapoor', 'parent', true, false, '', false, '', NULL),
  ('kesar.bhansal', 3, 'kesar.bhansal@demo.edu.in', '9710000029', 'hash_kesarbhansal', 'parent', true, false, '', false, '', NULL),
  ('ramesh.bhansal', 3, 'ramesh.bhansal@demo.edu.in', '9710000030', 'hash_rameshbhansal', 'parent', true, false, '', false, '', NULL);
     
      ;
    `);
    console.log('Demo users batch inserted!');
  } catch (error) {
    console.log('seedUsers error:', error);
  }
}

// Uncomment only when seeding:
seedUsers();
