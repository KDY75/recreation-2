export const TEAM_IDS = ["S", "K", "P"] as const;
export const PARTICLES = ["양성자", "전자", "광자", "중성미자"] as const;
export const QUANTUM_STATES = ["A", "B", "C", "D"] as const;

export type TeamId = (typeof TEAM_IDS)[number];
export type Particle = (typeof PARTICLES)[number];
export type QuantumState = (typeof QUANTUM_STATES)[number];
export type ParticipantId = `${TeamId}-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type Identity = {
  particle: Particle;
  state: QuantumState;
};

export type IdentityMap = Record<ParticipantId, Identity>;

export type DataCard = {
  id: number;
  team: TeamId;
  kind: "start" | "observation" | "correction";
  round: number | null;
  title: string;
  body: string;
  usedInTrade: boolean;
  createdAt: string;
};

export type CollisionLog = {
  id: string;
  round: number;
  event: 1 | 2;
  participants: ParticipantId[];
  participatingTeams: TeamId[];
  particleCounts: Partial<Record<Particle, number>>;
  stateCounts: Partial<Record<QuantumState, number>>;
  createdAt: string;
};

export type ObservationRun = {
  round: number;
  team: TeamId;
  cardIds: number[];
};

export type TradeLog = {
  id: string;
  round: number;
  teams: [TeamId, TeamId];
  cardIds: [number, number];
  createdAt: string;
};

export type PaperEntryResult = {
  participant: ParticipantId;
  guessedParticle: Particle;
  guessedState: QuantumState;
  correct: boolean;
  points: number;
  reason: "최초 발표" | "정답" | "재발표" | "오답";
};

export type PaperBatch = {
  id: string;
  round: number;
  team: TeamId;
  entries: PaperEntryResult[];
  total: number;
  createdAt: string;
};

export type FinalSubmission = {
  team: TeamId;
  correctIds: ParticipantId[];
  rawCorrect: number;
  awardedPoints: number;
  createdAt: string;
};

export type GameState = {
  version: 1;
  started: boolean;
  round: number;
  scores: Record<TeamId, number>;
  identities: IdentityMap;
  startSelections: Record<TeamId, ParticipantId>;
  nextCardId: number;
  cards: DataCard[];
  collisions: CollisionLog[];
  observations: ObservationRun[];
  correctionProgress: Record<TeamId, number>;
  trades: TradeLog[];
  firstPublishedRound: Partial<Record<ParticipantId, number>>;
  teamCorrectTargets: Record<TeamId, ParticipantId[]>;
  paperBatches: PaperBatch[];
  finalSubmissions: FinalSubmission[];
};

export const TEAM_NAMES: Record<TeamId, string> = {
  S: "S 나라",
  K: "K 나라",
  P: "P 나라",
};

export const TEAM_SHORT_NAMES: Record<TeamId, string> = {
  S: "S팀",
  K: "K팀",
  P: "P팀",
};

export const TEAM_RESEARCHERS: Record<TeamId, string> = {
  S: "S 연구진",
  K: "K 연구진",
  P: "P 연구진",
};

export const PARTICIPANT_IDS = TEAM_IDS.flatMap((team) =>
  Array.from({ length: 8 }, (_, index) => `${team}-${index + 1}` as ParticipantId),
);

export const CORRECTION_LAWS = [
  "각 팀의 1~4번과 5~8번은 각각 양성자, 전자, 광자, 중성미자를 하나씩 포함한다.",
  "같은 팀에서 동일한 입자종 두 개는 서로 다른 상태를 가진다.",
  "같은 번호의 세 팀 연구원은 서로 다른 입자종을 가진다.",
  "같은 팀에서 번호의 합이 9인 두 연구원은 같은 상태를 가진다.",
] as const;

export function participantTeam(participant: ParticipantId): TeamId {
  return participant.slice(0, 1) as TeamId;
}

export function participantsForTeam(team: TeamId): ParticipantId[] {
  return PARTICIPANT_IDS.filter((id) => participantTeam(id) === team);
}

export function createInitialState(identities: IdentityMap): GameState {
  return {
    version: 1,
    started: false,
    round: 1,
    scores: { S: 0, K: 0, P: 0 },
    identities,
    startSelections: {
      S: "S-3",
      K: "K-3",
      P: "P-3",
    },
    nextCardId: 1,
    cards: [],
    collisions: [],
    observations: [],
    correctionProgress: { S: 0, K: 0, P: 0 },
    trades: [],
    firstPublishedRound: {},
    teamCorrectTargets: { S: [], K: [], P: [] },
    paperBatches: [],
    finalSubmissions: [],
  };
}
