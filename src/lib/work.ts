import type { CaseStudyData } from "@/components/case-study/types";
import secondOffice from "../../content/work/second-office.json";

/**
 * The case studies the site has, by slug. To add one (Travelito, Joyn):
 * write content/work/<slug>.json in the block vocabulary of
 * src/components/case-study/types.ts, import it here, and point the
 * project's `href` in content/projects.json at /work/<slug>. The route,
 * its static generation and its metadata follow from this list.
 */
export const caseStudies: Record<string, CaseStudyData> = {
  [secondOffice.slug]: secondOffice as CaseStudyData,
};
