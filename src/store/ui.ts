"use client";

import { create } from "zustand";
import type { CalendarEvent } from "./calendar";

export type ToastKind = "success" | "warning" | "error";
export interface AiToast { kind: ToastKind; text: string }

interface UIStore {
  aiInput: string;
  aiLoading: boolean;
  aiResult: AiToast | null;
  sheetOpen: boolean;
  deleteConfirm: number | null;
  editEvent: CalendarEvent | null;
  detailEvent: CalendarEvent | null;
  error: string | null;
  setAiInput: (v: string) => void;
  setAiLoading: (v: boolean) => void;
  setAiResult: (v: AiToast | null) => void;
  openSheet: () => void;
  closeSheet: () => void;
  setDeleteConfirm: (id: number | null) => void;
  openEdit: (event: CalendarEvent) => void;
  closeEdit: () => void;
  openDetail: (event: CalendarEvent) => void;
  closeDetail: () => void;
  setError: (msg: string | null) => void;
}

export const useUI = create<UIStore>((set) => ({
  aiInput: "",
  aiLoading: false,
  aiResult: null,
  sheetOpen: false,
  deleteConfirm: null,
  editEvent: null,
  detailEvent: null,
  error: null,
  setAiInput: (v) => set({ aiInput: v }),
  setAiLoading: (v) => set({ aiLoading: v }),
  setAiResult: (v) => set({ aiResult: v }),
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
  setDeleteConfirm: (id) => set({ deleteConfirm: id }),
  openEdit: (event) => set({ editEvent: event }),
  closeEdit: () => set({ editEvent: null }),
  openDetail: (event) => set({ detailEvent: event }),
  closeDetail: () => set({ detailEvent: null }),
  setError: (msg) => set({ error: msg }),
}));
