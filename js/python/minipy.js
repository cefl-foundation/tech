/* MiniPy - a small Python subset interpreter for teaching tasks.
   Supports: def/return, if/elif/else, while, for..in range(), assignment (+= -= *=),
   int/float/str/bool, + - * / // % comparisons and/or/not, print/input/int/str/float/len,
   `import`/`from .. import ..` (ignored), `if __name__ == '__main__':`.
   Execution is a generator so the page can animate robot steps.            */
var MiniPy = (function () {
  'use strict';

  // ---------- errors and numbers ----------

  // Every mistake MiniPy finds becomes a PyError. It carries three things:
  //   kind  Python's own name for the kind of mistake, such as "SyntaxError"
  //   msg   a sentence for the student
  //   line  the line of the program where it happened
  // The page shows all three. The tests check them.
  function PyError(kind, msg, line) { this.kind = kind; this.msg = msg; this.line = line; }
  // All three in one sentence:
  // "ZeroDivisionError (line 2): division by zero"
  PyError.prototype.toString = function () { return this.kind + (this.line ? ' (line ' + this.line + ')' : '') + ': ' + this.msg; };

  // A decimal number, such as 3.5. Python has two kinds of number, int and
  // float, but JavaScript has only one. So MiniPy keeps a whole number as a
  // plain JavaScript number and wraps a decimal number in a PyFloat. That is
  // how it can tell 4.0 from 4.
  function PyFloat(v) { this.v = v; }

  // The words that belong to Python itself. The tokenizer labels each of
  // them KW (keyword) and every other word NAME.
  var KEYWORDS = { 'def': 1, 'if': 1, 'elif': 1, 'else': 1, 'while': 1, 'for': 1, 'in': 1, 'return': 1, 'pass': 1, 'and': 1, 'or': 1, 'not': 1, 'True': 1, 'False': 1, 'None': 1, 'import': 1, 'from': 1, 'break': 1, 'continue': 1 };

  /* ---------------- tokenizer ---------------- */
  // The tokenizer cuts the text of a program into tokens: small labelled
  // pieces. Each token is an object with
  //   t     its type: NAME, KW, NUMBER, STRING, OP, NEWLINE, INDENT, DEDENT or EOF
  //   v     its text, when it has one: "move", "while", "3.5", "("
  //   line  the line it came from, so that an error can say where it is
  //
  // The line "    move()" becomes  INDENT, NAME move, OP (, OP ), NEWLINE.
  //
  // Python shows a block by its indentation, where other languages use
  // brackets. The tokenizer turns the spaces at the start of a line into
  // two tokens that the parser can read like brackets:
  //   INDENT  a block starts here
  //   DEDENT  a block ends here
  function tokenize(src) {
    // Split the text into lines. Windows line endings (\r\n) and old Mac
    // ones (\r) become \n first.
    var lines = src.replace(/\r\n?/g, '\n').split('\n');
    // toks     the tokens found so far
    // indents  how far each open block is indented: a stack. It starts
    //          with 0, for the lines that are not indented at all.
    // depth    how many brackets are open. Inside brackets a statement may
    //          run over several lines, so line ends and indentation do
    //          not count there.
    var toks = [], indents = [0], depth = 0, i, ln;
    // inTriple is null, or the three quotes (""" or ''') of a string that
    // began on an earlier line and is still open.
    var inTriple = null; // {q, line}

    // One line of the program at a time. ln is its number, counted from 1.
    for (i = 0; i < lines.length; i++) {
      ln = i + 1;
      var line = lines[i];
      var pos = 0;

      // ----- the start of the line -----

      // Are we inside a string in triple quotes that began on an earlier
      // line? Then look for the three quotes that close it. A line without
      // them is skipped, so only the first line of such a string is kept.
      // The tasks use these strings as notes under a def line, and a note
      // does nothing when the program runs.
      if (inTriple) {
        var endIdx = line.indexOf(inTriple);
        if (endIdx < 0) continue;
        pos = endIdx + 3; inTriple = null;
        // rest of line is treated as continuation of a statement-level string; ignore remainder tokens rarely matter
        // Only spaces after the closing quotes: the statement ends here.
        if (line.slice(pos).trim() === '') { if (depth === 0) toks.push({ t: 'NEWLINE', line: ln }); continue; }
      } else {
        // indentation
        // m is the run of spaces and tabs at the start of the line.
        // stripped is the rest of the line.
        var m = /^[ \t]*/.exec(line)[0];
        var stripped = line.slice(m.length);
        // An empty line, a comment line and an import line give no tokens
        // at all. Import lines are skipped because the page hands the
        // robot's commands to MiniPy itself: there is nothing to import.
        if (stripped === '' || stripped[0] === '#' || /^(import|from)\s/.test(stripped)) continue; // blank/comment/import line
        // How far is the line indented? A space counts as 1. A tab moves
        // to the next multiple of 4. The answer is col. Inside brackets
        // this step is skipped.
        if (depth === 0) {
          var col = 0;
          for (var k = 0; k < m.length; k++) col += (m[k] === '\t') ? 4 - (col % 4) : 1;
          // Further in than the block we are in: a new block starts.
          // Remember how far it is indented and say INDENT.
          if (col > indents[indents.length - 1]) { indents.push(col); toks.push({ t: 'INDENT', line: ln }); }
          else {
            // Further out: close a block for every level the line has
            // left, and say DEDENT each time. Two blocks can end at once.
            while (col < indents[indents.length - 1]) { indents.pop(); toks.push({ t: 'DEDENT', line: ln }); }
            // The line must now sit exactly on a level that is still open.
            // If it sits between two levels, nobody can say which block
            // it belongs to.
            if (col !== indents[indents.length - 1]) throw new PyError('IndentationError', 'this line is indented by a different amount from the lines above it. Use 4 spaces for each level of indentation.', ln);
          }
        }
        pos = m.length;
      }

      // ----- the rest of the line, one token at a time -----

      // pos is the place we have reached in the line. Each branch below
      // knows one type of token by its first character. It adds the token
      // to toks and moves pos to the character after it.
      while (pos < line.length) {
        var c = line[pos];
        // Spaces between tokens mean nothing.
        if (c === ' ' || c === '\t') { pos++; continue; }
        // A # starts a comment: the rest of the line is not read.
        if (c === '#') break;

        // A quote starts a STRING, which ends at the next quote of the
        // same kind.
        if (c === '"' || c === "'") {
          // Three quotes in a row start a string in triple quotes. If it
          // closes on this line, it is an ordinary STRING. If it does not,
          // keep the text on this line and remember the quotes in inTriple.
          if (line.substr(pos, 3) === c + c + c) {
            var close = line.indexOf(c + c + c, pos + 3);
            if (close < 0) { inTriple = c + c + c; toks.push({ t: 'STRING', v: line.slice(pos + 3), line: ln }); pos = line.length; break; }
            toks.push({ t: 'STRING', v: line.slice(pos + 3, close), line: ln }); pos = close + 3; continue;
          }
          // An ordinary string. Copy its characters into s until the
          // closing quote. A backslash changes the character after it:
          // \n is a new line, \t is a tab, and \" is a quote that does
          // not end the string.
          var j = pos + 1, s = '';
          while (j < line.length && line[j] !== c) {
            if (line[j] === '\\' && j + 1 < line.length) { var e = line[j + 1]; s += (e === 'n' ? '\n' : e === 't' ? '\t' : e); j += 2; }
            else { s += line[j]; j++; }
          }
          // The line ended before the closing quote came.
          if (j >= line.length) throw new PyError('SyntaxError', 'this string is missing its closing quote ' + c, ln);
          toks.push({ t: 'STRING', v: s, line: ln }); pos = j + 1; continue;
        }

        // A digit starts a NUMBER. So does a dot with a digit after it
        // (.5). The token keeps the text "3.5". The parser turns it into
        // a number later.
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[pos + 1] || ''))) {
          var nm = /^(\d+\.\d*|\.\d+|\d+)/.exec(line.slice(pos))[0];
          toks.push({ t: 'NUMBER', v: nm, line: ln }); pos += nm.length; continue;
        }

        // A letter or an underscore starts a word, which goes on through
        // letters, digits and underscores. KEYWORDS decides: KW or NAME.
        if (/[A-Za-z_]/.test(c)) {
          var nmm = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(pos))[0];
          toks.push({ t: KEYWORDS[nmm] ? 'KW' : 'NAME', v: nmm, line: ln }); pos += nmm.length; continue;
        }

        // Anything else must be one of these symbols. The list is tried in
        // order, so the longer symbols come first: "//=" before "//", and
        // "==" before "=". If "=" came first, "==" would be read as two
        // "=" signs.
        var ops = ['//=', '==', '!=', '<=', '>=', '//', '+=', '-=', '*=', '/=', '(', ')', ',', ':', '=', '+', '-', '*', '/', '%', '<', '>', '[', ']'];
        var found = null;
        for (var o = 0; o < ops.length; o++) if (line.substr(pos, ops[o].length) === ops[o]) { found = ops[o]; break; }
        // No symbol fits: this character is not part of MiniPy's Python.
        if (!found) throw new PyError('SyntaxError', 'unexpected character "' + c + '"', ln);
        // Count the brackets that are open.
        if (found === '(' || found === '[') depth++;
        if (found === ')' || found === ']') depth = Math.max(0, depth - 1);
        toks.push({ t: 'OP', v: found, line: ln }); pos += found.length;
      }

      // The line is finished, so the statement is finished: NEWLINE. But
      // not inside brackets and not inside a string in triple quotes.
      // There the statement carries on, on the next line.
      if (depth === 0 && !inTriple) toks.push({ t: 'NEWLINE', line: ln });
    }

    // ----- after the last line -----

    // A bracket is still open.
    if (depth > 0) throw new PyError('SyntaxError', 'a bracket "(" was opened but never closed', lines.length);
    // Close every block that is still open, then mark the end of the
    // program with EOF ("end of file").
    while (indents.length > 1) { indents.pop(); toks.push({ t: 'DEDENT', line: lines.length }); }
    toks.push({ t: 'EOF', line: lines.length });
    return toks;
  }
  /* ---------------- parser ---------------- */
  // The parser turns the list of tokens into a tree that shows what
  // belongs to what. Every part of the tree is a node: an object whose k
  // says what kind of thing it is, with the line it came from.
  //
  //   move()            { k: 'expr', expr: { k: 'call', name: 'move', ... } }
  //   steps = 3         { k: 'assign', name: 'steps', op: '=', value: ... }
  //   if ...: / else:   { k: 'if', branches: [{ test, body }], orelse: ... }
  //
  // A body is a list of nodes, one for each line of the block. That is
  // how a block sits inside its if, and an if inside its def.
  //
  // The parser never runs anything. It only reads. It keeps the tokens
  // and i, the number of the next token it has not read yet.
  function Parser(toks) { this.toks = toks; this.i = 0; }

  // Four small tools that all the other functions use.

  // Look at a token without taking it: the next one, or the one k
  // places after it.
  Parser.prototype.peek = function (k) { return this.toks[this.i + (k || 0)]; };
  // Take the next token and move on.
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  // Is the next token of this type? And, if v is given, with this text?
  Parser.prototype.is = function (t, v) { var p = this.peek(); return p.t === t && (v === undefined || p.v === v); };
  // The next token has to be this one. Take it, or stop with a
  // SyntaxError that says what was expected and what was found instead.
  // what is the way to describe the expected token to a student.
  Parser.prototype.expect = function (t, v, what) {
    var p = this.peek();
    if (p.t === t && (v === undefined || p.v === v)) return this.next();
    var got = p.t === 'NEWLINE' ? 'the end of the line' : p.t === 'EOF' ? 'the end of the file' : p.t === 'INDENT' ? 'an indented line' : '"' + p.v + '"';
    throw new PyError('SyntaxError', 'expected ' + (what || (v ? '"' + v + '"' : t.toLowerCase())) + ' but found ' + got, p.line);
  };

  // The whole program: one statement after another until EOF.
  Parser.prototype.program = function () {
    var body = [];
    while (!this.is('EOF')) {
      // A NEWLINE with no statement in front of it: skip it.
      if (this.is('NEWLINE')) { this.next(); continue; }
      // An INDENT here means a line is indented with no block to be in.
      if (this.is('INDENT')) throw new PyError('IndentationError', 'unexpected indentation. This line should not be indented.', this.peek().line);
      body.push(this.statement());
    }
    return body;
  };

  // A block: the lines that belong to a def, if, elif, else, while or
  // for line. It starts after the colon and comes back as a list of nodes.
  // In tokens a block looks like this:  :  NEWLINE  INDENT  ...  DEDENT
  Parser.prototype.block = function () {
    this.expect('OP', ':', 'a colon ":" at the end of this line');
    // The short form, with the block on the same line as the colon.
    if (!this.is('NEWLINE')) { // single-line block  e.g. "if x: move()"
      var s = [this.simple()]; this.expect('NEWLINE'); return s;
    }
    // The usual form. Take the NEWLINE, then the INDENT must follow.
    this.next();
    while (this.is('NEWLINE')) this.next();
    if (!this.is('INDENT')) throw new PyError('IndentationError', 'expected an indented block after the colon. Indent the lines that belong inside it by 4 spaces.', this.peek().line);
    this.next();
    var body = [];
    // Read statements until the DEDENT that closes this block. A block
    // inside this one takes its own INDENT and DEDENT while it is read,
    // so the DEDENT we meet here is always ours.
    while (!this.is('DEDENT') && !this.is('EOF')) {
      if (this.is('NEWLINE')) { this.next(); continue; }
      body.push(this.statement());
    }
    if (this.is('DEDENT')) this.next();
    return body;
  };

  // One statement. def, if, while and for own a block, so they are read
  // here. Every other statement fits on one line: see simple().
  Parser.prototype.statement = function () {
    var p = this.peek();
    if (p.t === 'KW') {
      // def name(parameter, parameter):  followed by a block
      if (p.v === 'def') {
        this.next();
        var name = this.expect('NAME', undefined, 'a function name after "def"');
        this.expect('OP', '(', '"(" after the function name');
        var params = [];
        // The names between the brackets, with a comma after each but the last.
        while (!this.is('OP', ')')) { params.push(this.expect('NAME').v); if (this.is('OP', ',')) this.next(); }
        this.expect('OP', ')');
        var body = this.block();
        return { k: 'def', name: name.v, params: params, body: body, line: p.line };
      }
      // if test:  followed by a block, then any number of  elif test:
      // blocks, then perhaps an  else:  block. Each test goes into branches
      // with its block. The else block goes into orelse.
      if (p.v === 'if') {
        this.next();
        var node = { k: 'if', branches: [], orelse: null, line: p.line };
        node.branches.push({ test: this.expr(), body: this.block() });
        while (this.is('KW', 'elif')) { var e = this.next(); node.branches.push({ test: this.expr(), body: this.block(), line: e.line }); }
        if (this.is('KW', 'else')) { this.next(); node.orelse = this.block(); }
        return node;
      }
      // while test:  followed by a block
      if (p.v === 'while') { this.next(); var t = this.expr(); return { k: 'while', test: t, body: this.block(), line: p.line }; }
      // for name in something:  followed by a block. The something is
      // nearly always range(...).
      if (p.v === 'for') {
        this.next();
        var v = this.expect('NAME', undefined, 'a variable name after "for"');
        this.expect('KW', 'in', '"in"');
        var it = this.expr();
        return { k: 'for', v: v.v, iter: it, body: this.block(), line: p.line };
      }
      // An else or elif that is not straight after an if block.
      if (p.v === 'else' || p.v === 'elif') throw new PyError('SyntaxError', '"' + p.v + '" must come straight after an "if" block, at the same level of indentation', p.line);
    }
    // Not one of the four: a one-line statement. Nothing may follow it
    // on its line.
    var s = this.simple();
    if (!this.is('EOF')) this.expect('NEWLINE', undefined, 'the end of the line');
    return s;
  };

  // A statement that fits on one line.
  Parser.prototype.simple = function () {
    var p = this.peek();
    if (p.t === 'KW') {
      // Three statements that are one word each.
      if (p.v === 'pass') { this.next(); return { k: 'pass', line: p.line }; }
      if (p.v === 'break') { this.next(); return { k: 'break', line: p.line }; }
      if (p.v === 'continue') { this.next(); return { k: 'continue', line: p.line }; }
      // return, with a value after it or with nothing.
      if (p.v === 'return') { this.next(); var val = (this.is('NEWLINE') || this.is('EOF')) ? null : this.expr(); return { k: 'return', value: val, line: p.line }; }
      // An import that the tokenizer did not skip. Read to the end of
      // the line and do nothing.
      if (p.v === 'import' || p.v === 'from') { while (!this.is('NEWLINE') && !this.is('EOF')) this.next(); return { k: 'pass', line: p.line }; }
    }
    // An assignment: a name, then = or += -= *= /= //=, then a value.
    // The parser has to look two tokens ahead here, because the name
    // alone does not say whether this is  steps = 3  or  steps().
    if (p.t === 'NAME' && this.peek(1).t === 'OP' && ['=', '+=', '-=', '*=', '/=', '//='].indexOf(this.peek(1).v) >= 0) {
      this.next(); var op = this.next().v; var value = this.expr();
      return { k: 'assign', name: p.v, op: op, value: value, line: p.line };
    }
    // Anything else is a value on a line of its own. Most often it is a
    // call, such as move() or print("Hi").
    var e = this.expr();
    return { k: 'expr', expr: e, line: p.line };
  };

  // ----- values (expressions) -----

  // A value such as  2 + 3 * 4  or  not front_is_clear()  is read by a
  // ladder of functions. Each one calls the one below it first, so the
  // lower a function is, the more tightly its symbols hold their two sides:
  //
  //   expr      the top of the ladder
  //   orExpr    or
  //   andExpr   and
  //   notExpr   not
  //   compare   ==  !=  <  >  <=  >=
  //   arith     +  -
  //   term      *  /  //  %
  //   factor    a minus or plus sign in front of a value
  //   atom      one number, text, name or call, or a value in brackets
  //
  // In  2 + 3 * 4  arith asks term for its left side and gets 2. It sees
  // the +, and asks term for its right side. term reads 3, sees the *,
  // and reads 4 too. So  3 * 4  comes back as one node and becomes the
  // right side of the +. Nobody had to write a rule about which goes first.
  //
  // Most of these functions make a node { k: 'bin', op, l, r }: a symbol
  // with a left side and a right side. The while loop is for  1 + 2 + 3:
  // the node made so far becomes the left side of the next one.
  Parser.prototype.expr = function () { return this.orExpr(); };
  Parser.prototype.orExpr = function () { var l = this.andExpr(); while (this.is('KW', 'or')) { var t = this.next(); l = { k: 'bool', op: 'or', l: l, r: this.andExpr(), line: t.line }; } return l; };
  Parser.prototype.andExpr = function () { var l = this.notExpr(); while (this.is('KW', 'and')) { var t = this.next(); l = { k: 'bool', op: 'and', l: l, r: this.notExpr(), line: t.line }; } return l; };
  Parser.prototype.notExpr = function () { if (this.is('KW', 'not')) { var t = this.next(); return { k: 'not', e: this.notExpr(), line: t.line }; } return this.compare(); };
  // Two comparisons in a row, as in  0 <= mark <= 100, are read as
  // (0 <= mark) <= 100. Python reads them differently.
  Parser.prototype.compare = function () {
    var l = this.arith();
    while (this.is('OP') && ['==', '!=', '<', '>', '<=', '>='].indexOf(this.peek().v) >= 0) { var t = this.next(); l = { k: 'bin', op: t.v, l: l, r: this.arith(), line: t.line }; }
    // A single = here is the classic slip:  if steps = 3:
    if (this.is('OP', '=')) throw new PyError('SyntaxError', 'a single "=" assigns a value. To compare two values use "==" (two equals signs).', this.peek().line);
    return l;
  };
  Parser.prototype.arith = function () { var l = this.term(); while (this.is('OP', '+') || this.is('OP', '-')) { var t = this.next(); l = { k: 'bin', op: t.v, l: l, r: this.term(), line: t.line }; } return l; };
  Parser.prototype.term = function () { var l = this.factor(); while (this.is('OP') && ['*', '/', '//', '%'].indexOf(this.peek().v) >= 0) { var t = this.next(); l = { k: 'bin', op: t.v, l: l, r: this.factor(), line: t.line }; } return l; };
  // -5 becomes { k: 'unary', op: '-', e: the node for 5 }.
  Parser.prototype.factor = function () { if (this.is('OP', '-') || this.is('OP', '+')) { var t = this.next(); return { k: 'unary', op: t.v, e: this.factor(), line: t.line }; } return this.atom(); };

  // The bottom of the ladder: the smallest values.
  Parser.prototype.atom = function () {
    var p = this.next();
    // A number. With a decimal point it becomes a PyFloat. Without one it
    // stays a whole number.
    if (p.t === 'NUMBER') return { k: 'num', v: p.v.indexOf('.') >= 0 ? new PyFloat(parseFloat(p.v)) : parseInt(p.v, 10), line: p.line };
    // Text. Two pieces of text side by side are joined:  "a" "b"  is "ab".
    if (p.t === 'STRING') { var s = p.v; while (this.is('STRING')) s += this.next().v; return { k: 'str', v: s, line: p.line }; }
    if (p.t === 'KW' && p.v === 'True') return { k: 'const', v: true, line: p.line };
    if (p.t === 'KW' && p.v === 'False') return { k: 'const', v: false, line: p.line };
    if (p.t === 'KW' && p.v === 'None') return { k: 'const', v: null, line: p.line };
    // A value in brackets. The brackets leave no node of their own: they
    // only decide which values end up on which side of a symbol.
    if (p.t === 'OP' && p.v === '(') { var e = this.expr(); this.expect('OP', ')', 'a closing bracket ")"'); return e; }
    if (p.t === 'NAME') {
      // A name with a bracket after it is a call. Read the values between
      // the brackets (args). A value with a name and = in front, such as
      // end="" in print(), goes into kwargs.
      if (this.is('OP', '(')) {
        this.next(); var args = [], kwargs = {};
        while (!this.is('OP', ')')) {
          if (this.is('NAME') && this.peek(1).t === 'OP' && this.peek(1).v === '=') { var kn = this.next().v; this.next(); kwargs[kn] = this.expr(); }
          else args.push(this.expr());
          if (this.is('OP', ',')) this.next(); else if (!this.is('OP', ')')) throw new PyError('SyntaxError', 'expected "," or ")" inside the brackets of ' + p.v + '(...)', this.peek().line);
        }
        this.next();
        return { k: 'call', name: p.v, args: args, kwargs: kwargs, line: p.line };
      }
      // A name on its own: most often a variable.
      return { k: 'name', v: p.v, line: p.line };
    }
    // Anything else cannot start a value.
    if (p.t === 'KW') throw new PyError('SyntaxError', '"' + p.v + '" cannot be used here', p.line);
    var got = p.t === 'NEWLINE' ? 'the end of the line' : p.t === 'EOF' ? 'the end of the file' : p.t === 'INDENT' ? 'an indented line' : p.t === 'DEDENT' ? 'the end of the block' : '"' + p.v + '"';
    throw new PyError('SyntaxError', 'expected a value but found ' + got, p.line);
  };
  /* ---------------- values ---------------- */
  function typeName(v) {
    if (v === null || v === undefined) return 'NoneType';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'int';
    if (v instanceof PyFloat) return 'float';
    if (typeof v === 'string') return 'str';
    if (v && v.fn) return 'function';
    return 'object';
  }
  function repr(v, line) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return String(v);
    if (v instanceof PyFloat) { var s = String(v.v); if (/^-?\d+$/.test(s)) s += '.0'; return s; }
    if (typeof v === 'string') return v;
    if (v && v.fn) return '<function ' + v.name + '>';
    return String(v);
  }
  function num(v) { return v instanceof PyFloat ? v.v : v; }
  function isNum(v) { return typeof v === 'number' || v instanceof PyFloat || typeof v === 'boolean'; }
  function truthy(v) { if (v instanceof PyFloat) return v.v !== 0; return !!v; }

  function binop(op, a, b, line) {
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (typeof a === 'string' || typeof b === 'string') {
        var other = typeof a === 'string' ? b : a;
        throw new PyError('TypeError', 'can only concatenate str (not "' + typeName(other) + '") to str. Python cannot add text and a number together - wrap the number in str( ) first.', line);
      }
    }
    if (op === '*' && (typeof a === 'string' || typeof b === 'string')) {
      var s = typeof a === 'string' ? a : b, n = typeof a === 'string' ? b : a;
      if (typeof n === 'number') { var out = ''; for (var i = 0; i < n; i++) out += s; return out; }
    }
    if (['==', '!='].indexOf(op) >= 0) {
      var eq = (isNum(a) && isNum(b)) ? num(a) === num(b) : a === b;
      return op === '==' ? eq : !eq;
    }
    if (['<', '>', '<=', '>='].indexOf(op) >= 0) {
      if ((isNum(a) && isNum(b)) || (typeof a === 'string' && typeof b === 'string')) {
        var x = num(a), y = num(b);
        return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y;
      }
      throw new PyError('TypeError', "'" + op + "' not supported between " + typeName(a) + ' and ' + typeName(b), line);
    }
    if (!isNum(a) || !isNum(b)) throw new PyError('TypeError', 'unsupported operand type(s) for ' + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'", line);
    var fa = a instanceof PyFloat || b instanceof PyFloat, x2 = num(a) + 0, y2 = num(b) + 0, r;
    switch (op) {
      case '+': r = x2 + y2; break;
      case '-': r = x2 - y2; break;
      case '*': r = x2 * y2; break;
      case '/': if (y2 === 0) throw new PyError('ZeroDivisionError', 'division by zero', line); return new PyFloat(x2 / y2);
      case '//': if (y2 === 0) throw new PyError('ZeroDivisionError', 'division by zero', line); r = Math.floor(x2 / y2); break;
      case '%': if (y2 === 0) throw new PyError('ZeroDivisionError', 'division by zero', line); r = ((x2 % y2) + y2) % y2; break;
    }
    return fa ? new PyFloat(r) : r;
  }

  /* ---------------- interpreter ---------------- */
  function editDistance(a, b) {
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev.push(j);
    for (i = 1; i <= m; i++) { cur = [i]; for (j = 1; j <= n; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))); prev = cur; }
    return prev[n];
  }
  function Signal(type, value) { this.type = type; this.value = value; }

  function Runner(src, opts) {
    opts = opts || {};
    this.out = '';
    this.inputs = (opts.inputs || []).slice();
    this.builtins = {};
    this.globals = { '__name__': '__main__' };
    this.stepCount = 0;
    this.maxSteps = opts.maxSteps || 20000;
    this.onPrint = opts.onPrint || null;
    var self = this;
    var B = this.builtins;
    B['print'] = { fn: function (args, kw) {
      var sep = kw.sep !== undefined ? kw.sep : ' ', end = kw.end !== undefined ? kw.end : '\n';
      var text = args.map(function (a) { return repr(a); }).join(sep) + end;
      self.write(text); return null; } };
    B['input'] = { fn: function (args, kw, line) {
      var prompt = args.length ? repr(args[0]) : '';
      self.write(prompt);
      if (!self.inputs.length) throw new PyError('EOFError', 'the program asked for input() but there was nothing left to type in. Check the "Keyboard input" box.', line);
      var v = self.inputs.shift();
      self.write(v + '\n', true); return v; } };
    B['int'] = { fn: function (a, kw, line) {
      var v = a[0];
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v instanceof PyFloat) return Math.trunc(v.v);
      if (typeof v === 'string') { var t = v.trim(); if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10); throw new PyError('ValueError', "invalid literal for int() with base 10: '" + v + "'. int( ) can only convert text that looks like a whole number.", line); }
      throw new PyError('TypeError', 'int() cannot convert ' + typeName(v), line); } };
    B['float'] = { fn: function (a, kw, line) {
      var v = a[0];
      if (typeof v === 'number') return new PyFloat(v);
      if (v instanceof PyFloat) return v;
      if (typeof v === 'string') { var t = v.trim(); if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return new PyFloat(parseFloat(t)); throw new PyError('ValueError', "could not convert string to float: '" + v + "'", line); }
      throw new PyError('TypeError', 'float() cannot convert ' + typeName(v), line); } };
    B['str'] = { fn: function (a) { return a.length ? repr(a[0]) : ''; } };
    B['len'] = { fn: function (a, kw, line) { if (typeof a[0] === 'string') return a[0].length; throw new PyError('TypeError', "object of type '" + typeName(a[0]) + "' has no len()", line); } };
    B['abs'] = { fn: function (a) { return a[0] instanceof PyFloat ? new PyFloat(Math.abs(a[0].v)) : Math.abs(a[0]); } };
    B['round'] = { fn: function (a) { var n = num(a[0]); if (a.length > 1) { var d = Math.pow(10, a[1]); return new PyFloat(Math.round(n * d) / d); } return Math.round(n); } };
    B['type'] = { fn: function (a) { return "<class '" + typeName(a[0]) + "'>"; } };
    B['range'] = { fn: function (a, kw, line) {
      for (var i = 0; i < a.length; i++) if (typeof a[i] !== 'number') throw new PyError('TypeError', "'" + typeName(a[i]) + "' object cannot be interpreted as an integer. range( ) needs a whole number (an int).", line);
      var start = a.length > 1 ? a[0] : 0, stop = a.length > 1 ? a[1] : a[0], step = a.length > 2 ? a[2] : 1;
      if (stop === undefined) throw new PyError('TypeError', 'range() needs a number, e.g. range(4)', line);
      var out = []; if (step > 0) for (var x = start; x < stop; x += step) out.push(x); else if (step < 0) for (var y = start; y > stop; y += step) out.push(y);
      return { list: out }; } };
    if (opts.builtins) for (var k in opts.builtins) B[k] = opts.builtins[k];
    this.ast = new Parser(tokenize(src)).program();
  }
  Runner.prototype.write = function (t, isInput) { this.out += t; if (this.onPrint) this.onPrint(t, !!isInput); };
  Runner.prototype.tick = function (line) {
    if (++this.stepCount > this.maxSteps) throw new PyError('RuntimeError', 'the program has run more than ' + this.maxSteps + ' steps and was stopped. This usually means a loop never ends - check the condition of your while loop.', line);
  };
  Runner.prototype.run = function* () {
    var self = this;
    // define all functions first (hoisting like Python does when executed top-down is not exact, but this
    // lets `if __name__ == '__main__': main()` appear anywhere and mirrors what students see in class)
    for (var i = 0; i < this.ast.length; i++) {
      var s = this.ast[i];
      if (s.k === 'def') this.globals[s.name] = { fn: null, name: s.name, def: s };
    }
    var calledMain = false;
    for (var j = 0; j < this.ast.length; j++) {
      var st = this.ast[j];
      if (st.k === 'def') continue;
      if (st.k === 'if' && !calledMain) calledMain = true;
      var sig = yield* this.execStmt(st, this.globals, true);
      if (sig && sig.type === 'return') break;
    }
    return this.out;
  };
  Runner.prototype.execBlock = function* (body, env) {
    for (var i = 0; i < body.length; i++) {
      var sig = yield* this.execStmt(body[i], env);
      if (sig) return sig;
    }
    return null;
  };
  Runner.prototype.execStmt = function* (s, env, top) {
    this.tick(s.line);
    switch (s.k) {
      case 'pass': return null;
      case 'break': return new Signal('break');
      case 'continue': return new Signal('continue');
      case 'return': return new Signal('return', s.value ? (yield* this.evalExpr(s.value, env)) : null);
      case 'def':
        env[s.name] = { fn: null, name: s.name, def: s }; return null;
      case 'assign': {
        var v = yield* this.evalExpr(s.value, env);
        if (s.op !== '=') {
          if (!(s.name in env)) throw new PyError('NameError', "name '" + s.name + "' is not defined. You must give a variable a value before you can change it.", s.line);
          v = binop(s.op.slice(0, -1), env[s.name], v, s.line);
        }
        env[s.name] = v; return null;
      }
      case 'expr': {
        var r = yield* this.evalExpr(s.expr, env);
        if (s.expr.k === 'name' && r && r.fn !== undefined) throw new PyError('SyntaxError', "'" + s.expr.v + "' is a function. To call it you need brackets: " + s.expr.v + "()", s.line);
        return null;
      }
      case 'if': {
        for (var b = 0; b < s.branches.length; b++) {
          if (truthy(yield* this.evalExpr(s.branches[b].test, env))) return yield* this.execBlock(s.branches[b].body, env);
        }
        if (s.orelse) return yield* this.execBlock(s.orelse, env);
        return null;
      }
      case 'while': {
        while (truthy(yield* this.evalExpr(s.test, env))) {
          this.tick(s.line);
          var sg = yield* this.execBlock(s.body, env);
          if (sg) { if (sg.type === 'break') break; if (sg.type === 'return') return sg; }
        }
        return null;
      }
      case 'for': {
        var it = yield* this.evalExpr(s.iter, env);
        var items = it && it.list ? it.list : (typeof it === 'string' ? it.split('') : null);
        if (!items) throw new PyError('TypeError', "'" + typeName(it) + "' object is not iterable. A for loop needs something like range(4).", s.line);
        for (var q = 0; q < items.length; q++) {
          env[s.v] = items[q]; this.tick(s.line);
          var sg2 = yield* this.execBlock(s.body, env);
          if (sg2) { if (sg2.type === 'break') break; if (sg2.type === 'return') return sg2; }
        }
        return null;
      }
    }
    throw new PyError('RuntimeError', 'unknown statement', s.line);
  };
  Runner.prototype.lookup = function (name, env, line) {
    if (name in env) return env[name];
    if (name in this.globals) return this.globals[name];
    if (name in this.builtins) return this.builtins[name];
    var hint = '', best = null, bestD = 3;
    var candidates = Object.keys(this.builtins).concat(Object.keys(this.globals), Object.keys(env));
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i]; if (c === name || c.charAt(0) === '_') continue;
      if (c.toLowerCase() === name.toLowerCase()) { best = c; bestD = 0; break; }
      var d = editDistance(c, name); if (d < bestD) { bestD = d; best = c; }
    }
    if (best) hint = ' Did you mean "' + best + '"?' + (bestD === 0 ? ' Names are case sensitive.' : ' Check the spelling.');
    throw new PyError('NameError', "name '" + name + "' is not defined." + (hint || ' Check the spelling, or define it with "def ' + name + '():" if it is a function.'), line);
  };
  Runner.prototype.evalExpr = function* (e, env) {
    switch (e.k) {
      case 'num': case 'str': case 'const': return e.v;
      case 'name': return this.lookup(e.v, env, e.line);
      case 'unary': { var v = yield* this.evalExpr(e.e, env); if (!isNum(v)) throw new PyError('TypeError', "bad operand type for unary " + e.op + ": '" + typeName(v) + "'", e.line); return e.op === '-' ? (v instanceof PyFloat ? new PyFloat(-v.v) : -v) : v; }
      case 'not': return !truthy(yield* this.evalExpr(e.e, env));
      case 'bool': {
        var l = yield* this.evalExpr(e.l, env);
        if (e.op === 'and') return truthy(l) ? (yield* this.evalExpr(e.r, env)) : l;
        return truthy(l) ? l : (yield* this.evalExpr(e.r, env));
      }
      case 'bin': { var a = yield* this.evalExpr(e.l, env); var b = yield* this.evalExpr(e.r, env); return binop(e.op, a, b, e.line); }
      case 'call': {
        var f = this.lookup(e.name, env, e.line);
        var args = [];
        for (var i = 0; i < e.args.length; i++) args.push(yield* this.evalExpr(e.args[i], env));
        var kw = {};
        for (var k in e.kwargs) kw[k] = yield* this.evalExpr(e.kwargs[k], env);
        if (f && f.def) {
          if (args.length !== f.def.params.length) throw new PyError('TypeError', e.name + '() takes ' + f.def.params.length + ' argument(s) but ' + args.length + ' were given', e.line);
          var local = {};
          for (var p = 0; p < f.def.params.length; p++) local[f.def.params[p]] = args[p];
          this.tick(e.line);
          var sig = yield* this.execBlock(f.def.body, local);
          return sig && sig.type === 'return' ? sig.value : null;
        }
        if (f && f.fn) {
          if (f.arity !== undefined && args.length !== f.arity) throw new PyError('TypeError', e.name + '() takes ' + f.arity + ' arguments but ' + args.length + ' were given. Robot commands are written with empty brackets: ' + e.name + '()', e.line);
          var r = f.fn(args, kw, e.line);
          if (f.step) yield { line: e.line, name: e.name };
          return r;
        }
        throw new PyError('TypeError', "'" + typeName(f) + "' object is not callable", e.line);
      }
    }
    throw new PyError('RuntimeError', 'unknown expression', e.line);
  };

  function check(src) { try { new Parser(tokenize(src)).program(); return null; } catch (e) { return e; } }

  return { Runner: Runner, PyError: PyError, PyFloat: PyFloat, tokenize: tokenize, check: check, repr: repr };
})();
if (typeof module !== 'undefined') module.exports = MiniPy;
