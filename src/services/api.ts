// import axios from 'axios';

// const API_BASE_URL = 'http://localhost:8000';

// const api = axios.create({
// baseURL: API_BASE_URL,
// headers: {
// 'Content-Type': 'application/json',
// },
// });

// // Employee API
// export const employeeApi = {
// getAll: async () => {
// const { data } = await api.get('/employees');
// return data;
// },

// getById: async (id: number) => {
// const { data } = await api.get(`/employees/${id}`);
// return data;
// },

// create: async (employee: any) => {
// const { data } = await api.post('/employees', employee);
// return data;
// },

// update: async (id: number, employee: any) => {
// const { data } = await api.put(`/employees/${id}`, employee);
// return data;
// },

// delete: async (id: number) => {
// await api.delete(`/employees/${id}`);
// },
// };

// // Project API
// export const projectApi = {
// getAll: async () => {
// const { data } = await api.get('/projects');
// return data;
// },

// getById: async (id: number) => {
// const { data } = await api.get(`/projects/${id}`);
// return data;
// },

// create: async (project: any) => {
// const { data } = await api.post('/projects', project);
// return data;
// },

// update: async (id: number, project: any) => {
// const { data } = await api.put(`/projects/${id}`, project);
// return data;
// },

// delete: async (id: number) => {
// await api.delete(`/projects/${id}`);
// },
// };

// // Allocation API
// export const allocationApi = {
// getAll: async () => {
// const { data } = await api.get('/allocations');
// return data;
// },

// create: async (allocation: any) => {
// const { data } = await api.post('/allocations', allocation);
// return data;
// },

// update: async (id: number, allocation: any) => {
// const { data } = await api.put(`/allocations/${id}`, allocation);
// return data;
// },

// delete: async (id: number) => {
// await api.delete(`/allocations/${id}`);
// },
// };

// // Leave API
// export const leaveApi = {
// getAll: async () => {
// const { data } = await api.get('/leaves');
// return data;
// },

// create: async (leave: any) => {
// const { data } = await api.post('/leaves', leave);
// return data;
// },

// update: async (id: number, leave: any) => {
// const { data } = await api.put(`/leaves/${id}`, leave);
// return data;
// },

// delete: async (id: number) => {
// await api.delete(`/leaves/${id}`);
// },
// };

// // Skills API
// export const skillsApi = {
// getSummary: async () => {
// const { data } = await api.get('/skills/summary');
// return data;
// },

// getEmployeesBySkill: async (skill: string) => {
// const { data } = await api.get(`/skills/${skill}/employees`);
// return data;
// },
// };

// export default api;

import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Employee API
export const employeeApi = {
  getAll: async () => {
    const { data } = await api.get("/api/employees"); // Updated path
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/api/employees/${id}`); // Updated path
    return data;
  },

  create: async (employee: any) => {
    const { data } = await api.post("/api/employees", employee); // Updated path
    return data;
  },

  update: async (id: number, employee: any) => {
    const { data } = await api.put(`/api/employees/${id}`, employee); // Updated path
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/employees/${id}`); // Updated path
  },
};

// Project API
// export const projectApi = {
// getAll: async () => {
// const { data } = await api.get('/projects');
// return data;
// },

// getById: async (id: number) => {
// const { data } = await api.get(`/projects/${id}`);
// return data;
// },

// create: async (project: any) => {
// const { data } = await api.post('/projects', project);
// return data;
// },

// update: async (id: number, project: any) => {
// const { data } = await api.put(`/projects/${id}`, project);
// return data;
// },

// delete: async (id: number) => {
// await api.delete(`/projects/${id}`);
// },
// };
// Project API
export const projectApi = {
  getAll: async () => {
    const { data } = await api.get("/api/projects"); // Add /api
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/api/projects/${id}`); // Add /api
    return data;
  },

  create: async (project: any) => {
    const { data } = await api.post("/api/projects", project); // Add /api
    return data;
  },

  update: async (id: number, project: any) => {
    const { data } = await api.put(`/api/projects/${id}`, project); // Add /api
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/projects/${id}`); // Add /api
  },
};

// Allocation API
export const allocationApi = {
  getAll: async () => {
    const { data } = await api.get("/allocations");
    return data;
  },

  create: async (allocation: any) => {
    const { data } = await api.post("/allocations", allocation);
    return data;
  },

  update: async (id: number, allocation: any) => {
    const { data } = await api.put(`/allocations/${id}`, allocation);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/allocations/${id}`);
  },
};

// Leave API
export const leaveApi = {
  getAll: async () => {
    const { data } = await api.get("/leaves");
    return data;
  },

  create: async (leave: any) => {
    const { data } = await api.post("/leaves", leave);
    return data;
  },

  update: async (id: number, leave: any) => {
    const { data } = await api.put(`/leaves/${id}`, leave);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/leaves/${id}`);
  },
};

// Skills API - Updated and expanded
export const skillApi = {
  // Get all skills
  getAll: async () => {
    const { data } = await api.get("/api/skills");
    return data;
  },

  // Create a new skill
  create: async (skill: { name: string }) => {
    const { data } = await api.post("/api/skills", skill);
    return data;
  },
  getEmployeesBySkill: async (skill: string) => {
    const { data } = await api.get(`/skills/${skill}/employees`);
    return data;
  },
};

// Deprecated: use skillApi instead
export const skillsApi = skillApi;

export default api;
