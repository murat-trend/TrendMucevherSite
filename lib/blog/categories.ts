export const BLOG_CATEGORIES = [
  { value: "tasarim", label: "Tasarım" },
  { value: "sektor", label: "Sektör" },
  { value: "kisisel", label: "Kişisel" },
  { value: "haberler", label: "Haberler" },
] as const;

export type BlogCategoryValue = (typeof BLOG_CATEGORIES)[number]["value"] | "genel";

const LABEL_MAP: Record<string, string> = Object.fromEntries(BLOG_CATEGORIES.map((c) => [c.value, c.label]));

export function blogCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Genel";
  return LABEL_MAP[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
