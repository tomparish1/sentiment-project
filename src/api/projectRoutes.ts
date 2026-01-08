import { Router } from 'express';
import type { Request, Response, ParamsDictionary } from 'express-serve-static-core';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Route params type
interface IdParams extends ParamsDictionary {
  id: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base path for the _tom-pa workspace
// __dirname is src/api, so go up 4 levels: api -> src -> writers-portal -> tools -> _tom-pa
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../..');
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, 'projects');
const ARCHIVES_DIR = path.join(PROJECTS_DIR, 'archives');
const TOOLS_REGISTRY = path.join(WORKSPACE_ROOT, 'tools', 'registry.json');
const MANIFEST_PATH = path.join(PROJECTS_DIR, 'index.json');

const router = Router();

// Project phase order for sorting
const PHASE_ORDER = ['research', 'outline', 'drafting', 'revision', 'polish', 'review', 'published'];

interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  phase: string;
  created: string;
  updated: string;
  goal: string;
  files: {
    currentDraft: string | null;
    notes: string | null;
  };
  workingDirectory: string;
  tools: string[];
  launch: {
    quick: string;
    context: string;
    full: string;
  };
  context: {
    keyFindings: string[];
    currentStage: string;
    blockers: string[];
  };
  nextSteps: string[];
  notes: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  server: string;
  healthEndpoint: string;
  endpoints: Record<string, string>;
  launchCmd: string;
  launchDir: string;
}

/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: List all projects
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: phase
 *         in: query
 *         description: Filter by phase
 *         schema:
 *           type: string
 *       - name: type
 *         in: query
 *         description: Filter by type (essay, development, etc.)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { phase, type } = req.query;
    const projects = await loadAllProjects();

    let filtered = projects;
    if (phase) {
      filtered = filtered.filter(p => p.phase === phase);
    }
    if (type) {
      filtered = filtered.filter(p => p.type === type);
    }

    // Sort by phase order, then by updated date
    filtered.sort((a, b) => {
      const phaseA = PHASE_ORDER.indexOf(a.phase);
      const phaseB = PHASE_ORDER.indexOf(b.phase);
      if (phaseA !== phaseB) return phaseA - phaseB;
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });

    res.json({ projects: filtered, count: filtered.length });
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * @openapi
 * /api/projects/manifest:
 *   get:
 *     summary: Get the projects manifest
 *     tags:
 *       - Projects
 *     responses:
 *       200:
 *         description: Manifest contents
 *       404:
 *         description: Manifest not found
 */
router.get('/manifest', async (_req: Request, res: Response) => {
  try {
    const content = await fs.readFile(MANIFEST_PATH, 'utf-8');
    res.json(JSON.parse(content));
  } catch {
    res.status(404).json({ error: 'Manifest not found. POST to /api/projects/manifest to generate.' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     summary: Get a specific project
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await loadProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error('Error loading project:', error);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated project
 */
router.put('/:id', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    const existing = await loadProject(projectId);

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updated = {
      ...existing,
      ...(req.body as Record<string, unknown>),
      id: projectId, // Prevent ID change
      updated: new Date().toISOString()
    };

    await fs.writeFile(projectPath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   patch:
 *     summary: Partially update a project
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated project
 *       404:
 *         description: Project not found
 */
router.patch('/:id', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    const existing = await loadProject(projectId);

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updates = req.body as Record<string, unknown>;
    const updated = {
      ...existing,
      ...updates,
      id: projectId, // Prevent ID change
      updated: new Date().toISOString()
    };

    await fs.writeFile(projectPath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 *       404:
 *         description: Project not found
 */
router.delete('/:id', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Check if project exists
    try {
      await fs.access(projectDir);
    } catch {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Remove the project directory recursively
    await fs.rm(projectDir, { recursive: true, force: true });

    res.json({ success: true, id: projectId, message: `Project ${projectId} deleted` });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/archive:
 *   post:
 *     summary: Archive a completed project
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project archived
 *       404:
 *         description: Project not found
 */
router.post('/:id/archive', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Check if project exists
    const project = await loadProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Ensure archives directory exists
    await fs.mkdir(ARCHIVES_DIR, { recursive: true });

    // Add archive event to history
    const now = new Date().toISOString();
    if (!project.history) project.history = [];
    project.history.push({
      type: 'archived',
      phase: project.phase,
      timestamp: now
    });
    project.archived = true;
    project.archivedAt = now;
    project.updated = now;

    // Write updated project.json before moving
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(project, null, 2)
    );

    // Move to archives
    const archiveDir = path.join(ARCHIVES_DIR, projectId);
    await fs.rename(projectDir, archiveDir);

    res.json({
      success: true,
      id: projectId,
      archivePath: archiveDir,
      message: `Project ${projectId} archived`
    });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

/**
 * @openapi
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags:
 *       - Projects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - title
 *             properties:
 *               id:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, title, description, type, phase, goal, workingDirectory } = req.body;

    if (!id || !title) {
      res.status(400).json({ error: 'id and title are required' });
      return;
    }

    // Check if project already exists
    const projectDir = path.join(PROJECTS_DIR, id);
    try {
      await fs.access(projectDir);
      res.status(409).json({ error: 'Project already exists' });
      return;
    } catch {
      // Directory doesn't exist, we can create it
    }

    const now = new Date().toISOString();
    const newProject: Project = {
      id,
      title,
      description: description || '',
      type: type || 'essay',
      phase: phase || 'research',
      created: now,
      updated: now,
      goal: goal || '',
      files: {
        currentDraft: null,
        notes: null
      },
      workingDirectory: workingDirectory || `projects/${id}`,
      tools: [],
      launch: {
        quick: 'Activate session and open Claude',
        context: 'Show goal, key context, and next steps',
        full: 'Load project context and open current draft for editing'
      },
      context: {
        keyFindings: [],
        currentStage: 'Starting',
        blockers: []
      },
      nextSteps: [],
      notes: '',
      history: [{
        type: 'created',
        phase: phase || 'research',
        timestamp: now
      }]
    };

    // Create project directory structure
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'drafts'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'research'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'outputs'), { recursive: true });

    // Write project.json
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(newProject, null, 2)
    );

    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/phase:
 *   patch:
 *     summary: Update project phase
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phase
 *             properties:
 *               phase:
 *                 type: string
 *                 enum: [research, outline, drafting, revision, polish, review, published]
 *     responses:
 *       200:
 *         description: Updated project
 */
router.patch('/:id/phase', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const { phase } = req.body as { phase?: string };

    if (!phase || !PHASE_ORDER.includes(phase)) {
      res.status(400).json({
        error: 'Invalid phase',
        validPhases: PHASE_ORDER
      });
      return;
    }

    const project = await loadProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const oldPhase = project.phase;
    const now = new Date().toISOString();

    // Initialize history array if it doesn't exist
    if (!project.history) {
      project.history = [];
    }

    // Record the phase transition
    project.history.push({
      type: 'phase-change',
      from: oldPhase,
      to: phase,
      timestamp: now
    });

    project.phase = phase;
    project.updated = now;

    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));

    res.json(project);
  } catch (error) {
    console.error('Error updating phase:', error);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

/**
 * @openapi
 * /api/tools:
 *   get:
 *     summary: List all registered tools
 *     tags:
 *       - Tools
 *     responses:
 *       200:
 *         description: List of tools with status
 */
router.get('/tools/registry', async (_req: Request, res: Response) => {
  try {
    const registryContent = await fs.readFile(TOOLS_REGISTRY, 'utf-8');
    const registry = JSON.parse(registryContent);

    // Check status of each tool
    const toolsWithStatus = await Promise.all(
      registry.tools.map(async (tool: Tool) => {
        let status = 'offline';
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const response = await fetch(`${tool.server}${tool.healthEndpoint}`, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (response.ok) status = 'online';
        } catch {
          status = 'offline';
        }
        return { ...tool, status };
      })
    );

    res.json({ tools: toolsWithStatus });
  } catch (error) {
    console.error('Error loading tools registry:', error);
    res.status(500).json({ error: 'Failed to load tools registry' });
  }
});

// Helper functions
async function loadAllProjects(): Promise<Project[]> {
  const projects: Project[] = [];

  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const project = await loadProject(entry.name);
        if (project) {
          projects.push(project);
        }
      }
    }
  } catch (error) {
    console.error('Error reading projects directory:', error);
  }

  return projects;
}

async function loadProject(id: string): Promise<Project | null> {
  try {
    const projectPath = path.join(PROJECTS_DIR, id, 'project.json');
    const content = await fs.readFile(projectPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * @openapi
 * /api/projects/launch:
 *   post:
 *     summary: Launch Terminal in a directory with optional command
 *     tags:
 *       - Projects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *               command:
 *                 type: string
 *     responses:
 *       200:
 *         description: Terminal launched
 */
/**
 * @openapi
 * /api/projects/open-in-obsidian:
 *   post:
 *     summary: Open a file in Obsidian
 *     tags:
 *       - Projects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: File opened in Obsidian
 */
router.post('/open-in-obsidian', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body as { filePath: string };

    if (!filePath) {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }

    const { exec } = await import('child_process');

    // Build absolute path to the file
    let absolutePath: string;
    if (filePath.startsWith('/')) {
      absolutePath = filePath;
    } else if (filePath.startsWith('writing-vault/')) {
      absolutePath = path.join(WORKSPACE_ROOT, filePath);
    } else {
      absolutePath = path.join(WORKSPACE_ROOT, 'writing-vault', filePath);
    }

    // Use Obsidian URI with path (more reliable than vault name)
    const obsidianUrl = `obsidian://open?path=${encodeURIComponent(absolutePath)}`;

    exec(`open "${obsidianUrl}"`, (error) => {
      if (error) {
        console.error('Obsidian launch error:', error);
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ success: true, path: absolutePath });
    });
  } catch (error) {
    console.error('Error opening in Obsidian:', error);
    res.status(500).json({ error: 'Failed to open in Obsidian' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/start-writing:
 *   post:
 *     summary: Create draft.md if needed and open in Obsidian
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draft opened in Obsidian
 */
router.post('/:id/start-writing', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await loadProject(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const draftPath = path.join(projectDir, 'draft.md');

    // Check if draft exists, create if not
    let created = false;
    try {
      await fs.access(draftPath);
    } catch {
      // Create draft with frontmatter
      const frontmatter = `---
title: "${project.title}"
project: ${projectId}
type: ${project.type}
phase: ${project.phase}
created: ${new Date().toISOString()}
---

# ${project.title}

## Goal
${project.goal}

## Draft

`;
      await fs.writeFile(draftPath, frontmatter);
      created = true;

      // Update project to reference the draft
      project.files.currentDraft = `projects/${projectId}/draft.md`;
      project.updated = new Date().toISOString();
      await fs.writeFile(
        path.join(projectDir, 'project.json'),
        JSON.stringify(project, null, 2)
      );
    }

    // Open in Obsidian via URL scheme (using path for reliability)
    const { exec } = await import('child_process');
    const absoluteDraftPath = path.join(WORKSPACE_ROOT, 'writing-vault', 'projects', projectId, 'draft.md');
    const obsidianUrl = `obsidian://open?path=${encodeURIComponent(absoluteDraftPath)}`;

    exec(`open "${obsidianUrl}"`, (error) => {
      if (error) {
        console.error('Obsidian launch error:', error);
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({
        success: true,
        created,
        draftPath: `projects/${projectId}/draft.md`,
        project: project.title
      });
    });
  } catch (error) {
    console.error('Error starting writing:', error);
    res.status(500).json({ error: 'Failed to start writing session' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/open-vault:
 *   post:
 *     summary: Open the project vault in Obsidian with the last edited file
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vault opened in Obsidian
 */
router.post('/:id/open-vault', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await loadProject(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Find the most recently modified .md file in the project directory
    const findLastEditedFile = async (dir: string): Promise<{ path: string; mtime: Date } | null> => {
      let lastEdited: { path: string; mtime: Date } | null = null;

      const scanDir = async (currentDir: string) => {
        try {
          const entries = await fs.readdir(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              await scanDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              const stat = await fs.stat(fullPath);
              if (!lastEdited || stat.mtime > lastEdited.mtime) {
                lastEdited = { path: fullPath, mtime: stat.mtime };
              }
            }
          }
        } catch {
          // Ignore errors for inaccessible directories
        }
      };

      await scanDir(dir);
      return lastEdited;
    };

    const lastEdited = await findLastEditedFile(projectDir);

    // Fall back to draft.md if no files found
    const fileToOpen = lastEdited?.path || path.join(projectDir, 'draft.md');
    const absolutePath = path.join(WORKSPACE_ROOT, 'writing-vault', 'projects', projectId, path.relative(projectDir, fileToOpen));

    // Open in Obsidian
    const { exec } = await import('child_process');
    const obsidianUrl = `obsidian://open?path=${encodeURIComponent(absolutePath)}`;

    exec(`open "${obsidianUrl}"`, (error) => {
      if (error) {
        console.error('Obsidian launch error:', error);
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({
        success: true,
        openedFile: path.relative(projectDir, fileToOpen),
        project: project.title
      });
    });
  } catch (error) {
    console.error('Error opening vault:', error);
    res.status(500).json({ error: 'Failed to open vault' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/add-research:
 *   post:
 *     summary: Create a new research file
 *     tags:
 *       - Projects
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Research file created
 */
router.post('/:id/add-research', async (req: Request<IdParams>, res: Response) => {
  try {
    const projectId = req.params.id;
    const { filename, content } = req.body as { filename: string; content?: string };

    if (!filename) {
      res.status(400).json({ error: 'filename is required' });
      return;
    }

    const project = await loadProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const researchDir = path.join(PROJECTS_DIR, projectId, 'research');

    // Ensure research directory exists
    await fs.mkdir(researchDir, { recursive: true });

    // Sanitize filename and ensure .md extension
    const safeName = filename.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    const finalName = safeName.endsWith('.md') ? safeName : `${safeName}.md`;
    const filePath = path.join(researchDir, finalName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      res.status(409).json({ error: 'File already exists' });
      return;
    } catch {
      // File doesn't exist, we can create it
    }

    // Create file with frontmatter
    const now = new Date().toISOString();
    const fileContent = content || `---
title: "${safeName}"
project: ${projectId}
type: research
created: ${now}
---

# ${safeName}

## Notes

`;

    await fs.writeFile(filePath, fileContent);

    // Open in Obsidian (using path for reliability)
    const { exec } = await import('child_process');
    const absoluteResearchPath = path.join(WORKSPACE_ROOT, 'writing-vault', 'projects', projectId, 'research', `${safeName}.md`);
    const obsidianUrl = `obsidian://open?path=${encodeURIComponent(absoluteResearchPath)}`;

    exec(`open "${obsidianUrl}"`, (error) => {
      if (error) {
        console.error('Obsidian launch error:', error);
        // Still return success since file was created
      }
      res.status(201).json({
        success: true,
        filePath: `projects/${projectId}/research/${finalName}`,
        openedInObsidian: !error
      });
    });
  } catch (error) {
    console.error('Error adding research file:', error);
    res.status(500).json({ error: 'Failed to create research file' });
  }
});

router.post('/launch', async (req: Request, res: Response) => {
  try {
    const { path: dirPath, command } = req.body as { path: string; command?: string };

    if (!dirPath) {
      res.status(400).json({ error: 'path is required' });
      return;
    }

    const { spawn } = await import('child_process');
    const launchScript = path.join(WORKSPACE_ROOT, 'tools', 'launcher', 'launch-terminal.sh');

    // Use spawn with separate arguments to avoid shell escaping issues
    const args = command ? [dirPath, command] : [dirPath];

    const child = spawn(launchScript, args, { shell: false });

    child.on('error', (error) => {
      console.error('Launch error:', error);
      res.status(500).json({ error: error.message });
    });

    child.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, path: dirPath, command: command || 'none' });
      } else {
        res.status(500).json({ error: `Script exited with code ${code}` });
      }
    });
  } catch (error) {
    console.error('Error launching terminal:', error);
    res.status(500).json({ error: 'Failed to launch terminal' });
  }
});

/**
 * @openapi
 * /api/projects/manifest:
 *   post:
 *     summary: Regenerate the projects manifest file
 *     tags:
 *       - Projects
 *     responses:
 *       200:
 *         description: Manifest regenerated successfully
 *       500:
 *         description: Failed to regenerate manifest
 */
router.post('/manifest', async (_req: Request, res: Response) => {
  try {
    const projects = await loadAllProjects();

    // Sort by phase order, then by updated date
    projects.sort((a, b) => {
      const phaseA = PHASE_ORDER.indexOf(a.phase);
      const phaseB = PHASE_ORDER.indexOf(b.phase);
      if (phaseA !== phaseB) return phaseA - phaseB;
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });

    const manifest = {
      generated: new Date().toISOString(),
      count: projects.length,
      projects: projects
    };

    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    res.json({
      success: true,
      path: MANIFEST_PATH,
      count: projects.length
    });
  } catch (error) {
    console.error('Error regenerating manifest:', error);
    res.status(500).json({ error: 'Failed to regenerate manifest' });
  }
});

export { router as projectRoutes };
