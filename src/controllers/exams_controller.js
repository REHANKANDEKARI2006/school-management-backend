export const createExam = (req, res) => {
  const { examName, className, subject, date, time, totalScore } = req.body;

  res.json({
    success: true,
    message: "Exam created successfully",
    data: { examName, className, subject, date, time, totalScore }
  });
};

export const getAllExams = (req, res) => {
  res.json({
    success: true,
    message: "All exams fetched successfully",
    data: []
  });
};

export const updateExamSchedule = (req, res) => {
  res.json({
    success: true,
    message: `Exam schedule updated for ID: ${req.params.id}`
  });
};

export const enterGrades = (req, res) => {
  const { grades } = req.body;

  res.json({
    success: true,
    message: `Grades added for Exam ID: ${req.params.id}`,
    data: grades
  });
};

export const viewResults = (req, res) => {
  res.json({
    success: true,
    message: `Results fetched for Exam ID: ${req.params.id}`,
    data: []
  });
};

export const deleteExam = (req, res) => {
  res.json({
    success: true,
    message: `Exam deleted with ID: ${req.params.id}`
  });
};
