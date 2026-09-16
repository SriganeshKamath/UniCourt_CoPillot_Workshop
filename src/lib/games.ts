/**
 * Game data-access helpers for the static storefront.
 *
 * These query helpers read the SQLite-backed catalog used by Astro pages during
 * build and preview rendering, with optional filter parameters for narrowing the
 * catalog by category or publisher.
 */
import { eq, asc, and } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export interface GameFilters {
    publisherId?: number | null;
    categoryId?: number | null;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database, filters: GameFilters = {}) {
    const query = db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));

    if (filters.publisherId !== undefined && filters.publisherId !== null) {
        if (filters.categoryId !== undefined && filters.categoryId !== null) {
            return query.where(
                and(eq(games.publisherId, filters.publisherId), eq(games.categoryId, filters.categoryId)),
            );
        }

        return query.where(eq(games.publisherId, filters.publisherId));
    }

    if (filters.categoryId !== undefined && filters.categoryId !== null) {
        return query.where(eq(games.categoryId, filters.categoryId));
    }

    return query;
}

/**
 * Fetches all games, optionally filtered by publisher and/or category.
 *
 * @param db - Database connection used to read game records.
 * @param filters - Optional filter values applied before sorting by title.
 * @returns A promise resolving to game listings ordered alphabetically by title.
 */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const rows = await baseGamesQuery(db, filters).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Fetches all game ids, optionally filtered by publisher and/or category.
 *
 * @param db - Database connection used to read game records.
 * @param filters - Optional filter values applied before sorting by title.
 * @returns A promise resolving to game ids in title order.
 */
export async function getAllGameIds(db: Database, filters: GameFilters = {}): Promise<number[]> {
    const query = db.select({ id: games.id }).from(games);
    let rows: Array<{ id: number }>;

    if (filters.publisherId !== undefined && filters.publisherId !== null) {
        if (filters.categoryId !== undefined && filters.categoryId !== null) {
            rows = await query
                .where(and(eq(games.publisherId, filters.publisherId), eq(games.categoryId, filters.categoryId)))
                .orderBy(asc(games.title));
        } else {
            rows = await query.where(eq(games.publisherId, filters.publisherId)).orderBy(asc(games.title));
        }
    } else if (filters.categoryId !== undefined && filters.categoryId !== null) {
        rows = await query.where(eq(games.categoryId, filters.categoryId)).orderBy(asc(games.title));
    } else {
        rows = await query.orderBy(asc(games.title));
    }

    return rows.map((row) => row.id);
}

/**
 * Fetches a single game by id, or null when it does not exist.
 *
 * @param db - Database connection used to read game records.
 * @param id - Game identifier to look up.
 * @returns A promise resolving to the matching game, or null if absent.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
