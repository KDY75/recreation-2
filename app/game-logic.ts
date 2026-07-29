import {
  PARTICLES,
  QUANTUM_STATES,
  type CollisionLog,
  type GameState,
  type ParticipantId,
  type Particle,
  type QuantumState,
  type TeamId,
  participantTeam,
} from "./game-data.ts";

export type PaperGuess = {
  participant: ParticipantId;
  particle: Particle;
  state: QuantumState;
};

export function calculateCollision(
  state: GameState,
  event: 1 | 2,
  participants: ParticipantId[],
): CollisionLog {
  const particleCounts: Partial<Record<Particle, number>> = {};
  const stateCounts: Partial<Record<QuantumState, number>> = {};

  participants.forEach((participant) => {
    const identity = state.identities[participant];
    particleCounts[identity.particle] = (particleCounts[identity.particle] ?? 0) + 1;
    stateCounts[identity.state] = (stateCounts[identity.state] ?? 0) + 1;
  });

  return {
    id: `collision-${state.round}-${event}`,
    round: state.round,
    event,
    participants,
    participatingTeams: Array.from(
      new Set(participants.map(participantTeam)),
    ) as TeamId[],
    particleCounts,
    stateCounts,
    createdAt: new Date().toISOString(),
  };
}

export function formatDistribution<T extends string>(
  values: readonly T[],
  counts: Partial<Record<T, number>>,
): string {
  return values
    .filter((value) => counts[value])
    .map((value) => `${value} ${counts[value]}`)
    .join(" · ");
}

export function collisionResultText(log: CollisionLog): string[] {
  const result: string[] = [];
  if (log.round <= 3) {
    result.push(`입자 · ${formatDistribution(PARTICLES, log.particleCounts)}`);
  }
  if (log.round !== 3) {
    result.push(`상태 · ${formatDistribution(QUANTUM_STATES, log.stateCounts)}`);
  }
  return result;
}

export function scorePaperBatch(
  state: GameState,
  team: TeamId,
  guesses: PaperGuess[],
): {
  batch: GameState["paperBatches"][number];
  firstPublishedRound: GameState["firstPublishedRound"];
  teamCorrectTargets: GameState["teamCorrectTargets"];
} {
  const firstPublishedRound = { ...state.firstPublishedRound };
  const teamCorrectTargets = {
    S: [...state.teamCorrectTargets.S],
    K: [...state.teamCorrectTargets.K],
    P: [...state.teamCorrectTargets.P],
  };

  const entries = guesses.map((guess) => {
    const answer = state.identities[guess.participant];
    const correct =
      answer.particle === guess.particle && answer.state === guess.state;

    if (!correct) {
      return {
        participant: guess.participant,
        guessedParticle: guess.particle,
        guessedState: guess.state,
        correct: false,
        points: -1,
        reason: "오답" as const,
      };
    }

    if (teamCorrectTargets[team].includes(guess.participant)) {
      return {
        participant: guess.participant,
        guessedParticle: guess.particle,
        guessedState: guess.state,
        correct: true,
        points: 1,
        reason: "재발표" as const,
      };
    }

    const publishedRound = firstPublishedRound[guess.participant];
    const isFirstPublication =
      publishedRound === undefined || publishedRound === state.round;
    if (publishedRound === undefined) {
      firstPublishedRound[guess.participant] = state.round;
    }
    teamCorrectTargets[team].push(guess.participant);

    return {
      participant: guess.participant,
      guessedParticle: guess.particle,
      guessedState: guess.state,
      correct: true,
      points: isFirstPublication ? 3 : 2,
      reason: isFirstPublication ? ("최초 발표" as const) : ("정답" as const),
    };
  });

  const total = entries.reduce((sum, entry) => sum + entry.points, 0);
  return {
    batch: {
      id: `paper-${state.round}-${team}`,
      round: state.round,
      team,
      entries,
      total,
      createdAt: new Date().toISOString(),
    },
    firstPublishedRound,
    teamCorrectTargets,
  };
}
