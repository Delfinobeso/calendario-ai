"use client";

import { create } from "zustand";
import type { CalendarEvent } from "./calendar";

interface UIStore {
  aiInput: string;
  aiLoading: boolean;
  aiResult: string | null;
  sheetOpen: boolean;
  deleteConfirm: number | null;
  editEvent: CalendarEvent | null;
  setAiInput: (v: string) => void;
  setAiLoading: (v: boolean) => void;
  setAiResult: (v: string | null) => void;
  openSheet: () => void;
  closeSheet: () => void;
  setDeleteConfirm: (id: number | null) => void;
  openEdit: (event: CalendarEvent) => void;
  closeEdit: () => void;
}

export const useUI = create<UIStore>((set) => ({
  aiInput: "",
  aiLoading: false,
  aiResult: null,
  sheetOpen: false,
  deleteConfirm: null,
  editEvent: null,
  setAiInput: (v) => set({ aiInput: v }),
  setAiLoading: (v) => set({ aiLoading: v }),
  setAiResult: (v) => set({ aiResult: v }),
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
  setDeleteConfirm: (id) => set({ deleteConfirm: id }),
  openEdit: (event) => set({ editEvent: event }),
  closeEdit: () => set({ editEvent: null }),
}));
