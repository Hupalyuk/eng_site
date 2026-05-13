export const COURSE_CATEGORIES = [
  { id: "all", label: "Усі курси" },
  { id: "beginner", label: "Для початківців" },
  { id: "speaking", label: "Розмовна англійська" },
  { id: "exams", label: "Підготовка до іспитів" },
  { id: "business", label: "Бізнес-англійська" },
];

export const COURSES = [
  {
    id: "a1",
    title: "Beginner (A1)",
    tag: "Для початківців",
    category: "beginner",
    description: "Курс для тих, хто тільки починає вивчати англійську.",
    duration: "8 тижнів",
    lessons: "2 рази на тиждень",
    format: "онлайн",
    price: "3 000 грн",
    icon: "chat",
    accent: "green",
  },
  {
    id: "b1",
    title: "Intermediate (B1)",
    tag: "Розмовна англійська",
    category: "speaking",
    description: "Покращуй свої навички та говори впевненіше.",
    duration: "10 тижнів",
    lessons: "2 рази на тиждень",
    format: "онлайн",
    price: "4 000 грн",
    icon: "bubble",
    accent: "yellow",
  },
  {
    id: "ielts",
    title: "IELTS Preparation",
    tag: "Підготовка до іспитів",
    category: "exams",
    description: "Комплексна підготовка до іспиту IELTS.",
    duration: "12 тижнів",
    lessons: "3 рази на тиждень",
    format: "онлайн",
    price: "5 500 грн",
    icon: "badge",
    accent: "purple",
  },
  {
    id: "biz",
    title: "Business English",
    tag: "Бізнес-англійська",
    category: "business",
    description: "Англійська для роботи, зустрічей та переговорів.",
    duration: "8 тижнів",
    lessons: "2 рази на тиждень",
    format: "онлайн",
    price: "4 500 грн",
    icon: "briefcase",
    accent: "blue",
  },
];

export function getCourseById(courseId) {
  return COURSES.find((course) => course.id === courseId) || null;
}

