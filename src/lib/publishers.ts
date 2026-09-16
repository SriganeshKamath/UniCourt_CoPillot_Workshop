/**
 * Publisher data-access helpers for static page generation.
 *
 * These queries read the SQLite-backed publisher catalog used by Astro pages
 * that render build-time content without a separate backend API.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Fetches every publisher sorted alphabetically by name.
 *
 * @param db - Database connection used to read publisher records.
 * @returns A promise resolving to all publisher entries ordered by name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
