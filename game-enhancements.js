/* ENTREDOS_ENHANCEMENTS_V1: local answers, configurable length and visible sharing. */
let localQuestionLimit = 10;
let localQuestionPosition = 1;
let localQuestionHistory = [];
let localFirstAnswer = "";
let localSecondAnswer = "";
let localAnswerStage = 1;
let localRevealed = false;
let selectedGameMode = 'questions';
let localModeQuestionLimit = 10;
let localModeQuestionPosition = 1;
let localModeQuestionHistory = [];
const gameModeLabels = {questions:'Preguntas para conectar',who:'¿Quién de los dos?',truth:'Verdad o reto',memories:'Nuestra historia',date:'Plan de cita sorpresa',deep:'Charla profunda'};

(function installEnhancementMarkup(){
  const playerOne = $('#player1');
  const playerTwo = $('#player2');
  if (playerOne) {
    playerOne.placeholder = 'Ej. Leo';
    const label = playerOne.closest('label');
    if (label?.childNodes[0]) label.childNodes[0].textContent = 'Nombre de la persona 1';
  }
  if (playerTwo) {
    playerTwo.placeholder = 'Ej. Mia';
    const label = playerTwo.closest('label');
    if (label?.childNodes[0]) label.childNodes[0].textContent = 'Nombre de la persona 2';
  }

  const gameGrid = $('#juegos .game-grid');
  if (gameGrid && !$('#startHereGuide')) {
    const guide = document.createElement('aside');
    guide.id = 'startHereGuide';
    guide.className = 'start-guide';
    guide.innerHTML = '<div class="start-guide-heading"><span>GUÍA RÁPIDA</span><strong>¿Es vuestra primera vez? Seguid estos 3 pasos.</strong></div><div class="start-guide-steps"><div class="start-guide-step"><span>1</span><div><strong>Elegid un juego</strong><small>Pulsad una de las tarjetas de abajo o el botón «Empezar juntos».</small></div></div><div class="start-guide-step"><span>2</span><div><strong>Elegid cómo jugar</strong><small>En persona si compartís dispositivo; a distancia si cada uno usa el suyo.</small></div></div><div class="start-guide-step"><span>3</span><div><strong>Seguid las indicaciones</strong><small>Poned vuestros nombres si queréis. A distancia, una persona comparte el código y la otra lo introduce.</small></div></div></div>';
    gameGrid.insertAdjacentElement('beforebegin', guide);
  }

  const playerSettings = $('.play-board .player-settings');
  if (playerSettings && !$('#playerNameGuide')) {
    const nameGuide = document.createElement('div');
    nameGuide.id = 'playerNameGuide';
    nameGuide.className = 'player-name-guide';
    nameGuide.innerHTML = '<strong>ANTES DE JUGAR</strong><span>Escribid vuestros nombres en los campos de arriba (es opcional). Después elegid un tema. La pantalla os irá diciendo a quién le toca y qué hacer.</span>';
    playerSettings.insertAdjacentElement('afterend', nameGuide);
  }

  const inPersonCopy = $('#chooseInPerson')?.querySelector('small');
  if (inPersonCopy) inPersonCopy.textContent = 'Usáis el mismo móvil u ordenador. Podréis poner vuestros nombres y responder por turnos.';
  const remoteCopy = $('#chooseRemote')?.querySelector('small');
  if (remoteCopy) remoteCopy.textContent = 'Cada uno usa su propio dispositivo. Una persona crea la sala y comparte el código; la otra lo introduce para unirse.';
  const createRoomCopy = $('#showCreateRoom')?.querySelector('small');
  if (createRoomCopy) createRoomCopy.textContent = 'Elige el tema y el número de preguntas, crea la sala y comparte el código que aparece.';
  const joinRoomCopy = $('#showJoinRoom')?.querySelector('small');
  if (joinRoomCopy) joinRoomCopy.textContent = 'Si te han enviado un código de seis caracteres, introdúcelo en el siguiente paso para entrar.';
  const nameGuideElement = $('#playerNameGuide');
  if (nameGuideElement && !$('#localModeCountControl')) {
    const modeCount = document.createElement('label');
    modeCount.id = 'localModeCountControl';
    modeCount.className = 'question-count-control local-mode-count-control';
    modeCount.htmlFor = 'localModeCount';
    modeCount.style.display = 'none';
    modeCount.innerHTML = '<span>Rondas por partida</span><select id="localModeCount" aria-label="Número de rondas"><option value="5">5 rondas</option><option value="10" selected>10 rondas</option><option value="15">15 rondas</option><option value="20">20 rondas</option></select><small id="localModeCountHint">Ronda 1 de 10</small>';
    nameGuideElement.insertAdjacentElement('afterend', modeCount);
  }

  const pickerFooter = $('.question-picker .picker-footer');
  if (pickerFooter && !$('#localQuestionCount')) {
    const control = document.createElement('label');
    control.className = 'question-count-control';
    control.htmlFor = 'localQuestionCount';
    control.innerHTML = '<span>Preguntas por partida</span><select id="localQuestionCount" aria-label="Número de preguntas"><option value="5">5 preguntas</option><option value="10" selected>10 preguntas</option><option value="15">15 preguntas</option><option value="20">20 preguntas</option></select>';
    pickerFooter.insertBefore(control, $('#pickerRandom'));
  }

  const createStep = $('[data-remote-step="create"]');
  if (createStep && !$('#remoteGameModeSummary')) {
    const summary = document.createElement('div');
    summary.id = 'remoteGameModeSummary';
    summary.className = 'remote-mode-summary';
    summary.innerHTML = '<span>JUEGO SELECCIONADO</span><strong id="remoteGameModeTitle">Preguntas para conectar</strong>';
    createStep.insertBefore(summary, createStep.firstChild);
  }

  const remoteQuestion = $('#remoteQuestion');
  if (remoteQuestion && !$('#remoteModeHelper')) {
    const helper = document.createElement('p');
    helper.id = 'remoteModeHelper';
    helper.className = 'remote-mode-helper';
    helper.textContent = 'Cada uno responde desde su dispositivo. Las respuestas solo se muestran cuando ambos han enviado la suya.';
    remoteQuestion.insertAdjacentElement('afterend', helper);
  }

  const topicField = $('#remoteCreatorTopic')?.closest('.remote-field');
  if (topicField && !$('#remoteCreatorCount')) {
    const control = document.createElement('label');
    control.className = 'remote-field';
    control.htmlFor = 'remoteCreatorCount';
    control.innerHTML = '<span>Duración de la partida</span><select id="remoteCreatorCount" aria-label="Número de preguntas"><option value="5">5 preguntas</option><option value="10" selected>10 preguntas</option><option value="15">15 preguntas</option><option value="20">20 preguntas</option></select>';
    topicField.insertAdjacentElement('afterend', control);
  }

  const promptCard = $('#promptText')?.closest('.prompt-card');
  if (promptCard && !$('#localAnswerStation')) {
    const station = document.createElement('section');
    station.id = 'localAnswerStation';
    station.className = 'local-answer-station';
    station.innerHTML = '<div class="local-answer-top"><div><span class="local-answer-kicker">EN PERSONA · POR TURNOS</span><h3 id="localAnswerTitle">Turno de Persona 1</h3><p id="localAnswerInstructions">Cada persona escribe su respuesta sin ver la del otro.</p></div><span class="local-answer-counter" id="localQuestionCounter">Pregunta 1 de 10</span></div><div id="localAnswerEntry"><label class="local-answer-label" id="localAnswerLabel" for="localAnswerInput">Respuesta de Persona 1</label><textarea id="localAnswerInput" maxlength="600" rows="4" placeholder="Escribe tu respuesta…"></textarea><div class="local-answer-entry-footer"><span id="localAnswerNote">La respuesta quedará oculta hasta que ambos hayáis respondido.</span><button type="button" class="btn btn-dark" id="localAnswerSubmit">Guardar respuesta ↗</button></div></div><div id="localAnswerReveal" class="local-answer-reveal" style="display:none"><div class="local-result-heading"><span>✦ RESULTADO</span><h3>Vuestras respuestas</h3><p>Leed lo que ha compartido cada uno y comentadlo juntos.</p></div><div class="local-result-grid"><article><span id="localResultName1">Persona 1</span><p id="localResultAnswer1"></p></article><article><span id="localResultName2">Persona 2</span><p id="localResultAnswer2"></p></article></div></div>';
    promptCard.insertAdjacentElement('afterend', station);
  }

  const station = $('#localAnswerStation');
  if (station && !$('#localFinalResults')) {
    const final = document.createElement('section');
    final.id = 'localFinalResults';
    final.className = 'local-final-results';
    final.style.display = 'none';
    final.innerHTML = '<div class="local-result-heading"><span>♡ RESULTADO DE LA PARTIDA</span><h2>Habéis compartido vuestro momento.</h2><p id="localFinalSummary">Habéis completado 10 preguntas.</p></div><div id="localFinalList" class="local-final-list"></div><div class="local-final-actions"><button class="btn btn-light" type="button" id="localFinalClose">Cerrar resultado</button><button class="btn btn-dark" type="button" id="localFinalAgain">Jugar otra vez ↗</button></div>';
    station.insertAdjacentElement('afterend', final);
  }

  // Give the invitation its own full-width row so it cannot be clipped beside the code.
  const shareButton = $('#remoteShareInvite');
  const codeBanner = $('.remote-code-banner');
  if (shareButton && codeBanner && !$('#remoteShareRow')) {
    const row = document.createElement('div');
    row.id = 'remoteShareRow';
    row.className = 'remote-share-row';
    const copy = document.createElement('div');
    copy.className = 'remote-share-copy';
    copy.innerHTML = '<strong>Invita a tu pareja</strong><span>Comparte el enlace o el código para que pueda entrar desde su dispositivo.</span>';
    row.append(copy, shareButton);
    codeBanner.insertAdjacentElement('afterend', row);
  }

  const revealHeading = $('#remoteReveal h3');
  if (revealHeading) revealHeading.textContent = 'Resultado · vuestras respuestas';
})();

function renderLocalAnswerStage(){
  const station = $('#localAnswerStation');
  if (!station) return;
  const active = mode === 'questions' && $('#jugar')?.classList.contains('play-open');
  $('#jugar')?.classList.toggle('local-question-active', !!active);
  station.style.display = active ? 'block' : 'none';
  const final = $('#localFinalResults');
  if (final && active) final.style.display = 'none';
  const promptCard = $('#promptText')?.closest('.prompt-card');
  if (promptCard && active) promptCard.style.display = '';
  const progress = $('#progressBar')?.closest('.progress-wrap');
  if (progress && active) progress.style.display = '';
  const actions = $('#saveBtn')?.closest('.game-actions');
  if (actions && active) actions.style.display = '';
  const toastInline = $('#toastInline');
  if (toastInline && active) toastInline.style.display = '';
  if (!active) return;

  const name1 = p1();
  const name2 = p2();
  $('#localQuestionCounter').textContent = 'Pregunta ' + localQuestionPosition + ' de ' + localQuestionLimit;
  $('#localAnswerTitle').textContent = localRevealed ? 'Resultado · pregunta ' + localQuestionPosition : 'Turno de ' + (localAnswerStage === 1 ? name1 : name2);
  $('#localAnswerInstructions').textContent = localRevealed
    ? 'Los dos habéis respondido. Leed las respuestas y comentad qué habéis descubierto.'
    : (localAnswerStage === 1
      ? name1 + ', escribe primero tu respuesta. Después pasaréis el dispositivo a ' + name2 + '.'
      : 'Respuesta de ' + name1 + ' guardada. Pasa el dispositivo a ' + name2 + '; no se muestra lo que ha escrito ' + name1 + '.');
  $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? name1 : name2);
  $('#localAnswerInput').placeholder = 'Escribe tu respuesta, ' + (localAnswerStage === 1 ? name1 : name2) + '…';
  $('#localAnswerNote').textContent = localAnswerStage === 1
    ? 'Tu respuesta permanece oculta mientras responde la otra persona.'
    : 'La primera respuesta sigue oculta. Escribe la tuya para ver las dos.';
  $('#localAnswerEntry').style.display = localRevealed ? 'none' : 'block';
  $('#localAnswerReveal').style.display = localRevealed ? 'block' : 'none';
  $('#localAnswerInput').disabled = !!localRevealed;
  $('#localAnswerSubmit').disabled = !!localRevealed;
  $('#nextBtn').style.display = localRevealed ? '' : 'none';
  $('#nextBtn').textContent = localQuestionPosition >= localQuestionLimit ? 'Ver resultado final →' : 'Siguiente pregunta →';
  $('#passBtn').style.display = 'none';
  $('#shuffleBtn').style.display = 'none';

  if (localRevealed) {
    $('#localResultName1').textContent = name1;
    $('#localResultAnswer1').textContent = localFirstAnswer;
    $('#localResultName2').textContent = name2;
    $('#localResultAnswer2').textContent = localSecondAnswer;
  }
}

function submitLocalAnswer(){
  const input = $('#localAnswerInput');
  const value = (input?.value || '').trim();
  if (!value) { toast('Escribe tu respuesta antes de continuar.'); input?.focus(); return; }
  if (localAnswerStage === 1) {
    localFirstAnswer = value;
    localAnswerStage = 2;
    input.value = '';
    renderLocalAnswerStage();
    input.focus();
    return;
  }
  localSecondAnswer = value;
  localRevealed = true;
  localQuestionHistory.push({
    question: current?.text || '',
    category: current?.category || 'Pregunta',
    name1: p1(),
    answer1: localFirstAnswer,
    name2: p2(),
    answer2: localSecondAnswer
  });
  input.value = '';
  renderLocalAnswerStage();
}

function escapeLocalResult(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function showLocalFinalResults(){
  const promptCard = $('#promptText')?.closest('.prompt-card');
  const station = $('#localAnswerStation');
  const final = $('#localFinalResults');
  const progress = $('#progressBar')?.closest('.progress-wrap');
  const actions = $('#saveBtn')?.closest('.game-actions');
  const toastInline = $('#toastInline');
  if (promptCard) promptCard.style.display = 'none';
  if (station) station.style.display = 'none';
  if (progress) progress.style.display = 'none';
  if (actions) actions.style.display = 'none';
  if (toastInline) toastInline.style.display = 'none';
  if (!final) return;
  final.style.display = 'block';
  $('#localFinalSummary').textContent = 'Resultado: habéis completado ' + localQuestionHistory.length + ' de ' + localQuestionLimit + ' preguntas. No hay una respuesta ganadora: el resultado es lo que habéis compartido y descubierto juntos.';
  $('#localFinalList').innerHTML = localQuestionHistory.map((item, i) =>
    '<article class="local-final-item"><div class="local-final-item-title"><span>Pregunta ' + (i+1) + ' · ' + escapeLocalResult(item.category) + '</span><strong>' + escapeLocalResult(item.question) + '</strong></div><div class="local-final-answer-grid"><div><span>' + escapeLocalResult(item.name1) + '</span><p>' + escapeLocalResult(item.answer1) + '</p></div><div><span>' + escapeLocalResult(item.name2) + '</span><p>' + escapeLocalResult(item.answer2) + '</p></div></div></article>'
  ).join('');
  $('#jugar')?.classList.remove('local-question-active');
}


function renderLocalModeCountControl(){
  const control = $('#localModeCountControl');
  if (!control) return;
  const active = mode !== 'questions' && $('#jugar')?.classList.contains('play-open') && $('#localFinalResults')?.style.display !== 'block';
  control.style.display = active ? 'flex' : 'none';
  const hint = $('#localModeCountHint');
  if (hint) hint.textContent = 'Ronda ' + Math.min(localModeQuestionPosition, localModeQuestionLimit) + ' de ' + localModeQuestionLimit;
}

function resetLocalModeSession(){
  localModeQuestionPosition = 1;
  localModeQuestionHistory = [];
  const requested = Number($('#localModeCount')?.value || 10);
  const available = poolForMode().length || requested;
  const validCounts = [5,10,15,20].filter(n => n <= available);
  localModeQuestionLimit = Math.min(requested, available);
  if (localModeQuestionLimit < requested && validCounts.length) localModeQuestionLimit = validCounts[validCounts.length - 1];
  if ($('#localModeCount')) $('#localModeCount').value = String(localModeQuestionLimit);
  renderLocalModeCountControl();
}

function restoreLocalGameView(){
  const final = $('#localFinalResults');
  if (final) final.style.display = 'none';
  const promptCard = $('#promptText')?.closest('.prompt-card');
  if (promptCard) promptCard.style.display = '';
  const progress = $('#progressBar')?.closest('.progress-wrap');
  if (progress) progress.style.display = '';
  const actions = $('#saveBtn')?.closest('.game-actions');
  if (actions) actions.style.display = '';
  const toastInline = $('#toastInline');
  if (toastInline) toastInline.style.display = '';
  const extra = $('#modeExtra');
  if (extra) extra.style.display = '';
  renderLocalModeCountControl();
}

function showOtherModeFinalResults(){
  const promptCard = $('#promptText')?.closest('.prompt-card');
  const progress = $('#progressBar')?.closest('.progress-wrap');
  const actions = $('#saveBtn')?.closest('.game-actions');
  const toastInline = $('#toastInline');
  if (promptCard) promptCard.style.display = 'none';
  if (progress) progress.style.display = 'none';
  if (actions) actions.style.display = 'none';
  if (toastInline) toastInline.style.display = 'none';
  const extra = $('#modeExtra');
  if (extra) extra.style.display = 'none';
  const station = $('#localAnswerStation');
  if (station) station.style.display = 'none';
  const control = $('#localModeCountControl');
  if (control) control.style.display = 'none';
  const final = $('#localFinalResults');
  if (!final) return;
  final.style.display = 'block';
  const heading = $('#localFinalResults .local-result-heading h2');
  if (heading) heading.textContent = '¡Habéis jugado juntos!';
  $('#localFinalSummary').textContent = 'Habéis completado ' + localModeQuestionHistory.length + ' rondas de ' + (gameModeLabels[mode] || 'vuestro juego') + '. Podéis volver a jugar con otro tema o probar otro modo.';
  $('#localFinalList').innerHTML = localModeQuestionHistory.map((item,i) =>
    '<article class="local-final-item"><div class="local-final-item-title"><span>Ronda ' + (i+1) + ' · ' + escapeLocalResult(item.category) + '</span><strong>' + escapeLocalResult(item.question) + '</strong></div></article>'
  ).join('');
  $('#jugar')?.classList.remove('local-question-active');
}

$('#localModeCount')?.addEventListener('change', () => {
  if (mode === 'questions') return;
  const requested = Number($('#localModeCount').value || 10);
  const available = poolForMode().length || requested;
  const validCounts = [5,10,15,20].filter(n => n <= available);
  localModeQuestionLimit = Math.min(requested, available);
  if (localModeQuestionLimit < requested && validCounts.length) {
    localModeQuestionLimit = validCounts[validCounts.length - 1];
    $('#localModeCount').value = String(localModeQuestionLimit);
    toast('Este modo tiene menos opciones; hemos ajustado el número de rondas.');
  }
  renderLocalModeCountControl();
});

const originalSetSpecificQuestionForLocal = setSpecificQuestion;
setSpecificQuestion = function(text){
  const found = allQuestions.find(x => x.text === text) || saved.find(x => x.text === text);
  if (deck === 'saved' || pickerDeck === 'saved' || libraryFilter === 'saved') {
    deck = found?.categoryKey || found?.category || 'romantic';
  }
  const requestedLimit = Number($('#localQuestionCount')?.value || 10);
  localQuestionPosition = 1;
  localQuestionHistory = [];
  localFirstAnswer = '';
  localSecondAnswer = '';
  localAnswerStage = 1;
  localRevealed = false;
  originalSetSpecificQuestionForLocal(text);
  const availableQuestions = poolForMode().length || requestedLimit;
  const validCounts = [5, 10, 15, 20].filter(n => n <= availableQuestions);
  localQuestionLimit = Math.min(requestedLimit, availableQuestions);
  if (localQuestionLimit < requestedLimit && validCounts.length) {
    localQuestionLimit = validCounts[validCounts.length - 1];
    $('#localQuestionCount').value = String(localQuestionLimit);
  }
  renderLocalAnswerStage();
};

choosePickerQuestion = function(q){
  if (!q) return;
  deck = pickerDeck === 'saved' ? (q.categoryKey || q.category || 'romantic') : pickerDeck;
  $$( '[data-deck]' ).forEach(b => b.classList.toggle('active', b.dataset.deck === deck));
  closeQuestionPicker();
  setSpecificQuestion(q.text);
};

const originalNextQuestionForLocal = nextQuestion;
nextQuestion = function(){
  if (mode === 'questions' && $('#jugar')?.classList.contains('local-question-active')) {
    if (!localRevealed) { toast('Primero tenéis que responder los dos.'); return; }
    if (localQuestionPosition >= localQuestionLimit) {
      showLocalFinalResults();
      return;
    }
    localQuestionPosition += 1;
    round += 1;
    localFirstAnswer = '';
    localSecondAnswer = '';
    localAnswerStage = 1;
    localRevealed = false;
    renderQuestion();
    renderLocalAnswerStage();
    return;
  }
  if (mode !== 'questions' && $('#jugar')?.classList.contains('play-open')) {
    localModeQuestionHistory.push({question:current?.text || '',category:current?.category || 'Ronda'});
    if (localModeQuestionPosition >= localModeQuestionLimit) {
      showOtherModeFinalResults();
      return;
    }
    localModeQuestionPosition += 1;
    originalNextQuestionForLocal();
    renderLocalModeCountControl();
    return;
  }
  return originalNextQuestionForLocal();
};


/* Hacer que todos los juegos ofrezcan las dos modalidades. */
const originalStartModeForEveryGame = startMode;
startMode = function(nextMode) {
  selectedGameMode = Object.prototype.hasOwnProperty.call(gameModeLabels, nextMode) ? nextMode : 'questions';
  const result = originalStartModeForEveryGame(nextMode);
  if (selectedGameMode !== 'questions') {
    closePlayWindow();
    openModeChooser('all');
  }
  return result;
};

const originalOpenModeChooserForEveryGame = openModeChooser;
openModeChooser = function(topic = 'all') {
  const result = originalOpenModeChooserForEveryGame(topic);
  const subtitle = $('#modeChooser .choice-head p');
  if (subtitle) subtitle.textContent = 'Juego seleccionado: ' + (gameModeLabels[selectedGameMode] || gameModeLabels.questions) + '. Elegid si jugar en persona o a distancia.';
  return result;
};

$('#chooseInPerson').addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  closeModeChooser();
  if (selectedGameMode === 'questions') {
    openQuestionPicker(chosenModeTopic);
    return;
  }
  mode = selectedGameMode;
  deck = 'all';
  round = 1;
  used.clear();
  $$('[data-deck]').forEach(button => button.classList.toggle('active', button.dataset.deck === deck));
  $$('[data-mode]').forEach(button => button.classList.toggle('selected', button.dataset.mode === mode));
  restoreLocalGameView();
  resetLocalModeSession();
  renderQuestion();
  openPlayWindow();
  renderLocalAnswerStage();
  renderLocalModeCountControl();
}, true);

document.addEventListener('click', event => {
  if (event.target.closest('.deck-filter,[data-picker-deck],.library-filter,[data-library-start],#heroRandom,#closingBtn')) {
    selectedGameMode = 'questions';
  }
}, true);

const originalOpenDistanceSetupForEveryGame = openDistanceSetup;
openDistanceSetup = function(step = 'options') {
  const result = originalOpenDistanceSetupForEveryGame(step);
  const isQuestions = selectedGameMode === 'questions';
  const topicField = $('#remoteCreatorTopic')?.closest('.remote-field');
  if (topicField) topicField.hidden = !isQuestions;
  const summary = $('#remoteGameModeTitle');
  if (summary) summary.textContent = gameModeLabels[selectedGameMode] || gameModeLabels.questions;
  const note = $('#remoteGameModeSummary');
  if (note) note.hidden = step !== 'create';
  const countControl = $('#remoteCreatorCount')?.closest('.remote-field');
  if (countControl) countControl.querySelector('span').textContent = 'Preguntas o rondas por partida';
  const createCopy = $('#showCreateRoom')?.querySelector('small');
  if (createCopy) createCopy.textContent = isQuestions
    ? 'Elige el tema y cuántas preguntas jugaréis; después comparte el código.'
    : 'Crea una sala para este juego y comparte el código con tu pareja.';
  return result;
};

const originalRemoteQuestionPoolForEveryGame = remoteQuestionPool;
remoteQuestionPool = function(room) {
  const game = room?.game_mode || 'questions';
  if (game === 'who') return whoPrompts.map(text => ({category:'¿Quién de los dos?', text, kind:'who'}));
  if (game === 'truth') {
    const pool = [];
    const count = Math.max(truthPrompts.length, darePrompts.length);
    for (let i = 0; i < count; i++) {
      if (truthPrompts[i]) pool.push({category:'Verdad', text:truthPrompts[i], kind:'truth'});
      if (darePrompts[i]) pool.push({category:'Reto', text:darePrompts[i], kind:'dare'});
    }
    return pool;
  }
  if (game === 'memories') return sets.memories.map(text => ({category:'Recuerdos', text, kind:'memories'}));
  if (game === 'date') return dateIdeas.map(text => ({category:'Plan de cita', text, kind:'date'}));
  if (game === 'deep') return sets.deep.map(text => ({category:'Charla profunda', text, kind:'deep'}));
  return originalRemoteQuestionPoolForEveryGame(room);
};

const originalRenderRemoteStateForEveryGame = renderRemoteState;
renderRemoteState = function(state) {
  originalRenderRemoteStateForEveryGame(state);
  if (!state?.room) return;
  const room = state.room;
  const game = room.game_mode || 'questions';
  const topicName = roomTopicNames[room.topic] || 'Un poco de todo';
  $('#remoteTopicBadge').textContent = (gameModeLabels[game] || gameModeLabels.questions) + (game === 'questions' && room.topic !== 'all' ? ' · ' + topicName : '');
  const copy = {
    questions: 'Responde a la pregunta con tus propias palabras.',
    who: 'Cada uno elegid a quién describe mejor la frase y explicad por qué.',
    truth: 'Si es una verdad, contestad con sinceridad. Si es un reto, escribid cómo lo haríais.',
    memories: 'Compartid el recuerdo que os venga a la mente; no hace falta que sea el mismo.',
    date: 'Contad qué os parece el plan o cómo lo adaptaríais para los dos.',
    deep: 'Tomad vuestro tiempo y contestad con sinceridad, sin buscar una respuesta perfecta.'
  };
  const q = remoteQuestionPool(room)[Number(room.question_index) || 0];
  $('#remoteModeHelper').textContent = game === 'truth' && q?.kind === 'dare'
    ? 'Reto: proponed cómo lo haríais juntos, aunque cada uno esté en su dispositivo.'
    : (copy[game] || copy.questions);
  const answerLabel = $('#remoteRound .remote-answer-label');
  const answer = $('#remoteAnswer');
  if (answerLabel) answerLabel.textContent = game === 'who' ? '¿A quién eliges?' : game === 'date' ? 'Vuestra idea' : 'Tu respuesta';
  if (answer && !state.my_submitted) {
    answer.placeholder = game === 'who' ? 'Persona 1, Persona 2 o ambos…'
      : game === 'truth' && q?.kind === 'dare' ? 'Escribe cómo responderías al reto…'
      : game === 'date' ? '¿Qué te parece este plan?…'
      : game === 'memories' ? 'Cuenta lo que recuerdas…'
      : game === 'deep' ? 'Escribe tu respuesta sincera…'
      : 'Escribe lo que piensas…';
  }
};

const originalCreateRemoteRoomForLimit = createRemoteRoom;
createRemoteRoom = async function(){
  const button = $('#createRemoteRoom');
  button.disabled = true;
  button.textContent = 'Creando sala…';
  $('#remoteCreateError').textContent = '';
  try {
    const topic = selectedGameMode === 'questions' ? $('#remoteCreatorTopic').value : 'all';
    const requestedLimit = Number($('#remoteCreatorCount')?.value || 10);
    const availableQuestions = remoteQuestionPool({game_mode:selectedGameMode,topic}).length;
    const validCounts = [5, 10, 15, 20].filter(n => n <= availableQuestions);
    let questionLimit = Math.min(requestedLimit, availableQuestions);
    if (questionLimit < requestedLimit && validCounts.length) questionLimit = validCounts[validCounts.length - 1];
    $('#remoteCreatorCount').value = String(questionLimit);
    const data = await remoteRequest('create', {
      topic,
      game_mode: selectedGameMode,
      name: $('#remoteCreatorName').value.trim(),
      question_limit: questionLimit
    });
    remoteSession = {code:data.room.code, token:data.token, role:data.role};
    saveRemoteSession();
    openRemoteGame(data);
    toast('Sala creada. Comparte el código con tu pareja.');
  } catch (error) {
    $('#remoteCreateError').textContent = error.message || 'No se pudo crear la sala.';
  } finally {
    button.disabled = false;
    button.textContent = 'Generar código ↗';
  }
};

const originalRenderRemoteStateForLimit = renderRemoteState;
renderRemoteState = function(state){
  originalRenderRemoteStateForLimit(state);
  if (!state?.room) return;
  const room = state.room;
  const pool = remoteQuestionPool(room);
  const limit = Math.min(Number(room.question_limit || 10), pool.length);
  const index = Number(room.question_index || 0);
  $('#remoteRoundCount').textContent = 'Pregunta ' + Math.min(index + 1, limit) + ' de ' + limit;
  if (state.both_answered && index < limit) {
    $('#remoteNext').textContent = index + 1 >= limit ? 'Ver resultado final →' : 'Siguiente pregunta →';
  }
  if (room.status === 'finished' || index >= limit) {
    $('#remoteWaiting').hidden = true;
    $('#remoteRound').hidden = true;
    $('#remoteFinished').hidden = false;
    $('#remoteStatusText').textContent = 'Partida completada';
    $('#remoteFinished p').textContent = 'Resultado: habéis completado ' + limit + ' preguntas juntos. Habéis compartido vuestras respuestas y podéis volver a jugar con otro tema.';
  }
};

$('#localAnswerSubmit').addEventListener('click', submitLocalAnswer);
$('#player1').addEventListener('input', () => { if (!localRevealed) { $('#localAnswerTitle').textContent = 'Turno de ' + (localAnswerStage === 1 ? p1() : p2()); $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? p1() : p2()); } });
$('#player2').addEventListener('input', () => { if (!localRevealed) { $('#localAnswerTitle').textContent = 'Turno de ' + (localAnswerStage === 1 ? p1() : p2()); $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? p1() : p2()); } });
$('#localFinalClose').addEventListener('click', closePlayWindow);
$('#localFinalAgain').addEventListener('click', () => { closePlayWindow(); openModeChooser('all'); });

/* ENTREDOS_EXTRA_V2: intensity presets, skip controls, no-repeat rounds, date planning and QR invite. */
let entredosIntensity = 'romantico';
let entredosSeenPrompts = new Set();
const entredosIntensityNames = {suave:'Suave 🌸', romantico:'Romántico ❤️', profundo:'Profundo 💭', atrevido:'Atrevido 🔥'};

(function addEntreDosExtraControls(){
  const board = $('.play-board .player-settings') || $('#jugar .player-settings');
  if (board && !$('#entredosIntensityControl')) {
    const wrap = document.createElement('label');
    wrap.id='entredosIntensityControl'; wrap.className='question-count-control entredos-intensity-control';
    wrap.innerHTML='<span>Intensidad de la partida</span><select id="entredosIntensity"><option value="suave">Suave 🌸</option><option value="romantico" selected>Romántico ❤️</option><option value="profundo">Profundo 💭</option><option value="atrevido">Atrevido 🔥</option></select><small>Elegid el tono que os apetece compartir.</small>';
    board.insertAdjacentElement('afterend',wrap);
  }
  const dateSetup = $('[data-mode="date"]') || $('[data-game="date"]');
  const dateTarget = $('#ideas-cita') || $('#dateIdeas') || dateSetup?.closest('section');
  if (dateTarget && !$('#entredosDatePlanner')) {
    const planner=document.createElement('section'); planner.id='entredosDatePlanner'; planner.className='entredos-extra-card';
    planner.innerHTML='<div class="eyebrow">PLAN DE CITA SORPRESA</div><h3>Una cita a vuestra medida</h3><p>Elegid vuestras condiciones y generad una idea para los dos.</p><div class="entredos-planner-grid"><label>Presupuesto<select id="edBudget"><option value="gratis">Gratis</option><option value="20">Hasta 20 €</option><option value="50" selected>Hasta 50 €</option><option value="100">Hasta 100 €</option><option value="flexible">Flexible</option></select></label><label>Tiempo disponible<select id="edTime"><option value="30">30 minutos</option><option value="60" selected>1–2 horas</option><option value="half">Media tarde</option><option value="day">Todo el día</option></select></label><label>Plan<select id="edPlace"><option value="either" selected>Nos da igual</option><option value="out">Salir de casa</option><option value="in">Quedarnos en casa</option></select></label><label>Estilo<select id="edStyle"><option value="surprise" selected>Sorpresa</option><option value="food">Comida</option><option value="creative">Creativo</option><option value="calm">Tranquilo</option><option value="adventure">Aventura</option></select></label></div><button type="button" class="btn btn-dark" id="edGenerateDate">Crear nuestro plan ↗</button><div id="edDateResult" class="entredos-date-result" aria-live="polite"></div>';
    dateTarget.appendChild(planner);
  }
  const share = $('#remoteShareInvite');
  if (share && !$('#entredosInviteQR')) {
    const qr=document.createElement('div'); qr.id='entredosInviteQR'; qr.className='entredos-qr-wrap'; qr.hidden=true;
    qr.innerHTML='<strong>Escanea para abrir EntreDos</strong><img id="entredosQRImage" alt="Código QR de invitación"><small>El código de sala también es necesario para unirse.</small>';
    share.insertAdjacentElement('afterend',qr);
  }
})();

function entredosApplyIntensity(){
  const value=$('#entredosIntensity')?.value;
  if(value && entredosIntensityNames[value]) entredosIntensity=value;
}
$('#entredosIntensity')?.addEventListener('change',entredosApplyIntensity);
function entredosPromptMatchesIntensity(item){
  const t=String(item?.text||'').toLowerCase();
  const intimate=/(infancia|miedo|futuro|familia|herida|perdón|perdon|confianza|sueño|sueños|suenos|valor|recuerdo|vulnerable|profund|amor|intimidad|deseo|atracción|atraccion|secreto|fantasía|fantasia|atrev|beso|pasión|pasion)/i.test(t);
  const playful=/(risa|divertid|comida|viaje|cita|película|pelicula|canción|cancion|juego|aventura|primera vez|sorpresa|bailar|cocinar|favorit)/i.test(t);
  if(entredosIntensity==='suave') return !intimate || playful;
  if(entredosIntensity==='profundo') return intimate;
  if(entredosIntensity==='atrevido') return /(deseo|atracción|atraccion|intimidad|atrev|beso|pasión|pasion|fantasía|fantasia|coquete|romántic|romantic)/i.test(t);
  return true;
}
function entredosChooseUnseen(){
  const pool=(typeof poolForMode==='function'?poolForMode():[])||[];
  const options=pool.filter(item=>item && item.text && !entredosSeenPrompts.has(item.text) && entredosPromptMatchesIntensity(item));
  const fallback=pool.filter(item=>item && item.text && !entredosSeenPrompts.has(item.text));
  const list=options.length?options:fallback;
  if(!list.length) { entredosSeenPrompts.clear(); return; }
  const choice=list[Math.floor(Math.random()*list.length)];
  entredosSeenPrompts.add(choice.text);
  if(typeof setSpecificQuestion==='function') setSpecificQuestion(choice.text);
}
const entredosBaseSetQuestion = setSpecificQuestion;
setSpecificQuestion = function(text){
  if(text) entredosSeenPrompts.add(text);
  return entredosBaseSetQuestion(text);
};
const entredosBaseStartMode = startMode;
startMode = function(nextMode){
  entredosSeenPrompts.clear();
  entredosIntensity = $('#entredosIntensity')?.value || entredosIntensity;
  return entredosBaseStartMode(nextMode);
};

function entredosSkipCurrent(){
  if(!$('#jugar')?.classList.contains('play-open')) return;
  if(mode==='questions' && $('#jugar')?.classList.contains('local-question-active')){
    if(localQuestionPosition>=localQuestionLimit){showLocalFinalResults();return;}
    localQuestionPosition++; round++; localFirstAnswer=''; localSecondAnswer=''; localAnswerStage=1; localRevealed=false;
    const pool=(poolForMode()||[]).filter(item=>item?.text&&!entredosSeenPrompts.has(item.text)&&entredosPromptMatchesIntensity(item));
    const fallback=(poolForMode()||[]).filter(item=>item?.text&&!entredosSeenPrompts.has(item.text));
    const list=pool.length?pool:fallback;
    if(list.length){const choice=list[Math.floor(Math.random()*list.length)];entredosSeenPrompts.add(choice.text);entredosBaseSetQuestion(choice.text);}
    else {entredosSeenPrompts.clear();entredosBaseNextQuestion();}
    renderLocalAnswerStage(); toast('Pregunta saltada. Seguimos sin interrumpir la partida.'); return;
  }
  if(mode!=='questions' && $('#jugar')?.classList.contains('play-open')) {
    const pool=(poolForMode()||[]).filter(item=>item?.text&&!entredosSeenPrompts.has(item.text)&&entredosPromptMatchesIntensity(item));
    const fallback=(poolForMode()||[]).filter(item=>item?.text&&!entredosSeenPrompts.has(item.text));
    const list=pool.length?pool:fallback;
    if(list.length){const choice=list[Math.floor(Math.random()*list.length)];entredosSeenPrompts.add(choice.text);setSpecificQuestion(choice.text);}
    else nextQuestion();
    toast('Ronda saltada.'); return;
  }
  nextQuestion();
}
const entredosBaseNextQuestion = nextQuestion;
const entredosBaseNextQuestionForSkip = nextQuestion;
if($('#localAnswerStation') && !$('#entredosSkipQuestion')){
  const btn=document.createElement('button');btn.id='entredosSkipQuestion';btn.type='button';btn.className='btn btn-light entredos-skip';btn.textContent='Saltar pregunta →';
  $('#localAnswerSubmit')?.insertAdjacentElement('afterend',btn);
  btn.addEventListener('click',entredosSkipCurrent);
}
function entredosDatePlan(){
  const budget=$('#edBudget')?.value||'50', time=$('#edTime')?.value||'60', place=$('#edPlace')?.value||'either', style=$('#edStyle')?.value||'surprise';
  const outside=place==='out', inside=place==='in';
  const plans={
    food: outside?'Elegid una cafetería o preparad una pequeña ruta de degustación.':inside?'Preparad juntos una cena temática con lo que tengáis en casa.':'Organizad una cita gastronómica: cocinar algo nuevo o probar un lugar cercano.',
    creative: inside?'Haced un reto de dibujo mutuo, una playlist compartida o una manualidad.':'Visitad un mercado, una exposición o haced una sesión de fotos por vuestra zona.',
    calm: inside?'Preparad bebidas, elegid una película y dejad los móviles apartados.':'Pasead por un parque tranquilo y terminad con vuestra bebida favorita.',
    adventure: inside?'Preparad una búsqueda del tesoro en casa con pistas y pequeños premios.':'Elegid una ruta nueva, un lugar que no conozcáis o un reto fotográfico en pareja.',
    surprise: inside?'Montad una cita sorpresa en casa: luces suaves, música y un juego de preguntas.':outside?'Elegid un lugar cercano al azar, pasead sin prisa y terminad con un pequeño capricho.':'Escribid tres planes cada uno, mezcladlos y elegid uno al azar.'
  };
  const timeLabel={30:'30 minutos',60:'1–2 horas',half:'media tarde',day:'todo el día'}[time];
  const budgetLabel={gratis:'sin gastar dinero','20':'hasta 20 €','50':'hasta 50 €','100':'hasta 100 €',flexible:'presupuesto flexible'}[budget];
  const result=$('#edDateResult');
  result.replaceChildren();
  const h=document.createElement('h4');h.textContent='Vuestra cita sugerida';
  const p=document.createElement('p');p.textContent=plans[style]+' Duración: '+timeLabel+'. Presupuesto: '+budgetLabel+'.';
  const note=document.createElement('small');note.textContent='Consejo: cada uno puede proponer un detalle sorpresa y guardar el recuerdo después.';
  result.append(h,p,note);
}
$('#edGenerateDate')?.addEventListener('click',entredosDatePlan);
$('#remoteShareInvite')?.addEventListener('click',()=>{
  const code=$('#remoteRoomCode')?.textContent?.trim()||$('#remoteCode')?.textContent?.trim()||'';
  const url=new URL(location.href); url.searchParams.set('sala',code);
  const img=$('#entredosQRImage'); const wrap=$('#entredosInviteQR');
  if(img && wrap && code && /^[A-HJ-NP-Z2-9]{6}$/.test(code)){
    img.src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(url.toString());
    wrap.hidden=false;
  }
});
