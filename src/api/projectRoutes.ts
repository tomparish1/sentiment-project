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
const TOOLS_REGISTRY = path.join(WORKSPACE_ROOT, 'tools', 'registry.json');

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
    const { id, title, description, type, goal, workingDirectory } = req.body;

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
      phase: 'research',
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
      notes: ''
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

    project.phase = phase;
    project.updated = new Date().toISOString();

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

    // Parse the path to extract vault and file
    // Expected format: "writing-vault/path/to/file.md" or absolute path
    let vaultName = 'writing-vault';
    let fileInVault = filePath;

    if (filePath.startsWith('writing-vault/')) {
      vaultName = 'writing-vault';
      fileInVault = filePath.substring('writing-vault/'.length);
    } else if (filePath.startsWith('/')) {
      // Absolute path - try to extract vault from path
      const vaultPath = path.join(WORKSPACE_ROOT, 'writing-vault');
      if (filePath.startsWith(vaultPath)) {
        fileInVault = filePath.substring(vaultPath.length + 1);
      }
    }

    // Remove .md extension for Obsidian URI (it adds it automatically)
    const fileWithoutExt = fileInVault.replace(/\.md$/, '');

    // Use Obsidian URI scheme
    const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fileWithoutExt)}`;

    exec(`open "${obsidianUrl}"`, (error) => {
      if (error) {
        console.error('Obsidian launch error:', error);
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ success: true, vault: vaultName, file: fileInVault });
    });
  } catch (error) {
    console.error('Error opening in Obsidian:', error);
    res.status(500).json({ error: 'Failed to open in Obsidian' });
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

export { router as projectRoutes };
