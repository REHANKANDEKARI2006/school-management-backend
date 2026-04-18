import db from '../config/db.js';

async function standardizeClasses() {
  try {
    const { rows } = await db.query('SELECT class_id, class_name FROM class');
    let updatedCount = 0;

    for (const row of rows) {
      let originalName = row.class_name;
      let newName = originalName.trim();

      // Remove "Class " prefix
      if (newName.toLowerCase().startsWith('class ')) {
        newName = newName.substring(6).trim();
      }

      // Remove "th", "st", "nd", "rd" suffixes if followed by space or hyphen or end of string
      newName = newName.replace(/(\d+)(st|nd|rd|th)(\s|-|$)/gi, '$1$3');

      // Remove anything after " - "
      if (newName.includes(' - ')) {
        newName = newName.split(' - ')[0].trim();
      }
      
      // Remove any other stray hyphens or characters at the end
      if (newName.includes('-')) {
         newName = newName.split('-')[0].trim();
      }

      newName = newName.trim();

      if (newName !== originalName) {
        await db.query('UPDATE class SET class_name = $1 WHERE class_id = $2', [newName, row.class_id]);
        console.log(`Updated class ${row.class_id}: "${originalName}" -> "${newName}"`);
        updatedCount++;
      }
    }

    console.log(`Standardization complete. Updated ${updatedCount} classes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error standardizing classes:', error);
    process.exit(1);
  }
}

standardizeClasses();
