import { create } from "zustand";

export const usePayrollStore = create((set) => ({
  month: null, 
  generated: false,
  autoGenerate: false,
  adjustments: {},
  bonuses: {},
  additionalPayments: {},
  payTabEdits: {},

  // Pay Tab persistent UI state
  payTabSearch: "",
  payTabSortBy: "name-asc",
  payTabTypeFilter: "",
  payTabStatusFilter: "",
  payTabPage: 1,

  // Monthly Payroll UI state
  payrollSearch: "",
  payrollTypeFilter: "",
  payrollPage: 1,

  setMonth: (month) => set((state) => ({ 
    month: typeof month === 'function' ? month(state.month) : month, 
    generated: false, 
    adjustments: {}, 
    bonuses: {}, 
    additionalPayments: {} 
  })),
  setGenerated: (generated) => set((state) => ({ 
    generated: typeof generated === 'function' ? generated(state.generated) : generated 
  })),
  setAutoGenerate: (autoGenerate) => set((state) => ({ 
    autoGenerate: typeof autoGenerate === 'function' ? autoGenerate(state.autoGenerate) : autoGenerate 
  })),
  setAdjustments: (adjustments) => set((state) => ({ 
    adjustments: typeof adjustments === 'function' ? adjustments(state.adjustments) : adjustments 
  })),
  setBonuses: (bonuses) => set((state) => ({ 
    bonuses: typeof bonuses === 'function' ? bonuses(state.bonuses) : bonuses 
  })),
  setAdditionalPayments: (additionalPayments) => set((state) => ({ 
    additionalPayments: typeof additionalPayments === 'function' ? additionalPayments(state.additionalPayments) : additionalPayments 
  })),
  setPayTabEdits: (payTabEdits) => set((state) => ({ 
    payTabEdits: typeof payTabEdits === 'function' ? payTabEdits(state.payTabEdits) : payTabEdits 
  })),

  // Pay Tab UI setters
  setPayTabSearch: (v) => set({ payTabSearch: v, payTabPage: 1 }),
  setPayTabSortBy: (v) => set({ payTabSortBy: v, payTabPage: 1 }),
  setPayTabTypeFilter: (v) => set({ payTabTypeFilter: v, payTabPage: 1 }),
  setPayTabStatusFilter: (v) => set({ payTabStatusFilter: v, payTabPage: 1 }),
  setPayTabPage: (v) => set({ payTabPage: v }),

  // Monthly Payroll UI setters
  setPayrollSearch: (v) => set({ payrollSearch: v, payrollPage: 1 }),
  setPayrollTypeFilter: (v) => set({ payrollTypeFilter: v, payrollPage: 1 }),
  setPayrollPage: (v) => set({ payrollPage: v }),
  
  clearPayroll: () => set({ month: null, generated: false, autoGenerate: false, adjustments: {}, bonuses: {}, additionalPayments: {}, payTabEdits: {} })
}));
