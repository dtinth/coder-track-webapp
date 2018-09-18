export interface IProblem {
  submissionAllowed: boolean;
  description: string;
  title: string;
}

export interface IContestant {
  joinedAt: number;
  name: string;
  track: string;
}
