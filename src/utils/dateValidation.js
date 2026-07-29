export const isEndDateBeforeStartDate = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(endDate) < new Date(startDate);
};

export const getEndDateValidationMessage = (
  startLabel = "Start Date",
  endLabel = "End Date",
) => `${endLabel} cannot be earlier than ${startLabel}.`;
