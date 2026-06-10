import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import {
  DndContext,
  closestCenter
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const INFIELD = ["P", "C", "1B", "2B", "3B", "SS"];

const AGE_RULES = {
  "9U": {
    innings: 5,
    maxPitchInnings: 0,
    maxCatchInnings: 999,
    maxInfieldInnings: 3,
    outfieldPositions: ["LF", "LCF", "RCF", "RF"],
    enforcePitchRules: false
  },

  "11U": {
    innings: 6,
    maxPitchInnings: 2,
    maxCatchInnings: 3,
    maxInfieldInnings: 999,
    outfieldPositions: ["LF", "CF", "RF"],
    enforcePitchRules: true
  },

  "13U": {
    innings: 7,
    maxPitchInnings: 3,
    maxCatchInnings: 4,
    maxInfieldInnings: 999,
    outfieldPositions: ["LF", "CF", "RF"],
    enforcePitchRules: true
  }
};

function SortableRow({ player, index, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: player });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <tr ref={setNodeRef} style={style}>

  <td className="dragColumn">
    <button
      type="button"
      className="dragHandle"
      {...attributes}
      {...listeners}
    >
      ☰
    </button>
  </td>

<td className="stickyCol">
  <div
    className="playerLabel"
    style={{
      color: "black",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center"
    }}
  >
    <span
      className="battingNumber"
      style={{
        color: "black",
        fontWeight: "bold"
      }}
    >
      {index + 1}.
    </span>

    <span
      className="playerNameText"
      style={{
        color: "black",
        fontWeight: "bold"
      }}
    >
      {player}
    </span>
  </div>
</td>

  {children}
</tr>
  );
}


export default function App() {
  const [rawNames, setRawNames] = useState("");
  const [allPlayers, setAllPlayers] = useState([]);
  const [activePlayers, setActivePlayers] = useState([]);
  const [grid, setGrid] = useState({});
  const [cellIssues, setCellIssues] = useState({});
  const [finalIssues, setFinalIssues] = useState([]);
  const [page, setPage] = useState("roster");
  const [games, setGames] = useState([]);
  const [currentGameId, setCurrentGameId] = useState("");
  const [gameName, setGameName] = useState("");

  const AGE_LEVELS = ["9U", "11U", "13U"];

  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [ageLevel, setAgeLevel] = useState("11U");
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [newGameName, setNewGameName] = useState("");

  const INNINGS = AGE_RULES[ageLevel]?.innings || 6;
  const OUTFIELD =
    AGE_RULES[ageLevel]?.outfieldPositions || ["LF", "CF", "RF"];


  function handleDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = activePlayers.indexOf(active.id);
    const newIndex = activePlayers.indexOf(over.id);

    setActivePlayers(arrayMove(activePlayers, oldIndex, newIndex));
  }

  function getPositions() {

    if (ageLevel === "9U") {
      return [
        "P",
        "C",
        "1B",
        "2B",
        "3B",
        "SS",
        "LF",
        "LCF",
        "RCF",
        "RF",
        "Bench"
      ];
    }

    return [
      "P",
      "C",
      "1B",
      "2B",
      "3B",
      "SS",
      "LF",
      "CF",
      "RF",
      "Bench"
    ];
  }

  function cleanTeamCode(code) {
    return code.trim().toUpperCase().replace(/\s+/g, "-");
  }

  async function createGame() {
    if (!teamLoaded || !teamCode) return;

    const trimmedGameName = newGameName.trim() || "New Game";
    if (gameNameExists(trimmedGameName)) {
      alert("A game with that name already exists. Choose a different name.");
      return;
    }
    const newGameId = crypto.randomUUID();

    const emptyGrid = {};

    activePlayers.forEach(player => {
      emptyGrid[player] = Array(INNINGS).fill("");
    });

    try {
      await setDoc(
        doc(db, "teams", teamCode, "games", newGameId),
        {
          gameName: trimmedGameName,
          activePlayers,
          grid: emptyGrid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      setCurrentGameId(newGameId);
      setGrid(emptyGrid);
      setGameName(trimmedGameName);
      setNewGameName("");

      await loadGames();
    } catch (err) {
      console.error("Error creating game:", err);
    }
  }

  async function loadGames(code = teamCode) {
    if (!code) return;

    try {
      const snap = await getDocs(
        collection(db, "teams", code, "games")
      );

      const loadedGames = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setGames(loadedGames);
    } catch (err) {
      console.error("Error loading games:", err);
    }
  }

  async function duplicateCurrentGame() {
    if (!teamLoaded || !teamCode || !currentGameId) return;

    const trimmedGameName = newGameName.trim();

    if (!trimmedGameName) {
      alert("Enter a new game name before duplicating.");
      return;
    }

    if (gameNameExists(trimmedGameName)) {
      alert("A game with that name already exists. Choose a different name.");
      return;
    }

    if (!trimmedGameName) {
      alert("Enter a new game name before duplicating.");
      return;
    }

    const newGameId = crypto.randomUUID();

    try {
      await setDoc(
        doc(db, "teams", teamCode, "games", newGameId),
        {
          gameName: trimmedGameName,
          activePlayers,
          grid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      setCurrentGameId(newGameId);
      setGameName(trimmedGameName);
      setNewGameName("");

      await loadGames(teamCode);
    } catch (err) {
      console.error("Error duplicating game:", err);
    }
  }

  async function loadGame(gameId) {
    const snap = await getDoc(
      doc(db, "teams", teamCode, "games", gameId)
    );

    if (!snap.exists()) return;

    const data = snap.data();

    setCurrentGameId(gameId);
    setGameName(data.gameName || "");
    setActivePlayers(data.activePlayers || allPlayers);
    setGrid(data.grid || {});
  }

  async function saveGameData() {
    if (!teamLoaded || !teamCode || !currentGameId) return;

    await setDoc(
      doc(db, "teams", teamCode, "games", currentGameId),
      {
        gameName,
        activePlayers,
        grid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  useEffect(() => {
    if (!currentGameId) return;
    saveGameData();
  }, [activePlayers, grid, gameName, currentGameId]);

  async function createTeam() {
    const cleanedCode = cleanTeamCode(teamCode);

    if (!teamName.trim()) {
      setTeamError("Enter a team name.");
      return;
    }

    if (!cleanedCode) {
      setTeamError("Enter an access code.");
      return;
    }

    try {
      const ref = doc(db, "teams", cleanedCode);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setTeamError("That access code already exists. Choose another one.");
        return;
      }

      await setDoc(ref, {
        teamName: teamName.trim(),
        teamCode: cleanedCode,
        ageLevel,
        roster: [],
        activePlayers: [],
        grid: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setTeamCode(cleanedCode);
      setAllPlayers([]);
      setActivePlayers([]);
      setGrid({});
      setRawNames("");
      setTeamLoaded(true);
      setTeamError("");
      setPage("roster");

      localStorage.setItem("teamCode", cleanedCode);
    } catch (err) {
      console.error(err);
      setTeamError("Could not create team.");
    }
  }

  async function loadTeam() {
    const cleanedCode = cleanTeamCode(teamCode);

    if (!cleanedCode) {
      setTeamError("Enter an access code.");
      return;
    }

    try {
      const ref = doc(db, "teams", cleanedCode);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setTeamError("No team found with that access code.");
        return;
      }

      const data = snap.data();
      const loadedRoster = data.roster || [];

      setTeamCode(cleanedCode);
      setTeamName(data.teamName || "");
      setAgeLevel(data.ageLevel || "11U");
      setAllPlayers(loadedRoster);
      setActivePlayers(data.activePlayers || loadedRoster);
      setGrid(data.grid || {});
      setRawNames(loadedRoster.join("\n"));
      setTeamLoaded(true);

      setTeamError("");
      setPage(loadedRoster.length > 0 ? "rotation" : "roster");

      localStorage.setItem("teamCode", cleanedCode);
      await loadGames(cleanedCode);
    } catch (err) {
      console.error(err);
      setTeamError("Could not load team.");
    }
  }

  async function saveTeamData() {
    if (!teamLoaded || !teamCode) return;

    try {
      await setDoc(
        doc(db, "teams", teamCode),
        {
          teamName,
          teamCode,
          ageLevel,
          roster: allPlayers,
          activePlayers,
          grid,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
    }
  }


  useEffect(() => {
    if (!teamLoaded) return;
    saveTeamData();
  }, [allPlayers, activePlayers, grid, ageLevel, teamLoaded]);

  useEffect(() => {
    const savedCode = localStorage.getItem("teamCode");

    if (savedCode) {
      setTeamCode(savedCode);
    }
  }, []);

  function gameNameExists(name) {
    return games.some(
      game => game.gameName?.trim().toLowerCase() === name.trim().toLowerCase()
    );
  }

  function clearPositions() {

    const cleared = {};

    activePlayers.forEach(player => {
      cleared[player] = Array(INNINGS).fill("");
    });

    setGrid(cleared);

  }

  function handleGenerate() {

    const parsed = rawNames
      .split("\n")
      .map(n => n.trim())
      .filter(Boolean);

    setAllPlayers(parsed);
    setActivePlayers(parsed);

    setGrid(prev => {

      const updated = { ...prev };

      // add missing players
      parsed.forEach(player => {

        if (!updated[player]) {
          updated[player] = Array(INNINGS).fill("");
        }

      });

      // remove players no longer in roster
      Object.keys(updated).forEach(player => {

        if (!parsed.includes(player)) {
          delete updated[player];
        }

      });

      return updated;

    });

    setCellIssues({});
    setFinalIssues([]);
    saveTeamData();
    setPage("rotation");

  }

  function printRotation() {
  window.print();
}

function updateCell(player, inning, value) {
  setGrid(prev => {
    const updated = { ...prev };

    if (!updated[player]) {
      updated[player] = Array(INNINGS).fill("");
    }

    updated[player][inning] = value;

    return updated;
  });
}

  function benchCount(player) {
    let count = 0;

    for (let i = 0; i < INNINGS; i++) {
      if (grid[player]?.[i] === "Bench") {
        count++;
      }
    }

    return count;
  }

  function benchPerInning() {
    return Math.max(activePlayers.length - 9, 0);
  }

  function howManySits(){
    return ((benchPerInning() * 6) / activePlayers.length );
  }
function togglePlayer(player) {
  setActivePlayers(prev => {
    const isActive = prev.includes(player);

    if (isActive) {
      return prev.filter(p => p !== player);
    }

    setGrid(prevGrid => {
      const updated = { ...prevGrid };

      if (!updated[player]) {
        updated[player] = Array(INNINGS).fill("");
      }

      return updated;
    });

    return [...prev, player];
  });
}

  function availablePositions(player, inning) {
    const used = new Set();

    activePlayers.forEach(p => {
      if (p === player) return;
      const pos = grid[p]?.[inning];
      if (pos && pos !== "Bench") used.add(pos);
    });

    const current = grid[player]?.[inning];

    return getPositions().filter(pos =>
      pos === "Bench" ||
      !used.has(pos) ||
      pos === current
    );
  }

  useEffect(() => {
    const issues = {};
    const stats = {};

    activePlayers.forEach(p => {
      stats[p] = { infield: 0, outfield: 0, pitching: [] };
    });

    for (let i = 0; i < INNINGS; i++) {
      const used = {};

      activePlayers.forEach(p => {
        const pos = grid[p]?.[i];
        if (!pos || pos === "Bench") return;

        if (used[pos]) {
          issues[`${p}-${i}`] = "Duplicate position";
        } else {
          used[pos] = true;
        }

        if (INFIELD.includes(pos)) stats[p].infield++;
        if (OUTFIELD.includes(pos)) stats[p].outfield++;
        if (pos === "P") stats[p].pitching.push(i);
      });
    }

    // simple pitch rule
    activePlayers.forEach(p => {
      if (stats[p].pitching.length > 2) {
        stats[p].pitching.forEach(i => {
          issues[`${p}-${i}`] = "Too many pitching innings";
        });
      }
    });

    setCellIssues(issues);
  }, [grid, activePlayers]);

  function playerStatus(player) {
    const issues = [];

    let infield = 0;
    let outfield = 0;
    let pitching = [];
    let catching = 0;

    for (let i = 0; i < INNINGS; i++) {
      const pos = grid[player]?.[i];

      if (INFIELD.includes(pos)) infield++;
      if (OUTFIELD.includes(pos)) outfield++;

      if (pos === "P") pitching.push(i);
      if (pos === "C") catching++;
    }

    // ---- FIELDING COVERAGE ----
    if (infield === 0) issues.push("No IF");
    if (outfield === 0) issues.push("No OF");

    if (
      ageLevel === "9U" &&
      infield > AGE_RULES["9U"].maxInfieldInnings
    ) {
      issues.push("IF > 3 innings");
    }

    // ---- CATCHER RULE ----
    if (catching > AGE_RULES[ageLevel].maxCatchInnings) {
      issues.push("Catch limit");
    }

    // ---- PITCHING RULES ----
    if (
      AGE_RULES[ageLevel].enforcePitchRules &&
      pitching.length > 0
    ) {
      const sorted = [...pitching].sort((a, b) => a - b);

      if (
        sorted.length >
        AGE_RULES[ageLevel].maxPitchInnings
      ) {
        issues.push("Pitch > 2 innings");
      }

      for (let i = 1; i < sorted.length; i++) {

        if (sorted[i] !== sorted[i - 1] + 1) {
          issues.push("Pitch not consecutive");
          break;
        }

      }

      const firstPitch = sorted[0];
      const lastPitch = sorted[sorted.length - 1];

      const satAnytimeBefore =
        grid[player]
          ?.slice(0, firstPitch)
          .includes("Bench");

      const satImmediatelyAfter =
        lastPitch < INNINGS - 1 &&
        grid[player]?.[lastPitch + 1] === "Bench";

      const finalInningException =
        lastPitch === INNINGS - 1;

      if (
        !satAnytimeBefore &&
        !satImmediatelyAfter &&
        !finalInningException
      ) {
        issues.push("Pitch violation");
      }
    }

    for (let i = 1; i < INNINGS; i++) {
      if (
        grid[player]?.[i] === "Bench" &&
        grid[player]?.[i - 1] === "Bench"
      ) {
        issues.push("Consecutive bench");
        break;
      }
    }

    if (violatesBenchFairness(player)) {
      issues.push("Bench imbalance");
    }

    return issues;
  }

  function violatesBenchFairness(player) {

    const playerBenchCount = benchCount(player);

    for (const otherPlayer of activePlayers) {

      if (otherPlayer === player) continue;

      const otherBenchCount = benchCount(otherPlayer);

      if (playerBenchCount > otherBenchCount + 1) {
        return true;
      }
    }

    return false;
  }

  function inningSummary(i) {
    let pitcher = "-";
    let catcher = "-";

    let infielders = 0;
    let outfielders = 0;
    let bench = 0;

    activePlayers.forEach(player => {
      const pos = grid[player]?.[i];

      if (!pos) return;

      if (pos === "P") pitcher = player;
      else if (pos === "C") catcher = player;
      else if (["1B", "2B", "3B", "SS"].includes(pos)) infielders++;
      else if (["LF", "CF", "RF"].includes(pos)) outfielders++;
      else if (pos === "Bench") bench++;
    });

    return { pitcher, catcher, infielders, outfielders, bench };
  }


  function getRequiredFielders() {
    return ageLevel === "9U" ? 10 : 9;
  }

  function getBenchTarget() {
    return Math.max(activePlayers.length - getRequiredFielders(), 0);
  }

  function countPosition(player, positions) {
    return grid[player]?.filter(pos => positions.includes(pos)).length || 0;
  }

  function getUsedPositionsInInning(inning, draftGrid) {
    const used = new Set();

    activePlayers.forEach(player => {
      const pos = draftGrid[player]?.[inning];

      if (pos && pos !== "Bench") {
        used.add(pos);
      }
    });

    return used;
  }

  function getBenchCountInInning(inning, draftGrid) {
    return activePlayers.filter(
      player => draftGrid[player]?.[inning] === "Bench"
    ).length;
  }


  function fillEmptySpots() {
    const draftGrid = structuredClone(grid);

    activePlayers.forEach(player => {
      if (!draftGrid[player]) {
        draftGrid[player] = Array(INNINGS).fill("");
      }
    });

    for (let inning = 0; inning < INNINGS; inning++) {
      const positions = getPositions().filter(pos => pos !== "Bench");
      const usedPositions = getUsedPositionsInInning(inning, draftGrid);
      const availablePositions = positions.filter(pos => !usedPositions.has(pos));

      let benchNeeded = getBenchTarget() - getBenchCountInInning(inning, draftGrid);

      const emptyPlayers = activePlayers.filter(player => {
        return !draftGrid[player]?.[inning];
      });

      const sortedPlayers = [...emptyPlayers].sort((a, b) => {
        const benchDiff = benchCount(a) - benchCount(b);
        if (benchDiff !== 0) return benchDiff;

        const aNeedsOF = countPosition(a, OUTFIELD) === 0 ? -1 : 0;
        const bNeedsOF = countPosition(b, OUTFIELD) === 0 ? -1 : 0;
        if (aNeedsOF !== bNeedsOF) return aNeedsOF - bNeedsOF;

        const aNeedsIF = countPosition(a, INFIELD) === 0 ? -1 : 0;
        const bNeedsIF = countPosition(b, INFIELD) === 0 ? -1 : 0;
        return aNeedsIF - bNeedsIF;
      });

      // Assign bench first
      for (const player of sortedPlayers) {
        if (benchNeeded <= 0) break;

        const satLastInning =
          inning > 0 && draftGrid[player]?.[inning - 1] === "Bench";

        if (!satLastInning) {
          draftGrid[player][inning] = "Bench";
          benchNeeded--;
        }
      }

      // Fill remaining empty players with open positions
      const stillEmpty = activePlayers.filter(player => !draftGrid[player]?.[inning]);

      for (const player of stillEmpty) {
        if (availablePositions.length === 0) break;

        let chosenPosition = availablePositions[0];

        if (countPosition(player, OUTFIELD) === 0) {
          const outfieldChoice = availablePositions.find(pos =>
            OUTFIELD.includes(pos)
          );

          if (outfieldChoice) chosenPosition = outfieldChoice;
        } else if (countPosition(player, INFIELD) === 0) {
          const infieldChoice = availablePositions.find(pos =>
            INFIELD.includes(pos)
          );

          if (infieldChoice) chosenPosition = infieldChoice;
        }

        draftGrid[player][inning] = chosenPosition;

        const index = availablePositions.indexOf(chosenPosition);
        if (index !== -1) {
          availablePositions.splice(index, 1);
        }
      }
    }

    setGrid(draftGrid);
  }


  return (
    <div className="app">
      <h2>Fielding Rotation Planner</h2>

      {!teamLoaded && (
        <div className="pageSection">
          <h3>Open Team</h3>

          <input
            value={teamCode}
            onChange={e => setTeamCode(e.target.value)}
            placeholder="Enter team access code"
          />

          <button className="appButton" onClick={loadTeam}>
            Load Team
          </button>

          <h3>Create New Team</h3>

          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name"
          />

          <input
            value={teamCode}
            onChange={e => setTeamCode(e.target.value)}
            placeholder="Create access code"
          />

          <select
            value={ageLevel}
            onChange={e => setAgeLevel(e.target.value)}
          >
            {AGE_LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <button className="appButton" onClick={createTeam}>
            Create Team
          </button>

          {teamError && <p style={{ color: "red" }}>{teamError}</p>}
        </div>
      )}

      {teamLoaded && (
        <>
          <div className="navButtons">
            <button
              className={page === "rotation" ? "navButton activeNav" : "navButton"}
              onClick={() => setPage("rotation")}
              disabled={allPlayers.length === 0}
            >
              Rotation
            </button>

            <button
              className={page === "roster" ? "navButton activeNav" : "navButton"}
              onClick={() => setPage("roster")}
            >
              Roster
            </button>
          </div>

          {page === "roster" && (
            <div className="pageSection">
              <h3>Main Roster</h3>

              <textarea
                rows={8}
                value={rawNames}
                onChange={e => setRawNames(e.target.value)}
                placeholder="Players (one per line)"
              />

              <div className="buttonRow">
                <button className="appButton" onClick={handleGenerate}>
                  Save / Update Roster
                </button>
              </div>
            </div>
          )}


          {page === "rotation" && allPlayers.length > 0 && (
            <div className="pageSection">


              <div className="gamePanel">
                <h3>Games</h3>

                <input
                  value={newGameName}
                  onChange={e => setNewGameName(e.target.value)}
                  placeholder="New game name"
                />



                <button className="appButton" onClick={createGame}>
                  Create Blank Game
                </button>

                <button
                  className="appButton"
                  onClick={duplicateCurrentGame}
                  disabled={!currentGameId}
                >
                  Duplicate Current Game
                </button>

                <select
                  value={currentGameId}
                  onChange={e => loadGame(e.target.value)}
                >
                  <option value="">Select saved game</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.gameName || "Unnamed Game"}
                    </option>
                  ))}
                </select>
              </div>


              {currentGameId ? (
                <>

                  <div className="rosterPanel">
                    <h3>Roster</h3>
                    <p className="hint">Tap a player to include/exclude them.</p>

                    <div className="playerToggleWrap">
                      {allPlayers.map(player => {
                        const active = activePlayers.includes(player);

                        return (
                          <button
                            key={player}
                            onClick={() => togglePlayer(player)}
                            className={active ? "playerToggle active" : "playerToggle inactive"}
                          >
                            {player}
                          </button>
                        );
                      })}
                    </div>
                  </div>

<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    margin: "20px 0",
    flexWrap: "wrap"
  }}
>
  <div
    style={{
      border: "1px solid #ddd",
      padding: "12px 24px",
      textAlign: "center",
      whiteSpace: "nowrap"
    }}
  >
    <strong>Roster size:</strong> {activePlayers.length}
    <br />
    <strong>Required bench spots per inning:</strong> {benchPerInning()}
    <br />
    <strong>Total sits per player:</strong> {howManySits()}
  </div>

  <div
    style={{
      display: "flex",
      gap: "12px"
    }}
  >
    <button className="appButton" onClick={clearPositions}>
      Clear Positions
    </button>

    <button className="appButton" onClick={fillEmptySpots}>
      Fill Empty Spots
    </button>

    <button className="appButton" onClick={printRotation}>
  Print / Export
</button>
  </div>
</div>

             {activePlayers.length > 0 && (
  <div className="tableWrap">
    <table className="rotationTable printableRotation">
      <thead>
        <tr>
         <th className="dragColumn"></th>
<th className="stickyCol">Player</th>
          {Array.from({ length: INNINGS }).map((_, i) => (
            <th key={i}>Inning {i + 1}</th>
          ))}
          <th>Status</th>
          <th>Bench</th>
        </tr>
      </thead>

      <tbody>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activePlayers}
            strategy={verticalListSortingStrategy}
          >
            {activePlayers.map((p, index) => (
              <SortableRow key={p} player={p} index={index}>
                {Array.from({ length: INNINGS }).map((_, i) => {
                  const val = grid[p]?.[i] || "";
                  const issue = cellIssues[`${p}-${i}`];

                  return (
                    <td
                      key={i}
                      className={issue ? "issueCell" : ""}
                    >
                      <select
                        className="positionSelect"
                        value={val}
                        onChange={e => updateCell(p, i, e.target.value)}
                      >
                        <option value="">-</option>
                        {availablePositions(p, i).map(pos => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}

                <td className="statusCell">
                  {(() => {
                    const issues = playerStatus(p);

                    if (issues.length === 0) return "✅";

                    const priority =
                      issues.includes("Pitch violation")
                        ? "⚠️ Pitch violation"
                        : "⚠️ " + issues.join(", ");

                    return priority;
                  })()}
                </td>

                <td className="benchCountCell">
                  {benchCount(p)}
                </td>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>

        <tr className="guestRow">
  <td className="dragColumn"></td>

  <td className="stickyCol">
    <b>    </b>
  </td>

  {Array.from({ length: INNINGS }).map((_, i) => (
    <td key={i}>
      <select className="positionSelect">
        <option value="">-</option>

        {getPositions().map(pos => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>
    </td>
  ))}

  <td>-</td>
  <td>-</td>
</tr>

        <tr className="summaryRow">
          <td className="dragColumn"></td>

<td className="stickyCol">
  <b>Summary</b>
</td>

          {Array.from({ length: INNINGS }).map((_, i) => {
            const s = inningSummary(i);

            return (
              <td key={i} className="summaryCell">
                <div><strong>P:</strong> {s.pitcher}</div>
                <div><strong>C:</strong> {s.catcher}</div>
                <div><strong>IF:</strong> {s.infielders}</div>
                <div><strong>OF:</strong> {s.outfielders}</div>
                <div><strong>Bench:</strong> {s.bench}</div>
              </td>
            );
          })}

          <td>-</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  </div>
)}

{activePlayers.length === 0 && (
  <p className="hint">
    No active players selected. Tap players above to include them for this game.
  </p>
)}
</>
) : (
  <p className="hint">
    Create or select a game to begin editing the rotation.
  </p>
)}

</div>
)}


        </>
      )}
    </div>
  );
}