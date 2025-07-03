import { Action, ActionType } from "../types";

/***
 * Walks through the history in reverse order and removes all undo and undone actions
 */
const resolveUndos = (history: Action[]): Action[] => {
  const reversed = [...history].reverse();
  const pruned: Action[] = [];
  let counter = 0;

  for (const action of reversed) {
    if (action.type === ActionType.Undo) {
      counter += 1;
      continue;
    }

    if (counter > 0) {
      counter -= 1;
      continue;
    }

    pruned.unshift(action);
  }
  return pruned;
};

export default resolveUndos;
