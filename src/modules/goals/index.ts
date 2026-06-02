/** goals モジュールの公開 API（queries は server-only のため除外）。 */
export * from "./schema";
export { createGoal, updateGoal, contributeGoal, deleteGoal } from "./actions";
export { GoalsClient, type GoalItem } from "./components/goals-client";
