export async function getAllResumes() {
  try {
    const database = await getDB();
    const all = await database.getAll('resumes');
    return all;
  } catch (error) {
    console.error('Error getting all resumes:', error);
    return [];
  }
}

export async function deleteResume(id: string) {
  return deleteResumeFromDB(id);
}

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
      fit?: {
        score: number;
        summary?: string;
        strengths?: string[];
        gaps?: string[];
        seniority?: 'under' | 'exact' | 'over';
      };
      coaching?: {
        suggestions: string[];
        guidance?: string;
      };
      interviewPrep?: {
        generatedAt: string;
        summary?: string;
        focusAreas?: string[];
        practiceQuestions?: string[];
        actionItems?: string[];
      };
      interviewSimulation?: {
        generatedAt: string;
        scenario?: string;
        interviewerPersona?: string;
        openingHook?: string;
        keyStories?: string[];
        persuasionAngles?: string[];
        objectionResponses?: string[];
        behaviorTips?: string[];
        closingStatement?: string;
        followUpActions?: string[];
        sampleDialogue?: {
          prompt: string;
          response: string;
        }[];
      };
      meta?: {
        applicationStatus?: 'applied' | 'not_applied' | 'unsuccessful' | 'successful';
        company?: string;
        location?: string;
        jdUrl?: string;
      };
    };
  };
}

let db: Promise<import('idb').IDBPDatabase<JITDatabase>> | null = null;

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
  try {
    const database = await getDB();
    await database.put('personalDetails', {
      id: 'single',
      markdown,
    }, 'single');
  } catch (error) {
    console.error('Error saving personal details:', error);
    throw new Error('Failed to save personal details');
  }
}

export async function getPersonalDetails(): Promise<string | null> {
  try {
    const database = await getDB();
    const result = await database.get('personalDetails', 'single');
    // Use nullish coalescing so empty string is preserved (user may intentionally save empty)
    return result?.markdown ?? null;
  } catch (error) {
    console.error('Error getting personal details:', error);
    return null;
  }
}

export async function saveResume(id: string, data: {
  markdown: string;
  jdRaw: string;
  derived: { skills: string[]; keywords: string[] };
  fit?: {
    score: number;
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    seniority?: 'under' | 'exact' | 'over';
  };
  coaching?: {
    suggestions: string[];
    guidance?: string;
  };
  interviewPrep?: {
    generatedAt: string;
    summary?: string;
    focusAreas?: string[];
    practiceQuestions?: string[];
    actionItems?: string[];
  };
  interviewSimulation?: {
    generatedAt: string;
    scenario?: string;
    interviewerPersona?: string;
    openingHook?: string;
    keyStories?: string[];
    persuasionAngles?: string[];
    objectionResponses?: string[];
    behaviorTips?: string[];
    closingStatement?: string;
    followUpActions?: string[];
    sampleDialogue?: {
      prompt: string;
      response: string;
    }[];
  };
  meta?: {
    applicationStatus?: 'applied' | 'not_applied' | 'unsuccessful' | 'successful';
    company?: string;
    location?: string;
    jdUrl?: string;
  };
}) {
  try {
    const database = await getDB();
    await database.put('resumes', {
      id,
      ...data,
    }, id);
  } catch (error) {
    console.error('Error saving resume:', error);
    throw new Error('Failed to save resume');
  }
}

export async function getResume(id: string) {
  try {
    const database = await getDB();
    const result = await database.get('resumes', id);
    return result || null;
  } catch (error) {
    console.error('Error getting resume:', error);
    return null;
  }
}

export async function deleteResumeFromDB(id: string) {
  try {
    const database = await getDB();
    await database.delete('resumes', id);
  } catch (error) {
    console.error('Error deleting resume:', error);
    throw new Error('Failed to delete resume');
  }
}

export async function clearAllData() {
  try {
    const database = await getDB();
    await database.clear('personalDetails');
    await database.clear('resumes');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw new Error('Failed to clear data');
  }
}
