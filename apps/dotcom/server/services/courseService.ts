import pool from '../utils/db';

/**
 * Course Service
 * Single responsibility: Database queries for course data
 */

// Types for curriculum data
interface CaseStudy {
  id: string;
  title: string;
  url: string;
  source: string | null;
}

interface LearningOutcome {
  id: string;
  description: string;
}

interface Concept {
  id: string;
  orderIndex: number;
  name: string;
  description: string;
  conceptUrl: string | null;
  caseStudies: CaseStudy[];
  learningOutcomes: LearningOutcome[];
}

interface Module {
  id: string;
  name: string;
  description: string | null;
  concepts: Concept[];
}

interface CourseWithCurriculum {
  id: string;
  name: string;
  description: string | null;
  idealFor: string | null;
  duration: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  modules: Module[];
}

/**
 * Fetches basic course details by ID
 */
export const getCourseById = async (courseId: string) => {
  const query = `
    SELECT * FROM "course"
    WHERE id = $1 AND "isDeleted" = false
  `;
  
  const result = await pool.query(query, [courseId]);
  return result.rows[0] || null;
};

/**
 * Fetches complete course curriculum including modules, concepts, case studies, and learning outcomes
 * Uses a single optimized query with JSON aggregation
 */
export const getCourseWithCurriculum = async (courseId: string): Promise<CourseWithCurriculum | null> => {
  // First, get basic course info
  const courseQuery = `
    SELECT * FROM "course"
    WHERE id = $1 AND "isDeleted" = false
  `;
  
  const courseResult = await pool.query(courseQuery, [courseId]);
  
  if (courseResult.rows.length === 0) {
    return null;
  }
  
  const course = courseResult.rows[0];
  
  // Fetch modules for this course
  const modules = await getModulesWithContent(courseId);
  
  return {
    ...course,
    modules,
  };
};

/**
 * Fetches all modules for a course with their concepts, case studies, and learning outcomes
 */
async function getModulesWithContent(courseId: string): Promise<Module[]> {
  const modulesQuery = `
    SELECT id, name, description
    FROM "module"
    WHERE "courseId" = $1 AND "isDeleted" = false
    ORDER BY id
  `;
  
  const modulesResult = await pool.query(modulesQuery, [courseId]);
  const modules: Module[] = [];
  
  for (const mod of modulesResult.rows) {
    const concepts = await getConceptsWithContent(mod.id);
    modules.push({
      id: mod.id,
      name: mod.name,
      description: mod.description,
      concepts,
    });
  }
  
  return modules;
}

/**
 * Fetches all concepts for a module with their case studies and learning outcomes
 */
async function getConceptsWithContent(moduleId: string): Promise<Concept[]> {
  const conceptsQuery = `
    SELECT id, "orderIndex", name, description, "conceptUrl"
    FROM "concept"
    WHERE "moduleId" = $1
    ORDER BY "orderIndex"
  `;
  
  const conceptsResult = await pool.query(conceptsQuery, [moduleId]);
  const concepts: Concept[] = [];
  
  for (const concept of conceptsResult.rows) {
    const [caseStudies, learningOutcomes] = await Promise.all([
      getCaseStudiesForConcept(concept.id),
      getLearningOutcomesForConcept(concept.id),
    ]);
    
    concepts.push({
      id: concept.id,
      orderIndex: concept.orderIndex,
      name: concept.name,
      description: concept.description,
      conceptUrl: concept.conceptUrl,
      caseStudies,
      learningOutcomes,
    });
  }
  
  return concepts;
}

/**
 * Fetches all case studies for a concept
 */
async function getCaseStudiesForConcept(conceptId: string): Promise<CaseStudy[]> {
  const query = `
    SELECT id, title, url, source
    FROM "case_study"
    WHERE "conceptId" = $1
    ORDER BY "orderIndex"
  `;
  
  const result = await pool.query(query, [conceptId]);
  return result.rows;
}

/**
 * Fetches all learning outcomes for a concept
 */
async function getLearningOutcomesForConcept(conceptId: string): Promise<LearningOutcome[]> {
  const query = `
    SELECT id, description
    FROM "learning_outcome"
    WHERE "conceptId" = $1
    ORDER BY "orderIndex"
  `;
  
  const result = await pool.query(query, [conceptId]);
  return result.rows;
}
