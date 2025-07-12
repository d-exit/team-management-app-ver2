// utils/ratingCalculator.ts
import { Team } from '../types';

const K_FACTOR = 32;

/**
 * Calculates the expected score of Player A against Player B.
 * @param ratingA Rating of player A.
 * @param ratingB Rating of player B.
 * @returns The expected score (probability of winning) for player A.
 */
const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculates the new ratings for two teams based on a match result.
 * @param ratingA The current rating of team A.
 * @param ratingB The current rating of team B.
 * @param resultForA The result for team A: 1 for a win, 0.5 for a draw, 0 for a loss.
 * @returns An object with the new ratings for both teams.
 */
export const calculateNewRatings = (
    ratingA: number,
    ratingB: number,
    resultForA: 1 | 0.5 | 0
): { newRatingA: number; newRatingB: number } => {
    const expectedScoreA = calculateExpectedScore(ratingA, ratingB);
    const expectedScoreB = 1 - expectedScoreA;
    const resultForB = 1 - resultForA;

    const newRatingA = Math.round(ratingA + K_FACTOR * (resultForA - expectedScoreA));
    const newRatingB = Math.round(ratingB + K_FACTOR * (resultForB - expectedScoreB));

    return { newRatingA, newRatingB };
};
