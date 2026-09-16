/**
 * Category data-access helpers for static page generation.
 *
 * These queries read the SQLite-backed category catalog used by Astro pages to
 * render build-time content without a separate backend API.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Fetches every category sorted alphabetically by name.
 *
 * @param db - Database connection used to read category records.
 * @returns A promise resolving to all category entries ordered by name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
