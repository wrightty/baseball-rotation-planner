import { useState, useEffect } from "react";

const INNINGS = 6;

const POSITIONS = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","Bench"
];

const INFIELD = ["P","C","1B","2B","3B","SS"];
const OUTFIELD = ["LF","CF","RF"];

export default function App() {
  const [rawNames, setRawNames] = useState("");
  const [allPlayers, setAllPlayers] = useState([]);
  const [activePlayers, setActivePlayers] = useState([]);
  const [grid, setGrid] = useState({});
  const [cellIssues, setCellIssues] = useState({});
  const [finalIssues, setFinalIssues] = useState([]);

  function handleGenerate() {
    const parsed = rawNames
      .split("\n")
      .map(n => n.trim())
      .filter(Boolean);

    setAllPlayers(parsed);
    setActivePlayers(parsed);

    const newGrid = {};
    parsed.forEach(p => {
      newGrid[p] = Array(INNINGS).fill("");
    });

    setGrid(newGrid);
    setCellIssues({});
    setFinalIssues([]);
  }

  function updateCell(player, inning, value) {
    const copy = { ...grid };
    copy[player][inning] = value;
    setGrid(copy);
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

  function togglePlayer(player) {
  setActivePlayers(prev =>
    prev.includes(player)
      ? prev.filter(p => p !== player)
      : [...prev, player]
  );
}

  function availablePositions(player, inning) {
    const used = new Set();

    activePlayers.forEach(p => {
      if (p === player) return;
      const pos = grid[p]?.[inning];
      if (pos && pos !== "Bench") used.add(pos);
    });

    const current = grid[player]?.[inning];

    return POSITIONS.filter(pos =>
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

  // ---- CATCHER RULE ----
  if (catching > 2) {
    issues.push("Catch limit");
  }

  // ---- PITCHING RULES ----
  if (pitching.length > 0) {
    const sorted = [...pitching].sort((a, b) => a - b);

    // max 2 innings
    if (sorted.length > 2) {
      issues.push("Pitch > 2 innings");
    }

    // must be consecutive if 2 innings
    if (sorted.length === 2 && sorted[1] !== sorted[0] + 1) {
      issues.push("Pitch not consecutive");
    }

    // must sit before or after pitching (unless last inning exception)
    const hasSitBefore = sorted.some(i =>
      grid[player]?.[i - 1] === "Bench"
    );

    const hasSitAfter = sorted.some(i =>
      grid[player]?.[i + 1] === "Bench"
    );

    const lastPitch = sorted[sorted.length - 1];
    const isLastInning = lastPitch === INNINGS - 1;

    if (!hasSitBefore && !hasSitAfter && !isLastInning) {
      issues.push("Pitch violation");
    }
  }

  return issues;
}

  function inningSummary(i) {
  let pitcher = "-";
  let catcher = "-";

  let infielders = 0;
  let outfielders = 0;

  activePlayers.forEach(player => {
    const pos = grid[player]?.[i];

    if (!pos || pos === "Bench") return;

    if (pos === "P") pitcher = player;
    else if (pos === "C") catcher = player;
    else if (["1B", "2B", "3B", "SS"].includes(pos)) infielders++;
    else if (["LF", "CF", "RF"].includes(pos)) outfielders++;
  });

  return { pitcher, catcher, infielders, outfielders };
}

  return (
    <div style={{ padding: 20 }}>
      <h2>Fielding Rotation Planner</h2>

      <textarea
        rows={6}
        value={rawNames}
        onChange={e => setRawNames(e.target.value)}
        placeholder="Players (one per line)"
      />

      <br />
      <button onClick={handleGenerate}>
        Generate
      </button>

      {activePlayers.length > 0 && (
        <>
          <p>
            Roster size: {activePlayers.length} <br />
            Required bench spots per inning: {benchPerInning()}
          </p>


        <div style={{ marginBottom: 20 }}>
  <h3>Roster (click to include/exclude)</h3>

  {allPlayers.map(player => {
    const active = activePlayers.includes(player);

    return (
      <button
        key={player}
        onClick={() => togglePlayer(player)}
        style={{
          margin: 4,
          padding: 6,
          background: active ? "#4caf50" : "#ccc",
          color: active ? "white" : "black",
          border: "none",
          cursor: "pointer"
        }}
      >
        {player}
      </button>
    );
  })}
</div>


          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Player</th>
                {Array.from({ length: INNINGS }).map((_, i) => (
                  <th key={i}>Inning {i + 1}</th>
                ))}
                <th>Status</th>
                <th>Bench</th>
              </tr>
            </thead>

            <tbody>
              {activePlayers.map(p => (
                <tr key={p}>
                  <td><b>{p}</b></td>

                  {Array.from({ length: INNINGS }).map((_, i) => {
                    const val = grid[p]?.[i] || "";
                    const issue = cellIssues[`${p}-${i}`];

                    return (
                      <td key={i} style={{ background: issue ? "#ffcccc" : "" }}>
                        <select
                          value={val}
                          onChange={e => updateCell(p, i, e.target.value)}
                        >
                          <option value="">-</option>
                          {availablePositions(p, i).map(pos => (
                            <option key={pos}>{pos}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}

                  <td>
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

<td style={{ textAlign: "center" }}>
  {benchCount(p)}
</td>
                </tr>
              ))}

              {/* INNING SUMMARY ROW */}
              <tr>
                <td><b>Summary</b></td>

                {Array.from({ length: INNINGS }).map((_, i) => {
                  const s = inningSummary(i);

                  return (
                    <td key={i} style={{ background: "#f5f5f5", fontSize: "12px" }}>
                      P: {s.pitcher}<br />
                      C: {s.catcher}<br />
                      IF: {s.infielders}<br />
                      OF: {s.outfielders}
                    </td>
                  );
                })}

                <td>-</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}