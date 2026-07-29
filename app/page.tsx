"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CORRECTION_LAWS,
  PARTICIPANT_IDS,
  PARTICLES,
  QUANTUM_STATES,
  TEAM_IDS,
  TEAM_NAMES,
  TEAM_SHORT_NAMES,
  createInitialState,
  participantTeam,
  participantsForTeam,
  type DataCard,
  type GameState,
  type IdentityMap,
  type ParticipantId,
  type Particle,
  type QuantumState,
  type TeamId,
} from "./game-data";
import {
  calculateCollision,
  collisionResultText,
  scorePaperBatch,
  type PaperGuess,
} from "./game-logic";
import { decryptIdentities } from "./game-secrets";

type SectionId =
  | "setup"
  | "collision"
  | "observation"
  | "correction"
  | "negotiation"
  | "papers"
  | "final"
  | "cards";

type SaveStatus = "loading" | "saving" | "saved" | "error";
type UnlockStatus = "locked" | "unlocking" | "unlocked";
const GAME_STORAGE_KEY = "hidden-particle-game-device-v1";
const LEGACY_ROOM_ONE_STORAGE_KEY = "hidden-particle-game-room-v1-1";
const AUTH_SESSION_KEY = "hidden-particle-operator-session-v1";

type ObservationDraft = {
  type: "comparison" | "hypothesis";
  ownParticipant: ParticipantId;
  otherParticipant: ParticipantId;
  axis: "particle" | "state";
  particleGuess: Particle;
  stateGuess: QuantumState;
};

type FinalGuess = {
  particle: Particle | "";
  state: QuantumState | "";
};

const NAV_ITEMS: Array<{
  id: SectionId;
  step: string;
  label: string;
  short: string;
}> = [
  { id: "setup", step: "00", label: "게임 설정", short: "설정" },
  { id: "collision", step: "01", label: "충돌 이벤트", short: "충돌" },
  { id: "observation", step: "02", label: "개인관측", short: "관측" },
  { id: "correction", step: "＋", label: "보정문제", short: "보정" },
  { id: "negotiation", step: "03", label: "교섭", short: "교섭" },
  { id: "papers", step: "04", label: "논문 투고", short: "논문" },
  { id: "final", step: "Ω", label: "최종 지도", short: "최종" },
  { id: "cards", step: "#", label: "데이터 카드", short: "카드" },
];

const EMPTY_FINAL_GUESSES = (): Record<
  TeamId,
  Record<ParticipantId, FinalGuess>
> => {
  const perTeam = Object.fromEntries(
    TEAM_IDS.map((team) => [
      team,
      Object.fromEntries(
        PARTICIPANT_IDS.map((participant) => [
          participant,
          { particle: "", state: "" },
        ]),
      ),
    ]),
  );
  return perTeam as Record<TeamId, Record<ParticipantId, FinalGuess>>;
};

function createObservationDraftsForTeam(team: TeamId): ObservationDraft[] {
  const teamIndex = TEAM_IDS.indexOf(team);
  const otherTeam = TEAM_IDS[(teamIndex + 1) % TEAM_IDS.length];
  const ownParticipants = participantsForTeam(team);
  const otherParticipants = participantsForTeam(otherTeam);

  return [
    {
      type: "comparison",
      ownParticipant: ownParticipants[0],
      otherParticipant: otherParticipants[0],
      axis: "particle",
      particleGuess: "양성자",
      stateGuess: "A",
    },
    {
      type: "comparison",
      ownParticipant: ownParticipants[1],
      otherParticipant: otherParticipants[1],
      axis: "particle",
      particleGuess: "양성자",
      stateGuess: "A",
    },
    {
      type: "hypothesis",
      ownParticipant: ownParticipants[2],
      otherParticipant: otherParticipants[2],
      axis: "particle",
      particleGuess: "양성자",
      stateGuess: "A",
    },
    {
      type: "hypothesis",
      ownParticipant: ownParticipants[3],
      otherParticipant: otherParticipants[3],
      axis: "state",
      particleGuess: "양성자",
      stateGuess: "A",
    },
  ];
}

function createObservationDrafts(): Record<TeamId, ObservationDraft[]> {
  return {
    S: createObservationDraftsForTeam("S"),
    K: createObservationDraftsForTeam("K"),
    P: createObservationDraftsForTeam("P"),
  };
}

function createPaperDrafts(): Record<TeamId, PaperGuess[]> {
  return Object.fromEntries(
    TEAM_IDS.map((team, teamIndex) => [
      team,
      Array.from({ length: 4 }, (_, index) => ({
        participant: PARTICIPANT_IDS[teamIndex * 4 + index],
        particle: PARTICLES[index],
        state: QUANTUM_STATES[index],
      })),
    ]),
  ) as Record<TeamId, PaperGuess[]>;
}

function createLockedIdentityMap(): IdentityMap {
  return Object.fromEntries(
    PARTICIPANT_IDS.map((participant) => [
      participant,
      { particle: "양성자", state: "A" },
    ]),
  ) as IdentityMap;
}

function normalizeLoadedGameState(
  rawState: GameState,
  masterIdentities: IdentityMap,
): GameState {
  const defaults = createInitialState(structuredClone(masterIdentities));
  let repairedIdentity = false;

  const identities = Object.fromEntries(
    PARTICIPANT_IDS.map((participant) => {
      const candidate = rawState.identities?.[participant];
      const fallback = defaults.identities[participant];
      const validParticle = PARTICLES.includes(candidate?.particle as Particle);
      const validState = QUANTUM_STATES.includes(
        candidate?.state as QuantumState,
      );

      if (!validParticle || !validState) repairedIdentity = true;
      return [
        participant,
        {
          particle: validParticle ? candidate.particle : fallback.particle,
          state: validState ? candidate.state : fallback.state,
        },
      ];
    }),
  ) as GameState["identities"];

  const normalized: GameState = {
    ...defaults,
    ...rawState,
    identities,
    scores: { ...defaults.scores, ...(rawState.scores ?? {}) },
    startSelections: {
      ...defaults.startSelections,
      ...(rawState.startSelections ?? {}),
    },
    cards: Array.isArray(rawState.cards) ? rawState.cards : [],
    collisions: Array.isArray(rawState.collisions) ? rawState.collisions : [],
    observations: Array.isArray(rawState.observations)
      ? rawState.observations
      : [],
    correctionProgress: {
      ...defaults.correctionProgress,
      ...(rawState.correctionProgress ?? {}),
    },
    trades: Array.isArray(rawState.trades) ? rawState.trades : [],
    firstPublishedRound: rawState.firstPublishedRound ?? {},
    teamCorrectTargets: {
      ...defaults.teamCorrectTargets,
      ...(rawState.teamCorrectTargets ?? {}),
    },
    paperBatches: Array.isArray(rawState.paperBatches)
      ? rawState.paperBatches
      : [],
    finalSubmissions: Array.isArray(rawState.finalSubmissions)
      ? rawState.finalSubmissions
      : [],
  };

  if (!repairedIdentity) return normalized;

  const repairedStartCards: DataCard[] = normalized.started
    ? TEAM_IDS.map((team, index) => {
        const participant = normalized.startSelections[team];
        const answer = identities[participant];
        const oldCard = normalized.cards.find(
          (card) => card.kind === "start" && card.team === team,
        );
        return {
          id: index + 1,
          team,
          kind: "start",
          round: null,
          title: `${TEAM_SHORT_NAMES[team]} 시작 정보`,
          body: `${participant} = ${answer.particle} ${answer.state}`,
          usedInTrade: false,
          createdAt: oldCard?.createdAt ?? new Date().toISOString(),
        };
      })
    : [];

  // 손상된 정체를 기준으로 계산된 시험 결과는 신뢰할 수 없으므로
  // 배정표와 시작 카드만 유지하고 진행 기록을 깨끗하게 복구한다.
  return {
    ...normalized,
    round: 1,
    scores: { S: 0, K: 0, P: 0 },
    cards: repairedStartCards,
    nextCardId: normalized.started ? 4 : 1,
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

function CardTag({ card }: { card: DataCard }) {
  const labels = {
    start: "시작정보",
    observation: "개인관측",
    correction: "보정법칙",
  };
  return (
    <span className={`card-tag card-tag--${card.kind}`}>
      {labels[card.kind]}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export default function Home() {
  const [game, setGame] = useState<GameState>(() =>
    createInitialState(createLockedIdentityMap()),
  );
  const [section, setSection] = useState<SectionId>("setup");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [hydrated, setHydrated] = useState(false);
  const [editingIdentities, setEditingIdentities] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatus>("locked");
  const [accessPassword, setAccessPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");

  const [collisionEvent, setCollisionEvent] = useState<1 | 2>(1);
  const [collisionSelection, setCollisionSelection] = useState<
    Record<TeamId, ParticipantId[]>
  >({ S: [], K: [], P: [] });

  const [activeObservationTeam, setActiveObservationTeam] =
    useState<TeamId>("S");
  const [observationDrafts, setObservationDrafts] = useState(
    createObservationDrafts,
  );

  const [tradeTeams, setTradeTeams] = useState<[TeamId, TeamId]>(["S", "K"]);
  const [tradeCardIds, setTradeCardIds] = useState<
    [number | null, number | null]
  >([null, null]);

  const [activePaperTeam, setActivePaperTeam] = useState<TeamId>("S");
  const [paperDrafts, setPaperDrafts] = useState(createPaperDrafts);

  const [activeFinalTeam, setActiveFinalTeam] = useState<TeamId>("S");
  const [finalGuesses, setFinalGuesses] = useState(EMPTY_FINAL_GUESSES);

  const [cardTeamFilter, setCardTeamFilter] = useState<"all" | TeamId>("all");
  const [cardKindFilter, setCardKindFilter] = useState<
    "all" | DataCard["kind"]
  >("all");

  useEffect(() => {
    const sessionPassword = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sessionPassword) {
      void unlockGame(sessionPassword);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || unlockStatus !== "unlocked") return;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [game, hydrated, unlockStatus]);

  const currentCollision = useMemo(
    () =>
      game.collisions.find(
        (log) => log.round === game.round && log.event === collisionEvent,
      ),
    [game.collisions, game.round, collisionEvent],
  );

  const currentObservationRun = game.observations.find(
    (run) =>
      run.round === game.round && run.team === activeObservationTeam,
  );

  const currentPaperBatch = game.paperBatches.find(
    (batch) =>
      batch.round === game.round && batch.team === activePaperTeam,
  );

  const safeObservationTeam = TEAM_IDS.includes(activeObservationTeam)
    ? activeObservationTeam
    : "S";
  const storedObservationDrafts = observationDrafts?.[safeObservationTeam];
  const activeObservationDraftList: ObservationDraft[] = Array.isArray(
    storedObservationDrafts,
  )
    ? storedObservationDrafts
    : createObservationDraftsForTeam(safeObservationTeam);

  const activePaperDraftList =
    paperDrafts[activePaperTeam] ??
    createPaperDrafts()[activePaperTeam] ??
    createPaperDrafts().S;

  const filteredCards = game.cards
    .filter(
      (card) =>
        (cardTeamFilter === "all" || card.team === cardTeamFilter) &&
        (cardKindFilter === "all" || card.kind === cardKindFilter),
    )
    .sort((a, b) => b.id - a.id);

  const totalScore = Object.values(game.scores).reduce(
    (sum, score) => sum + score,
    0,
  );

  async function unlockGame(password: string) {
    if (!password.trim()) {
      setUnlockError("운영자 비밀번호를 입력해 주세요.");
      return;
    }

    setUnlockStatus("unlocking");
    setUnlockError("");
    setHydrated(false);

    try {
      const identities = await decryptIdentities(password.trim());
      const stored =
        window.localStorage.getItem(GAME_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_ROOM_ONE_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as GameState) : null;
      setGame(
        parsed?.version === 1
          ? normalizeLoadedGameState(parsed, identities)
          : createInitialState(structuredClone(identities)),
      );
      setCollisionSelection({ S: [], K: [], P: [] });
      setObservationDrafts(createObservationDrafts());
      setPaperDrafts(createPaperDrafts());
      setFinalGuesses(EMPTY_FINAL_GUESSES());
      setSection("setup");
      setSaveStatus("saved");
      setAccessPassword("");
      window.sessionStorage.setItem(AUTH_SESSION_KEY, password.trim());
      setHydrated(true);
      setUnlockStatus("unlocked");
    } catch {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      setUnlockStatus("locked");
      setUnlockError("비밀번호가 맞지 않습니다. 다시 확인해 주세요.");
    }
  }

  function startGame() {
    if (game.started) return;
    const now = new Date().toISOString();
    const startCards: DataCard[] = TEAM_IDS.map((team, index) => {
      const participant = game.startSelections[team];
      const answer = game.identities[participant];
      return {
        id: index + 1,
        team,
        kind: "start",
        round: null,
        title: `${TEAM_SHORT_NAMES[team]} 시작 정보`,
        body: `${participant} = ${answer.particle} ${answer.state}`,
        usedInTrade: false,
        createdAt: now,
      };
    });
    setGame((current) => ({
      ...current,
      started: true,
      cards: startCards,
      nextCardId: 4,
    }));
    setEditingIdentities(false);
    setSection("collision");
  }

  function resetGame() {
    if (
      !window.confirm(
        "점수, 카드, 제출 기록을 모두 지우고 새 게임을 시작할까요? 배정표는 유지됩니다.",
      )
    ) {
      return;
    }
    setGame((current) => createInitialState(structuredClone(current.identities)));
    setCollisionSelection({ S: [], K: [], P: [] });
    setObservationDrafts(createObservationDrafts());
    setPaperDrafts(createPaperDrafts());
    setFinalGuesses(EMPTY_FINAL_GUESSES());
    setSection("setup");
  }

  function advanceRound() {
    if (game.round >= 4) {
      setSection("final");
      return;
    }
    const submittedTeams = game.paperBatches.filter(
      (batch) => batch.round === game.round,
    ).length;
    if (
      submittedTeams < 3 &&
      !window.confirm(
        `이번 라운드 논문 투고가 ${submittedTeams}/3팀만 완료되었습니다. 그래도 다음 라운드로 넘어갈까요?`,
      )
    ) {
      return;
    }
    setGame((current) => ({ ...current, round: current.round + 1 }));
    setCollisionEvent(1);
    setCollisionSelection({ S: [], K: [], P: [] });
    setObservationDrafts(createObservationDrafts());
    setPaperDrafts(createPaperDrafts());
    setSection("collision");
  }

  function toggleCollisionParticipant(
    team: TeamId,
    participant: ParticipantId,
  ) {
    setCollisionSelection((current) => {
      const selected = current[team];
      if (selected.includes(participant)) {
        return {
          ...current,
          [team]: selected.filter((id) => id !== participant),
        };
      }
      if (selected.length >= 2) return current;
      return { ...current, [team]: [...selected, participant] };
    });
  }

  function changeCollisionEvent(event: 1 | 2) {
    setCollisionEvent(event);
    const existing = game.collisions.find(
      (log) => log.round === game.round && log.event === event,
    );
    setCollisionSelection(
      existing
        ? {
            S: existing.participants.filter(
              (participant) => participantTeam(participant) === "S",
            ),
            K: existing.participants.filter(
              (participant) => participantTeam(participant) === "K",
            ),
            P: existing.participants.filter(
              (participant) => participantTeam(participant) === "P",
            ),
          }
        : { S: [], K: [], P: [] },
    );
  }

  function runCollision() {
    const participants = TEAM_IDS.flatMap(
      (team) => collisionSelection[team],
    );
    if (participants.length === 0) {
      window.alert("충돌에 참가할 연구원을 한 명 이상 선택해 주세요.");
      return;
    }
    const log = calculateCollision(game, collisionEvent, participants);
    setGame((current) => ({
      ...current,
      collisions: [
        ...current.collisions.filter(
          (item) =>
            !(item.round === current.round && item.event === collisionEvent),
        ),
        log,
      ],
    }));
  }

  function updateObservationDraft(
    team: TeamId,
    index: number,
    patch: Partial<ObservationDraft>,
  ) {
    setObservationDrafts((current) => ({
      ...current,
      [team]: (
        Array.isArray(current?.[team])
          ? current[team]
          : createObservationDraftsForTeam(team)
      ).map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    }));
  }

  function processObservations(team: TeamId) {
    if (
      game.observations.some(
        (run) => run.round === game.round && run.team === team,
      )
    ) {
      return;
    }

    const createdAt = new Date().toISOString();
    const teamDrafts = Array.isArray(observationDrafts?.[team])
      ? observationDrafts[team]
      : createObservationDraftsForTeam(team);
    const cards: DataCard[] = teamDrafts.map((draft, index) => {
      const own = game.identities[draft.ownParticipant];
      let title = "개인관측 · 비교관측";
      let body = "";

      if (draft.type === "comparison") {
        const other = game.identities[draft.otherParticipant];
        const answers: string[] = [];
        if (game.round <= 3) {
          answers.push(
            `입자 ${own.particle === other.particle ? "같다" : "다르다"}`,
          );
        }
        if (game.round !== 3) {
          answers.push(
            `상태 ${own.state === other.state ? "같다" : "다르다"}`,
          );
        }
        body = `${draft.ownParticipant} ↔ ${draft.otherParticipant} · ${answers.join(" / ")}`;
      } else {
        title = "개인관측 · 자기가설";
        const isParticle = draft.axis === "particle";
        const hypothesis = isParticle ? draft.particleGuess : draft.stateGuess;
        const answer = isParticle
          ? own.particle === draft.particleGuess
          : own.state === draft.stateGuess;
        body = `${draft.ownParticipant}의 ${isParticle ? "입자" : "상태"}는 ${hypothesis}인가? · ${answer ? "YES" : "NO"}`;
      }

      return {
        id: game.nextCardId + index,
        team,
        kind: "observation",
        round: game.round,
        title,
        body,
        usedInTrade: false,
        createdAt,
      };
    });

    setGame((current) => ({
      ...current,
      cards: [...current.cards, ...cards],
      nextCardId: current.nextCardId + cards.length,
      observations: [
        ...current.observations,
        { round: current.round, team, cardIds: cards.map((card) => card.id) },
      ],
    }));
  }

  function awardCorrectionCard(team: TeamId) {
    const progress = game.correctionProgress[team];
    if (progress >= CORRECTION_LAWS.length) return;
    const lawNumber = progress + 1;
    const card: DataCard = {
      id: game.nextCardId,
      team,
      kind: "correction",
      round: game.round,
      title: `보정법칙 ${lawNumber}`,
      body: CORRECTION_LAWS[progress],
      usedInTrade: false,
      createdAt: new Date().toISOString(),
    };
    setGame((current) => ({
      ...current,
      cards: [...current.cards, card],
      nextCardId: current.nextCardId + 1,
      correctionProgress: {
        ...current.correctionProgress,
        [team]: lawNumber,
      },
    }));
  }

  function eligibleTradeCards(team: TeamId) {
    return game.cards.filter(
      (card) => card.team === team && !card.usedInTrade,
    );
  }

  function completeTrade() {
    const [firstTeam, secondTeam] = tradeTeams;
    const [firstCardId, secondCardId] = tradeCardIds;
    if (firstTeam === secondTeam || firstCardId === null || secondCardId === null) {
      window.alert("서로 다른 두 팀과 각 팀의 카드 1장을 선택해 주세요.");
      return;
    }
    if (game.trades.filter((trade) => trade.round === game.round).length >= 3) {
      window.alert("이번 라운드 교섭 기록은 최대 3회까지 저장할 수 있습니다.");
      return;
    }
    const firstCard = game.cards.find((card) => card.id === firstCardId);
    const secondCard = game.cards.find((card) => card.id === secondCardId);
    if (
      !firstCard ||
      !secondCard ||
      firstCard.team !== firstTeam ||
      secondCard.team !== secondTeam ||
      firstCard.usedInTrade ||
      secondCard.usedInTrade
    ) {
      window.alert("교환 가능한 카드를 다시 선택해 주세요.");
      return;
    }

    setGame((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === firstCardId || card.id === secondCardId
          ? { ...card, usedInTrade: true }
          : card,
      ),
      scores: {
        ...current.scores,
        [firstTeam]: current.scores[firstTeam] + 1,
        [secondTeam]: current.scores[secondTeam] + 1,
      },
      trades: [
        ...current.trades,
        {
          id: `trade-${current.round}-${current.trades.length + 1}`,
          round: current.round,
          teams: [firstTeam, secondTeam],
          cardIds: [firstCardId, secondCardId],
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setTradeCardIds([null, null]);
  }

  function updatePaperGuess(
    team: TeamId,
    index: number,
    patch: Partial<PaperGuess>,
  ) {
    setPaperDrafts((current) => ({
      ...current,
      [team]: (current[team] ?? createPaperDrafts()[team]).map(
        (guess, guessIndex) =>
        guessIndex === index ? { ...guess, ...patch } : guess,
      ),
    }));
  }

  function submitPapers(team: TeamId) {
    if (
      game.paperBatches.some(
        (batch) => batch.round === game.round && batch.team === team,
      )
    ) {
      return;
    }
    const guesses = paperDrafts[team] ?? createPaperDrafts()[team];
    const result = scorePaperBatch(game, team, guesses);
    setGame((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [team]: current.scores[team] + result.batch.total,
      },
      firstPublishedRound: result.firstPublishedRound,
      teamCorrectTargets: result.teamCorrectTargets,
      paperBatches: [...current.paperBatches, result.batch],
    }));
  }

  function updateFinalGuess(
    team: TeamId,
    participant: ParticipantId,
    patch: Partial<FinalGuess>,
  ) {
    setFinalGuesses((current) => ({
      ...current,
      [team]: {
        ...current[team],
        [participant]: { ...current[team][participant], ...patch },
      },
    }));
  }

  function submitFinalMap(team: TeamId) {
    if (game.finalSubmissions.some((submission) => submission.team === team)) {
      return;
    }
    const guesses = finalGuesses[team];
    const missing = PARTICIPANT_IDS.some(
      (participant) =>
        !guesses[participant].particle || !guesses[participant].state,
    );
    if (missing) {
      window.alert("24명 전원의 입자와 상태를 모두 입력해 주세요.");
      return;
    }
    const correctIds = PARTICIPANT_IDS.filter((participant) => {
      const guess = guesses[participant];
      const answer = game.identities[participant];
      return guess.particle === answer.particle && guess.state === answer.state;
    });
    const awardedPoints = Math.min(correctIds.length, 18);
    setGame((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [team]: current.scores[team] + awardedPoints,
      },
      finalSubmissions: [
        ...current.finalSubmissions,
        {
          team,
          correctIds,
          rawCorrect: correctIds.length,
          awardedPoints,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  if (unlockStatus !== "unlocked") {
    return (
      <main className="access-screen">
        <form
          className="access-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void unlockGame(accessPassword);
          }}
        >
          <div className="access-mark" aria-hidden="true">
            Q
          </div>
          <p className="eyebrow">CLASSIFIED OPERATOR ACCESS</p>
          <h1>비공개 소입자 관측전</h1>
          <p className="access-copy">
            정답 데이터가 암호화되어 있습니다. 운영자 비밀번호를 입력하면 이
            노트북의 독립 게임방이 열립니다.
          </p>
          <label htmlFor="operator-password">운영자 비밀번호</label>
          <input
            id="operator-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={accessPassword}
            onChange={(event) => setAccessPassword(event.target.value)}
            placeholder="비밀번호 입력"
            aria-describedby={unlockError ? "unlock-error" : undefined}
          />
          {unlockError ? (
            <p className="access-error" id="unlock-error" role="alert">
              {unlockError}
            </p>
          ) : null}
          <button type="submit" disabled={unlockStatus === "unlocking"}>
            {unlockStatus === "unlocking" ? "정답 데이터 해독 중…" : "운영 화면 열기"}
            <span aria-hidden="true">→</span>
          </button>
          <small>비밀번호는 참가자에게 공유하지 마세요.</small>
        </form>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="loading-screen">
        <div className="loading-orbit" aria-hidden="true" />
        <p className="eyebrow">QUANTUM CONTROL DESK</p>
        <h1>관측 장비 동기화 중</h1>
        <p>저장된 게임 정보를 안전하게 불러오고 있습니다.</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            Q
          </div>
          <div>
            <p className="eyebrow">OPERATOR CONSOLE</p>
            <h1>비공개 소입자 관측전</h1>
          </div>
        </div>

        <div className="scoreboard" aria-label="실시간 점수">
          {TEAM_IDS.map((team) => (
            <div className={`score-chip team-${team.toLowerCase()}`} key={team}>
              <span>{TEAM_SHORT_NAMES[team]}</span>
              <strong>{game.scores[team]}</strong>
              <small>PTS</small>
            </div>
          ))}
        </div>

        <div className="round-control">
          <div className="round-display">
            <span>ROUND</span>
            <strong>{game.round}</strong>
            <small>/ 4</small>
          </div>
          <button className="next-round-button" onClick={advanceRound}>
            {game.round < 4 ? "다음 라운드" : "최종 지도"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </header>

      <div className="status-strip">
        <span className={`save-status save-status--${saveStatus}`}>
          <i />
          {saveStatus === "saving"
            ? "저장 중"
            : saveStatus === "saved"
              ? "이 노트북에 자동 저장됨"
              : "브라우저 저장 확인 필요"}
        </span>
        <span>
          카드 <strong>{game.cards.length}</strong>장
        </span>
        <span>
          누적 점수 <strong>{totalScore}</strong>점
        </span>
        <span>
          최초 발표 <strong>{Object.keys(game.firstPublishedRound).length}</strong>
          /24
        </span>
        <button className="text-button danger-text" onClick={resetGame}>
          새 게임 초기화
        </button>
      </div>

      <div className="workspace">
        <nav className="side-nav" aria-label="게임 운영 단계">
          <p className="nav-caption">CONTROL FLOW</p>
          {NAV_ITEMS.map((item) => {
            const collisionsDone = game.collisions.filter(
              (log) => log.round === game.round,
            ).length;
            const observationsDone = game.observations.filter(
              (run) => run.round === game.round,
            ).length;
            const papersDone = game.paperBatches.filter(
              (batch) => batch.round === game.round,
            ).length;
            const tradesDone = game.trades.filter(
              (trade) => trade.round === game.round,
            ).length;
            const badge =
              item.id === "collision"
                ? `${collisionsDone}/2`
                : item.id === "observation"
                  ? `${observationsDone}/3`
                  : item.id === "negotiation"
                    ? `${tradesDone}/3`
                    : item.id === "papers"
                      ? `${papersDone}/3`
                      : item.id === "cards"
                        ? `${game.cards.length}`
                        : null;
            return (
              <button
                key={item.id}
                className={`nav-item ${section === item.id ? "is-active" : ""}`}
                onClick={() => setSection(item.id)}
              >
                <span className="nav-step">{item.step}</span>
                <span className="nav-label">
                  <strong>{item.label}</strong>
                  <small>{item.short}</small>
                </span>
                {badge && <em>{badge}</em>}
              </button>
            );
          })}
          <div className="operator-note">
            <span aria-hidden="true">◉</span>
            <p>
              모든 판정은 운영자 화면에만 표시됩니다. 참가자에게 필요한 결과만
              읽어주세요.
            </p>
          </div>
        </nav>

        <section className="content-panel">
          {section === "setup" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PRE-GAME · MASTER DATA</p>
                  <h2>게임 설정</h2>
                  <p>
                    첨부 배정표를 적용했습니다. 시작 정보 3장을 확정하면 카드
                    번호가 #001부터 시작됩니다.
                  </p>
                </div>
                <div className={`lock-pill ${game.started ? "is-locked" : ""}`}>
                  {game.started ? "● 게임 진행 중" : "○ 시작 전 · 편집 가능"}
                </div>
              </div>

              <div className="setup-grid">
                <article className="panel start-card-panel">
                  <div className="panel-title">
                    <div>
                      <span className="panel-kicker">START DATA</span>
                      <h3>시작 정보 카드</h3>
                    </div>
                    <span className="count-badge">3 CARDS</span>
                  </div>
                  <p className="panel-description">
                    각 팀에 공개할 자기 팀 연구원 1명을 선택하세요. 카드 번호는
                    S팀, K팀, P팀 순서로 부여됩니다.
                  </p>
                  <div className="start-select-list">
                    {TEAM_IDS.map((team, index) => {
                      const participant = game.startSelections[team];
                      const answer = game.identities[participant];
                      return (
                        <label
                          className={`start-select team-${team.toLowerCase()}`}
                          key={team}
                        >
                          <span className="card-number">#{String(index + 1).padStart(3, "0")}</span>
                          <strong>{TEAM_SHORT_NAMES[team]}</strong>
                          <select
                            value={participant}
                            disabled={game.started}
                            onChange={(event) =>
                              setGame((current) => ({
                                ...current,
                                startSelections: {
                                  ...current.startSelections,
                                  [team]: event.target.value as ParticipantId,
                                },
                              }))
                            }
                          >
                            {participantsForTeam(team).map((id) => (
                              <option value={id} key={id}>
                                {id}
                              </option>
                            ))}
                          </select>
                          <span className="answer-preview">
                            {answer.particle} · {answer.state}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {!game.started ? (
                    <button className="primary-button wide" onClick={startGame}>
                      시작 카드 확정 &amp; 게임 시작
                      <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <div className="success-banner">
                      <span aria-hidden="true">✓</span>
                      시작 정보 카드 #001–#003 발급 완료
                    </div>
                  )}
                </article>

                <article className="panel rules-panel">
                  <div className="panel-title">
                    <div>
                      <span className="panel-kicker">ROUND RULE</span>
                      <h3>현재 공개 범위</h3>
                    </div>
                    <span className="round-mini">R{game.round}</span>
                  </div>
                  <div className="rule-readout">
                    <div>
                      <span>충돌 결과</span>
                      <strong>
                        {game.round <= 2
                          ? "입자 분포 + 상태 분포"
                          : game.round === 3
                            ? "입자 분포만"
                            : "상태 분포만"}
                      </strong>
                    </div>
                    <div>
                      <span>비교관측</span>
                      <strong>
                        {game.round <= 2
                          ? "입자 + 상태"
                          : game.round === 3
                            ? "입자만"
                            : "상태만"}
                      </strong>
                    </div>
                    <div>
                      <span>논문 투고</span>
                      <strong>팀당 4편 · 중복 허용</strong>
                    </div>
                  </div>
                  <div className="score-legend">
                    <span>
                      <i className="dot dot--mint" /> 최초 +3
                    </span>
                    <span>
                      <i className="dot dot--blue" /> 정답 +2
                    </span>
                    <span>
                      <i className="dot dot--amber" /> 재발표 +1
                    </span>
                    <span>
                      <i className="dot dot--red" /> 오답 -1
                    </span>
                  </div>
                </article>
              </div>

              <article className="panel identity-panel">
                <div className="panel-title">
                  <div>
                    <span className="panel-kicker">CLASSIFIED</span>
                    <h3>운영자용 전체 배정표</h3>
                  </div>
                  {!game.started && (
                    <button
                      className="secondary-button"
                      onClick={() => setEditingIdentities((value) => !value)}
                    >
                      {editingIdentities ? "편집 완료" : "배정표 편집"}
                    </button>
                  )}
                </div>
                <div className="identity-table-wrap">
                  <table className="identity-table">
                    <thead>
                      <tr>
                        <th>팀 ＼ 번호</th>
                        {Array.from({ length: 8 }, (_, index) => (
                          <th key={index}>{index + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TEAM_IDS.map((team) => (
                        <tr key={team}>
                          <th className={`team-label team-${team.toLowerCase()}`}>
                            {TEAM_SHORT_NAMES[team]}
                          </th>
                          {participantsForTeam(team).map((participant) => {
                            const identity = game.identities[participant];
                            return (
                              <td key={participant}>
                                <strong>{participant}</strong>
                                {editingIdentities ? (
                                  <div className="inline-editors">
                                    <select
                                      value={identity.particle}
                                      onChange={(event) =>
                                        setGame((current) => ({
                                          ...current,
                                          identities: {
                                            ...current.identities,
                                            [participant]: {
                                              ...current.identities[participant],
                                              particle: event.target.value as Particle,
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      {PARTICLES.map((particle) => (
                                        <option value={particle} key={particle}>
                                          {particle}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={identity.state}
                                      onChange={(event) =>
                                        setGame((current) => ({
                                          ...current,
                                          identities: {
                                            ...current.identities,
                                            [participant]: {
                                              ...current.identities[participant],
                                              state: event.target
                                                .value as QuantumState,
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      {QUANTUM_STATES.map((state) => (
                                        <option value={state} key={state}>
                                          {state}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span>
                                    {identity.particle} · {identity.state}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </>
          )}

          {section === "collision" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ROUND {game.round} · COLLISION</p>
                  <h2>충돌 이벤트</h2>
                  <p>
                    팀마다 0~2명을 터치하세요. 참가한 팀에만 아래 분포 결과를
                    전달합니다.
                  </p>
                </div>
                <div className="segment-control">
                  {[1, 2].map((event) => (
                    <button
                      className={collisionEvent === event ? "is-active" : ""}
                      onClick={() => changeCollisionEvent(event as 1 | 2)}
                      key={event}
                    >
                      충돌 {event}
                      {game.collisions.some(
                        (log) =>
                          log.round === game.round && log.event === event,
                      ) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="collision-grid">
                {TEAM_IDS.map((team) => (
                  <article
                    className={`panel participant-panel team-${team.toLowerCase()}`}
                    key={team}
                  >
                    <div className="panel-title compact">
                      <div>
                        <span className="panel-kicker">{TEAM_NAMES[team]}</span>
                        <h3>{TEAM_SHORT_NAMES[team]} 충돌자</h3>
                      </div>
                      <span className="selection-count">
                        {collisionSelection[team].length}/2
                      </span>
                    </div>
                    <div className="participant-buttons">
                      {participantsForTeam(team).map((participant) => (
                        <button
                          key={participant}
                          className={
                            collisionSelection[team].includes(participant)
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            toggleCollisionParticipant(team, participant)
                          }
                        >
                          <span>{participant.split("-")[0]}</span>
                          <strong>{participant.split("-")[1]}</strong>
                          <i aria-hidden="true">✓</i>
                        </button>
                      ))}
                    </div>
                    {collisionSelection[team].length === 0 && (
                      <p className="no-participation">불참 · 정보 수신 없음</p>
                    )}
                  </article>
                ))}
              </div>

              <article className="result-console">
                <div className="result-console__header">
                  <div>
                    <span className="live-dot" />
                    <strong>충돌 분석기</strong>
                    <small>
                      {TEAM_IDS.flatMap(
                        (team) => collisionSelection[team],
                      ).join(" · ") || "참가자 대기 중"}
                    </small>
                  </div>
                  <button className="primary-button" onClick={runCollision}>
                    {currentCollision ? "결과 다시 계산" : "충돌 결과 계산"}
                  </button>
                </div>
                {currentCollision ? (
                  <div className="collision-result">
                    <div className="recipient-list">
                      <span>정보 수신 팀</span>
                      {currentCollision.participatingTeams.map((team) => (
                        <strong
                          className={`team-pill team-${team.toLowerCase()}`}
                          key={team}
                        >
                          {TEAM_SHORT_NAMES[team]}
                        </strong>
                      ))}
                    </div>
                    <div className="distribution-list">
                      {collisionResultText(currentCollision).map((line) => (
                        <div key={line}>
                          <span aria-hidden="true">◌</span>
                          <strong>{line}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState>
                    참가자를 선택한 뒤 ‘충돌 결과 계산’을 누르세요.
                  </EmptyState>
                )}
              </article>
            </>
          )}

          {section === "observation" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ROUND {game.round} · OBSERVATION</p>
                  <h2>개인관측</h2>
                  <p>
                    팀당 4개를 한 번에 판정합니다. 결과마다 공식 데이터 카드
                    번호가 자동 부여됩니다.
                  </p>
                </div>
                <div className="team-tabs">
                  {TEAM_IDS.map((team) => (
                    <button
                      className={`team-${team.toLowerCase()} ${activeObservationTeam === team ? "is-active" : ""}`}
                      onClick={() => setActiveObservationTeam(team)}
                      key={team}
                    >
                      {TEAM_SHORT_NAMES[team]}
                      {game.observations.some(
                        (run) =>
                          run.round === game.round && run.team === team,
                      ) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <article className="panel">
                <div className="observation-header">
                  <div>
                    <span
                      className={`team-orb team-${activeObservationTeam.toLowerCase()}`}
                    >
                      {activeObservationTeam}
                    </span>
                    <div>
                      <span className="panel-kicker">
                        {TEAM_NAMES[activeObservationTeam]}
                      </span>
                      <h3>{TEAM_SHORT_NAMES[activeObservationTeam]} 관측 제출서</h3>
                    </div>
                  </div>
                  <span className="count-badge">
                    CARD #{String(game.nextCardId).padStart(3, "0")}–
                    {String(game.nextCardId + 3).padStart(3, "0")}
                  </span>
                </div>

                <div className="observation-list">
                  {(Array.isArray(activeObservationDraftList)
                    ? activeObservationDraftList
                    : createObservationDraftsForTeam(safeObservationTeam)
                  ).map(
                    (draft, index) => (
                      <div className="observation-row" key={index}>
                        <span className="row-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="mini-segment">
                          <button
                            className={
                              draft.type === "comparison" ? "is-active" : ""
                            }
                            disabled={Boolean(currentObservationRun)}
                            onClick={() =>
                              updateObservationDraft(
                                activeObservationTeam,
                                index,
                                { type: "comparison" },
                              )
                            }
                          >
                            비교관측
                          </button>
                          <button
                            className={
                              draft.type === "hypothesis" ? "is-active" : ""
                            }
                            disabled={Boolean(currentObservationRun)}
                            onClick={() =>
                              updateObservationDraft(
                                activeObservationTeam,
                                index,
                                { type: "hypothesis" },
                              )
                            }
                          >
                            자기가설
                          </button>
                        </div>
                        <label>
                          <span>자기 팀</span>
                          <select
                            value={draft.ownParticipant}
                            disabled={Boolean(currentObservationRun)}
                            onChange={(event) =>
                              updateObservationDraft(
                                activeObservationTeam,
                                index,
                                {
                                  ownParticipant: event.target
                                    .value as ParticipantId,
                                },
                              )
                            }
                          >
                            {participantsForTeam(activeObservationTeam).map(
                              (participant) => (
                                <option value={participant} key={participant}>
                                  {participant}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        {draft.type === "comparison" ? (
                          <>
                            <span className="compare-symbol">↔</span>
                            <label className="grow-field">
                              <span>상대 팀</span>
                              <select
                                value={draft.otherParticipant}
                                disabled={Boolean(currentObservationRun)}
                                onChange={(event) =>
                                  updateObservationDraft(
                                    activeObservationTeam,
                                    index,
                                    {
                                      otherParticipant: event.target
                                        .value as ParticipantId,
                                    },
                                  )
                                }
                              >
                                {PARTICIPANT_IDS.filter(
                                  (participant) =>
                                    participantTeam(participant) !==
                                    activeObservationTeam,
                                ).map((participant) => (
                                  <option value={participant} key={participant}>
                                    {participant}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <span className="round-scope">
                              {game.round <= 2
                                ? "입자 + 상태 판정"
                                : game.round === 3
                                  ? "입자 판정"
                                  : "상태 판정"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="compare-symbol">=</span>
                            <label>
                              <span>가설 종류</span>
                              <select
                                value={draft.axis}
                                disabled={Boolean(currentObservationRun)}
                                onChange={(event) =>
                                  updateObservationDraft(
                                    activeObservationTeam,
                                    index,
                                    {
                                      axis: event.target.value as
                                        | "particle"
                                        | "state",
                                    },
                                  )
                                }
                              >
                                <option value="particle">입자인가?</option>
                                <option value="state">상태인가?</option>
                              </select>
                            </label>
                            <label className="grow-field">
                              <span>가설 값</span>
                              {draft.axis === "particle" ? (
                                <select
                                  value={draft.particleGuess}
                                  disabled={Boolean(currentObservationRun)}
                                  onChange={(event) =>
                                    updateObservationDraft(
                                      activeObservationTeam,
                                      index,
                                      {
                                        particleGuess: event.target
                                          .value as Particle,
                                      },
                                    )
                                  }
                                >
                                  {PARTICLES.map((particle) => (
                                    <option value={particle} key={particle}>
                                      {particle}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={draft.stateGuess}
                                  disabled={Boolean(currentObservationRun)}
                                  onChange={(event) =>
                                    updateObservationDraft(
                                      activeObservationTeam,
                                      index,
                                      {
                                        stateGuess: event.target
                                          .value as QuantumState,
                                      },
                                    )
                                  }
                                >
                                  {QUANTUM_STATES.map((state) => (
                                    <option value={state} key={state}>
                                      {state}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </label>
                          </>
                        )}
                      </div>
                    ),
                  )}
                </div>

                {!currentObservationRun ? (
                  <div className="panel-actions">
                    <span>판정 시 공식 데이터 카드 4장이 생성됩니다.</span>
                    <button
                      className="primary-button"
                      onClick={() => processObservations(activeObservationTeam)}
                    >
                      4개 관측 일괄 판정
                    </button>
                  </div>
                ) : (
                  <div className="generated-card-grid">
                    {(currentObservationRun.cardIds ?? []).map((cardId) => {
                      const card = game.cards.find((item) => item.id === cardId);
                      if (!card) return null;
                      return (
                        <div className="data-card compact-card" key={card.id}>
                          <div>
                            <span className="card-number">
                              #{String(card.id).padStart(3, "0")}
                            </span>
                            <CardTag card={card} />
                          </div>
                          <strong>{card.body}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </>
          )}

          {section === "correction" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">LIVE · CALIBRATION</p>
                  <h2>보정문제 카드 발급</h2>
                  <p>
                    팀이 문제를 맞힐 때마다 다음 보정법칙 카드를 즉시
                    발급합니다. 순서는 1→4로 고정됩니다.
                  </p>
                </div>
              </div>
              <div className="correction-grid">
                {TEAM_IDS.map((team) => {
                  const progress = game.correctionProgress[team];
                  const nextLaw = CORRECTION_LAWS[progress];
                  return (
                    <article
                      className={`panel correction-panel team-${team.toLowerCase()}`}
                      key={team}
                    >
                      <div className="panel-title">
                        <div>
                          <span className="panel-kicker">{TEAM_NAMES[team]}</span>
                          <h3>{TEAM_SHORT_NAMES[team]} 진행</h3>
                        </div>
                        <span className="selection-count">{progress}/4</span>
                      </div>
                      <div className="law-progress">
                        {CORRECTION_LAWS.map((_, index) => (
                          <i
                            className={index < progress ? "is-done" : ""}
                            key={index}
                          >
                            {index + 1}
                          </i>
                        ))}
                      </div>
                      {nextLaw ? (
                        <>
                          <div className="next-law">
                            <span>다음 발급 · 보정법칙 {progress + 1}</span>
                            <p>{nextLaw}</p>
                          </div>
                          <button
                            className="primary-button wide"
                            onClick={() => awardCorrectionCard(team)}
                          >
                            정답 확인 · 카드 발급
                          </button>
                        </>
                      ) : (
                        <div className="success-banner">
                          <span aria-hidden="true">✓</span>
                          보정법칙 4장 발급 완료
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              <article className="panel law-reference">
                <div className="panel-title">
                  <div>
                    <span className="panel-kicker">OPERATOR REFERENCE</span>
                    <h3>보정법칙 전체 목록</h3>
                  </div>
                </div>
                <ol>
                  {CORRECTION_LAWS.map((law, index) => (
                    <li key={law}>
                      <span>{index + 1}</span>
                      <p>{law}</p>
                    </li>
                  ))}
                </ol>
              </article>
            </>
          )}

          {section === "negotiation" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ROUND {game.round} · NEGOTIATION</p>
                  <h2>교섭 카드 교환</h2>
                  <p>
                    두 팀과 미사용 카드 1장씩을 선택하세요. 완료 시 양 팀 +1점,
                    사용 카드는 자동 잠금됩니다.
                  </p>
                </div>
                <span className="count-badge">
                  {game.trades.filter((trade) => trade.round === game.round).length}
                  /3 기록
                </span>
              </div>

              <article className="trade-stage">
                {[0, 1].map((side) => {
                  const team = tradeTeams[side];
                  return (
                    <div
                      className={`trade-side team-${team.toLowerCase()}`}
                      key={side}
                    >
                      <span className="trade-side-label">
                        {side === 0 ? "TEAM A" : "TEAM B"}
                      </span>
                      <div className="trade-team-buttons">
                        {TEAM_IDS.map((candidate) => (
                          <button
                            className={
                              candidate === team ? "is-selected" : ""
                            }
                            disabled={tradeTeams[side === 0 ? 1 : 0] === candidate}
                            onClick={() => {
                              const next: [TeamId, TeamId] = [...tradeTeams];
                              next[side] = candidate;
                              setTradeTeams(next);
                              const nextCards: [number | null, number | null] = [
                                ...tradeCardIds,
                              ];
                              nextCards[side] = null;
                              setTradeCardIds(nextCards);
                            }}
                            key={candidate}
                          >
                            {TEAM_SHORT_NAMES[candidate]}
                          </button>
                        ))}
                      </div>
                      <label className="trade-card-select">
                        <span>교환할 미사용 카드</span>
                        <select
                          value={tradeCardIds[side] ?? ""}
                          onChange={(event) => {
                            const next: [number | null, number | null] = [
                              ...tradeCardIds,
                            ];
                            next[side] = Number(event.target.value);
                            setTradeCardIds(next);
                          }}
                        >
                          <option value="">카드 번호 선택</option>
                          {eligibleTradeCards(team).map((card) => (
                            <option value={card.id} key={card.id}>
                              #{String(card.id).padStart(3, "0")} · {card.title} ·{" "}
                              {card.body}
                            </option>
                          ))}
                        </select>
                      </label>
                      {tradeCardIds[side] !== null && (
                        <div className="trade-preview">
                          {game.cards.find(
                            (card) => card.id === tradeCardIds[side],
                          )?.body}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="trade-center">
                  <span aria-hidden="true">⇄</span>
                  <strong>30초 공개</strong>
                  <small>기록 후 인용 완료</small>
                </div>
              </article>
              <button
                className="primary-button trade-submit"
                onClick={completeTrade}
                disabled={
                  game.trades.filter((trade) => trade.round === game.round)
                    .length >= 3
                }
              >
                인용교환 완료 · 양 팀 +1점
              </button>

              <article className="panel history-panel">
                <div className="panel-title">
                  <div>
                    <span className="panel-kicker">TRADE LOG</span>
                    <h3>이번 라운드 교섭 기록</h3>
                  </div>
                </div>
                {game.trades.filter((trade) => trade.round === game.round)
                  .length ? (
                  <div className="trade-log-list">
                    {game.trades
                      .filter((trade) => trade.round === game.round)
                      .map((trade, index) => (
                        <div key={trade.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <strong>
                            {TEAM_SHORT_NAMES[trade.teams[0]]} #
                            {String(trade.cardIds[0]).padStart(3, "0")}
                          </strong>
                          <i aria-hidden="true">⇄</i>
                          <strong>
                            {TEAM_SHORT_NAMES[trade.teams[1]]} #
                            {String(trade.cardIds[1]).padStart(3, "0")}
                          </strong>
                          <em>각 +1점</em>
                        </div>
                      ))}
                  </div>
                ) : (
                  <EmptyState>아직 기록된 교섭이 없습니다.</EmptyState>
                )}
              </article>
            </>
          )}

          {section === "papers" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ROUND {game.round} · PUBLICATION</p>
                  <h2>논문 투고</h2>
                  <p>
                    참가자·입자·상태를 모두 입력합니다. 팀당 4편을 한 번에
                    채점하며 같은 참가자 중복 제출도 가능합니다.
                  </p>
                </div>
                <div className="team-tabs">
                  {TEAM_IDS.map((team) => (
                    <button
                      className={`team-${team.toLowerCase()} ${activePaperTeam === team ? "is-active" : ""}`}
                      onClick={() => setActivePaperTeam(team)}
                      key={team}
                    >
                      {TEAM_SHORT_NAMES[team]}
                      {game.paperBatches.some(
                        (batch) =>
                          batch.round === game.round && batch.team === team,
                      ) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <article className="panel paper-panel">
                <div className="paper-title-row">
                  <div>
                    <span
                      className={`team-orb team-${activePaperTeam.toLowerCase()}`}
                    >
                      {activePaperTeam}
                    </span>
                    <div>
                      <span className="panel-kicker">SUBMISSION BATCH</span>
                      <h3>{TEAM_SHORT_NAMES[activePaperTeam]} 논문 4편</h3>
                    </div>
                  </div>
                  <div className="score-legend compact-legend">
                    <span>
                      <i className="dot dot--mint" /> 최초 +3
                    </span>
                    <span>
                      <i className="dot dot--blue" /> 정답 +2
                    </span>
                    <span>
                      <i className="dot dot--amber" /> 재발표 +1
                    </span>
                    <span>
                      <i className="dot dot--red" /> 오답 -1
                    </span>
                  </div>
                </div>

                <div className="paper-entry-list">
                  {activePaperDraftList.map((guess, index) => {
                    const result = currentPaperBatch?.entries[index];
                    return (
                      <div
                        className={`paper-entry ${result ? (result.correct ? "is-correct" : "is-wrong") : ""}`}
                        key={index}
                      >
                        <span className="paper-index">P{index + 1}</span>
                        <label>
                          <span>참가자</span>
                          <select
                            value={guess.participant}
                            disabled={Boolean(currentPaperBatch)}
                            onChange={(event) =>
                              updatePaperGuess(activePaperTeam, index, {
                                participant: event.target
                                  .value as ParticipantId,
                              })
                            }
                          >
                            {PARTICIPANT_IDS.map((participant) => (
                              <option value={participant} key={participant}>
                                {participant}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="formula-equals">=</span>
                        <label>
                          <span>입자</span>
                          <select
                            value={guess.particle}
                            disabled={Boolean(currentPaperBatch)}
                            onChange={(event) =>
                              updatePaperGuess(activePaperTeam, index, {
                                particle: event.target.value as Particle,
                              })
                            }
                          >
                            {PARTICLES.map((particle) => (
                              <option value={particle} key={particle}>
                                {particle}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>상태</span>
                          <select
                            value={guess.state}
                            disabled={Boolean(currentPaperBatch)}
                            onChange={(event) =>
                              updatePaperGuess(activePaperTeam, index, {
                                state: event.target.value as QuantumState,
                              })
                            }
                          >
                            {QUANTUM_STATES.map((state) => (
                              <option value={state} key={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </label>
                        {result && (
                          <div className="paper-result">
                            <span>{result.correct ? "정답" : "오답"}</span>
                            <strong>
                              {result.points > 0 ? "+" : ""}
                              {result.points}
                            </strong>
                            <small>{result.reason}</small>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!currentPaperBatch ? (
                  <div className="panel-actions">
                    <span>
                      채점 후에는 수정할 수 없습니다. 네 편을 확인해 주세요.
                    </span>
                    <button
                      className="primary-button"
                      onClick={() => submitPapers(activePaperTeam)}
                    >
                      논문 4편 일괄 채점
                    </button>
                  </div>
                ) : (
                  <div className="paper-total">
                    <div>
                      <span>채점 공지</span>
                      <strong>
                        {currentPaperBatch.entries
                          .map(
                            (entry) =>
                              `${entry.points > 0 ? "+" : ""}${entry.points}점`,
                          )
                          .join(" · ")}
                      </strong>
                    </div>
                    <div>
                      <span>총 반영</span>
                      <strong>
                        {currentPaperBatch.total > 0 ? "+" : ""}
                        {currentPaperBatch.total}
                      </strong>
                    </div>
                  </div>
                )}
              </article>
            </>
          )}

          {section === "final" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">FINAL · COMPLETE MAP</p>
                  <h2>최종 지도 제출</h2>
                  <p>
                    제출 팀이 작성한 24명 전원의 입자와 상태를 옮겨 입력하세요.
                    완전 일치 1명당 +1점, 최대 18점입니다.
                  </p>
                </div>
                <div className="team-tabs">
                  {TEAM_IDS.map((team) => (
                    <button
                      className={`team-${team.toLowerCase()} ${activeFinalTeam === team ? "is-active" : ""}`}
                      onClick={() => setActiveFinalTeam(team)}
                      key={team}
                    >
                      {TEAM_SHORT_NAMES[team]}
                      {game.finalSubmissions.some(
                        (submission) => submission.team === team,
                      ) && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {game.round < 4 && (
                <div className="warning-banner">
                  <span aria-hidden="true">!</span>
                  현재 {game.round}라운드입니다. 입력은 미리 할 수 있지만 채점은
                  4라운드부터 가능합니다.
                </div>
              )}

              <article className="panel final-map-panel">
                <div className="panel-title">
                  <div>
                    <span className="panel-kicker">
                      {TEAM_SHORT_NAMES[activeFinalTeam]} SUBMISSION
                    </span>
                    <h3>24인 최종 추리 지도</h3>
                  </div>
                  <span className="count-badge">MAX +18</span>
                </div>
                <div className="final-map-groups">
                  {TEAM_IDS.map((targetTeam) => (
                    <div className="final-map-group" key={targetTeam}>
                      <div
                        className={`final-group-title team-${targetTeam.toLowerCase()}`}
                      >
                        <strong>{TEAM_SHORT_NAMES[targetTeam]} 연구원</strong>
                        <span>입자 + 상태</span>
                      </div>
                      <div className="final-grid">
                        {participantsForTeam(targetTeam).map((participant) => {
                          const guess =
                            finalGuesses[activeFinalTeam][participant];
                          const finalResult = game.finalSubmissions.find(
                            (submission) =>
                              submission.team === activeFinalTeam,
                          );
                          const isCorrect =
                            finalResult?.correctIds.includes(participant);
                          return (
                            <div
                              className={`final-cell ${finalResult ? (isCorrect ? "is-correct" : "is-wrong") : ""}`}
                              key={participant}
                            >
                              <strong>{participant}</strong>
                              <select
                                aria-label={`${participant} 입자`}
                                value={guess.particle}
                                disabled={Boolean(finalResult)}
                                onChange={(event) =>
                                  updateFinalGuess(
                                    activeFinalTeam,
                                    participant,
                                    {
                                      particle: event.target
                                        .value as Particle,
                                    },
                                  )
                                }
                              >
                                <option value="">입자</option>
                                {PARTICLES.map((particle) => (
                                  <option value={particle} key={particle}>
                                    {particle}
                                  </option>
                                ))}
                              </select>
                              <select
                                aria-label={`${participant} 상태`}
                                value={guess.state}
                                disabled={Boolean(finalResult)}
                                onChange={(event) =>
                                  updateFinalGuess(
                                    activeFinalTeam,
                                    participant,
                                    {
                                      state: event.target
                                        .value as QuantumState,
                                    },
                                  )
                                }
                              >
                                <option value="">상태</option>
                                {QUANTUM_STATES.map((state) => (
                                  <option value={state} key={state}>
                                    {state}
                                  </option>
                                ))}
                              </select>
                              {finalResult && (
                                <span className="final-verdict">
                                  {isCorrect ? "✓" : "×"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {game.finalSubmissions.find(
                  (submission) => submission.team === activeFinalTeam,
                ) ? (
                  <div className="final-score-result">
                    <div>
                      <span>완전 일치</span>
                      <strong>
                        {
                          game.finalSubmissions.find(
                            (submission) =>
                              submission.team === activeFinalTeam,
                          )?.rawCorrect
                        }
                        /24
                      </strong>
                    </div>
                    <div>
                      <span>점수 반영</span>
                      <strong>
                        +
                        {
                          game.finalSubmissions.find(
                            (submission) =>
                              submission.team === activeFinalTeam,
                          )?.awardedPoints
                        }
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="panel-actions">
                    <span>24칸을 모두 입력하면 한 번에 채점됩니다.</span>
                    <button
                      className="primary-button"
                      disabled={game.round < 4}
                      onClick={() => submitFinalMap(activeFinalTeam)}
                    >
                      최종 지도 채점 &amp; 점수 반영
                    </button>
                  </div>
                )}
              </article>

              {game.finalSubmissions.length === 3 && (
                <article className="winner-panel">
                  <span className="winner-kicker">FINAL RESULT</span>
                  <h3>
                    {TEAM_SHORT_NAMES[
                      TEAM_IDS.reduce((winner, team) =>
                        game.scores[team] > game.scores[winner] ? team : winner,
                      )
                    ]}{" "}
                    최고 점수
                  </h3>
                  <div>
                    {TEAM_IDS.map((team) => (
                      <p key={team}>
                        <span>{TEAM_SHORT_NAMES[team]}</span>
                        <strong>{game.scores[team]}</strong>
                      </p>
                    ))}
                  </div>
                </article>
              )}
            </>
          )}

          {section === "cards" && (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">OFFICIAL DATA LEDGER</p>
                  <h2>공식 데이터 카드</h2>
                  <p>
                    시작정보·개인관측·보정법칙 카드의 통합 원장입니다. 인용교환
                    완료 카드는 자동으로 잠깁니다.
                  </p>
                </div>
                <div className="card-total">
                  <strong>{game.cards.length}</strong>
                  <span>CARDS</span>
                </div>
              </div>

              <div className="filter-bar">
                <div className="filter-group">
                  {(["all", ...TEAM_IDS] as const).map((filter) => (
                    <button
                      className={cardTeamFilter === filter ? "is-active" : ""}
                      onClick={() => setCardTeamFilter(filter)}
                      key={filter}
                    >
                      {filter === "all" ? "전체 팀" : TEAM_SHORT_NAMES[filter]}
                    </button>
                  ))}
                </div>
                <div className="filter-group">
                  {(
                    [
                      ["all", "전체 종류"],
                      ["start", "시작정보"],
                      ["observation", "개인관측"],
                      ["correction", "보정법칙"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      className={cardKindFilter === value ? "is-active" : ""}
                      onClick={() => setCardKindFilter(value)}
                      key={value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCards.length ? (
                <div className="card-ledger">
                  {filteredCards.map((card) => (
                    <article
                      className={`data-card team-${card.team.toLowerCase()} ${card.usedInTrade ? "is-used" : ""}`}
                      key={card.id}
                    >
                      <div className="data-card__top">
                        <span className="card-number">
                          #{String(card.id).padStart(3, "0")}
                        </span>
                        <CardTag card={card} />
                        <span
                          className={`team-pill team-${card.team.toLowerCase()}`}
                        >
                          {TEAM_SHORT_NAMES[card.team]}
                        </span>
                      </div>
                      <h3>{card.title}</h3>
                      <p>{card.body}</p>
                      <div className="data-card__footer">
                        <span>{card.round ? `ROUND ${card.round}` : "START"}</span>
                        <strong>
                          {card.usedInTrade ? "인용 완료 · 재사용 불가" : "교환 가능"}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>조건에 맞는 카드가 없습니다.</EmptyState>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
