import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilteredGames(db: Database): Promise<{
    strategyCategoryId: number;
    racingCategoryId: number;
    pubOneId: number;
    pubTwoId: number;
}> {
    const [strategyCategory] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategic play' })
        .returning({ id: categories.id });
    const [racingCategory] = await db
        .insert(categories)
        .values({ name: 'Racing', description: 'speed play' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub one' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub two' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        { title: 'Apex Rally', description: 'racing', starRating: 4.7, categoryId: racingCategory.id, publisherId: pubOne.id },
        { title: 'Cobalt Circuit', description: 'racing', starRating: 4.6, categoryId: racingCategory.id, publisherId: pubTwo.id },
        { title: 'Castle Siege', description: 'strategy', starRating: 4.8, categoryId: strategyCategory.id, publisherId: pubOne.id },
        { title: 'Deep Frontier', description: 'strategy', starRating: 4.3, categoryId: strategyCategory.id, publisherId: pubTwo.id },
    ]);

    return {
        strategyCategoryId: strategyCategory.id,
        racingCategoryId: racingCategory.id,
        pubOneId: pubOne.id,
        pubTwoId: pubTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by publisher', async () => {
        const ids = await seedFilteredGames(db);
        const filtered = await getAllGames(db, { publisherId: ids.pubOneId });

        expect(filtered.map((game) => game.title)).toEqual(['Apex Rally', 'Castle Siege']);
        expect(filtered.every((game) => game.publisher?.id === ids.pubOneId)).toBe(true);
    });

    it('filters games by category', async () => {
        const ids = await seedFilteredGames(db);
        const filtered = await getAllGames(db, { categoryId: ids.strategyCategoryId });

        expect(filtered.map((game) => game.title)).toEqual(['Castle Siege', 'Deep Frontier']);
        expect(filtered.every((game) => game.category?.id === ids.strategyCategoryId)).toBe(true);
    });

    it('filters games by both publisher and category', async () => {
        const ids = await seedFilteredGames(db);
        const filtered = await getAllGames(db, {
            publisherId: ids.pubOneId,
            categoryId: ids.racingCategoryId,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Apex Rally']);
    });

    it('returns an empty list when filters do not match any game', async () => {
        const ids = await seedFilteredGames(db);
        const filtered = await getAllGames(db, {
            publisherId: ids.pubOneId,
            categoryId: ids.racingCategoryId + 999,
        });

        expect(filtered).toEqual([]);
    });
});
