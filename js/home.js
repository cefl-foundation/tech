
(function () {
  "use strict";

  const clearButton = document.getElementById("clear-work");
  const message = document.getElementById("saved-message");

  // Write "3 of 13 done" on each card, adding up the weeks it names.
  function showCounts(index) {
    const rows = Progress.summary(index);   // one row per week
    for (const card of document.querySelectorAll(".card[data-weeks]")) {
      const weeks = card.getAttribute("data-weeks").split(",").map(Number);   // "6,7" -> [6, 7]
      let done = 0;
      let total = 0;
      for (const row of rows) {
        if (weeks.includes(row.week)) {
          done += row.done;
          total += row.total;
        }
      }
      // A card whose weeks have no tasks yet keeps the words it was typed with.
      if (total > 0) {
        Dom.text(card.querySelector(".count"), done + " of " + total + " done");
      }
    }
  }

  // Load the task list, then count. If it cannot load, the cards stay as typed.
  function refresh() {
    Tasks.loadIndex().then(showCounts).catch(function (error) {
      console.error("The task counts could not be shown.", error);
    });
  }

  // Ask first: clearing cannot be undone.
  function clearWork() {
    const sure = window.confirm("Clear all your saved work in this browser?\n\nYour code, your answers and your finished tasks will be removed. This cannot be undone.");
    if (!sure) { return; }
    if (Progress.clearAll()) {
      Dom.text(message, "Cleared. Nothing of yours is saved in this browser now.");
    } else {
      Dom.text(message, "Nothing was cleared: this browser did not allow it.");
    }
    refresh();
  }

  if (Progress.available()) {
    refresh();
    clearButton.addEventListener("click", clearWork);
  } else {
    // Nothing can be saved, so there is nothing to count and nothing to clear.
    clearButton.hidden = true;
    Dom.text(message, "This browser does not allow saving, so your work will be lost when you close the page.");
  }
})();