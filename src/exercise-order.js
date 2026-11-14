export function moveExercise(exercises, from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= exercises.length ||
    to >= exercises.length ||
    from === to
  )
    return exercises;
  const next = [...exercises];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
