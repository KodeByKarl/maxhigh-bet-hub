/**
 * Educational Beach Bonanza game-logic surface (Beach Bonanza–style mechanics).
 * Rendering stays in React components; this module is pure math.
 */
export { generateBoard, buildBoard, cloneBoard, makeCell, pickSym } from "./gridState";
export {
  floodFill,
  findClusters,
  calculateWin,
  boardHasAdjacentCluster,
} from "./clusterEngine";
export {
  evaluateBoard,
  removeWinningSymbols,
  applyGravity,
  spawnSymbols,
} from "./tumbleEngine";
export {
  createEmptyMults,
  updateMultipliers,
  sumMultipliers,
  resetBoardMultipliers,
  applyPositionMultToWin,
  nextMultiplierTier,
  getMultiplierTiers,
  shadeForMultiplier,
} from "./multiplierEngine";
export {
  checkScatters,
  triggerFreeSpins,
  resolveScatters,
  freeSpinsForScatterCount,
} from "./scatterEngine";
export {
  playCascade,
  resolveSpin,
  endSpin,
  finalizeFreeSpinTotal,
} from "./spinResolver";
export type { SpinScript, BoardCell, SymKind, TumbleStep, ClusterWin } from "./types";
export { COLS, ROWS, CELLS, MIN_CLUSTER, ORTHO_DIRS } from "./types";
