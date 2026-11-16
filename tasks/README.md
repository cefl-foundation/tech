# tasks/

Every practice task on the site is one JSON file in here. A page reads
`tasks/index.json` to know which tasks exist and in what order, then
fetches a task's own file when a student opens it. No build step: add a
file, add a line to the index, done.

```
tasks/
  index.json    the list of tasks, grouped by week (order matters)
  console/      type "console": Python programs that print text, week 3
  web/          types "html-editor", "inspect" and "walkthrough", weeks 6 and 7
  quiz.json     the questions of the quick vocabulary practice
```

The robot and AI tasks get folders of their own when they move in.

`tests/tasks.test.js` checks that the index and the files agree, and
`tests/python-solutions.test.js` checks the Python tasks themselves. Run
both from the repository folder with `node --test`.

## index.json

```json
{
  "weeks": [
    {
      "week": 6,
      "title": "The frontend: HTML, CSS and accessibility",
      "tasks": [
        {
          "id": "web-w6-01",
          "type": "html-editor",
          "file": "web/w6-01.json",
          "title": "Page structure and headings",
          "concept": "Elements, headings and the title tag"
        }
      ]
    }
  ]
}
```

`file` is relative to the `tasks/` folder. Spell it exactly as the file is
named: GitHub Pages treats `W6-01.json` and `w6-01.json` as two different
files, while a Mac finds either. `title` is repeated here so the task list
can be drawn without fetching every task file; it must be the same as the
title in the task's own file. `concept` is one short line shown under the
title in the task list.

## quiz.json

The quick vocabulary practice: two questions under every Python task.
They are not saved and do not count towards the task.

```json
{
  "console": [
    { "type": "mc", "q": "What is the type of the result of `7 / 2`?", "options": ["int", "float", "string", "boolean"], "answer": 1, "why": "…" },
    { "type": "gap", "q": "One repetition of a loop is called one ______.", "accept": ["iteration"], "why": "…" }
  ]
}
```

There is one group of questions for the console tasks (`console`) and one
for each robot world (`mars`, `warehouse`, `ocean`). A task shows two
questions from its group, chosen by the number at the end of its id: task
1 gets the first and second, task 2 the third and fourth, and so on,
starting at the top again after the last.

In an `mc` question, `answer` is the number of the right option, counted
from 0. In a `gap` question, `accept` lists every answer that counts as
right, in small letters. `why` is shown after the student checks an
answer. `tests/quiz.test.js` checks every question.

## Fields every web task has

| field | meaning |
|---|---|
| `id` | unique; used in the page address (`practice-web.html?task=web-w6-01`) |
| `week` | the teaching week it belongs to |
| `type` | `html-editor`, `inspect` or `walkthrough`. The index entry carries the same `type` |
| `title` | the task's name, the same as in the index |
| `concepts` | short tags: the ideas the task practises |
| `brief` | what to do. It is the only instruction the student sees, so make it complete. Separate paragraphs with a blank line (`\n\n`). A sample between two lines of three backticks is shown as code |
| `vocabulary` | terms with a one-line gloss; shown beside the brief |
| `hints` | revealed one at a time. Two to four while the site is being rebuilt; three each after the task-by-task review |

Inside a sentence of a `brief`, a hint or a gloss, text between two
backticks is shown as code:

    "hints": ["Use `print()` to show the text."]

Anyone can read these files on GitHub, solutions included, so put nothing
secret in them.

## `console`

A Python program that prints text and can ask the user to type. It runs in
MiniPy, the site's own small Python (`js/python/minipy.js`), and it is
judged by what it prints. Console tasks open on `practice-python.html`.

```json
{
  "id": "console-w3-04",
  "week": 3,
  "type": "console",
  "title": "Add two numbers",
  "brief": "…",
  "vocabulary": [{ "term": "convert", "gloss": "…" }],
  "starterCode": "\"\"\"\nFile: add2numbers.py\n…\n\"\"\"\n\n\ndef main():\n    pass\n\n\nif __name__ == '__main__':\n    main()\n",
  "tests": [
    { "stdin": ["9", "17"], "expectedStdout": "Enter first number: 9\nEnter second number: 17\nThe total is 26.\n" }
  ],
  "requires": [
    { "pattern": "\\bint\\s*\\(", "message": "Convert the text with `int()`." }
  ],
  "hints": ["…", "…"],
  "reflect": "Why does the program need int() and str()?",
  "solution": "…"
}
```

`id`, `week`, `type`, `title`, `brief`, `vocabulary` and `hints` are as
for a web task. A console task has no `concepts`: the one line under its
title comes from `concept` in the index.

| field | meaning |
|---|---|
| `starterCode` | what is in the code box when the task opens. Write `\n` for each new line, and end with one. The code box locks everything above the first `def` and everything from the `if __name__` line down (`js/python/editor-lock.js`). A line `File: name.py` in the docstring gives the name shown on the code box |
| `tests` | see below. Every test must pass for the task to be complete |
| `requires` | (optional) what the code itself must contain, such as a `for` loop. `pattern` is a regular expression, kept as text because JSON cannot hold a pattern: write every `\` twice. `message` is shown when the output is right but the code does not match the pattern |
| `reflect` | the reflection question for the task. The task page does not show it yet |
| `solution` | a correct program: the whole file, starter lines included |

### Tests

Each test runs the student's whole program once. `stdin` is the list of
answers that `input()` gets, in order. `expectedStdout` is everything the
terminal shows: what the program prints and, after each prompt, the
answer that was typed. `name` (optional) is shown to the student beside
the test's number.

`match` (optional) chooses how the output is compared with
`expectedStdout`:

| `match` | passes when |
|---|---|
| left out | the two are the same once spaces at the end of a line and blank lines at the end are ignored. Use this unless you need another rule |
| `exact` | the output is exactly `expectedStdout`, character for character |
| `trimmed` | the same once spaces and blank lines at both ends are ignored |
| `contains` | `expectedStdout` appears anywhere in the output |
| `regex` | the output matches `expectedStdout` as a JavaScript regular expression with the `m` flag, so `^` and `$` match the start and end of any line |

When a test with no `match` fails, the student sees the expected output
beside their own, and one sentence about the first difference.

`tests/python-solutions.test.js` checks three things for every console
task: the solution passes, the starter code does not, and the solution
prints the same in real Python as in MiniPy.

## `html-editor`

```json
"starterHtml": "<!DOCTYPE html>…", "starterCss": "body { … }",
"checks": [
  { "label": "There is exactly one h1", "kind": "count", "selector": "h1", "exact": 1 },
  { "label": "At least three paragraphs", "kind": "count", "selector": "p", "min": 3 },
  { "label": "The page has a title", "kind": "title" },
  { "label": "The h1 is not black", "kind": "style", "selector": "h1", "property": "color", "notIn": ["rgb(0, 0, 0)"] },
  { "label": "Text is at least 18px", "kind": "style", "selector": "p", "property": "font-size", "min": 18 }
]
```

The checks run against the live preview every time it updates. `count`
takes `exact`, `min` and/or `max`; `style` reads the computed style of the
first matching element and takes `equals`, `notIn` (a list of values that
fail) or `min` (numeric, in px); `title` passes when `<title>` is not
empty. `solutionHtml` / `solutionCss` are for the teachers' page.

Three more kinds, added for the second round of tasks (w6-07 to w6-09):

```json
{ "label": "Every input has a label", "kind": "labelled", "selector": "input" },
{ "label": "Every image has alt text", "kind": "every", "selector": "img", "matches": "[alt]:not([alt=''])" },
{ "label": "Paragraph text has enough contrast", "kind": "contrast", "selector": "p", "min": 4.5 }
```

`labelled` passes when every form control matching `selector` is either
inside a `<label>` or has an `id` that some `<label for="…">` points at.
`every` passes when every element matching `selector` also matches the
CSS selector in `matches` (and there is at least one). `contrast` works
out the WCAG contrast ratio between the text colour of the first matching
element and the first solid background behind it (walking up its parents;
white if none) and passes at `min` or above: 4.5 is the rule for normal
text, 3 for large text.

## `inspect`

```json
"sample": "samples/cafe-site.html",
"problems": [
  { "id": "alt", "label": "An image has no alt text", "why": "model answer shown after Reveal" },
  { "id": "d1",  "label": "The page has no <title>", "decoy": true }
]
```

`displayUrl` (optional) is the address shown in the pretend browser
window around the sample page, e.g. `thecornercafe.example.com`; without
it the window shows the file path.

The sample page must mark each real problem with `data-flaw="…"` so
`samples/reveal.js` can outline it when the page is loaded with
`?reveal=1`. Items with `"decoy": true` are not problems on that page;
ticking one fails the check. Complete when every real problem is ticked
with a sentence of at least four words and no decoy is ticked.

The `data-flaw` value is also the key of the label `reveal.js` writes
under the outlined element, so a new kind of flaw needs a line in its
`LABELS` table. The kinds so far: `alt`, `heading`, `contrast`,
`divbutton`, `label` (the cafe, gym and library), then `badalt`,
`clickhere`, `tiny`, `colouronly` (the students' union page) and
`lowcontrast`, `noth`, `iconlink` (the repair shop). Each sample page has
its own look on purpose: a new one should not borrow another's
stylesheet, so students see that the same problems hide in very
different-looking sites.

## `walkthrough`

`steps` (each `{term, title, text}`: the term is shown in bold inside
the text), `matching` (each `{term, definition}`; definitions are shown in
a fixed shuffled order with a dropdown of all terms) and `writingPrompt`.
Complete when all matches are right and the writing has at least 15
words.

Optional wording, so the box at the top can be something other than an
address bar: `urlLabel` (default "Type a website address and press
Enter"), `urlPlaceholder` ("www.beds.ac.uk"), `goLabel` ("Go") and
`writingHint`, the advice added when the writing is too short ("Say what
it is, then what it does."). The login walkthrough (w7-02) uses all
four.
