export type RankingRow = {
  _id: string;
  uid: string;
  timestamp: number;
  rank: number;
};

export function getRankingInfo(
  submissions: {
    [k: string]: {
      success: boolean;
      timestamp: number;
      uid: string;
    };
  } | null
) {
  const finishers: RankingRow[] = [];
  const done = new Map<string, RankingRow>();
  const people = new Set<string>();
  let count = 0;
  if (submissions) {
    Object.keys(submissions)
      .sort((a, b) => submissions[a].timestamp - submissions[b].timestamp)
      .forEach(k => {
        count++;
        const submission = submissions[k];
        people.add(submission.uid);
        if (submission.success) {
          if (!done.has(submission.uid)) {
            const finisher = {
              _id: k,
              uid: submission.uid,
              timestamp: submission.timestamp,
              rank: finishers.length + 1
            };
            done.set(submission.uid, finisher);
            finishers.push(finisher);
          }
        }
      });
  }
  return {
    finishers,
    peopleCount: people.size,
    submissionCount: count
  };
}
