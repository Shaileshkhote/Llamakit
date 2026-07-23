import ProjectWorkspace from "../../_components/project-workspace"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export default async function ProjectPage({ params }: Params) {
  const { projectSlug } = await params
  return <ProjectWorkspace slug={projectSlug} />
}
