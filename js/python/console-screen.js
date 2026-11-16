
(function () {
  "use strict";

  function draw(task, area) {
    const saved = Progress.get(task.id);   // what this browser has saved for the task, or null
    const editor = Editor.create({
      code: saved && saved.lastCode != null ? saved.lastCode : task.starterCode,
      starter: task.starterCode,
      onChange: function (code) { Progress.saveCode(task.id, task, code); }
    });
    area.append(editor.node, editor.note);
  }

  Shell.addType("console", draw);
})();