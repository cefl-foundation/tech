
(function () {
  "use strict";

  // The five positions of the speed control, slow on the left. DELAYS is
  // the pause after each robot command, in milliseconds. SPEED_WORDS says
  // the same for a screen reader: the slider only knows the numbers 0 to 4.
  const DELAYS = [900, 450, 220, 80, 0];
  const SPEED_WORDS = ["very slow", "slow", "medium", "fast", "no pauses"];

  // With no pause, this many commands run in one go before the page is drawn.
  const BATCH = 100;

  // ---------- the HTML of the screen ----------

  // The commands and sensors of one world, as a list that opens.
  function commandsHtml(theme) {
    const names = theme.cmds;
    return `
      <details class="robot-commands">
        <summary>What ${Dom.esc(theme.robotName)} can do</summary>
        <div class="robot-commands-lists">
          <div>
            <h3>${Dom.esc(theme.robotName)} can</h3>
            <ul><li><code>move()</code>, <code>turn_left()</code></li><li><code>${names.pick}()</code>, <code>${names.put}()</code></li></ul>
          </div>
          <div>
            <h3>It can check</h3>
            <ul>
              <li><code>front_is_clear()</code>, <code>front_is_blocked()</code></li>
              <li><code>left_is_clear()</code>, <code>right_is_clear()</code>, and the same with <code>_blocked()</code></li>
              <li><code>${names.present}()</code>, <code>${names.absent}()</code></li>
              <li><code>facing_north()</code>, <code>facing_east()</code>, <code>facing_south()</code>, <code>facing_west()</code></li>
            </ul>
          </div>
        </div>
      </details>`;
  }

  function screenHtml(theme, goalNote) {
    return `
      <div class="robot-stage">
        <div class="worlds">
          <div class="worldbox">
            <h2>Now</h2>
            <div id="now-picture"></div>
            <p class="world-note" id="now-where"></p>
            <details class="world-words"><summary>The picture in words</summary><p id="now-words"></p></details>
          </div>
          <div class="worldbox goal">
            <h2>Goal</h2>
            <div id="goal-picture"></div>
            <p class="world-note">${Dom.esc(goalNote)}</p>
            <details class="world-words"><summary>The picture in words</summary><p id="goal-words"></p></details>
          </div>
        </div>
        <div class="py-runrow">
          <button type="button" class="button primary" id="robot-run">Run</button>
          <button type="button" class="button black" id="robot-check">Run and check</button>
          <button type="button" class="button" id="robot-stop" disabled>Stop</button>
          <label class="robot-speed">Speed <span aria-hidden="true">slow</span>
            <input type="range" id="robot-speed" min="0" max="${DELAYS.length - 1}" value="2"> <span aria-hidden="true">fast</span></label>
        </div>
        <p class="robot-status" id="robot-status" role="status"></p>
      </div>
      ${commandsHtml(theme)}
      <div id="robot-editor"></div>
      <p class="robot-tip">Ctrl + Enter also runs and checks.</p>
      <div class="py-terminal" id="robot-output" hidden><div class="py-terminal-bar">Terminal</div><pre class="py-terminal-screen" tabindex="0" role="region" aria-label="Terminal: what your program printed"></pre></div>`;
  }

  // ---------- one task ----------

  // Draw the screen for one task in the right-hand column of the page.
  function draw(task, area) {
    const theme = RobotWorld.WORLDS[task.world];
    const goal = task.goal;
    const ending = goal.robot ? `must finish on this square${goal.robot.dir ? ", facing this way" : ""}` : "can finish on any square";
    area.innerHTML = screenHtml(theme, `${theme.robotName} ${ending}.`);

    const stage = area.querySelector(".robot-stage");
    const stop = document.getElementById("robot-stop");
    const speed = document.getElementById("robot-speed");
    const status = document.getElementById("robot-status");
    const output = document.getElementById("robot-output");

    // The code box, with the code this browser has saved for the task.
    const saved = Progress.get(task.id);
    const editor = Editor.create({
      code: saved && saved.lastCode != null ? saved.lastCode : task.starterCode,
      starter: task.starterCode,
      onChange: function (code) { Progress.saveCode(task.id, task, code); }
    });
    document.getElementById("robot-editor").append(editor.node, editor.note);

    let world = RobotWorld.make(task.map);
    let runNumber = 0;   // goes up for every run and every Stop: an older run sees it and gives up

    // ---------- drawing ----------

    // The goal never changes, so it is drawn once.
    const goalWorld = RobotWorld.goalWorld(task);
    const goalOptions = { label: "The goal", describedBy: "goal-words", showRobot: Boolean(goal.robot), anyDirection: Boolean(goal.robot) && !goal.robot.dir };
    document.getElementById("goal-picture").innerHTML = RobotRender.picture(goalWorld, task.world, goalOptions);
    Dom.text(document.getElementById("goal-words"), RobotRender.describe(goalWorld, theme, goalOptions));

    // The world as it is now: the picture, the line under it and the description.
    function showWorld() {
      document.getElementById("now-picture").innerHTML = RobotRender.picture(world, task.world, { label: "The world now", describedBy: "now-words" });
      let where = `${theme.robotName} is in ${RobotRender.where(world)}`;
      if (world.bag > 0) { where += `, carrying ${world.bag} ${world.bag === 1 ? theme.item : theme.items}`; }
      Dom.text(document.getElementById("now-where"), where + (world.crashed ? ". It has crashed." : "."));
      Dom.text(document.getElementById("now-words"), RobotRender.describe(world, theme));
    }

    // The message under the buttons, as plain text (it may quote the student's
    // code). kind is "good", "bad" or "neutral". A screen reader reads it out.
    function say(kind, title, message) {
      status.className = `robot-status ${kind}`;
      Dom.clear(status);
      status.append(Dom.make("strong", null, title), " " + message);
      fitStage();
    }

    // The pictures and buttons stay at the top of the window while the
    // page is scrolled, if they fill less than half of it (the message
    // does not count). The browser is told how tall the stage is, so
    // that Tab never scrolls a button underneath it.
    function fitStage() {
      const sticks = stage.offsetHeight - status.offsetHeight < window.innerHeight / 2;
      stage.classList.toggle("sticks", sticks);
      document.documentElement.style.scrollPaddingTop = sticks ? `${stage.offsetHeight + 12}px` : "";
    }

    // An error as a sentence, with the line of the student's mistake marked.
    function showError(error, title) {
      let kind = "bad";
      let message = String((error && error.message) || error);
      if (error instanceof RobotWorld.RobotError) {
        message = error.msg + (error.line ? ` The command is on line ${error.line}.` : "");
      } else if (error && error.kind === "NotInMiniPy") {
        // Real Python that this site does not use: not the student's mistake.
        kind = "neutral";
        title = "Not on this site.";
        message = error.msg + (error.line ? ` It is on line ${error.line}.` : "");
      } else if (error && error.kind) {
        message = `${error.kind}${error.line ? ` on line ${error.line}` : ""}: ${error.msg}`;
      }
      if (error && error.line && kind === "bad") { editor.markLine(error.line); }
      say(kind, title, message);
    }

    // ---------- running ----------

    function setRunning(on) {
      // A button that is switched off cannot keep the keyboard focus.
      if (!on && document.activeElement === stop) { document.getElementById("robot-run").focus(); }
      stop.disabled = !on;
    }

    // Run the program from the start. check: also compare the end with the goal.
    function run(check) {
      runNumber += 1;
      const thisRun = runNumber;
      const code = editor.getCode();

      Shell.clearVerdict();
      editor.markLine(0);
      setRunning(false);
      output.hidden = true;
      Dom.text(output.querySelector("pre"), "");
      world = RobotWorld.make(task.map);
      showWorld();

      let runner;
      try {
        runner = new MiniPy.Runner(code, {
          builtins: RobotWorld.builtins(world, theme),
          onPrint: function (text) {
            output.hidden = false;
            output.querySelector("pre").textContent += text;
          }
        });
      } catch (error) {
        finish(error, "Python could not read the program.");
        return;
      }
      if (!ConsoleCheck.hasMain(code)) {
        if (check) { Progress.recordAttempt(task.id, task); }
        say("bad", "No main function.", "Every program here needs a main() function. The last two lines of the file call it.");
        return;
      }

      const program = runner.run();
      setRunning(true);
      say("neutral", "Running.", "Press Stop to end the program early.");
      // The first command waits too, so that the start can be seen.
      setTimeout(step, DELAYS[Number(speed.value)]);

      // Do the next command, or the next few, then draw and wait.
      function step() {
        if (thisRun !== runNumber) { return; }   // Stop was pressed, or a newer run began
        const delay = DELAYS[Number(speed.value)];
        let result;
        try {
          for (let i = 0; i < (delay === 0 ? BATCH : 1); i++) {
            result = program.next();
            if (result.done) { break; }
          }
        } catch (error) {
          finish(error);
          return;
        }
        showWorld();
        if (result.done) { finish(null); } else { setTimeout(step, delay); }
      }

      // The run is over. A checked run counts as one try, as on the console
      // screen, unless Python that this site does not have stopped it.
      function finish(error, title) {
        setRunning(false);
        showWorld();
        if (check && !(error && error.kind === "NotInMiniPy")) { Progress.recordAttempt(task.id, task); }
        if (error) {
          showError(error, title || (error instanceof RobotWorld.RobotError ? "The program stopped." : "The program stopped with an error."));
          return;
        }
        if (!check) {
          say("neutral", "Finished.", "The program ran to the end. Use Run and check to compare the result with the goal.");
          return;
        }
        const problem = RobotWorld.checkGoal(world, task);
        if (problem) {
          say("bad", "Not there yet.", problem);
          return;
        }
        const missing = ConsoleCheck.missing(task, code);
        if (missing.length > 0) {
          say("neutral", "The goal is reached, but read the brief again.", "");
          // A message of the task file can hold code between two ` marks.
          status.insertAdjacentHTML("beforeend", Dom.code(missing.join(" ")));
          return;
        }
        say("good", "Task complete.", "The link to the next task is under your code.");
        Shell.taskPassed(`${theme.robotName} did exactly what the brief asked.`);
      }
    }

    // ---------- buttons and keys ----------

    document.getElementById("robot-run").addEventListener("click", function () { run(false); });
    document.getElementById("robot-check").addEventListener("click", function () { run(true); });

    stop.addEventListener("click", function () {
      runNumber += 1;
      setRunning(false);
      say("neutral", "Stopped.", "Press Run to start again from the beginning.");
    });

    // Ctrl + Enter (Cmd + Enter on a Mac) runs and checks from anywhere on
    // the page. With "true" this listener hears the key before the code box.
    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        run(true);
      }
    }, true);

    // The slider says its position in words to a screen reader.
    function nameSpeed() { speed.setAttribute("aria-valuetext", SPEED_WORDS[Number(speed.value)]); }
    speed.addEventListener("input", nameSpeed);

    // The stage changes its height when the window does, and when one of
    // the two descriptions is opened or closed.
    window.addEventListener("resize", fitStage);
    for (const words of stage.querySelectorAll("details")) { words.addEventListener("toggle", fitStage); }

    showWorld();
    nameSpeed();
    fitStage();
    QuickPractice.add(task, area);
  }

  // Tell the shell: when a robot task opens, call draw(task, area).
  Shell.addType("robot", draw);
})();