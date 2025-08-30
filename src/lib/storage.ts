import { openDB, DBSchema } from 'idb';

interface JITDatabase extends DBSchema {
  personalDetails: {
    key: 'single';
    value: {
      id: 'single';
      markdown: string;
    };
  };
  resumes: {
    key: string;
    value: {
      id: string;
      markdown: string;
      jdRaw: string;
      derived: {
        skills: string[];
        keywords: string[];
      };
    };
  };
}

let db: ReturnType<typeof openDB<JITDatabase>> | null = null;

async function getDB() {
  if (!db) {
    db = openDB<JITDatabase>('jit-resume-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('personalDetails')) {
          db.createObjectStore('personalDetails');
        }
        if (!db.objectStoreNames.contains('resumes')) {
          db.createObjectStore('resumes');
        }
      },
    });
  }
  return db;
}

export async function savePersonalDetails(markdown: string) {
  const database = await getDB();
  await database.put('personalDetails', {
    id: 'single',
    markdown,
  });
}

export async function getPersonalDetails(): Promise<string | null> {
  try {
    const database = await getDB();
    const result = await database.get('personalDetails', 'single');
    return result?.markdown || null;
  } catch {
    return null;
  }
}

export async function saveResume(id: string, data: {
  markdown: string;
  jdRaw: string;
  derived: { skills: string[]; keywords: string[] };
}) {
  const database = await getDB();
  await database.put('resumes', {
    id,
    ...data,
  });
}

export async function getResume(id: string) {
  try {
    const database = await getDB();
    const result = await database.get('resumes', id);
    return result || null;
  } catch {
    return null;
  }
}

export async function deleteResumeFromDB(id: string) {
  const database = await getDB();
  await database.delete('resumes', id);
}

export async function clearAllData() {
  const database = await getDB();
  await database.clear('personalDetails');
  await database.clear('resumes');
}