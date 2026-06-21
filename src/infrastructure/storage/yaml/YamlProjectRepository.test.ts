import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';

import type { ProjectAggregate } from '../../../domains/project/ProjectAggregate';
import { YamlProjectRepository } from './YamlProjectRepository';

test('save(project) then load(project.id) returns equivalent aggregate', async () => {
  await withTempDir(async (dir) => {
    const repository = new YamlProjectRepository(dir);
    const project: ProjectAggregate = {
      id: 'project-001',
      name: 'MVP Demo Project',
      budget: {
        amount: 120000,
        currency: 'CNY',
      },
    };

    await repository.save(project);
    const loaded = await repository.load(project.id);

    assert.deepEqual(loaded, project);
  });
});

test('load(non-existing id) returns null', async () => {
  await withTempDir(async (dir) => {
    const repository = new YamlProjectRepository(dir);

    const loaded = await repository.load('missing-project');

    assert.equal(loaded, null);
  });
});

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'zooming-project-repo-'));

  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
