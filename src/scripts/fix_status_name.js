import fs from 'fs';
const filePath = 'c:/Users/Rehan/OneDrive/Documents/School_Management_system/school_management_team/src/models/attendance_Model.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/ast\.status_type as status,/g, 'ast.atd_status_name as status,');
fs.writeFileSync(filePath, content);
console.log('Fixed atd_status_name in attendance_Model.js');
