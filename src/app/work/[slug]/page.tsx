import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFrame } from "@/components/PageFrame";
import { CaseStudy } from "@/components/case-study/CaseStudy";
import type { CaseStudyChrome } from "@/components/case-study/types";
import { caseStudies } from "@/lib/work";
import chrome from "../../../../content/case-study.json";

type Params = { params: Promise<{ slug: string }> };

/* Every registered case study is generated at build time, so its URL loads
   and refreshes directly as a static page; anything else is a 404. */
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(caseStudies).map((slug) => ({ slug }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const study = caseStudies[(await params).slug];
  return study ? { title: study.meta.title, description: study.meta.description } : {};
}

export default async function CaseStudyPage({ params }: Params) {
  const study = caseStudies[(await params).slug];
  if (!study) notFound();
  return (
    /* A case study belongs under Projects in the header. */
    <PageFrame current="#work">
      <CaseStudy data={study} chrome={chrome as CaseStudyChrome} />
    </PageFrame>
  );
}
