import { ProjectFlowApp } from "@/components/ProjectFlowApp";

type Params = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: Params) {
  const { projectId } = await params;
  return <ProjectFlowApp initialProjectId={projectId} />;
}
