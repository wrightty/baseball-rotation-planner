import { useState, useEffect } from "react";

const INNINGS = 6;

const POSITIONS = [
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

const INFIELD = ["P", "C", "1B", "2B", "3B", "SS"];
const OUTFIELD = ["LF", "CF", "RF"];

export default function App() {
  const [rawNames, setRawNames] = useState("");
  const [players, setPlayers] = useState([]);
  const [grid, setGrid] = useState({});
  const [cellIssues, setCellIssues] = useState({});
  const [finalIssues, setFinalIssues] = useState([]);

  // Generate roster + empty grid
  function handleGenerate() {
    const parsed = rawNames
      .split("\n")
      .map(n => n.trim())
      .filter(Boolean);

    setPlayers(parsed);

    const newGrid = {};

    parsed.forEach(player => {
      newGrid[player] = Array(INNINGS).fill("");
    });

    setGrid(newGrid);
    setCellIssues({});
    setFinalIssues([]);
  }

  // Update a player's inning position
  function updateCell(player, inning, value) {
    const newGrid = { ...grid };
    newGrid[player][inning] = value;
    setGrid(newGrid);
  }

  // Available positions for an inning
  function availablePositions(player, inning) {
    const usedPositions = new Set();

    players.forEach(p => {
      if (p === player) return;

      const pos = grid[p]?.[inning];
      if (pos && pos !== "Bench") {
        usedPositions.add(pos);
      }
    });

    const current = grid[player]?.[inning] || "";

    return POSITIONS.filter(pos => {
      if (pos === "Bench") return true;
      return !usedPositions.has(pos) || pos === current;
    });
  }

  // REAL-TIME VALIDATION
  useEffect(() => {
    const issues = {};

    const stats = {};

    players.forEach(player => {
      stats[player] = {
        pitching: [],
        catching: 0,
        bench: [],
      };
    });

    // Gather stats
    players.forEach(player => {
      for (let inning = 0; inning < INNINGS; inning++) {
        const pos = grid[player]?.[inning];

        if (!pos) continue;

        if (pos === "P") {
          stats[player].pitching.push(inning);
        }

        if (pos === "C") {
          stats[player].catching++;
        }

        if (pos === "Bench") {
          stats[player].bench.push(inning);
        }
      }
    });

    // Validate inning duplicates
    for (let inning = 0; inning < INNINGS; inning++) {
      const used = {};

      players.forEach(player => {
        const pos = grid[player]?.[inning];

        if (!pos || pos === "Bench") return;

        if (used[pos]) {
          issues[`${player}-${inning}`] =
            "Duplicate position in inning";
        } else {
          used[pos] = true;
        }
      });
    }

    // Catcher max
    players.forEach(player => {
      if (stats[player].catching > 3) {
        stats[player].pitching.forEach(inning => {
          issues[`${player}-${inning}`] =
            "Exceeded catcher max";
        });
      }
    });

    // Pitching validation
    const benchExists = players.length > 9;

    players.forEach(player => {
      const pitching = stats[player].pitching;

      if (pitching.length === 0) return;

      // Max 2 innings
      if (pitching.length > 2) {
        pitching.forEach(inning => {
          issues[`${player}-${inning}`] =
            "Cannot pitch more than 2 innings";
        });
        return;
      }

      // Consecutive innings if pitching 2
      if (
        pitching.length === 2 &&
        pitching[1] !== pitching[0] + 1
      ) {
        pitching.forEach(inning => {
          issues[`${player}-${inning}`] =
            "Pitching innings must be consecutive";
        });
      }

      // Must sit after pitching unless final inning
      if (benchExists) {
        const lastPitch = pitching[pitching.length - 1];

        if (lastPitch < INNINGS - 1) {
          const satAfter =
            grid[player]?.[lastPitch + 1] === "Bench";

          if (!satAfter) {
            pitching.forEach(inning => {
              issues[`${player}-${inning}`] =
                "Must sit immediately after pitching";
            });
          }
        }

        // Cannot pitch again after sitting
        let satAfterPitching = false;

        for (let inning = 0; inning < INNINGS; inning++) {
          const pos = grid[player]?.[inning];

          if (pos === "Bench" && inning > lastPitch) {
            satAfterPitching = true;
          }

          if (
            satAfterPitching &&
            pos === "P"
          ) {
            issues[`${player}-${inning}`] =
              "Cannot pitch again after sitting";
          }
        }
      }
    });

    setCellIssues(issues);

  }, [grid, players]);

  // FINAL VALIDATION BUTTON
  function checkFinalValidation() {
    const issues = [];

    const stats = {};

    players.forEach(player => {
      stats[player] = {
        infield: 0,
        outfield: 0,
        bench: 0
      };
    });

    players.forEach(player => {
      for (let inning = 0; inning < INNINGS; inning++) {
        const pos = grid[player]?.[inning];

        if (INFIELD.includes(pos)) {
          stats[player].infield++;
        }

        if (OUTFIELD.includes(pos)) {
          stats[player].outfield++;
        }

        if (pos === "Bench") {
          stats[player].bench++;
        }
      }
    });

    // Infield / outfield minimums
    players.forEach(player => {
      if (stats[player].infield < 1) {
        issues.push(
          `${player} never played infield`
        );
      }

      if (stats[player].outfield < 1) {
        issues.push(
          `${player} never played outfield`
        );
      }
    });

    // Bench fairness
    const benchCounts = Object.values(stats).map(
      s => s.bench
    );

    const minBench = Math.min(...benchCounts);
    const maxBench = Math.max(...benchCounts);

    if (maxBench - minBench > 1) {
      issues.push(
        "Bench time is not evenly distributed"
      );
    }

    setFinalIssues(issues);
  }

  // Cell coloring
  function getCellColor(position, hasIssue) {
    if (hasIssue) return "#ffb3b3";

    switch (position) {
      case "P":
        return "#ffd6d6";

      case "C":
        return "#ffe0b3";

      case "1B":
      case "2B":
      case "3B":
      case "SS":
        return "#d6eaff";

      case "LF":
      case "CF":
      case "RF":
        return "#d6ffd6";

      case "Bench":
        return "#dddddd";

      default:
        return "";
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>11U Fielding Rotation Planner</h1>

      <textarea
        rows={10}
        cols={30}
        placeholder="Enter one player per line"
        value={rawNames}
        onChange={e => setRawNames(e.target.value)}
      />

      <br />
      <br />

      <button onClick={handleGenerate}>
        Generate Grid
      </button>

      {players.length > 0 && (
        <>
          <br />
          <br />

          <table
            border="1"
            cellPadding="6"
            style={{
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th>Player</th>

                {Array.from({
                  length: INNINGS
                }).map((_, inning) => (
                  <th key={inning}>
                    Inning {inning + 1}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {players.map(player => (
                <tr key={player}>
                  <td>
                    <strong>{player}</strong>
                  </td>

                  {Array.from({
                    length: INNINGS
                  }).map((_, inning) => {
                    const value =
                      grid[player]?.[inning] || "";

                    const issue =
                      cellIssues[
                        `${player}-${inning}`
                      ];

                    return (
                      <td key={inning}>
                        <select
                          value={value}
                          onChange={e =>
                            updateCell(
                              player,
                              inning,
                              e.target.value
                            )
                          }
                          style={{
                            backgroundColor:
                              getCellColor(
                                value,
                                !!issue
                              )
                          }}
                        >
                          <option value="">
                            --
                          </option>

                          {availablePositions(
                            player,
                            inning
                          ).map(pos => (
                            <option
                              key={pos}
                              value={pos}
                            >
                              {pos}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <button onClick={checkFinalValidation}>
            Check Rotation
          </button>

          {finalIssues.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Issues</h3>

              <ul>
                {finalIssues.map(
                  (issue, index) => (
                    <li
                      key={index}
                      style={{
                        color: "red"
                      }}
                    >
                      {issue}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}