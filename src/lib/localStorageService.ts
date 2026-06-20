import { useState, useEffect, useCallback } from "react";
import { CampSetup, Scout, Income, Expense, ExpenseCategoryCode } from "../types";
import { EMPTY_CAMP_SETUP, CATEGORIES_LIST } from "../initialData";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useLocalCampSetup() {
  const [setup, setSetup] = useState<CampSetup>(() => load("scout_camp_setup", EMPTY_CAMP_SETUP));

  const saveCampSetup = useCallback((s: CampSetup) => {
    setSetup(s);
    save("scout_camp_setup", s);
  }, []);

  return { setup, saveCampSetup };
}

export function useLocalScoutsCollection() {
  const [scouts, setScouts] = useState<Scout[]>(() => load("scout_scouts", []));

  useEffect(() => { save("scout_scouts", scouts); }, [scouts]);

  const upsertScout = useCallback((id: string, s: Scout) => {
    setScouts(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = s;
        return copy;
      }
      return [...prev, s];
    });
  }, []);

  const updateScout = useCallback((id: string, partial: Partial<Scout>) => {
    setScouts(prev => prev.map(s => s.id === id ? { ...s, ...partial } : s));
  }, []);

  return { scouts, upsertScout, updateScout };
}

export function useLocalIncomesCollection() {
  const [incomes, setIncomes] = useState<Income[]>(() => load("scout_incomes", []));

  useEffect(() => { save("scout_incomes", incomes); }, [incomes]);

  const upsertIncome = useCallback((id: string, inc: Income) => {
    setIncomes(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = inc;
        return copy;
      }
      return [...prev, inc];
    });
  }, []);

  const updateIncome = useCallback((id: string, partial: Partial<Income>) => {
    setIncomes(prev => prev.map(inc => inc.id === id ? { ...inc, ...partial } : inc));
  }, []);

  return { incomes, upsertIncome, updateIncome };
}

export function useLocalExpensesCollection() {
  const [expenses, setExpenses] = useState<Expense[]>(() => load("scout_expenses", []));

  useEffect(() => { save("scout_expenses", expenses); }, [expenses]);

  const upsertExpense = useCallback((id: string, exp: Expense) => {
    setExpenses(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exp;
        return copy;
      }
      return [...prev, exp];
    });
  }, []);

  const updateExpense = useCallback((id: string, partial: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...partial } : e));
  }, []);

  return { expenses, upsertExpense, updateExpense };
}

export function useLocalCategories() {
  const [categories, setCategories] = useState<{ code: ExpenseCategoryCode; labelAr: string; labelFr: string; emoji: string; planned: number }[]>(
    () => load("scout_categories", CATEGORIES_LIST.map(c => ({ ...c, planned: 0 })))
  );

  const saveCategories = useCallback((cats: typeof CATEGORIES_LIST) => {
    setCategories(cats.map(c => ({ ...c, planned: "planned" in c ? (c as any).planned : 0 })) as any);
  }, []);

  return { categories, saveCategories };
}

export function useLocalTroopImages() {
  const [stamp, setStamp] = useState<string | null>(() => load("scout_stamp", null));
  const [signature, setSignature] = useState<string | null>(() => load("scout_signature", null));

  useEffect(() => { save("scout_stamp", stamp); }, [stamp]);
  useEffect(() => { save("scout_signature", signature); }, [signature]);

  const saveStamp = useCallback((s: string | null) => setStamp(s), []);
  const saveSignature = useCallback((s: string | null) => setSignature(s), []);

  return { stamp, signature, saveStamp, saveSignature };
}
