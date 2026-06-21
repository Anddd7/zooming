import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

import type { ProjectAggregate } from '../../../domains/project/ProjectAggregate';
import type { ProjectRepository } from '../../../domains/project/ProjectRepository';

interface ProjectYamlDto {
  id: string;
  name: string;
  budget: {
    amount: number;
    currency: string;
  };
}

export class YamlProjectRepository implements ProjectRepository {
  constructor(private readonly storageDir: string) {}

  async save(project: ProjectAggregate): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
    const path = this.getProjectPath(project.id);
    const dto = toYamlDto(project);
    await writeFile(path, stringify(dto), 'utf8');
  }

  async load(projectId: string): Promise<ProjectAggregate | null> {
    const path = this.getProjectPath(projectId);

    try {
      const content = await readFile(path, 'utf8');
      const dto = parse(content) as ProjectYamlDto;
      return toAggregate(dto);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private getProjectPath(projectId: string): string {
    return join(this.storageDir, `${projectId}.yaml`);
  }
}

function toYamlDto(project: ProjectAggregate): ProjectYamlDto {
  return {
    id: project.id,
    name: project.name,
    budget: {
      amount: project.budget.amount,
      currency: project.budget.currency,
    },
  };
}

function toAggregate(dto: ProjectYamlDto): ProjectAggregate {
  return {
    id: dto.id,
    name: dto.name,
    budget: {
      amount: dto.budget.amount,
      currency: dto.budget.currency,
    },
  };
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
