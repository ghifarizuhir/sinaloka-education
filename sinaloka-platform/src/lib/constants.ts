export const GRADE_GROUPS = [
  {
    label: 'SD',
    options: [
      { value: 'Kelas 1', label: 'Kelas 1' },
      { value: 'Kelas 2', label: 'Kelas 2' },
      { value: 'Kelas 3', label: 'Kelas 3' },
      { value: 'Kelas 4', label: 'Kelas 4' },
      { value: 'Kelas 5', label: 'Kelas 5' },
      { value: 'Kelas 6', label: 'Kelas 6' },
    ],
  },
  {
    label: 'SMP',
    options: [
      { value: 'Kelas 7', label: 'Kelas 7' },
      { value: 'Kelas 8', label: 'Kelas 8' },
      { value: 'Kelas 9', label: 'Kelas 9' },
    ],
  },
  {
    label: 'SMA',
    options: [
      { value: 'Kelas 10', label: 'Kelas 10' },
      { value: 'Kelas 11', label: 'Kelas 11' },
      { value: 'Kelas 12', label: 'Kelas 12' },
    ],
  },
];

export const ALL_GRADES = GRADE_GROUPS.flatMap(g => g.options);
