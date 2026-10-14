const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

// Test the exact built page, but avoid fetching third-party scripts or making network requests.
const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<script\b(?=[^>]*\bsrc\s*=)[^>]*>\s*<\/script>/gi, '');
const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => {
  const message = String(error && (error.stack || error.message) || error);
  if (/uncaught|script error|not implemented/i.test(message)) runtimeErrors.push(message);
});

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://danield2008.github.io/entredos/',
  virtualConsole,
  beforeParse(window) {
    window.HTMLElement.prototype.scrollIntoView = function() {};
    window.scrollTo = function() {};
    window.matchMedia ||= () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {}
    });
  }
});

const { document } = dom.window;
const modes = ['questions', 'who', 'truth', 'memories', 'date', 'deep'];

for (const [index, mode] of modes.entries()) {
  const modeButton = document.querySelector('[data-mode="' + mode + '"]');
  assert.ok(modeButton, 'Falta el botón del modo ' + mode);
  modeButton.click();

  const chooser = document.getElementById('modeChooser');
  assert.ok(chooser.classList.contains('open'), 'No se abre el selector al elegir ' + mode);

  const inPerson = document.getElementById('chooseInPerson');
  assert.ok(inPerson, 'Falta la opción para jugar en persona');
  inPerson.click();

  const setup = document.getElementById('inPersonSetup');
  assert.equal(setup.getAttribute('aria-hidden'), 'false', 'No se abre la pantalla de nombres (' + mode + ')');

  document.getElementById('personName1').value = 'Alex' + index;
  document.getElementById('personName2').value = 'Sam' + index;
  document.getElementById('personSetupContinue').click();

  const play = document.getElementById('jugar');
  assert.ok(play.classList.contains('play-open'), 'Siguiente no abre el cuestionario del modo ' + mode);
  assert.equal(setup.getAttribute('aria-hidden'), 'true', 'La pantalla de nombres no se marca oculta (' + mode + ')');
  assert.ok(!setup.classList.contains('open'), 'La pantalla de nombres sigue abierta (' + mode + ')');
  for (const property of ['display', 'visibility', 'opacity', 'pointer-events']) {
    assert.equal(setup.style.getPropertyValue(property), '', 'Queda el estilo inline ' + property + ' (' + mode + ')');
  }
  assert.ok(document.getElementById('promptText').textContent.trim(), 'No hay pregunta visible en el modo ' + mode);

  document.getElementById('playClose').click();
}

assert.deepEqual(runtimeErrors, [], 'Errores de JavaScript al ejecutar la página: ' + runtimeErrors.join('\n'));
dom.window.close();
console.log('OK: los seis modos abren selector, nombres y cuestionario; la capa de nombres se cierra.');
