export function useStudentId() {
  return useState<string | null>('student-id', () => null)
}
