import type { ProjectAggregate } from './ProjectAggregate';

export interface ProjectRepository {
  save(project: ProjectAggregate): Promise<void>;
  load(projectId: string): Promise<ProjectAggregate | null>;
}
