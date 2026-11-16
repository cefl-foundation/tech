
const QuickPractice = (function () {
  "use strict";

  // ---------- pure logic ----------

  // Which group of questions a task uses: its robot world if it has one,
  // and if not, its type ("console").
  function groupOf(task) {
    return task.world || task.type;
  }

  // Two questions for a task, chosen by the number at the end of its id:
  // "console-w3-01" gets questions 1 and 2, "console-w3-02" gets 3 and 4,
  // and so on. After the last question the count starts at the top again.
  function pick(questions, taskId) {
    if (!questions || questions.length === 0) { return []; }
    const number = /(\d+)$/.exec(taskId);
    const first = number ? (Number(number[1]) - 1) * 2 : 0;
    const two = [questions[first % questions.length]];
    if (questions.length > 1) { two.push(questions[(first + 1) % questions.length]); }
    return two;
  }

  // A typed answer without its capitals, spaces at the ends and punctuation.
  function tidy(text) {
    return String(text).trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "");
  }

  // Is this answer right? For "mc" the answer is the number of the chosen
  // option. For "gap" it is the text that was typed.
  function isRight(question, answer) {
    if (question.type === "mc") { return Number(answer) === question.answer; }
    return question.accept.includes(tidy(answer));
  }

  // ---------- the page ----------

  // One question, with its Check button and a place for the feedback.
  function questionBox(question, number) {
    const make = Dom.make;
    const form = make("form", "quick-item");
    const name = "quick-" + number;

    if (question.type === "mc") {
      // A group of radio buttons has a <fieldset> round it, and the
      // question is its <legend>: a screen reader then reads the question
      // with every option.
      const set = make("fieldset");
      const legend = make("legend");
      legend.innerHTML = Dom.code(question.q);   // safe: Dom.code() escapes the text
      set.appendChild(legend);
      question.options.forEach(function (option, i) {
        const radio = make("input");
        radio.type = "radio";
        radio.name = name;
        radio.value = i;
        const words = make("span");
        words.innerHTML = Dom.code(option);
        const label = make("label");
        label.append(radio, " ", words);
        set.appendChild(label);
      });
      form.appendChild(set);
    } else {
      const label = make("label");
      label.innerHTML = Dom.code(question.q);
      label.htmlFor = name;
      const box = make("input");
      box.type = "text";
      box.id = name;
      box.name = name;
      box.autocomplete = "off";
      box.placeholder = "type one word";
      form.append(label, box);
    }

    const feedback = make("p", "quick-feedback");
    feedback.setAttribute("role", "status");   // a screen reader reads it out when it changes
    form.append(make("button", "button black", "Check"), feedback);

    // The button is the form's submit button, so Enter in the text box
    // checks the answer too.
    form.addEventListener("submit", function (event) {
      event.preventDefault();   // do not send the form anywhere
      const answer = new FormData(form).get(name);   // the chosen option's number or the typed text; null when nothing is chosen
      if (answer === null || String(answer).trim() === "") {
        feedback.className = "quick-feedback";
        Dom.text(feedback, question.type === "mc" ? "Choose an answer first." : "Type an answer first.");
        return;
      }
      const right = isRight(question, answer);
      feedback.className = "quick-feedback " + (right ? "good" : "bad");
      feedback.innerHTML = "<b>" + (right ? "Correct." : "Not quite.") + "</b> " + Dom.code(question.why);
    });
    return form;
  }

  // Put this task's two questions on its page, just above the Previous
  // and Next buttons.
  function add(task, area) {
    Tasks.loadQuiz()
      .then(function (quiz) {
        const questions = pick(quiz[groupOf(task)], task.id);
        if (questions.length === 0) { return; }
        const box = Dom.make("section", "quick");
        box.append(
          Dom.make("h3", null, "Quick practice"),
          Dom.make("p", "quick-intro", "Two questions on the vocabulary of this section. They are not saved.")
        );
        questions.forEach(function (question, i) { box.appendChild(questionBox(question, i + 1)); });
        const column = area.parentNode;
        const pager = column.querySelector(".pager");
        if (pager) { pager.before(box); } else { column.appendChild(box); }
      })
      .catch(function (error) {
        console.error("The quick practice could not be shown.", error);   // the task itself still works
      });
  }

  // Only these names can be seen from outside this file.
  return { add: add, groupOf: groupOf, pick: pick, isRight: isRight };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands QuickPractice to the tests.
if (typeof module !== "undefined") { module.exports = QuickPractice; }