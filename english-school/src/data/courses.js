const COURSE_CATEGORY_IDS = ["all", "beginner", "speaking", "exams", "business"];

const COURSE_DEFINITIONS = [
  {
    id: "a1",
    category: "beginner",
    icon: "chat",
    accent: "green",
  },
  {
    id: "b1",
    category: "speaking",
    icon: "bubble",
    accent: "yellow",
  },
  {
    id: "ielts",
    category: "exams",
    icon: "badge",
    accent: "purple",
  },
  {
    id: "biz",
    category: "business",
    icon: "briefcase",
    accent: "blue",
  },
];

const withFallback = (t, key, fallback) => (typeof t === "function" ? t(key, fallback) : fallback);

const localizeCourse = (course, t) => ({
  ...course,
  title: withFallback(t, `courses.items.${course.id}.title`, course.id),
  tag: withFallback(t, `courses.items.${course.id}.tag`, course.category),
  description: withFallback(t, `courses.items.${course.id}.description`, ""),
  duration: withFallback(t, `courses.items.${course.id}.duration`, ""),
  lessons: withFallback(t, `courses.items.${course.id}.lessons`, ""),
  format: withFallback(t, `courses.items.${course.id}.format`, ""),
  price: withFallback(t, `courses.items.${course.id}.price`, ""),
});

export const COURSE_CATEGORIES = COURSE_CATEGORY_IDS.map((id) => ({ id, label: id }));
export const COURSES = COURSE_DEFINITIONS.map((course) => localizeCourse(course));

export function getLocalizedCourseCategories(t) {
  return COURSE_CATEGORY_IDS.map((id) => ({
    id,
    label: withFallback(t, `courses.categories.${id}`, id),
  }));
}

export function getLocalizedCourses(t) {
  return COURSE_DEFINITIONS.map((course) => localizeCourse(course, t));
}

export function getCourseById(courseId, t) {
  const course = COURSE_DEFINITIONS.find((item) => item.id === courseId);
  return course ? localizeCourse(course, t) : null;
}
