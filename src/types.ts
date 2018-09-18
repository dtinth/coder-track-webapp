export interface IProblem {
  number: number;
  description: string;
  title: string;
}

export interface IContestant {
  joinedAt: number;
  name: string;
  track: string;
}

export interface IContestInfo {
  currentProblem?: string;
  problems?: {
    [problemId: string]: IProblemState | null;
  };
}

export interface IProblemState {
  activated?: number;
  submissionAllowed?: number;
  finished?: number;
}
