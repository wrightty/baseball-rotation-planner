import { useState, useEffect } from "react";

const INNINGS = 6;

const POSITIONS = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","Bench"
];

const INFIELD = ["P","C","1B","2B","3B","SS"];
const OUTFIELD = ["LF","CF","RF"];

export default function App() {
  const [rawNames, setRawNames] = useState("");
  const [players, setPlayers] = useState([]);
  const [grid, setGrid] = useState({});
  const [cellIssues, setCellIssues] = useState({});
  const [finalIssues, setFinalIssues] = useState([]);

  function handleGenerate() {
    const parsed = rawNames
      .split("\n")
      .map(n => n.trim())
      .filter(Boolean);

    setPlayers(parsed);

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

  function benchPerInning() {
    return Math.max(players.length - 9, 0);
  }

  function availablePositions(player, inning) {
    const used = new Set();

    players.forEach(p => {
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

    players.forEach(p => {
      stats[p] = { infield: 0, outfield: 0, pitching: [] };
    });

    for (let i = 0; i < INNINGS; i++) {
      const used = {};

      players.forEach(p => {
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
    players.forEach(p => {
      if (stats[p].pitching.length > 2) {
        stats[p].pitching.forEach(i => {
          issues[`${p}-${i}`] = "Too many pitching innings";
        });
      }
    });

    setCellIssues(issues);
  }, [grid, players]);

  function playerStatus(player) {
    const issues = [];

    let infield = 0;
    let outfield = 0;
    let pitching = [];

    for (let i = 0; i < INNINGS; i++) {
      const pos = grid[player]?.[i];
      if (INFIELD.includes(pos)) infield++;
      if (OUTFIELD.includes(pos)) outfield++;
      if (pos === "P") pitching.push(i);
    }

    if (infield === 0) issues.push("No IF");
    if (outfield === 0) issues.push("No OF");
    if (pitching.length > 2) issues.push("Pitch issue");

    return issues;
  }

  function inningSummary(i) {
  let pitcher = "-";
  let catcher = "-";

  let infielders = 0;
  let outfielders = 0;

  players.forEach(player => {
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

      {players.length > 0 && (
        <>
          <p>
            Roster size: {players.length} <br />
            Required bench spots per inning: {benchPerInning()}
          </p>

          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Player</th>
                {Array.from({ length: INNINGS }).map((_, i) => (
                  <th key={i}>Inning {i + 1}</th>
                ))}
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {players.map(p => (
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
                    {playerStatus(p).length === 0
                      ? "✅"
                      : "⚠️ " + playerStatus(p).join(", ")
                    }
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