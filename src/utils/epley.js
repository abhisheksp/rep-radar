/**
 * Epley formula for estimating rep maxes.
 * estimateNRM(weight, actualReps, targetReps)
 *   → estimates what load you could do for targetReps
 *     given you did actualReps at weight.
 */
export const estimateNRM = (weight, actualReps, targetReps) => {
  if (actualReps === targetReps) return weight;
  if (actualReps <= 0 || targetReps <= 0) return weight;
  const est1RM = weight * (1 + actualReps / 30);
  if (targetReps === 1) return Math.round(est1RM);
  return Math.round(est1RM / (1 + targetReps / 30));
};

export const estimate1RM = (weight, reps) => estimateNRM(weight, reps, 1);
