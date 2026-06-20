import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type { CampSetup, Expense, Income, Scout, ExpenseCategoryCode } from "../types";
import { EMPTY_CAMP_SETUP, CATEGORIES_LIST } from "../initialData";

const CAMP_DOC = "campSetup/current-camp";
const CATEGORIES_DOC = "categories/main";
const SCOUTS_COLLECTION = "scouts";
const INCOMES_COLLECTION = "incomes";
const EXPENSES_COLLECTION = "expenses";

function deserializeDates(data: any): any {
  if (data == null || typeof data !== "object") return data;
  if (data instanceof Timestamp) return data.toDate().toISOString();
  if (Array.isArray(data)) return data.map(deserializeDates);
  const result: any = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === "object" && "toDate" in val) {
      result[key] = (val as Timestamp).toDate().toISOString();
    } else {
      result[key] = deserializeDates(val);
    }
  }
  return result;
}

export function useCampSetup() {
  const [setup, setSetup] = useState<CampSetup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "campSetup", "current-camp"),
      (snap) => {
        if (snap.exists()) {
          setSetup(deserializeDates(snap.data()) as CampSetup);
        } else {
          setDoc(doc(db, "campSetup", "current-camp"), EMPTY_CAMP_SETUP);
          setSetup(EMPTY_CAMP_SETUP);
        }
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const saveCampSetup = useCallback(async (data: CampSetup) => {
    await setDoc(doc(db, "campSetup", "current-camp"), data, { merge: true });
  }, []);

  return { setup, loading, saveCampSetup };
}

export function useCategories() {
  const [categories, setCategories] = useState(CATEGORIES_LIST);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "categories", "main"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.list) setCategories(data.list);
        } else {
          setDoc(doc(db, "categories", "main"), { list: CATEGORIES_LIST });
        }
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const saveCategories = useCallback(async (list: typeof CATEGORIES_LIST) => {
    await setDoc(doc(db, "categories", "main"), { list });
  }, []);

  return { categories, loading, saveCategories };
}

export function useScoutsCollection() {
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, SCOUTS_COLLECTION), orderBy("dateAdded", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Scout[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...deserializeDates(d.data()) } as Scout));
      setScouts(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const upsertScout = useCallback(async (id: string, data: Scout) => {
    await setDoc(doc(db, SCOUTS_COLLECTION, id), data);
  }, []);

  const updateScout = useCallback(async (id: string, data: Partial<Scout>) => {
    await updateDoc(doc(db, SCOUTS_COLLECTION, id), data);
  }, []);

  return { scouts, loading, upsertScout, updateScout };
}

export function useIncomesCollection() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, INCOMES_COLLECTION), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Income[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...deserializeDates(d.data()) } as Income));
      setIncomes(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const upsertIncome = useCallback(async (id: string, data: Income) => {
    await setDoc(doc(db, INCOMES_COLLECTION, id), data);
  }, []);

  const updateIncome = useCallback(async (id: string, data: Partial<Income>) => {
    await updateDoc(doc(db, INCOMES_COLLECTION, id), data);
  }, []);

  return { incomes, loading, upsertIncome, updateIncome };
}

export function useExpensesCollection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, EXPENSES_COLLECTION), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Expense[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...deserializeDates(d.data()) } as Expense));
      setExpenses(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const upsertExpense = useCallback(async (id: string, data: Expense) => {
    await setDoc(doc(db, EXPENSES_COLLECTION, id), data);
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    await updateDoc(doc(db, EXPENSES_COLLECTION, id), data);
  }, []);

  return { expenses, loading, upsertExpense, updateExpense };
}

export function useTroopImages() {
  const [stamp, setStamp] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "troop", "images"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStamp(data.stamp || null);
        setSignature(data.signature || null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveStamp = useCallback(async (base64: string | null) => {
    if (base64 && BASE64_REGEX.test(base64)) {
      try {
        const url = await uploadImage(base64, `troop/stamp-${Date.now()}`);
        await setDoc(doc(db, "troop", "images"), { stamp: url, signature }, { merge: true });
        setStamp(url);
        return;
      } catch (e) {
        console.warn("Stamp upload failed, storing base64:", e);
      }
    }
    await setDoc(doc(db, "troop", "images"), { stamp: base64, signature }, { merge: true });
    setStamp(base64);
  }, [signature]);

  const saveSignature = useCallback(async (base64: string | null) => {
    if (base64 && BASE64_REGEX.test(base64)) {
      try {
        const url = await uploadImage(base64, `troop/signature-${Date.now()}`);
        await setDoc(doc(db, "troop", "images"), { stamp, signature: url }, { merge: true });
        setSignature(url);
        return;
      } catch (e) {
        console.warn("Signature upload failed, storing base64:", e);
      }
    }
    await setDoc(doc(db, "troop", "images"), { stamp, signature: base64 }, { merge: true });
    setSignature(base64);
  }, [stamp]);

  return { stamp, signature, loading, saveStamp, saveSignature };
}

export async function uploadImage(base64: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64, "data_url");
  return getDownloadURL(storageRef);
}

export async function removeImage(path: string) {
  try { await deleteObject(ref(storage, path)); } catch {}
}

const BASE64_REGEX = /^data:image\/\w+;base64,/;

export async function uploadBase64Fields<T extends Record<string, any>>(
  obj: T,
  pathPrefix: string,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && BASE64_REGEX.test(value)) {
      const ts = Date.now();
      const storagePath = `${pathPrefix}/${String(field)}-${ts}`;
      try {
        const url = await uploadImage(value, storagePath);
        (result as any)[field] = url;
      } catch (e) {
        console.warn(`Failed to upload ${String(field)} to Storage, keeping base64:`, e);
      }
    }
  }
  return result;
}
