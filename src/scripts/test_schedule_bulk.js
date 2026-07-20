import ScheduleModel from '../models/schedule_model.js';

async function testBulkSchedule() {
  try {
    console.log('Testing bulk schedule save with break slots (staff_id = null)...');
    const mockSchedule = [
      {
        day_of_week: 1,
        period_number: 1,
        start_time: '09:00:00',
        end_time: '09:45:00',
        staff_id: 1,
        subject_id: 1,
        is_break: false
      },
      {
        day_of_week: 1,
        period_number: 2,
        start_time: '09:45:00',
        end_time: '10:00:00',
        staff_id: null,
        subject_id: null,
        is_break: true
      }
    ];

    const result = await ScheduleModel.replaceClassSchedule(1, mockSchedule, 3);
    console.log('✅ Bulk schedule replace result:', result);
  } catch (err) {
    console.error('❌ Error testing bulk schedule:', err);
  }
  process.exit(0);
}

testBulkSchedule();
