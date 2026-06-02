import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getAppState,
  getProject,
  createTask,
  updateTask,
  archiveTask
} from "../lib/db.js";
import type { TaskType, Priority } from "../lib/types.js";

const server = new McpServer({
  name: "ProjectFlow MCP Server",
  version: "1.0.0",
});

server.tool(
  "get_projects",
  "List all projects in ProjectFlow",
  {},
  async () => {
    try {
      const appState = getAppState();
      const projects = appState.projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_phases",
  "List all phases for a given project",
  {
    projectId: z.string().describe("The ID of the project"),
  },
  async ({ projectId }) => {
    try {
      const appState = getAppState();
      const phases = appState.phases.filter((p) => p.projectId === projectId).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(phases, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_columns",
  "List all columns for a given project",
  {
    projectId: z.string().describe("The ID of the project"),
  },
  async ({ projectId }) => {
    try {
      const appState = getAppState();
      const columns = appState.columns.filter((c) => c.projectId === projectId).map((c) => ({
        id: c.id,
        name: c.name,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(columns, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_tasks",
  "List tasks for a given project",
  {
    projectId: z.string().describe("The ID of the project"),
    columnId: z.string().optional().describe("Filter tasks by column ID"),
    phaseId: z.string().optional().describe("Filter tasks by phase ID"),
  },
  async ({ projectId, columnId, phaseId }) => {
    try {
      const appState = getAppState();
      let tasks = appState.tasks.filter((t) => t.projectId === projectId);
      
      if (columnId) {
        tasks = tasks.filter((t) => t.columnId === columnId);
      }
      if (phaseId) {
        tasks = tasks.filter((t) => t.phaseId === phaseId);
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_task",
  "Get details of a specific task by its ID",
  {
    taskId: z.string().describe("The ID of the task"),
  },
  async ({ taskId }) => {
    try {
      const appState = getAppState();
      const task = appState.tasks.find((t) => t.id === taskId);
      
      if (!task) {
        return {
          content: [{ type: "text", text: `Task not found` }],
          isError: true,
        };
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_task",
  "Create a new task in ProjectFlow",
  {
    projectId: z.string().describe("The ID of the project"),
    columnId: z.string().optional().describe("The ID of the column to place the task in (optional, defaults to first)"),
    phaseId: z.string().optional().describe("The ID of the phase (optional, defaults to active phase)"),
    title: z.string().describe("The title of the task"),
    description: z.string().optional().describe("Detailed description of the task"),
    taskType: z.enum(["Feature", "Bug", "Enhancement", "UI Fix", "Refactor", "Research", "Idea", "AI Prompt", "Note", ""]).optional().describe("The type of the task"),
    priority: z.enum(["Low", "Medium", "High", "Urgent", ""]).optional().describe("The priority of the task"),
    tags: z.array(z.string()).optional().describe("An array of tag names"),
  },
  async ({ projectId, columnId, phaseId, title, description, taskType, priority, tags }) => {
    try {
      const taskId = createTask({
        projectId,
        columnId,
        phaseId,
        title,
        description,
        taskType: taskType as TaskType,
        priority: priority as Priority,
        tags,
      });
      return {
        content: [{ type: "text", text: `Successfully created task with ID: ${taskId}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error creating task: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_task",
  "Update an existing task in ProjectFlow",
  {
    taskId: z.string().describe("The ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    description: z.string().optional().describe("New description"),
    phaseId: z.string().optional().describe("New phase ID"),
    columnId: z.string().optional().describe("New column ID (this effectively moves the task)"),
    taskType: z.enum(["Feature", "Bug", "Enhancement", "UI Fix", "Refactor", "Research", "Idea", "AI Prompt", "Note", ""]).optional().describe("New task type"),
    priority: z.enum(["Low", "Medium", "High", "Urgent", ""]).optional().describe("New task priority"),
    tags: z.array(z.string()).optional().describe("New array of tag names (overwrites existing)"),
  },
  async ({ taskId, title, description, phaseId, columnId, taskType, priority, tags }) => {
    try {
      const patch: any = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (phaseId !== undefined) patch.phaseId = phaseId;
      if (columnId !== undefined) patch.columnId = columnId;
      if (taskType !== undefined) patch.taskType = taskType as TaskType;
      if (priority !== undefined) patch.priority = priority as Priority;
      if (tags !== undefined) patch.tags = tags;

      updateTask(taskId, patch);
      return {
        content: [{ type: "text", text: `Successfully updated task ${taskId}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error updating task: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "move_task",
  "Move a task to a different column in ProjectFlow",
  {
    taskId: z.string().describe("The ID of the task to move"),
    columnId: z.string().describe("The ID of the destination column"),
  },
  async ({ taskId, columnId }) => {
    try {
      updateTask(taskId, { columnId });
      return {
        content: [{ type: "text", text: `Successfully moved task ${taskId} to column ${columnId}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error moving task: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "delete_task",
  "Archive (delete) a task by its ID",
  {
    taskId: z.string().describe("The ID of the task to archive/delete"),
  },
  async ({ taskId }) => {
    try {
      archiveTask(taskId);
      return {
        content: [{ type: "text", text: `Successfully archived task ${taskId}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error archiving task: ${error.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in MCP Server:", error);
  process.exit(1);
});
