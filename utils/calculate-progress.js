const calculateProgress = (todoChecklist) => {
  if (!todoChecklist || todoChecklist.length === 0) return 100; // No checklist = full progress
  const completedCount = todoChecklist.filter((item) => item.completed).length;
  return Math.round((completedCount / todoChecklist.length) * 100);
};

export default calculateProgress;